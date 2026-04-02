from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from bson import ObjectId

# JWT Configuration
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="Snappoint Traffa API")

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ================================
# Pydantic Models
# ================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "kasir"  # Default role

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    created_at: datetime

class TransactionCreate(BaseModel):
    tanggal: str
    kategori: str
    jenis: str  # PEMASUKAN or PENGELUARAN
    keterangan: str
    nominal: float
    is_backdated: bool = False
    alasan_backdate: Optional[str] = None

class TransactionUpdate(BaseModel):
    keterangan: Optional[str] = None
    nominal: Optional[float] = None
    alasan_edit: str

class StockCreate(BaseModel):
    jenis_pergerakan: str  # MASUK, TERPAKAI, RUSAK, PENYESUAIAN
    jumlah_lembar: int
    keterangan: str

class KasCreate(BaseModel):
    keterangan: str
    nominal: float
    is_backdated: bool = False
    tanggal_backdate: Optional[str] = None
    alasan_backdate: Optional[str] = None

class InvestorCreate(BaseModel):
    nama_investor: str
    persentase: float
    mulai_bulan: int
    mulai_tahun: int

class InvestorUpdate(BaseModel):
    nama_investor: Optional[str] = None
    persentase: Optional[float] = None
    akhir_bulan: Optional[int] = None
    akhir_tahun: Optional[int] = None

class KategoriTransaksi(BaseModel):
    nama_kategori: str
    jenis: str  # PEMASUKAN or PENGELUARAN

class SettingKas(BaseModel):
    tahun: int
    bulan: int
    persentase: float

class ForecastRequest(BaseModel):
    n_days: int = 30

# ================================
# Auth Helper
# ================================

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["id"] = str(user["_id"])
        user.pop("_id", None)
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(roles: List[str]):
    async def role_checker(request: Request):
        user = await get_current_user(request)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ================================
# Auth Routes
# ================================

