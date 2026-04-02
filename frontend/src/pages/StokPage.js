import React, { useState, useEffect } from 'react';
import { stokAPI } from '@/services/api';
import { formatApiErrorDetail, JENIS_PERGERAKAN } from '@/utils/helpers';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Package, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const StokPage = () => {
  const [stocks, setStocks] = useState([]);
  const [sisaStok, setSisaStok] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    jenis_pergerakan: 'TERPAKAI',
    jumlah_lembar: '',
    keterangan: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [stocksRes, sisaRes] = await Promise.all([
        stokAPI.getAll(),
        stokAPI.getSisa()
      ]);
      setStocks(stocksRes.data);
      setSisaStok(sisaRes.data.sisa_stok);
    } catch (error) {
      console.error('Error fetching stock data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await stokAPI.create({
        ...form,
        jumlah_lembar: parseInt(form.jumlah_lembar)
      });
      toast({
        title: "Berhasil!",
        description: "Pergerakan stok berhasil dicatat",
      });
      setForm({ jenis_pergerakan: 'TERPAKAI', jumlah_lembar: '', keterangan: '' });
      fetchData();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  const getJenisBadge = (jenis) => {
    const colors = {
      'MASUK': 'bg-emerald-500 text-white',
      'TERPAKAI': 'bg-blue-500 text-white',
      'RUSAK': 'bg-rose-500 text-white',
      'PENYESUAIAN': 'bg-yellow-500 text-neutral-900'
    };
    return colors[jenis] || 'bg-neutral-500 text-white';
  };

  const canInput = ['admin', 'owner', 'kasir'].includes(user?.role);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="stok-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-neutral-900">Kelola Stok Kertas</h1>
          <p className="text-neutral-500">Catat dan pantau pergerakan stok kertas</p>
        </div>
        <Card className={`${sisaStok <= 100 ? 'bg-rose-500' : sisaStok <= 200 ? 'bg-yellow-500' : 'bg-emerald-500'} text-white border-0`}>
          <CardContent className="p-4 text-center">
            <p className="text-sm opacity-90">Sisa Stok</p>
            <p className="text-2xl font-bold" data-testid="sisa-stok-display">{sisaStok.toLocaleString('id-ID')} lbr</p>
          </CardContent>
        </Card>
      </div>

      {sisaStok <= 100 && (
        <div className="p-4 bg-rose-50 border-2 border-rose-200 rounded-xl flex items-center gap-3" data-testid="stok-warning">
          <AlertTriangle className="w-6 h-6 text-rose-500" />
          <div>
            <p className="font-semibold text-rose-700">Peringatan Stok Kritis!</p>
            <p className="text-sm text-rose-600">Sisa kertas hanya {sisaStok} lembar. Segera restock!</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        {canInput && (
          <Card className="bg-white border-yellow-200 shadow-sm">
            <CardHeader className="border-b border-yellow-100">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-yellow-500" />
                Catat Pergerakan
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="jenis">Jenis Pergerakan</Label>
                  <Select
                    value={form.jenis_pergerakan}
                    onValueChange={(value) => setForm({ ...form, jenis_pergerakan: value })}
                  >
                    <SelectTrigger className="border-yellow-200" data-testid="select-jenis-pergerakan">
                      <SelectValue placeholder="Pilih Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      {JENIS_PERGERAKAN.map((j) => (
                        <SelectItem key={j.value} value={j.value}>
                          {j.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jumlah">Jumlah (Lembar)</Label>
                  <Input
                    id="jumlah"
                    type="number"
                    value={form.jumlah_lembar}
                    onChange={(e) => setForm({ ...form, jumlah_lembar: e.target.value })}
                    placeholder="Contoh: 120"
                    required
                    className="border-yellow-200"
                    data-testid="input-jumlah-lembar"
                  />
                  <p className="text-xs text-neutral-500">1 Roll ≈ 700 lembar</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keterangan">Keterangan</Label>
                  <Input
                    id="keterangan"
                    value={form.keterangan}
                    onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                    placeholder="Keterangan detail"
                    required
                    className="border-yellow-200"
                    data-testid="input-keterangan-stok"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-neutral-900 hover:bg-neutral-800 text-white"
                  disabled={submitting}
                  data-testid="submit-stok"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Simpan Log Kertas
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Stock History Table */}
        <Card className={`bg-white border-yellow-200 shadow-sm ${canInput ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
          <CardHeader className="border-b border-yellow-100">
            <CardTitle>Riwayat Log Kertas</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="stok-table">
                <thead>
                  <tr className="border-b border-yellow-200 bg-yellow-50">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Waktu</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Jenis</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Keterangan</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-8 text-neutral-500">
                        Belum ada riwayat pergerakan stok
                      </td>
                    </tr>
                  ) : (
                    stocks.map((s) => (
                      <tr key={s.id} className="border-b border-yellow-100 hover:bg-yellow-50/50">
                        <td className="py-3 px-4">
                          <p className="font-medium">{s.tanggal}</p>
                          <p className="text-xs text-neutral-500">
                            {s.waktu_input ? new Date(s.waktu_input).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Badge className={getJenisBadge(s.jenis_pergerakan)}>
                            {s.jenis_pergerakan}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <p>{s.keterangan}</p>
                          {s.is_edited && (
                            <p className="text-xs text-yellow-600 mt-1">
                              Diedit: {s.alasan_edit}
                            </p>
                          )}
                        </td>
                        <td className={`py-3 px-4 text-right text-lg font-bold ${s.jenis_pergerakan === 'MASUK' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {s.jenis_pergerakan === 'MASUK' ? '+' : '-'}{s.jumlah_lembar.toLocaleString('id-ID')}
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

export default StokPage;
