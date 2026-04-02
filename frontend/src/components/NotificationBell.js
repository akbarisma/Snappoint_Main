import React, { useState, useEffect, useRef } from 'react';
import { notificationsAPI } from '@/services/api';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, AlertCircle, TrendingUp, Wallet, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const iconMap = {
  'alert-triangle': AlertTriangle,
  'alert-circle': AlertCircle,
  'trending-up': TrendingUp,
  'wallet': Wallet,
};

const colorMap = {
  red: 'bg-rose-500 text-white',
  yellow: 'bg-yellow-500 text-neutral-900',
  green: 'bg-emerald-500 text-white',
  blue: 'bg-blue-500 text-white',
};

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [hasCritical, setHasCritical] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
    // Refresh every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await notificationsAPI.getAll();
      setNotifications(res.data.notifications || []);
      setHasCritical(res.data.has_critical || false);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = async (id, e) => {
    e.stopPropagation();
    try {
      await notificationsAPI.dismiss(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    if (notification.action) {
      navigate(notification.action);
      setIsOpen(false);
    }
  };

  const count = notifications.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-lg transition-colors ${
          hasCritical 
            ? 'bg-rose-100 text-rose-600 hover:bg-rose-200' 
            : count > 0 
              ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
        }`}
        data-testid="notification-bell"
      >
        <Bell size={20} className={hasCritical ? 'animate-pulse' : ''} />
        {count > 0 && (
          <span className={`absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center text-xs font-bold rounded-full ${
            hasCritical ? 'bg-rose-500 text-white' : 'bg-yellow-500 text-neutral-900'
          }`}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-yellow-200 z-50 overflow-hidden">
          <div className="p-3 border-b border-yellow-100 bg-yellow-50">
            <h3 className="font-semibold text-neutral-900">Notifikasi</h3>
            <p className="text-xs text-neutral-500">{count} notifikasi aktif</p>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-neutral-500">
                <div className="spinner mx-auto"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-neutral-500">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Tidak ada notifikasi</p>
              </div>
            ) : (
              notifications.map((notif) => {
                const IconComponent = iconMap[notif.icon] || Bell;
                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3 border-b border-yellow-50 hover:bg-yellow-50 cursor-pointer transition-colors ${
                      notif.type === 'critical' ? 'bg-rose-50' : ''
                    }`}
                    data-testid={`notification-${notif.id}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${colorMap[notif.color] || 'bg-neutral-500 text-white'}`}>
                        <IconComponent size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-neutral-900">{notif.title}</p>
                        <p className="text-xs text-neutral-600 mt-0.5">{notif.message}</p>
                      </div>
                      <button
                        onClick={(e) => handleDismiss(notif.id, e)}
                        className="p-1 text-neutral-400 hover:text-neutral-600 rounded"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {notifications.length > 0 && (
            <div className="p-2 border-t border-yellow-100 bg-yellow-50">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-yellow-700 hover:bg-yellow-100"
                onClick={() => {
                  notifications.forEach(n => handleDismiss(n.id, { stopPropagation: () => {} }));
                }}
              >
                Hapus Semua
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