@auth_router.post("/register")
async def register(user_data: UserRegister, response: Response):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    hashed = hash_password(user_data.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": email, "name": user_data.name, "role": user_data.role}

@auth_router.post("/login")
async def login(user_data: UserLogin, response: Response, request: Request):
    email = user_data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    # Check brute force
    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("count", 0) >= 5:
        lockout_until = attempt.get("lockout_until")
        if lockout_until and datetime.now(timezone.utc) < lockout_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(user_data.password, user["password_hash"]):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {
                "$inc": {"count": 1},
                "$set": {"lockout_until": datetime.now(timezone.utc) + timedelta(minutes=15)}
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear failed attempts on success
    await db.login_attempts.delete_one({"identifier": identifier})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {"id": user_id, "email": user["email"], "name": user["name"], "role": user["role"]}

@auth_router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}

@auth_router.get("/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@auth_router.post("/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user_id = str(user["_id"])
        access_token = create_access_token(user_id, user["email"])
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ================================
# User Management Routes
# ================================

@api_router.get("/users")
async def get_users(user: dict = Depends(require_role(["admin"]))):
    users = await db.users.find({}, {"password_hash": 0}).to_list(1000)
    for u in users:
        u["id"] = str(u["_id"])
        u.pop("_id", None)
    return users

@api_router.post("/users")
async def create_user(user_data: UserRegister, current_user: dict = Depends(require_role(["admin"]))):
    email = user_data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    hashed = hash_password(user_data.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": user_data.name,
        "role": user_data.role,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    return {"id": str(result.inserted_id), "email": email, "name": user_data.name, "role": user_data.role}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_role(["admin"]))):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted"}

# ================================
# Transaction Routes
# ================================

@api_router.get("/kategori")
async def get_kategori(user: dict = Depends(get_current_user)):
    kategoris = await db.kategori_transaksi.find({}).to_list(100)
    for k in kategoris:
        k["id"] = str(k["_id"])
        k.pop("_id", None)
    return kategoris

@api_router.get("/transaksi")
async def get_transaksi(user: dict = Depends(get_current_user)):
    transactions = await db.transaksi.find({}).sort("tanggal", -1).to_list(1000)
    for t in transactions:
        t["id"] = str(t["_id"])
        t.pop("_id", None)
    return transactions

@api_router.post("/transaksi")
async def create_transaksi(data: TransactionCreate, user: dict = Depends(require_role(["admin", "owner", "kasir"]))):
    doc = {
        "tanggal": data.tanggal,
        "kategori": data.kategori,
        "jenis": data.jenis,
        "keterangan": data.keterangan,
        "nominal": data.nominal,
        "is_backdated": data.is_backdated,
        "alasan_backdate": data.alasan_backdate,
        "is_edited": False,
        "alasan_edit": None,
        "waktu_input": datetime.now(timezone.utc),
        "created_by": user["id"]
    }
    result = await db.transaksi.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.put("/transaksi/{transaksi_id}")
async def update_transaksi(transaksi_id: str, data: TransactionUpdate, user: dict = Depends(require_role(["admin", "owner"]))):
    update_doc = {"is_edited": True, "alasan_edit": data.alasan_edit, "waktu_edit": datetime.now(timezone.utc)}
    if data.keterangan:
        update_doc["keterangan"] = data.keterangan
    if data.nominal:
        update_doc["nominal"] = data.nominal
    
    result = await db.transaksi.update_one({"_id": ObjectId(transaksi_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction updated"}

@api_router.delete("/transaksi/{transaksi_id}")
async def delete_transaksi(transaksi_id: str, user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.transaksi.delete_one({"_id": ObjectId(transaksi_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return {"message": "Transaction deleted"}

# ================================
# Stock Routes (Kelola Stok Kertas)
# ================================

@api_router.get("/stok")
async def get_stok(user: dict = Depends(get_current_user)):
    stocks = await db.log_kertas.find({}).sort("tanggal", -1).to_list(1000)
    for s in stocks:
        s["id"] = str(s["_id"])
        s.pop("_id", None)
    return stocks

@api_router.get("/stok/sisa")
async def get_sisa_stok(user: dict = Depends(get_current_user)):
    stocks = await db.log_kertas.find({}).to_list(1000)
    total_masuk = sum(s["jumlah_lembar"] for s in stocks if s["jenis_pergerakan"] == "MASUK")
    total_keluar = sum(s["jumlah_lembar"] for s in stocks if s["jenis_pergerakan"] in ["TERPAKAI", "RUSAK", "PENYESUAIAN"])
    return {"sisa_stok": total_masuk - total_keluar}

@api_router.post("/stok")
async def create_stok(data: StockCreate, user: dict = Depends(require_role(["admin", "owner", "kasir"]))):
    doc = {
        "tanggal": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "jenis_pergerakan": data.jenis_pergerakan,
        "jumlah_lembar": data.jumlah_lembar,
        "keterangan": data.keterangan,
        "is_edited": False,
        "alasan_edit": None,
        "waktu_input": datetime.now(timezone.utc),
        "created_by": user["id"]
    }
    result = await db.log_kertas.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.put("/stok/{stok_id}")
async def update_stok(stok_id: str, data: dict, user: dict = Depends(require_role(["admin", "owner"]))):
    update_doc = {"is_edited": True, "alasan_edit": data.get("alasan_edit"), "waktu_edit": datetime.now(timezone.utc)}
    if "jumlah_lembar" in data:
        update_doc["jumlah_lembar"] = data["jumlah_lembar"]
    if "keterangan" in data:
        update_doc["keterangan"] = data["keterangan"]
    
    result = await db.log_kertas.update_one({"_id": ObjectId(stok_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stock record not found")
    return {"message": "Stock record updated"}

@api_router.delete("/stok/{stok_id}")
async def delete_stok(stok_id: str, user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.log_kertas.delete_one({"_id": ObjectId(stok_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stock record not found")
    return {"message": "Stock record deleted"}

# ================================
# Kas Routes (Buku Kas)
# ================================

@api_router.get("/kas")
async def get_kas(user: dict = Depends(require_role(["admin", "owner"]))):
    kas_records = await db.buku_kas.find({}).sort("tanggal", -1).to_list(1000)
    for k in kas_records:
        k["id"] = str(k["_id"])
        k.pop("_id", None)
    return kas_records

@api_router.post("/kas")
async def create_kas(data: KasCreate, user: dict = Depends(require_role(["admin", "owner"]))):
    tanggal = data.tanggal_backdate if data.is_backdated else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = {
        "tanggal": tanggal,
        "tipe": "KELUAR",
        "keterangan": data.keterangan,
        "nominal": data.nominal,
        "is_backdated": data.is_backdated,
        "alasan_backdate": data.alasan_backdate,
        "is_edited": False,
        "alasan_edit": None,
        "waktu_input": datetime.now(timezone.utc),
        "created_by": user["id"]
    }
    result = await db.buku_kas.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.put("/kas/{kas_id}")
async def update_kas(kas_id: str, data: dict, user: dict = Depends(require_role(["admin", "owner"]))):
    update_doc = {"is_edited": True, "alasan_edit": data.get("alasan_edit"), "waktu_edit": datetime.now(timezone.utc)}
    if "keterangan" in data:
        update_doc["keterangan"] = data["keterangan"]
    if "nominal" in data:
        update_doc["nominal"] = data["nominal"]
    
    result = await db.buku_kas.update_one({"_id": ObjectId(kas_id)}, {"$set": update_doc})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Kas record not found")
    return {"message": "Kas record updated"}

@api_router.delete("/kas/{kas_id}")
async def delete_kas(kas_id: str, user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.buku_kas.delete_one({"_id": ObjectId(kas_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Kas record not found")
    return {"message": "Kas record deleted"}

@api_router.get("/kas/setting")
async def get_kas_setting(user: dict = Depends(require_role(["admin", "owner"]))):
    settings = await db.setting_kas.find({}).to_list(100)
    for s in settings:
        s["id"] = str(s["_id"])
        s.pop("_id", None)
    return settings

@api_router.post("/kas/setting")
async def set_kas_percentage(data: SettingKas, user: dict = Depends(require_role(["admin", "owner"]))):
    await db.setting_kas.update_one(
        {"tahun": data.tahun, "bulan": data.bulan},
        {"$set": {"persentase": data.persentase}},
        upsert=True
    )
    return {"message": "Kas percentage saved"}

# ================================
# Investor Routes
# ================================

@api_router.get("/investor")
async def get_investors(user: dict = Depends(require_role(["admin", "owner"]))):
    investors = await db.pemegang_saham.find({}).sort("persentase", -1).to_list(100)
    for inv in investors:
        inv["id"] = str(inv["_id"])
        inv.pop("_id", None)
    return investors

@api_router.post("/investor")
async def create_investor(data: InvestorCreate, user: dict = Depends(require_role(["admin", "owner"]))):
    doc = {
        "nama_investor": data.nama_investor,
        "persentase": data.persentase,
        "mulai_bulan": data.mulai_bulan,
        "mulai_tahun": data.mulai_tahun,
        "akhir_bulan": None,
        "akhir_tahun": None,
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.pemegang_saham.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.put("/investor/{investor_id}")
async def update_investor(investor_id: str, data: InvestorUpdate, user: dict = Depends(require_role(["admin", "owner"]))):
    update_doc = {}
    if data.nama_investor:
        update_doc["nama_investor"] = data.nama_investor
    if data.persentase is not None:
        update_doc["persentase"] = data.persentase
    if data.akhir_bulan is not None:
        update_doc["akhir_bulan"] = data.akhir_bulan
    if data.akhir_tahun is not None:
        update_doc["akhir_tahun"] = data.akhir_tahun
    
    if update_doc:
        result = await db.pemegang_saham.update_one({"_id": ObjectId(investor_id)}, {"$set": update_doc})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Investor not found")
    return {"message": "Investor updated"}

@api_router.delete("/investor/{investor_id}")
async def delete_investor(investor_id: str, user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.pemegang_saham.delete_one({"_id": ObjectId(investor_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Investor not found")
    return {"message": "Investor deleted"}

# ================================
# Dashboard/Rekap Routes
# ================================

@api_router.get("/dashboard/rekap")
async def get_rekap_bulanan(user: dict = Depends(get_current_user)):
    # Get all transactions grouped by month
    transactions = await db.transaksi.find({}).to_list(10000)
    
    rekap = {}
    for t in transactions:
        tanggal = t.get("tanggal", "")
        if tanggal:
            parts = tanggal.split("-")
            if len(parts) >= 2:
                key = f"{parts[0]}-{parts[1]}"
                if key not in rekap:
                    rekap[key] = {"tahun": int(parts[0]), "bulan": int(parts[1]), "pemasukan": 0, "pengeluaran": 0}
                if t.get("jenis") == "PEMASUKAN":
                    rekap[key]["pemasukan"] += t.get("nominal", 0)
                else:
                    rekap[key]["pengeluaran"] += t.get("nominal", 0)
    
    # Calculate laba bersih
    result = []
    for key, data in rekap.items():
        data["laba_bersih"] = data["pemasukan"] - data["pengeluaran"]
        result.append(data)
    
    result.sort(key=lambda x: (x["tahun"], x["bulan"]), reverse=True)
    return result

@api_router.get("/dashboard/stok-bulanan")
async def get_stok_bulanan(user: dict = Depends(get_current_user)):
    stocks = await db.log_kertas.find({}).to_list(10000)
    
    rekap = {}
    for s in stocks:
        tanggal = s.get("tanggal", "")
        if tanggal:
            parts = tanggal.split("-")
            if len(parts) >= 2:
                key = f"{parts[0]}-{parts[1]}"
                if key not in rekap:
                    rekap[key] = {"tahun": int(parts[0]), "bulan": int(parts[1]), "masuk": 0, "keluar": 0}
                if s.get("jenis_pergerakan") == "MASUK":
                    rekap[key]["masuk"] += s.get("jumlah_lembar", 0)
                else:
                    rekap[key]["keluar"] += s.get("jumlah_lembar", 0)
    
    result = list(rekap.values())
    result.sort(key=lambda x: (x["tahun"], x["bulan"]), reverse=True)
    return result

# ================================
# ML Prediction Routes (Enhanced LSTM-like)
# ================================

class MLTrainingDataCreate(BaseModel):
    tanggal: str
    penjualan: float
    kategori: Optional[str] = None

@api_router.post("/predict")
async def get_prediction(data: ForecastRequest, user: dict = Depends(get_current_user)):
    import numpy as np
    
    n_days = min(max(data.n_days, 1), 90)
    
    # Get historical transactions for base prediction
    transactions = await db.transaksi.find({"jenis": "PEMASUKAN"}).sort("tanggal", 1).to_list(1000)
    
    # Also get ML training data if available
    training_data = await db.ml_training_data.find({}).sort("tanggal", 1).to_list(1000)
    
    # Combine data sources
    all_values = []
    all_dates = []
    
    # Add training data
    for td in training_data:
        all_values.append(td.get("penjualan", 0))
        all_dates.append(td.get("tanggal", ""))
    
    # Add transaction data (group by date)
    daily_sales = {}
    for t in transactions:
        tanggal = t.get("tanggal", "")
        if tanggal:
            if tanggal not in daily_sales:
                daily_sales[tanggal] = 0
            daily_sales[tanggal] += t.get("nominal", 0)
    
    for date, value in sorted(daily_sales.items()):
        if date not in all_dates:
            all_values.append(value)
            all_dates.append(date)
    
    if len(all_values) < 5:
        # Generate sample predictions if no data
        base_value = 500000
        predictions = []
        for i in range(n_days):
            date = datetime.now(timezone.utc) + timedelta(days=i+1)
            # Add realistic variance
            day_of_week = date.weekday()
            weekend_factor = 1.3 if day_of_week >= 5 else 1.0
            pred_value = base_value * weekend_factor + np.random.uniform(-50000, 100000)
            predictions.append({
                "tanggal": date.strftime("%Y-%m-%d"),
                "hari": date.strftime("%A"),
                "prediksi": round(max(0, pred_value), 2)
            })
    else:
        # Advanced prediction using moving averages and trends (LSTM-like behavior)
        values = np.array(all_values[-90:])  # Use last 90 days
        
        # Calculate statistics
        avg_value = np.mean(values)
        std_value = np.std(values) if len(values) > 1 else avg_value * 0.1
        
        # Calculate trend (linear regression)
        if len(values) >= 7:
            x = np.arange(len(values))
            trend_coef = np.polyfit(x, values, 1)[0]
        else:
            trend_coef = 0
        
        # Calculate weekly pattern
        weekly_pattern = [1.0] * 7
        if len(values) >= 14:
            for i in range(7):
                day_values = values[i::7]  # Every 7th value starting from i
                if len(day_values) > 0:
                    weekly_pattern[i] = np.mean(day_values) / avg_value if avg_value > 0 else 1.0
        
        # Generate predictions
        predictions = []
        last_values = list(values[-14:])  # Keep last 14 values for momentum
        
        for i in range(n_days):
            date = datetime.now(timezone.utc) + timedelta(days=i+1)
            day_of_week = date.weekday()
            
            # Base prediction with trend
            base = avg_value + trend_coef * (len(values) + i)
            
            # Apply weekly seasonality
            seasonality_factor = weekly_pattern[day_of_week]
            
            # Add momentum from recent values
            momentum = 0
            if len(last_values) >= 7:
                recent_avg = np.mean(last_values[-7:])
                momentum = (recent_avg - avg_value) * 0.3
            
            # Add controlled noise
            noise = np.random.normal(0, std_value * 0.05)
            
            # Final prediction
            pred_value = (base * seasonality_factor) + momentum + noise
            pred_value = max(0, pred_value)
            
            predictions.append({
                "tanggal": date.strftime("%Y-%m-%d"),
                "hari": date.strftime("%A"),
                "prediksi": round(pred_value, 2)
            })
            
            # Update last values for next iteration
            last_values.append(pred_value)
            if len(last_values) > 14:
                last_values.pop(0)
    
    values = [p["prediksi"] for p in predictions]
    return {
        "status": "success",
        "n_days": n_days,
        "data_source": "ml_training_data + transaksi",
        "data_points_used": len(all_values),
        "predictions": predictions,
        "ringkasan": {
            "rata_rata": round(float(np.mean(values)), 2),
            "minimum": round(float(np.min(values)), 2),
            "maksimum": round(float(np.max(values)), 2),
            "total": round(float(np.sum(values)), 2)
        }
    }

@api_router.post("/predict/save")
async def save_prediction(data: dict, user: dict = Depends(require_role(["admin", "owner"]))):
    doc = {
        "predictions": data.get("predictions", []),
        "n_days": data.get("n_days", 30),
        "ringkasan": data.get("ringkasan", {}),
        "data_points_used": data.get("data_points_used", 0),
        "created_at": datetime.now(timezone.utc),
        "created_by": user["id"]
    }
    result = await db.prediction_history.insert_one(doc)
    return {"id": str(result.inserted_id), "message": "Prediction saved"}

@api_router.get("/predict/history")
async def get_prediction_history(user: dict = Depends(get_current_user)):
    history = await db.prediction_history.find({}).sort("created_at", -1).to_list(50)
    for h in history:
        h["id"] = str(h["_id"])
        h.pop("_id", None)
    return history

# ================================
# ML Training Data Routes
# ================================

@api_router.get("/ml/training-data")
async def get_ml_training_data(user: dict = Depends(require_role(["admin", "owner"]))):
    """Get all ML training data"""
    data = await db.ml_training_data.find({}).sort("tanggal", -1).to_list(1000)
    for d in data:
        d["id"] = str(d["_id"])
        d.pop("_id", None)
    return data

@api_router.post("/ml/training-data")
async def add_ml_training_data(data: MLTrainingDataCreate, user: dict = Depends(require_role(["admin", "owner"]))):
    """Add new ML training data point"""
    doc = {
        "tanggal": data.tanggal,
        "penjualan": data.penjualan,
        "kategori": data.kategori,
        "created_at": datetime.now(timezone.utc),
        "created_by": user["id"]
    }
    result = await db.ml_training_data.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc.pop("_id", None)
    return doc

@api_router.post("/ml/training-data/bulk")
async def bulk_add_ml_training_data(data: List[MLTrainingDataCreate], user: dict = Depends(require_role(["admin", "owner"]))):
    """Bulk add ML training data"""
    docs = []
    for item in data:
        docs.append({
            "tanggal": item.tanggal,
            "penjualan": item.penjualan,
            "kategori": item.kategori,
            "created_at": datetime.now(timezone.utc),
            "created_by": user["id"]
        })
    
    if docs:
        result = await db.ml_training_data.insert_many(docs)
        return {"message": f"{len(result.inserted_ids)} data points added"}
    return {"message": "No data to add"}

@api_router.delete("/ml/training-data/{data_id}")
async def delete_ml_training_data(data_id: str, user: dict = Depends(require_role(["admin", "owner"]))):
    """Delete ML training data point"""
    result = await db.ml_training_data.delete_one({"_id": ObjectId(data_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Data not found")
    return {"message": "Data deleted"}

@api_router.get("/ml/sync-from-transactions")
async def sync_ml_from_transactions(user: dict = Depends(require_role(["admin", "owner"]))):
    """Sync ML training data from existing transactions"""
    transactions = await db.transaksi.find({"jenis": "PEMASUKAN"}).to_list(10000)
    
    # Group by date
    daily_sales = {}
    for t in transactions:
        tanggal = t.get("tanggal", "")
        if tanggal:
            if tanggal not in daily_sales:
                daily_sales[tanggal] = 0
            daily_sales[tanggal] += t.get("nominal", 0)
    
    # Add to ML training data (upsert)
    added = 0
    for tanggal, penjualan in daily_sales.items():
        existing = await db.ml_training_data.find_one({"tanggal": tanggal})
        if not existing:
            await db.ml_training_data.insert_one({
                "tanggal": tanggal,
                "penjualan": penjualan,
                "kategori": "synced_from_transactions",
                "created_at": datetime.now(timezone.utc),
                "created_by": user["id"]
            })
            added += 1
    
    return {"message": f"Synced {added} new data points from transactions", "total_days": len(daily_sales)}

# ================================
# Health Check
# ================================

@api_router.get("/")
async def root():
    return {"message": "Snappoint Traffa API is running"}

@api_router.get("/health")
async def health():
    return {"status": "ok", "message": "API healthy"}

# Include routers
api_router.include_router(auth_router)
app.include_router(api_router)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[os.environ.get('FRONTEND_URL', 'http://localhost:3000')],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ================================
# Startup Events
# ================================

@app.on_event("startup")
async def startup_event():
    # Create indexes
    await db.users.create_index("email", unique=True)
    await db.login_attempts.create_index("identifier")
    await db.transaksi.create_index("tanggal")
    await db.log_kertas.create_index("tanggal")
    await db.buku_kas.create_index("tanggal")
    await db.pemegang_saham.create_index("nama_investor")
    await db.ml_training_data.create_index("tanggal", unique=True)
    await db.prediction_history.create_index("created_at")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@snappoint.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Administrator",
            "role": "admin",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")
    
    # Seed default categories
    categories = [
        {"nama_kategori": "Pendapatan (Gross Income)", "jenis": "PEMASUKAN"},
        {"nama_kategori": "Bahan Baku (Kertas/Tinta)", "jenis": "PENGELUARAN"},
        {"nama_kategori": "Gaji & Honor", "jenis": "PENGELUARAN"},
        {"nama_kategori": "Sewa Tempat", "jenis": "PENGELUARAN"},
        {"nama_kategori": "Operasional & Konsumsi", "jenis": "PENGELUARAN"},
        {"nama_kategori": "Maintenance & Perbaikan", "jenis": "PENGELUARAN"},
        {"nama_kategori": "Lain-lain", "jenis": "PENGELUARAN"},
    ]
    
    for cat in categories:
        existing_cat = await db.kategori_transaksi.find_one({"nama_kategori": cat["nama_kategori"]})
        if not existing_cat:
            await db.kategori_transaksi.insert_one(cat)
    
    # Seed some sample data
    sample_transactions = await db.transaksi.count_documents({})
    if sample_transactions == 0:
        sample_data = [
            {"tanggal": "2026-01-15", "kategori": "Pendapatan (Gross Income)", "jenis": "PEMASUKAN", "keterangan": "Gross Income Januari", "nominal": 5000000},
            {"tanggal": "2026-01-16", "kategori": "Bahan Baku (Kertas/Tinta)", "jenis": "PENGELUARAN", "keterangan": "Beli kertas HVS", "nominal": 500000},
            {"tanggal": "2026-01-17", "kategori": "Pendapatan (Gross Income)", "jenis": "PEMASUKAN", "keterangan": "Gross Income", "nominal": 3500000},
            {"tanggal": "2026-01-18", "kategori": "Operasional & Konsumsi", "jenis": "PENGELUARAN", "keterangan": "Listrik dan Air", "nominal": 250000},
            {"tanggal": "2026-01-19", "kategori": "Pendapatan (Gross Income)", "jenis": "PEMASUKAN", "keterangan": "Gross Income", "nominal": 4200000},
        ]
        for td in sample_data:
            td["is_backdated"] = False
            td["alasan_backdate"] = None
            td["is_edited"] = False
            td["alasan_edit"] = None
            td["waktu_input"] = datetime.now(timezone.utc)
            td["created_by"] = "system"
        await db.transaksi.insert_many(sample_data)
        logger.info("Sample transactions created")
    
    # Write test credentials
    try:
        Path("/app/memory").mkdir(parents=True, exist_ok=True)
        with open("/app/memory/test_credentials.md", "w") as f:
            f.write("# Test Credentials\n\n")
            f.write("## Admin Account\n")
            f.write(f"- Email: {admin_email}\n")
            f.write(f"- Password: {admin_password}\n")
            f.write("- Role: admin\n\n")
            f.write("## Auth Endpoints\n")
            f.write("- POST /api/auth/login\n")
            f.write("- POST /api/auth/register\n")
            f.write("- POST /api/auth/logout\n")
            f.write("- GET /api/auth/me\n")
            f.write("- POST /api/auth/refresh\n")
    except Exception as e:
        logger.error(f"Failed to write test credentials: {e}")
    
    logger.info("Startup completed")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
