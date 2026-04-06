from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Float, Boolean, DateTime, Text, ForeignKey, select, func, and_, or_
from contextlib import asynccontextmanager
import os
import logging
import bcrypt
import jwt
import json
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, EmailStr
from typing import List, Optional

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

def create_access_token(user_id: int, email: str) -> str:
    payload = {
        "sub": str(user_id),
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# MySQL connection (with SQLite fallback for development)
DATABASE_URL = os.environ.get('DATABASE_URL')

if DATABASE_URL:
    # Use SQLite for development
    engine = create_async_engine(DATABASE_URL, echo=False)
else:
    # Use MySQL for production
    MYSQL_URL = f"mysql+aiomysql://{os.environ.get('MYSQL_USER', 'root')}:{os.environ.get('MYSQL_PASSWORD', '')}@{os.environ.get('MYSQL_HOST', 'localhost')}:{os.environ.get('MYSQL_PORT', '3306')}/{os.environ.get('MYSQL_DATABASE', 'snappoint_db')}"
    engine = create_async_engine(MYSQL_URL, echo=False, pool_pre_ping=True)

async_session = async_sessionmaker(engine, expire_on_commit=False)

# ================================
# SQLAlchemy Models
# ================================

class Base(DeclarativeBase):
    pass

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="kasir")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    identifier: Mapped[str] = mapped_column(String(255), nullable=False)
    count: Mapped[int] = mapped_column(Integer, default=0)
    lockout_until: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)

class KategoriTransaksi(Base):
    __tablename__ = "kategori_transaksi"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nama_kategori: Mapped[str] = mapped_column(String(255), nullable=False)
    jenis: Mapped[str] = mapped_column(String(50), nullable=False)

class Transaksi(Base):
    __tablename__ = "transaksi"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tanggal: Mapped[str] = mapped_column(String(20), nullable=False)
    kategori: Mapped[str] = mapped_column(String(255), nullable=False)
    jenis: Mapped[str] = mapped_column(String(50), nullable=False)
    keterangan: Mapped[str] = mapped_column(Text, nullable=True)
    nominal: Mapped[float] = mapped_column(Float, default=0)
    is_backdated: Mapped[bool] = mapped_column(Boolean, default=False)
    alasan_backdate: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    alasan_edit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    waktu_input: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    waktu_edit: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class LogKertas(Base):
    __tablename__ = "log_kertas"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tanggal: Mapped[str] = mapped_column(String(20), nullable=False)
    jenis_pergerakan: Mapped[str] = mapped_column(String(50), nullable=False)
    jumlah_lembar: Mapped[int] = mapped_column(Integer, default=0)
    keterangan: Mapped[str] = mapped_column(Text, nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    alasan_edit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    waktu_input: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    waktu_edit: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class BukuKas(Base):
    __tablename__ = "buku_kas"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tanggal: Mapped[str] = mapped_column(String(20), nullable=False)
    tipe: Mapped[str] = mapped_column(String(20), default="KELUAR")
    keterangan: Mapped[str] = mapped_column(Text, nullable=True)
    nominal: Mapped[float] = mapped_column(Float, default=0)
    is_backdated: Mapped[bool] = mapped_column(Boolean, default=False)
    alasan_backdate: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_edited: Mapped[bool] = mapped_column(Boolean, default=False)
    alasan_edit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    waktu_input: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    waktu_edit: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class SettingKas(Base):
    __tablename__ = "setting_kas"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tahun: Mapped[int] = mapped_column(Integer, nullable=False)
    bulan: Mapped[int] = mapped_column(Integer, nullable=False)
    persentase: Mapped[float] = mapped_column(Float, default=3.0)

class PemegangSaham(Base):
    __tablename__ = "pemegang_saham"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    nama_investor: Mapped[str] = mapped_column(String(255), nullable=False)
    persentase: Mapped[float] = mapped_column(Float, default=0)
    mulai_bulan: Mapped[int] = mapped_column(Integer, nullable=False)
    mulai_tahun: Mapped[int] = mapped_column(Integer, nullable=False)
    akhir_bulan: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    akhir_tahun: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

class MLTrainingData(Base):
    __tablename__ = "ml_training_data"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    tanggal: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    penjualan: Mapped[float] = mapped_column(Float, default=0)
    kategori: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class PredictionHistory(Base):
    __tablename__ = "prediction_history"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    n_days: Mapped[int] = mapped_column(Integer, default=30)
    predictions_json: Mapped[str] = mapped_column(Text, nullable=True)
    ringkasan_json: Mapped[str] = mapped_column(Text, nullable=True)
    data_points_used: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    created_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class NotificationSettings(Base):
    __tablename__ = "notification_settings"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    stok_kritis_threshold: Mapped[int] = mapped_column(Integer, default=100)
    stok_warning_threshold: Mapped[int] = mapped_column(Integer, default=300)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    updated_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    updated_by: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

class DismissedNotification(Base):
    __tablename__ = "dismissed_notifications"
    
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(255), nullable=False)
    notification_id: Mapped[str] = mapped_column(String(255), nullable=False)
    dismissed_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

