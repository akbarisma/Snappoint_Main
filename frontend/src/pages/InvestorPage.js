import React, { useState, useEffect } from 'react';
import { investorAPI } from '@/services/api';
import { formatApiErrorDetail, MONTHS } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Plus, Users, Edit, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const InvestorPage = () => {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [editDialog, setEditDialog] = useState({ open: false, investor: null });
  const [closeDialog, setCloseDialog] = useState({ open: false, investor: null });
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [form, setForm] = useState({
    nama_investor: '',
    persentase: '',
    mulai_bulan: currentMonth,
    mulai_tahun: currentYear
  });

  useEffect(() => {
    fetchInvestors();
  }, []);

  const fetchInvestors = async () => {
    try {
      const res = await investorAPI.getAll();
      setInvestors(res.data);
    } catch (error) {
      console.error('Error fetching investors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await investorAPI.create({
        ...form,
        persentase: parseFloat(form.persentase),
        mulai_bulan: parseInt(form.mulai_bulan),
        mulai_tahun: parseInt(form.mulai_tahun)
      });
      toast({
        title: "Berhasil!",
        description: "Investor baru berhasil ditambahkan",
      });
      setForm({
        nama_investor: '',
        persentase: '',
        mulai_bulan: currentMonth,
        mulai_tahun: currentYear
      });
      fetchInvestors();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseBook = async (investorId) => {
    try {
      await investorAPI.update(investorId, {
        akhir_bulan: currentMonth,
        akhir_tahun: currentYear
      });
      toast({
        title: "Berhasil!",
        description: "Investor berhasil dinonaktifkan",
      });
      setCloseDialog({ open: false, investor: null });
      fetchInvestors();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const handleDelete = async (investorId) => {
    if (!window.confirm('Yakin ingin menghapus investor ini secara permanen?')) return;
    
    try {
      await investorAPI.delete(investorId);
      toast({
        title: "Berhasil!",
        description: "Investor berhasil dihapus",
      });
      fetchInvestors();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  const activeInvestors = investors.filter(inv => !inv.akhir_tahun);
  const inactiveInvestors = investors.filter(inv => inv.akhir_tahun);
  const totalSaham = activeInvestors.reduce((sum, inv) => sum + inv.persentase, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="investor-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-neutral-900">Kelola Investor</h1>
          <p className="text-neutral-500">Data pemegang saham dan pembagian laba</p>
        </div>
        <Badge className={`text-lg px-4 py-2 ${totalSaham === 100 ? 'bg-emerald-500' : totalSaham < 100 ? 'bg-yellow-500 text-neutral-900' : 'bg-rose-500'}`}>
          Total: {totalSaham}%
        </Badge>
      </div>

      {totalSaham !== 100 && (
        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600" />
          <div>
            <p className="font-semibold text-yellow-800">Persentase Tidak Seimbang!</p>
            <p className="text-sm text-yellow-700">Total saham aktif saat ini {totalSaham}%. Pastikan pas 100% untuk pembagian yang adil.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Form */}
        <Card className="bg-white border-blue-200 shadow-sm">
          <CardHeader className="border-b border-blue-100 bg-blue-50">
            <CardTitle className="text-blue-700 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Tambah Investor Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nama">Nama Investor</Label>
                <Input
                  id="nama"
                  value={form.nama_investor}
                  onChange={(e) => setForm({ ...form, nama_investor: e.target.value })}
                  placeholder="Nama investor"
                  required
                  className="border-yellow-200"
                  data-testid="input-nama-investor"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="persentase">Persentase Saham (%)</Label>
                <Input
                  id="persentase"
                  type="number"
                  step="0.01"
                  value={form.persentase}
                  onChange={(e) => setForm({ ...form, persentase: e.target.value })}
                  placeholder="10"
                  required
                  className="border-yellow-200"
                  data-testid="input-persentase-investor"
                />
              </div>
              <div className="space-y-2">
                <Label>Mulai Aktif</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={form.mulai_bulan.toString()}
                    onValueChange={(value) => setForm({ ...form, mulai_bulan: value })}
                  >
                    <SelectTrigger className="border-yellow-200">
                      <SelectValue placeholder="Bulan" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.slice(1).map((m, idx) => (
                        <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    value={form.mulai_tahun}
                    onChange={(e) => setForm({ ...form, mulai_tahun: e.target.value })}
                    className="border-yellow-200"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                disabled={submitting}
                data-testid="submit-investor"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Simpan Investor
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Investors List */}
        <Card className="bg-white border-yellow-200 shadow-sm lg:col-span-2">
          <CardHeader className="border-b border-yellow-100">
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-yellow-500" />
              Daftar Pemegang Saham
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="investor-table">
                <thead>
                  <tr className="border-b border-yellow-200 bg-yellow-50">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Nama</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Porsi</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Masa Aktif</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Status</th>
                    <th className="text-center py-3 px-4 font-semibold text-neutral-700">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {investors.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-neutral-500">
                        Belum ada data investor
                      </td>
                    </tr>
                  ) : (
                    investors.map((inv) => {
                      const isActive = !inv.akhir_tahun;
                      return (
                        <tr key={inv.id} className={`border-b border-yellow-100 ${!isActive ? 'opacity-60' : ''}`}>
                          <td className={`py-3 px-4 font-semibold ${!isActive ? 'line-through' : ''}`}>
                            {inv.nama_investor}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={isActive ? 'bg-emerald-500 text-white' : 'bg-neutral-400 text-white'}>
                              {inv.persentase}%
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center text-sm">
                            <p>{MONTHS[inv.mulai_bulan]} {inv.mulai_tahun}</p>
                            <p className="text-neutral-500">s/d</p>
                            <p>{isActive ? 'Sekarang' : `${MONTHS[inv.akhir_bulan]} ${inv.akhir_tahun}`}</p>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <Badge className={isActive ? 'bg-blue-500 text-white' : 'bg-rose-500 text-white'}>
                              {isActive ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-center space-x-1">
                            {isActive && (
                              <Dialog open={closeDialog.open && closeDialog.investor?.id === inv.id} onOpenChange={(open) => setCloseDialog({ open, investor: open ? inv : null })}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="border-yellow-400 text-yellow-700 hover:bg-yellow-50">
                                    Tutup
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Tutup Buku Investor</DialogTitle>
                                  </DialogHeader>
                                  <p className="text-neutral-600">
                                    Investor <strong>{inv.nama_investor}</strong> akan dinonaktifkan. 
                                    Histori di bulan lalu tetap aman.
                                  </p>
                                  <div className="flex gap-2 mt-4">
                                    <Button 
                                      className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-neutral-900"
                                      onClick={() => handleCloseBook(inv.id)}
                                    >
                                      Tutup Buku
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      className="flex-1"
                                      onClick={() => setCloseDialog({ open: false, investor: null })}
                                    >
                                      Batal
                                    </Button>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDelete(inv.id)}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
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

export default InvestorPage;
