import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { formatApiErrorDetail } from '@/utils/helpers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user.role === 'kasir') {
        navigate('/transaksi');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image */}
      <div 
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/6423063/pexels-photo-6423063.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940)'
        }}
      >
        <div className="w-full h-full bg-yellow-400/20 flex items-end p-12">
          <div>
            <h1 className="font-heading text-4xl font-bold text-neutral-900 mb-2">
              Snappoint Traffa
            </h1>
            <p className="text-neutral-800 text-lg">Sistem Manajemen Keuangan Modern</p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <Card className="w-full max-w-md border-yellow-200">
          <CardHeader className="space-y-1">
            <div className="lg:hidden mb-4">
              <h1 className="font-heading text-2xl font-bold text-neutral-900">Snappoint Traffa</h1>
            </div>
            <CardTitle className="text-2xl font-heading">Login</CardTitle>
            <CardDescription>
              Masuk ke akun Anda untuk melanjutkan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-600 text-sm" data-testid="login-error">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400"
                  data-testid="login-email-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-yellow-200 focus:border-yellow-400 focus:ring-yellow-400 pr-10"
                    data-testid="login-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-neutral-900 font-semibold"
                disabled={loading}
                data-testid="login-submit-button"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  'Login'
                )}
              </Button>

              <p className="text-center text-sm text-neutral-600">
                Belum punya akun?{' '}
                <Link to="/register" className="text-yellow-600 hover:underline font-medium">
                  Daftar di sini
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