# ================================
# Pydantic Models
# ================================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: str = "kasir"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TransactionCreate(BaseModel):
    tanggal: str
    kategori: str
    jenis: str
    keterangan: str
    nominal: float
    is_backdated: bool = False
    alasan_backdate: Optional[str] = None

class TransactionUpdate(BaseModel):
    keterangan: Optional[str] = None
    nominal: Optional[float] = None
    alasan_edit: str

class StockCreate(BaseModel):
    jenis_pergerakan: str
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

class SettingKasModel(BaseModel):
    tahun: int
    bulan: int
    persentase: float

class ForecastRequest(BaseModel):
    n_days: int = 30

class MLTrainingDataCreate(BaseModel):
    tanggal: str
    penjualan: float
    kategori: Optional[str] = None

class NotificationSettingsModel(BaseModel):
    stok_kritis_threshold: int = 100
    stok_warning_threshold: int = 300
    enabled: bool = True

# ================================
# Database Session Dependency
# ================================

async def get_db():
    async with async_session() as session:
        yield session

# ================================
# Auth Helper
# ================================

async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> dict:
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        result = await db.execute(select(User).where(User.id == int(payload["sub"])))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return {
            "id": str(user.id),
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "created_at": user.created_at.isoformat() if user.created_at else None
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def require_role(roles: List[str]):
    async def role_checker(request: Request, db: AsyncSession = Depends(get_db)):
        user = await get_current_user(request, db)
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return role_checker

# ================================
# App Lifespan
# ================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed data
    async with async_session() as db:
        # Check and create admin
        admin_email = os.environ.get("ADMIN_EMAIL", "admin@snappoint.com")
        admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
        
        result = await db.execute(select(User).where(User.email == admin_email))
        existing = result.scalar_one_or_none()
        
        if not existing:
            admin = User(
                email=admin_email,
                password_hash=hash_password(admin_password),
                name="Administrator",
                role="admin"
            )
            db.add(admin)
            logger.info(f"Admin user created: {admin_email}")
        
        # Seed categories
        categories = [
            ("Pendapatan (Gross Income)", "PEMASUKAN"),
            ("Bahan Baku (Kertas/Tinta)", "PENGELUARAN"),
            ("Gaji & Honor", "PENGELUARAN"),
            ("Sewa Tempat", "PENGELUARAN"),
            ("Operasional & Konsumsi", "PENGELUARAN"),
            ("Maintenance & Perbaikan", "PENGELUARAN"),
            ("Lain-lain", "PENGELUARAN"),
        ]
        
        for nama, jenis in categories:
            result = await db.execute(select(KategoriTransaksi).where(KategoriTransaksi.nama_kategori == nama))
            if not result.scalar_one_or_none():
                db.add(KategoriTransaksi(nama_kategori=nama, jenis=jenis))
        
        await db.commit()
    
    # Write test credentials
    Path("/app/memory").mkdir(parents=True, exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write("# Test Credentials\n\n")
        f.write("## Admin Account\n")
        f.write(f"- Email: {os.environ.get('ADMIN_EMAIL', 'admin@snappoint.com')}\n")
        f.write(f"- Password: {os.environ.get('ADMIN_PASSWORD', 'admin123')}\n")
        f.write("- Role: admin\n")
    
    logger.info("Startup completed")
    
    yield
    
    # Shutdown
    await engine.dispose()

# Create app
app = FastAPI(title="Snappoint Traffa API", lifespan=lifespan)

# Create routers
api_router = APIRouter(prefix="/api")
auth_router = APIRouter(prefix="/auth", tags=["Authentication"])

# ================================
# Auth Routes
# ================================

@auth_router.post("/register")
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    email = user_data.email.lower()
    
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=email,
        password_hash=hash_password(user_data.password),
        name=user_data.name,
        role=user_data.role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    access_token = create_access_token(user.id, email)
    refresh_token = create_refresh_token(user.id)
    
    return {
        "id": str(user.id),
        "email": email,
        "name": user_data.name,
        "role": user_data.role,
        "access_token": access_token,
        "refresh_token": refresh_token
    }

@auth_router.post("/login")
async def login(user_data: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    email = user_data.email.lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    
    # Check brute force
    result = await db.execute(select(LoginAttempt).where(LoginAttempt.identifier == identifier))
    attempt = result.scalar_one_or_none()
    
    if attempt and attempt.count >= 5:
        if attempt.lockout_until and datetime.now(timezone.utc) < attempt.lockout_until:
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again later.")
    
    # Find user
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(user_data.password, user.password_hash):
        if attempt:
            attempt.count += 1
            attempt.lockout_until = datetime.now(timezone.utc) + timedelta(minutes=15)
        else:
            db.add(LoginAttempt(identifier=identifier, count=1, lockout_until=datetime.now(timezone.utc) + timedelta(minutes=15)))
        await db.commit()
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Clear attempts on success
    if attempt:
        await db.delete(attempt)
        await db.commit()
    
    access_token = create_access_token(user.id, email)
    refresh_token = create_refresh_token(user.id)
    
    return {
        "id": str(user.id),
        "email": user.email,
        "name": user.name,
        "role": user.role,
        "access_token": access_token,
        "refresh_token": refresh_token
    }

@auth_router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}

@auth_router.get("/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user

@auth_router.post("/refresh")
async def refresh_token(request: Request, db: AsyncSession = Depends(get_db)):
    auth_header = request.headers.get("Authorization", "")
    token = None
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
    
    if not token:
        try:
            body = await request.json()
            token = body.get("refresh_token")
        except:
            pass
    
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        result = await db.execute(select(User).where(User.id == int(payload["sub"])))
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        access_token = create_access_token(user.id, user.email)
        new_refresh_token = create_refresh_token(user.id)
        
        return {
            "access_token": access_token,
            "refresh_token": new_refresh_token,
            "message": "Token refreshed"
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ================================
# User Management Routes
# ================================

@api_router.get("/users")
async def get_users(db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin"]))):
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [{"id": str(u.id), "email": u.email, "name": u.name, "role": u.role, "created_at": u.created_at.isoformat() if u.created_at else None} for u in users]

@api_router.post("/users")
async def create_user(user_data: UserRegister, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_role(["admin"]))):
    email = user_data.email.lower()
    
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user = User(
        email=email,
        password_hash=hash_password(user_data.password),
        name=user_data.name,
        role=user_data.role
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return {"id": str(user.id), "email": email, "name": user_data.name, "role": user_data.role}

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db), current_user: dict = Depends(require_role(["admin"]))):
    if str(user_id) == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete yourself")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(user)
    await db.commit()
    return {"message": "User deleted"}

# ================================
# Transaction Routes
# ================================

@api_router.get("/kategori")
async def get_kategori(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(KategoriTransaksi))
    kategoris = result.scalars().all()
    return [{"id": str(k.id), "nama_kategori": k.nama_kategori, "jenis": k.jenis} for k in kategoris]

@api_router.get("/transaksi")
async def get_transaksi(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(Transaksi).order_by(Transaksi.tanggal.desc()))
    transactions = result.scalars().all()
    return [{
        "id": str(t.id), "tanggal": t.tanggal, "kategori": t.kategori, "jenis": t.jenis,
        "keterangan": t.keterangan, "nominal": t.nominal, "is_backdated": t.is_backdated,
        "alasan_backdate": t.alasan_backdate, "is_edited": t.is_edited, "alasan_edit": t.alasan_edit,
        "waktu_input": t.waktu_input.isoformat() if t.waktu_input else None
    } for t in transactions]

@api_router.post("/transaksi")
async def create_transaksi(data: TransactionCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner", "kasir"]))):
    transaksi = Transaksi(
        tanggal=data.tanggal, kategori=data.kategori, jenis=data.jenis,
        keterangan=data.keterangan, nominal=data.nominal,
        is_backdated=data.is_backdated, alasan_backdate=data.alasan_backdate,
        created_by=user["id"]
    )
    db.add(transaksi)
    await db.commit()
    await db.refresh(transaksi)
    
    return {"id": str(transaksi.id), "tanggal": transaksi.tanggal, "kategori": transaksi.kategori, "jenis": transaksi.jenis, "nominal": transaksi.nominal}

@api_router.put("/transaksi/{transaksi_id}")
async def update_transaksi(transaksi_id: int, data: TransactionUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(Transaksi).where(Transaksi.id == transaksi_id))
    transaksi = result.scalar_one_or_none()
    
    if not transaksi:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    transaksi.is_edited = True
    transaksi.alasan_edit = data.alasan_edit
    transaksi.waktu_edit = datetime.now(timezone.utc)
    if data.keterangan:
        transaksi.keterangan = data.keterangan
    if data.nominal:
        transaksi.nominal = data.nominal
    
    await db.commit()
    return {"message": "Transaction updated"}

@api_router.delete("/transaksi/{transaksi_id}")
async def delete_transaksi(transaksi_id: int, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(Transaksi).where(Transaksi.id == transaksi_id))
    transaksi = result.scalar_one_or_none()
    
    if not transaksi:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    await db.delete(transaksi)
    await db.commit()
    return {"message": "Transaction deleted"}

# ================================
# Stock Routes
# ================================

@api_router.get("/stok")
async def get_stok(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(LogKertas).order_by(LogKertas.tanggal.desc()))
    stocks = result.scalars().all()
    return [{
        "id": str(s.id), "tanggal": s.tanggal, "jenis_pergerakan": s.jenis_pergerakan,
        "jumlah_lembar": s.jumlah_lembar, "keterangan": s.keterangan,
        "is_edited": s.is_edited, "alasan_edit": s.alasan_edit,
        "waktu_input": s.waktu_input.isoformat() if s.waktu_input else None
    } for s in stocks]

@api_router.get("/stok/sisa")
async def get_sisa_stok(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(LogKertas))
    stocks = result.scalars().all()
    
    total_masuk = sum(s.jumlah_lembar for s in stocks if s.jenis_pergerakan == "MASUK")
    total_keluar = sum(s.jumlah_lembar for s in stocks if s.jenis_pergerakan in ["TERPAKAI", "RUSAK", "PENYESUAIAN"])
    
    return {"sisa_stok": total_masuk - total_keluar}

@api_router.post("/stok")
async def create_stok(data: StockCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner", "kasir"]))):
    stock = LogKertas(
        tanggal=datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        jenis_pergerakan=data.jenis_pergerakan,
        jumlah_lembar=data.jumlah_lembar,
        keterangan=data.keterangan,
        created_by=user["id"]
    )
    db.add(stock)
    await db.commit()
    await db.refresh(stock)
    
    return {"id": str(stock.id), "tanggal": stock.tanggal, "jenis_pergerakan": stock.jenis_pergerakan, "jumlah_lembar": stock.jumlah_lembar}

@api_router.delete("/stok/{stok_id}")
async def delete_stok(stok_id: int, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(LogKertas).where(LogKertas.id == stok_id))
    stock = result.scalar_one_or_none()
    
    if not stock:
        raise HTTPException(status_code=404, detail="Stock record not found")
    
    await db.delete(stock)
    await db.commit()
    return {"message": "Stock record deleted"}

# ================================
# Kas Routes
# ================================

@api_router.get("/kas")
async def get_kas(db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(BukuKas).order_by(BukuKas.tanggal.desc()))
    kas_records = result.scalars().all()
    return [{
        "id": str(k.id), "tanggal": k.tanggal, "tipe": k.tipe, "keterangan": k.keterangan,
        "nominal": k.nominal, "is_backdated": k.is_backdated, "alasan_backdate": k.alasan_backdate,
        "is_edited": k.is_edited, "alasan_edit": k.alasan_edit
    } for k in kas_records]

@api_router.post("/kas")
async def create_kas(data: KasCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    tanggal = data.tanggal_backdate if data.is_backdated else datetime.now(timezone.utc).strftime("%Y-%m-%d")
    kas = BukuKas(
        tanggal=tanggal, tipe="KELUAR", keterangan=data.keterangan, nominal=data.nominal,
        is_backdated=data.is_backdated, alasan_backdate=data.alasan_backdate,
        created_by=user["id"]
    )
    db.add(kas)
    await db.commit()
    await db.refresh(kas)
    
    return {"id": str(kas.id), "tanggal": kas.tanggal, "nominal": kas.nominal}

@api_router.delete("/kas/{kas_id}")
async def delete_kas(kas_id: int, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(BukuKas).where(BukuKas.id == kas_id))
    kas = result.scalar_one_or_none()
    
    if not kas:
        raise HTTPException(status_code=404, detail="Kas record not found")
    
    await db.delete(kas)
    await db.commit()
    return {"message": "Kas record deleted"}

@api_router.get("/kas/setting")
async def get_kas_setting(db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(SettingKas))
    settings = result.scalars().all()
    return [{"id": str(s.id), "tahun": s.tahun, "bulan": s.bulan, "persentase": s.persentase} for s in settings]

@api_router.post("/kas/setting")
async def set_kas_percentage(data: SettingKasModel, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(SettingKas).where(and_(SettingKas.tahun == data.tahun, SettingKas.bulan == data.bulan)))
    existing = result.scalar_one_or_none()
    
    if existing:
        existing.persentase = data.persentase
    else:
        db.add(SettingKas(tahun=data.tahun, bulan=data.bulan, persentase=data.persentase))
    
    await db.commit()
    return {"message": "Kas percentage saved"}

# ================================
# Investor Routes
# ================================

@api_router.get("/investor")
async def get_investors(db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(PemegangSaham).order_by(PemegangSaham.persentase.desc()))
    investors = result.scalars().all()
    return [{
        "id": str(i.id), "nama_investor": i.nama_investor, "persentase": i.persentase,
        "mulai_bulan": i.mulai_bulan, "mulai_tahun": i.mulai_tahun,
        "akhir_bulan": i.akhir_bulan, "akhir_tahun": i.akhir_tahun
    } for i in investors]

@api_router.post("/investor")
async def create_investor(data: InvestorCreate, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    investor = PemegangSaham(
        nama_investor=data.nama_investor, persentase=data.persentase,
        mulai_bulan=data.mulai_bulan, mulai_tahun=data.mulai_tahun
    )
    db.add(investor)
    await db.commit()
    await db.refresh(investor)
    
    return {"id": str(investor.id), "nama_investor": investor.nama_investor, "persentase": investor.persentase}

@api_router.put("/investor/{investor_id}")
async def update_investor(investor_id: int, data: InvestorUpdate, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(PemegangSaham).where(PemegangSaham.id == investor_id))
    investor = result.scalar_one_or_none()
    
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    if data.nama_investor:
        investor.nama_investor = data.nama_investor
    if data.persentase is not None:
        investor.persentase = data.persentase
    if data.akhir_bulan is not None:
        investor.akhir_bulan = data.akhir_bulan
    if data.akhir_tahun is not None:
        investor.akhir_tahun = data.akhir_tahun
    
    await db.commit()
    return {"message": "Investor updated"}

@api_router.delete("/investor/{investor_id}")
async def delete_investor(investor_id: int, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(PemegangSaham).where(PemegangSaham.id == investor_id))
    investor = result.scalar_one_or_none()
    
    if not investor:
        raise HTTPException(status_code=404, detail="Investor not found")
    
    await db.delete(investor)
    await db.commit()
    return {"message": "Investor deleted"}

# ================================
# Dashboard Routes
# ================================

@api_router.get("/dashboard/rekap")
async def get_rekap_bulanan(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(Transaksi))
    transactions = result.scalars().all()
    
    rekap = {}
    for t in transactions:
        if t.tanggal:
            parts = t.tanggal.split("-")
            if len(parts) >= 2:
                key = f"{parts[0]}-{parts[1]}"
                if key not in rekap:
                    rekap[key] = {"tahun": int(parts[0]), "bulan": int(parts[1]), "pemasukan": 0, "pengeluaran": 0}
                if t.jenis == "PEMASUKAN":
                    rekap[key]["pemasukan"] += t.nominal
                else:
                    rekap[key]["pengeluaran"] += t.nominal
    
    result_list = []
    for key, data in rekap.items():
        data["laba_bersih"] = data["pemasukan"] - data["pengeluaran"]
        result_list.append(data)
    
    result_list.sort(key=lambda x: (x["tahun"], x["bulan"]), reverse=True)
    return result_list

# ================================
# ML Prediction Routes
# ================================

@api_router.post("/predict")
async def get_prediction(data: ForecastRequest, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    import numpy as np
    
    n_days = min(max(data.n_days, 1), 90)
    
    # Get historical transactions
    result = await db.execute(select(Transaksi).where(Transaksi.jenis == "PEMASUKAN").order_by(Transaksi.tanggal))
    transactions = result.scalars().all()
    
    # Get ML training data
    result = await db.execute(select(MLTrainingData).order_by(MLTrainingData.tanggal))
    training_data = result.scalars().all()
    
    all_values = []
    all_dates = []
    
    for td in training_data:
        all_values.append(td.penjualan)
        all_dates.append(td.tanggal)
    
    daily_sales = {}
    for t in transactions:
        if t.tanggal:
            if t.tanggal not in daily_sales:
                daily_sales[t.tanggal] = 0
            daily_sales[t.tanggal] += t.nominal
    
    for date, value in sorted(daily_sales.items()):
        if date not in all_dates:
            all_values.append(value)
            all_dates.append(date)
    
    if len(all_values) < 5:
        base_value = 500000
        predictions = []
        for i in range(n_days):
            date = datetime.now(timezone.utc) + timedelta(days=i+1)
            day_of_week = date.weekday()
            weekend_factor = 1.3 if day_of_week >= 5 else 1.0
            pred_value = base_value * weekend_factor + np.random.uniform(-50000, 100000)
            predictions.append({
                "tanggal": date.strftime("%Y-%m-%d"),
                "hari": date.strftime("%A"),
                "prediksi": round(max(0, pred_value), 2)
            })
    else:
        values = np.array(all_values[-90:])
        avg_value = np.mean(values)
        std_value = np.std(values) if len(values) > 1 else avg_value * 0.1
        
        if len(values) >= 7:
            x = np.arange(len(values))
            trend_coef = np.polyfit(x, values, 1)[0]
        else:
            trend_coef = 0
        
        weekly_pattern = [1.0] * 7
        if len(values) >= 14:
            for i in range(7):
                day_values = values[i::7]
                if len(day_values) > 0:
                    weekly_pattern[i] = np.mean(day_values) / avg_value if avg_value > 0 else 1.0
        
        predictions = []
        last_values = list(values[-14:])
        
        for i in range(n_days):
            date = datetime.now(timezone.utc) + timedelta(days=i+1)
            day_of_week = date.weekday()
            
            base = avg_value + trend_coef * (len(values) + i)
            seasonality_factor = weekly_pattern[day_of_week]
            
            momentum = 0
            if len(last_values) >= 7:
                recent_avg = np.mean(last_values[-7:])
                momentum = (recent_avg - avg_value) * 0.3
            
            noise = np.random.normal(0, std_value * 0.05)
            pred_value = (base * seasonality_factor) + momentum + noise
            pred_value = max(0, pred_value)
            
            predictions.append({
                "tanggal": date.strftime("%Y-%m-%d"),
                "hari": date.strftime("%A"),
                "prediksi": round(pred_value, 2)
            })
            
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
async def save_prediction(data: dict, db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    history = PredictionHistory(
        n_days=data.get("n_days", 30),
        predictions_json=json.dumps(data.get("predictions", [])),
        ringkasan_json=json.dumps(data.get("ringkasan", {})),
        data_points_used=data.get("data_points_used", 0),
        created_by=user["id"]
    )
    db.add(history)
    await db.commit()
    await db.refresh(history)
    
    return {"id": str(history.id), "message": "Prediction saved"}

@api_router.get("/predict/history")
async def get_prediction_history(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    result = await db.execute(select(PredictionHistory).order_by(PredictionHistory.created_at.desc()).limit(50))
    history = result.scalars().all()
    
    return [{
        "id": str(h.id),
        "n_days": h.n_days,
        "predictions": json.loads(h.predictions_json) if h.predictions_json else [],
        "ringkasan": json.loads(h.ringkasan_json) if h.ringkasan_json else {},
        "data_points_used": h.data_points_used,
        "created_at": h.created_at.isoformat() if h.created_at else None
    } for h in history]

@api_router.get("/ml/sync-from-transactions")
async def sync_ml_from_transactions(db: AsyncSession = Depends(get_db), user: dict = Depends(require_role(["admin", "owner"]))):
    result = await db.execute(select(Transaksi).where(Transaksi.jenis == "PEMASUKAN"))
    transactions = result.scalars().all()
    
    daily_sales = {}
    for t in transactions:
        if t.tanggal:
            if t.tanggal not in daily_sales:
                daily_sales[t.tanggal] = 0
            daily_sales[t.tanggal] += t.nominal
    
    added = 0
    for tanggal, penjualan in daily_sales.items():
        result = await db.execute(select(MLTrainingData).where(MLTrainingData.tanggal == tanggal))
        existing = result.scalar_one_or_none()
        
        if not existing:
            db.add(MLTrainingData(
                tanggal=tanggal,
                penjualan=penjualan,
                kategori="synced_from_transactions",
                created_by=user["id"]
            ))
            added += 1
    
    await db.commit()
    return {"message": f"Synced {added} new data points from transactions", "total_days": len(daily_sales)}

# ================================
# Notification Routes
# ================================

@api_router.get("/notifications")
async def get_notifications(db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    notifications = []
    
    # Check stock level
    result = await db.execute(select(LogKertas))
    stocks = result.scalars().all()
    
    total_masuk = sum(s.jumlah_lembar for s in stocks if s.jenis_pergerakan == "MASUK")
    total_keluar = sum(s.jumlah_lembar for s in stocks if s.jenis_pergerakan in ["TERPAKAI", "RUSAK", "PENYESUAIAN"])
    sisa_stok = total_masuk - total_keluar
    
    # Get settings
    result = await db.execute(select(NotificationSettings).limit(1))
    settings = result.scalar_one_or_none()
    
    stok_kritis = settings.stok_kritis_threshold if settings else 100
    stok_warning = settings.stok_warning_threshold if settings else 300
    
    if sisa_stok <= stok_kritis:
        notifications.append({
            "id": "stok_kritis",
            "type": "critical",
            "title": "Stok Kertas Kritis!",
            "message": f"Sisa stok hanya {sisa_stok} lembar. Segera lakukan restock!",
            "icon": "alert-triangle",
            "color": "red",
            "action": "/stok",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    elif sisa_stok <= stok_warning:
        notifications.append({
            "id": "stok_warning",
            "type": "warning",
            "title": "Stok Kertas Menipis",
            "message": f"Sisa stok tinggal {sisa_stok} lembar. Pertimbangkan untuk restock.",
            "icon": "alert-circle",
            "color": "yellow",
            "action": "/stok",
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    return {
        "notifications": notifications,
        "count": len(notifications),
        "has_critical": any(n.get("type") == "critical" for n in notifications)
    }

@api_router.post("/notifications/{notification_id}/dismiss")
async def dismiss_notification(notification_id: str, db: AsyncSession = Depends(get_db), user: dict = Depends(get_current_user)):
    db.add(DismissedNotification(user_id=user["id"], notification_id=notification_id))
    await db.commit()
    return {"message": "Notification dismissed"}

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
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
