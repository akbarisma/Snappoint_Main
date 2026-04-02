import React, { useState, useEffect } from 'react';
import { usersAPI } from '@/services/api';
import { formatApiErrorDetail, ROLES } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, UserCog, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const AkunPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'kasir'
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await usersAPI.getAll();
      setUsers(res.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await usersAPI.create(form);
      toast({
        title: "Berhasil!",
        description: "Akun baru berhasil dibuat",
      });
      setForm({ name: '', email: '', password: '', role: 'kasir' });
      fetchUsers();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Yakin ingin menghapus akun ini?')) return;
    
    try {
      await usersAPI.delete(userId);
      toast({
        title: "Berhasil!",
        description: "Akun berhasil dihapus",
      });
      fetchUsers();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-rose-500 text-white',
      owner: 'bg-emerald-500 text-white',
      investor: 'bg-blue-500 text-white',
      kasir: 'bg-neutral-500 text-white'
    };
    return colors[role] || 'bg-neutral-500 text-white';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="akun-page">
      <div>
        <h1 className="font-heading text-3xl font-bold text-neutral-900">Kelola Akun</h1>
        <p className="text-neutral-500">Manajemen pengguna sistem</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Form */}
        <Card className="bg-white border-neutral-200 shadow-sm">
          <CardHeader className="border-b border-neutral-100 bg-neutral-900">
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Tambah Akun Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nama Lengkap</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama lengkap"
                  required
                  className="border-yellow-200"
                  data-testid="input-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email (untuk login)</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@example.com"
                  required
                  className="border-yellow-200"
                  data-testid="input-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="Minimal 6 karakter"
                    required
                    minLength={6}
                    className="border-yellow-200 pr-10"
                    data-testid="input-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role / Peran</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) => setForm({ ...form, role: value })}
                >
                  <SelectTrigger className="border-yellow-200" data-testid="select-role">
                    <SelectValue placeholder="Pilih Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
                disabled={submitting}
                data-testid="submit-akun"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Membuat...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Buat Akun
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Users List */}
        <Card className="bg-white border-yellow-200 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-yellow-100">
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-5 h-5 text-yellow-500" />
              Daftar Pengguna
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="users-table">
                <thead>
                  <tr className="border-b border-yellow-200 bg-yellow-50">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Nama</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Email</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Role</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-neutral-500">
                        Belum ada data pengguna
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="border-b border-yellow-100 hover:bg-yellow-50/50">
                        <td className="py-3 px-4 font-semibold">{u.name}</td>
                        <td className="py-3 px-4 text-neutral-600">{u.email}</td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getRoleBadgeColor(u.role)}>
                            {u.role.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {u.id === currentUser?.id ? (
                            <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300">
                              Anda (Aktif)
                            </Badge>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDelete(u.id)}
                              data-testid={`delete-user-${u.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AkunPage;
