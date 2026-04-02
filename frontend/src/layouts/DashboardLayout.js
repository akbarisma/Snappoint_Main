import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Sidebar from './Sidebar';

const DashboardLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mb-4 mx-auto"></div>
          <p className="text-neutral-600">Memuat...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Kasir redirected to transaksi page
  if (user.role === 'kasir' && window.location.pathname === '/') {
    return <Navigate to="/transaksi" replace />;
  }

  return (
    <div className="min-h-screen bg-yellow-50 flex">
      <Sidebar />
      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
