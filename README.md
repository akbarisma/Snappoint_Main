# Snappoint Traffa - Panduan Instalasi & Menjalankan di Local

## Prasyarat

Pastikan sistem Anda sudah terinstall:
- **Python 3.11+** - [Download Python](https://www.python.org/downloads/)
- **Node.js 18+** - [Download Node.js](https://nodejs.org/)
- **MySQL 8.0+** (Opsional) - [Download MySQL](https://dev.mysql.com/downloads/mysql/)
- **Git** - [Download Git](https://git-scm.com/)

## Struktur Folder

```
snappoint-traffa/
├── backend/              # FastAPI Python Backend
│   ├── server.py         # Main server file
│   ├── requirements.txt  # Python dependencies
│   ├── .env              # Environment variables
│   └── snappoint.db      # SQLite database (auto-generated)
├── frontend/             # React.js Frontend
│   ├── src/              # Source code
│   ├── package.json      # Node.js dependencies
│   └── .env              # Environment variables
└── README.md
```

## Langkah 1: Clone/Download Repository

```bash
# Jika menggunakan Git
git clone <repository-url>
cd snappoint-traffa

# Atau extract file zip yang sudah didownload
```

## Langkah 2: Setup Backend

### 2.1 Buat Virtual Environment
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Linux/Mac
source venv/bin/activate
```

### 2.2 Install Dependencies
```bash
pip install -r requirements.txt
```

### 2.3 Konfigurasi Environment Variables

Edit file `backend/.env`:

```env
# Untuk SQLite (Development - Recommended)
DATABASE_URL="sqlite+aiosqlite:///./snappoint.db"

# Untuk MySQL (Production)
# Uncomment baris di bawah dan comment DATABASE_URL di atas
# MYSQL_HOST="localhost"
# MYSQL_PORT="3306"
# MYSQL_USER="root"
# MYSQL_PASSWORD="your_password"
# MYSQL_DATABASE="snappoint_db"

# JWT Configuration
JWT_SECRET="ganti-dengan-secret-key-yang-aman-minimal-32-karakter"

# Admin Default
ADMIN_EMAIL="admin@snappoint.com"
ADMIN_PASSWORD="admin123"

# Frontend URL (untuk CORS)
FRONTEND_URL="http://localhost:3000"
```

### 2.4 Jalankan Backend Server
```bash
# Dari folder backend dengan virtual environment aktif
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Backend akan berjalan di: `http://localhost:8001`

API Documentation tersedia di: `http://localhost:8001/docs`

## Langkah 3: Setup Frontend

### 3.1 Install Dependencies
```bash
cd frontend
npm install
# atau
yarn install
```

### 3.2 Konfigurasi Environment Variables

Edit file `frontend/.env`:

```env
REACT_APP_BACKEND_URL=http://localhost:8001
```

### 3.3 Jalankan Frontend Server
```bash
npm start
# atau
yarn start
```

Frontend akan berjalan di: `http://localhost:3000`

## Langkah 4: Akses Aplikasi

1. Buka browser dan akses: `http://localhost:3000`
2. Login dengan kredensial default:
   - **Email**: admin@snappoint.com
   - **Password**: admin123

## Setup MySQL (Opsional)

Jika ingin menggunakan MySQL sebagai database:

### 1. Buat Database
```sql
CREATE DATABASE snappoint_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Update .env Backend
```env
# Hapus atau comment DATABASE_URL
# DATABASE_URL="sqlite+aiosqlite:///./snappoint.db"

# Uncomment dan sesuaikan konfigurasi MySQL
MYSQL_HOST="localhost"
MYSQL_PORT="3306"
MYSQL_USER="root"
MYSQL_PASSWORD="your_password"
MYSQL_DATABASE="snappoint_db"
```

### 3. Restart Backend
```bash
# Ctrl+C untuk stop server
uvicorn server:app --reload --host 0.0.0.0 --port 8001
```

Tabel akan dibuat otomatis saat server pertama kali dijalankan.

## Troubleshooting

### Error: ModuleNotFoundError
```bash
pip install -r requirements.txt
```

### Error: CORS (Cross-Origin Request Blocked)
Pastikan `FRONTEND_URL` di backend `.env` sesuai dengan URL frontend.

### Error: Database Connection
- SQLite: Pastikan folder backend writable
- MySQL: Pastikan service MySQL running dan kredensial benar

### Port Already in Use
```bash
# Backend (ganti port)
uvicorn server:app --reload --port 8002

# Frontend (ganti port)
PORT=3001 npm start
```

## Database Schema

### Tabel yang Akan Dibuat Otomatis:
- `users` - Akun pengguna
- `login_attempts` - Tracking brute force
- `kategori_transaksi` - Kategori transaksi
- `transaksi` - Data transaksi
- `log_kertas` - Log stok kertas
- `buku_kas` - Buku kas
- `setting_kas` - Setting persentase kas
- `pemegang_saham` - Data investor
- `ml_training_data` - Data training ML
- `prediction_history` - History prediksi
- `notification_settings` - Setting notifikasi
- `dismissed_notifications` - Notifikasi yang di-dismiss

## Fitur Utama

1. **Dashboard** - Ringkasan keuangan dan stok
2. **Input Transaksi** - Catat pemasukan dan pengeluaran
3. **Kelola Stok** - Manajemen stok kertas
4. **Detail Transaksi** - Laporan transaksi detail
5. **Kelola Kas** - Buku kas otomatis
6. **Kelola Investor** - Manajemen pemegang saham
7. **Prediksi ML** - Forecasting penjualan dengan history
8. **Kelola Akun** - Manajemen user (admin only)
9. **Notifikasi Otomatis** - Alert stok kritis

## Role & Akses

| Role | Dashboard | Transaksi | Stok | Kas | Investor | Prediksi | Akun |
|------|-----------|-----------|------|-----|----------|----------|------|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Owner | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - |
| Kasir | - | ✓ | ✓ | - | - | - | - |
| Investor | ✓ | - | ✓ (view) | - | - | ✓ | - |

## Support

Jika mengalami masalah, silakan buka issue di repository atau hubungi developer.
