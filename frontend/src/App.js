import "@/index.css";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

// Layouts
import DashboardLayout from "@/layouts/DashboardLayout";

// Pages
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import TransaksiPage from "@/pages/TransaksiPage";
import StokPage from "@/pages/StokPage";
import LaporanPage from "@/pages/LaporanPage";
import KasPage from "@/pages/KasPage";
import InvestorPage from "@/pages/InvestorPage";
import PrediksiPage from "@/pages/PrediksiPage";
import AkunPage from "@/pages/AkunPage";

// Protected Route wrapper
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Public Route (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <div className="spinner"></div>
      </div>
    );
  }

  if (user) {
    if (user.role === 'kasir') {
      return <Navigate to="/transaksi" replace />;
    }
    return <Navigate to="/" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Protected Routes with Dashboard Layout */}
      <Route element={<DashboardLayout />}>
        <Route path="/" element={
          <ProtectedRoute allowedRoles={['admin', 'owner', 'investor']}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/transaksi" element={
          <ProtectedRoute allowedRoles={['admin', 'owner', 'kasir']}>
            <TransaksiPage />
          </ProtectedRoute>
        } />
        <Route path="/stok" element={
          <ProtectedRoute allowedRoles={['admin', 'owner', 'kasir', 'investor']}>
            <StokPage />
          </ProtectedRoute>
        } />
        <Route path="/laporan" element={
          <ProtectedRoute allowedRoles={['admin', 'owner', 'kasir']}>
            <LaporanPage />
          </ProtectedRoute>
        } />
        <Route path="/kas" element={
          <ProtectedRoute allowedRoles={['admin', 'owner']}>
            <KasPage />
          </ProtectedRoute>
        } />
        <Route path="/investor" element={
          <ProtectedRoute allowedRoles={['admin', 'owner']}>
            <InvestorPage />
          </ProtectedRoute>
        } />
        <Route path="/prediksi" element={
          <ProtectedRoute allowedRoles={['admin', 'owner', 'investor']}>
            <PrediksiPage />
          </ProtectedRoute>
        } />
        <Route path="/akun" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AkunPage />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
          <Toaster />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
