import React, { useState, useEffect } from 'react';
import { kasAPI, dashboardAPI } from '@/services/api';
import { formatCurrency, formatApiErrorDetail, MONTHS } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Wallet } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const KasPage = () => {
  const [kasRecords, setKasRecords] = useState([]);
  const [rekap, setRekap] = useState([]);
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [form, setForm] = useState({
    keterangan: '',
    nominal: ''
  });

  const [settingForm, setSettingForm] = useState({
    tahun: currentYear,
    bulan: currentMonth,
    persentase: '3'
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kasRes, rekapRes, settingsRes] = await Promise.all([
        kasAPI.getAll(),
        dashboardAPI.getRekap(),
        kasAPI.getSetting()
      ]);
      setKasRecords(kasRes.data);
      setRekap(rekapRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      console.error('Error fetching kas data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPersenKas = (tahun, bulan) => {
    const sorted = [...settings].sort((a, b) => {
      if (a.tahun !== b.tahun) return a.tahun - b.tahun;
      return a.bulan - b.bulan;
    });
    
    let lastVal = 3;
    for (const s of sorted) {
      if (s.tahun < tahun || (s.tahun === tahun && s.bulan <= bulan)) {
        lastVal = s.persentase;
      }
    }
    return lastVal;
  };

  // Calculate kas balance with auto income from rekap
  const calculateKasHistory = () => {
    const history = [];
    
    // Add auto kas from completed months
    for (const r of rekap) {
      const isCompleted = r.tahun < currentYear || (r.tahun === currentYear && r.bulan < currentMonth);
      if (isCompleted && r.laba_bersih > 0) {
        const persen = getPersenKas(r.tahun, r.bulan);
        const nominal = r.laba_bersih * (persen / 100);
        const lastDay = new Date(r.tahun, r.bulan, 0).toISOString().split('T')[0];
        history.push({
          tanggal: lastDay,
          tipe: 'MASUK_AUTO',
          keterangan: `Potongan Kas Otomatis (${persen}%) - Laba ${MONTHS[r.bulan]} ${r.tahun}`,
          masuk: nominal,
          keluar: 0,
          id: null
        });
      }
    }
    
    // Add manual kas records
    for (const k of kasRecords) {
      history.push({
        tanggal: k.tanggal,
        tipe: k.tipe,
        keterangan: k.keterangan,
        masuk: k.tipe === 'MASUK' ? k.nominal : 0,
        keluar: k.tipe === 'KELUAR' ? k.nominal : 0,
        id: k.id,
        is_edited: k.is_edited,
        alasan_edit: k.alasan_edit,
        is_backdated: k.is_backdated,
        alasan_backdate: k.alasan_backdate
      });
    }
    
    // Sort and calculate running balance
    history.sort((a, b) => new Date(a.tanggal) - new Date(b.tanggal));
    
    let saldo = 0;
    for (const h of history) {
      saldo += h.masuk - h.keluar;
      h.saldo = saldo;
    }
    
    return history.reverse();
  };

  const kasHistory = calculateKasHistory();
  const totalSaldo = kasHistory.length > 0 ? kasHistory[0].saldo : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      await kasAPI.create({
        keterangan: form.keterangan,
        nominal: parseFloat(form.nominal)
      });
      toast({
        title: "Berhasil!",
        description: "Pengeluaran kas berhasil dicatat",
      });
      setForm({ keterangan: '', nominal: '' });
      fetchData();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSettingSubmit = async (e) => {
    e.preventDefault();
    try {
      await kasAPI.setSetting({
        tahun: parseInt(settingForm.tahun),
        bulan: parseInt(settingForm.bulan),
        persentase: parseFloat(settingForm.persentase)
      });
      toast({
        title: "Berhasil!",
        description: "Persentase kas berhasil disimpan",
      });
      fetchData();
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="kas-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-neutral-900">Kelola Kas</h1>
          <p className="text-neutral-500">Buku kas otomatis dan terencana</p>
        </div>
        <Card className="bg-emerald-500 text-white border-0">
          <CardContent className="p-4 text-center">
            <p className="text-sm opacity-90">Total Saldo Kas</p>
            <p className="text-2xl font-bold" data-testid="saldo-kas">{formatCurrency(totalSaldo)}</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setting Form */}
        <Card className="bg-white border-blue-200 shadow-sm">
          <CardHeader className="border-b border-blue-100 bg-blue-50">
            <CardTitle className="text-blue-700">Rencana Persentase Kas</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSettingSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Periode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={settingForm.bulan.toString()}
                    onValueChange={(value) => setSettingForm({ ...settingForm, bulan: value })}
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
                    value={settingForm.tahun}
                    onChange={(e) => setSettingForm({ ...settingForm, tahun: e.target.value })}
                    className="border-yellow-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Persentase Kas (%)</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={settingForm.persentase}
                  onChange={(e) => setSettingForm({ ...settingForm, persentase: e.target.value })}
                  className="border-yellow-200"
                  data-testid="input-persentase-kas"
                />
              </div>
              <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600 text-white">
                Simpan Persentase
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Withdrawal Form */}
        <Card className="bg-white border-rose-200 shadow-sm">
          <CardHeader className="border-b border-rose-100 bg-rose-50">
            <CardTitle className="text-rose-700 flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Tarik Saldo Kas
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Tanggal</Label>
                <Input 
                  value={new Date().toLocaleDateString('id-ID')} 
                  disabled 
                  className="bg-neutral-50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="keterangan-kas">Keterangan</Label>
                <Input
                  id="keterangan-kas"
                  value={form.keterangan}
                  onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                  placeholder="Penggunaan kas"
                  required
                  className="border-yellow-200"
                  data-testid="input-keterangan-kas"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nominal-kas">Nominal (Rp)</Label>
                <Input
                  id="nominal-kas"
                  type="number"
                  value={form.nominal}
                  onChange={(e) => setForm({ ...form, nominal: e.target.value })}
                  placeholder="0"
                  required
                  className="border-yellow-200"
                  data-testid="input-nominal-kas"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                disabled={submitting}
                data-testid="submit-kas"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Tarik Saldo Kas
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Kas History */}
        <Card className="bg-white border-yellow-200 shadow-sm lg:col-span-1">
          <CardHeader className="border-b border-yellow-100">
            <CardTitle>Riwayat Kas</CardTitle>
          </CardHeader>
          <CardContent className="p-0 max-h-[400px] overflow-y-auto">
            {kasHistory.length === 0 ? (
              <div className="text-center py-8 text-neutral-500">
                Belum ada riwayat kas
              </div>
            ) : (
              <div className="divide-y divide-yellow-100">
                {kasHistory.slice(0, 10).map((k, idx) => (
                  <div key={idx} className="p-4 hover:bg-yellow-50/50">
                    <div className="flex justify-between items-start">
                      <div>
                        <Badge className={k.tipe === 'MASUK_AUTO' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}>
                          {k.tipe === 'MASUK_AUTO' ? 'AUTO' : 'KELUAR'}
                        </Badge>
                        <p className="text-sm mt-1">{k.keterangan}</p>
                        <p className="text-xs text-neutral-500">{k.tanggal}</p>
                      </div>
                      <div className="text-right">
                        {k.masuk > 0 && (
                          <p className="text-emerald-600 font-semibold">+{formatCurrency(k.masuk)}</p>
                        )}
                        {k.keluar > 0 && (
                          <p className="text-rose-600 font-semibold">-{formatCurrency(k.keluar)}</p>
                        )}
                        <p className="text-xs text-blue-600">Saldo: {formatCurrency(k.saldo)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default KasPage;
