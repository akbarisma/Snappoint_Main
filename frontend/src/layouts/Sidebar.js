import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  Receipt, 
  Package, 
  BookOpen, 
  Users, 
  TrendingUp,
  UserCog,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const role = user?.role;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: ['admin', 'owner', 'investor'] },
    { to: '/transaksi', icon: Receipt, label: 'Input Transaksi', roles: ['admin', 'owner', 'kasir'] },
    { to: '/stok', icon: Package, label: 'Kelola Stok', roles: ['admin', 'owner', 'kasir', 'investor'] },
    { to: '/laporan', icon: BookOpen, label: 'Detail Transaksi', roles: ['admin', 'owner', 'kasir'] },
    { to: '/kas', icon: BookOpen, label: 'Kelola Kas', roles: ['admin', 'owner'] },
    { to: '/investor', icon: Users, label: 'Kelola Investor', roles: ['admin', 'owner'] },
    { to: '/prediksi', icon: TrendingUp, label: 'Prediksi ML', roles: ['admin', 'owner', 'investor'] },
    { to: '/akun', icon: UserCog, label: 'Kelola Akun', roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => item.roles.includes(role));

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-yellow-400 rounded-md shadow-md"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="sidebar-toggle"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-yellow-400 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo/Brand */}
        <div className="p-6 border-b border-yellow-500">
          <h1 className="font-heading text-2xl font-bold text-neutral-900">
            Snappoint
          </h1>
          <p className="text-sm text-neutral-700">Traffa Kudus</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsOpen(false)}
              className={({ isActive }) =>
                `sidebar-link flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-neutral-900 text-yellow-400'
                    : 'text-neutral-900 hover:bg-yellow-500'
                }`
              }
              data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s/g, '-')}`}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-yellow-500">
          <div className="mb-3 px-4">
            <p className="font-semibold text-neutral-900">{user?.name}</p>
            <span className="inline-block px-2 py-0.5 text-xs font-semibold uppercase bg-neutral-900 text-yellow-400 rounded">
              {role}
            </span>
          </div>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full justify-start gap-3 text-neutral-900 hover:bg-yellow-500"
            data-testid="logout-button"
          >
            <LogOut size={20} />
            <span>Logout</span>
          </Button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
