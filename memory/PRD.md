# Snappoint Traffa - PRD (Product Requirements Document)

## Original Problem Statement
User memiliki file snappoint_app-main (backend PHP) dan ML_main (Model Machine Learning LSTM) namun belum memiliki tampilan frontend. Diminta untuk membuat frontend React.js dengan struktur yang rapi dan merapikan file backend yang masih tercampur dengan file HTML dan CSS.

## User Choices
- Frontend: Dashboard admin responsif
- Tema: Modern minimalis dengan komposisi warna kuning 70%, putih 20%, hijau 5%, merah 5%
- Framework: React.js
- Autentikasi: JWT-based manual login/register
- Database: MongoDB (migrasi dari MySQL PHP)

## Architecture
```
/app/
├── backend/           # FastAPI Python backend
│   └── server.py      # Main API server (800+ lines)
├── frontend/          # React.js frontend
│   └── src/
│       ├── contexts/  # Auth context
│       ├── layouts/   # Dashboard layout, Sidebar
│       ├── pages/     # All page components
│       ├── services/  # API services
│       └── utils/     # Helper functions
├── ML_extracted/      # Original ML model files (reference)
└── snappoint_extracted/ # Original PHP files (reference)
```

## Core Requirements (Static)
1. ✅ JWT Authentication (login, register, logout, refresh token)
2. ✅ Role-based access control (admin, owner, kasir, investor)
3. ✅ Dashboard with financial summary
4. ✅ Transaction input (pemasukan/pengeluaran)
5. ✅ Stock management (kelola stok kertas)
6. ✅ Transaction detail/reports
7. ✅ Cash book management (kelola kas)
8. ✅ Investor management
9. ✅ ML prediction (LSTM-like forecasting)
10. ✅ User management (admin only)

## What's Been Implemented (January 2026)
- [x] FastAPI backend with all CRUD endpoints
- [x] MongoDB integration with proper indexes
- [x] JWT authentication with localStorage token storage
- [x] React.js frontend with yellow theme (70% yellow, 20% white, 5% green, 5% red)
- [x] All 8 pages: Dashboard, Transaksi, Stok, Laporan, Kas, Investor, Prediksi, Akun
- [x] ML prediction using historical transaction data
- [x] Sync ML training data from transactions
- [x] Responsive design with mobile sidebar toggle
- [x] Data-testid attributes for testing

## Database Collections (MongoDB)
- `users` - User accounts with roles
- `transaksi` - Financial transactions
- `log_kertas` - Paper stock movements
- `buku_kas` - Cash book entries
- `pemegang_saham` - Investor/shareholder data
- `kategori_transaksi` - Transaction categories
- `ml_training_data` - ML training data points
- `prediction_history` - Saved predictions
- `setting_kas` - Cash percentage settings
- `login_attempts` - Brute force protection

## Prioritized Backlog

### P0 (Critical) - DONE
- ✅ Fix authentication (cookie → localStorage + Authorization header)
- ✅ All CRUD operations working

### P1 (High Priority) - Future
- [ ] Export reports to PDF/Excel
- [ ] Print functionality for laporan
- [ ] Email notifications

### P2 (Medium Priority) - Future
- [ ] Dashboard charts with Recharts
- [ ] Dark mode toggle
- [ ] Multi-language support (ID/EN)

### P3 (Low Priority) - Future
- [ ] Integrate actual LSTM model from ML_main
- [ ] Real-time notifications
- [ ] Audit log for all changes

## Next Tasks
1. Add more sample data for better ML predictions
2. Implement export functionality
3. Add print view for reports
