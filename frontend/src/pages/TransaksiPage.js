import React, { useState, useEffect } from 'react';
import { transaksiAPI } from '@/services/api';
import { formatCurrency, formatApiErrorDetail } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Plus, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const TransaksiPage = () => {
  const [kategoris, setKategoris] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const [formPemasukan, setFormPemasukan] = useState({
    nominal: '',
    keterangan: 'Gross Income'
  });

  const [formPengeluaran, setFormPengeluaran] = useState({
    kategori: '',
    nominal: '',
    keterangan: ''
  });

  useEffect(() => {
    fetchKategoris();
  }, []);

  const fetchKategoris = async () => {
    try {
      const res = await transaksiAPI.getKategori();
      setKategoris(res.data.filter(k => k.jenis === 'PENGELUARAN'));
    } catch (error) {
      console.error('Error fetching kategoris:', error);
    }
  };

  const handlePemasukanSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await transaksiAPI.create({
        tanggal: new Date().toISOString().split('T')[0],
        kategori: 'Pendapatan (Gross Income)',
        jenis: 'PEMASUKAN',
        keterangan: formPemasukan.keterangan,
        nominal: parseFloat(formPemasukan.nominal)
      });
      toast({
        title: "Berhasil!",
        description: "Transaksi pemasukan berhasil disimpan",
      });
      setFormPemasukan({ nominal: '', keterangan: 'Gross Income' });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const handlePengeluaranSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await transaksiAPI.create({
        tanggal: new Date().toISOString().split('T')[0],
        kategori: formPengeluaran.kategori,
        jenis: 'PENGELUARAN',
        keterangan: formPengeluaran.keterangan,
        nominal: parseFloat(formPengeluaran.nominal)
      });
      toast({
        title: "Berhasil!",
        description: "Transaksi pengeluaran berhasil disimpan",
      });
      setFormPengeluaran({ kategori: '', nominal: '', keterangan: '' });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });

  return (
    <div className="space-y-8" data-testid="transaksi-page">
      <div>
        <h1 className="font-heading text-3xl font-bold text-neutral-900">Input Transaksi</h1>
        <p className="text-neutral-500">Catat pemasukan dan pengeluaran harian</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
          {error}
        </div>
      )}

      <Tabs defaultValue="pemasukan" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-yellow-100">
          <TabsTrigger 
            value="pemasukan" 
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-white"
            data-testid="tab-pemasukan"
          >
            <TrendingUp className="w-4 h-4 mr-2" />
            Pemasukan
          </TabsTrigger>
          <TabsTrigger 
            value="pengeluaran" 
            className="data-[state=active]:bg-rose-500 data-[state=active]:text-white"
            data-testid="tab-pengeluaran"
          >
            <TrendingDown className="w-4 h-4 mr-2" />
            Pengeluaran
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pemasukan">
          <Card className="bg-white border-emerald-200 shadow-sm">
            <CardHeader className="border-b border-emerald-100 bg-emerald-50">
              <CardTitle className="text-emerald-700 flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Catat Pemasukan Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handlePemasukanSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input 
                    value={today} 
                    disabled 
                    className="bg-neutral-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keterangan-pemasukan">Keterangan</Label>
                  <Input
                    id="keterangan-pemasukan"
                    value={formPemasukan.keterangan}
                    onChange={(e) => setFormPemasukan({ ...formPemasukan, keterangan: e.target.value })}
                    placeholder="Gross Income"
                    className="border-yellow-200"
                    data-testid="input-keterangan-pemasukan"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nominal-pemasukan">Nominal (Rp)</Label>
                  <Input
                    id="nominal-pemasukan"
                    type="number"
                    value={formPemasukan.nominal}
                    onChange={(e) => setFormPemasukan({ ...formPemasukan, nominal: e.target.value })}
                    placeholder="0"
                    required
                    className="border-yellow-200 text-lg font-semibold"
                    data-testid="input-nominal-pemasukan"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white"
                  disabled={loading}
                  data-testid="submit-pemasukan"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Simpan Pemasukan
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pengeluaran">
          <Card className="bg-white border-rose-200 shadow-sm">
            <CardHeader className="border-b border-rose-100 bg-rose-50">
              <CardTitle className="text-rose-700 flex items-center gap-2">
                <TrendingDown className="w-5 h-5" />
                Catat Pengeluaran Hari Ini
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <form onSubmit={handlePengeluaranSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Tanggal</Label>
                  <Input 
                    value={today} 
                    disabled 
                    className="bg-neutral-50"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="kategori">Kategori</Label>
                  <Select
                    value={formPengeluaran.kategori}
                    onValueChange={(value) => setFormPengeluaran({ ...formPengeluaran, kategori: value })}
                  >
                    <SelectTrigger className="border-yellow-200" data-testid="select-kategori">
                      <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {kategoris.map((kat) => (
                        <SelectItem key={kat.id} value={kat.nama_kategori}>
                          {kat.nama_kategori}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="keterangan-pengeluaran">Keterangan Detail</Label>
                  <Input
                    id="keterangan-pengeluaran"
                    value={formPengeluaran.keterangan}
                    onChange={(e) => setFormPengeluaran({ ...formPengeluaran, keterangan: e.target.value })}
                    placeholder="Keterangan detail pengeluaran"
                    required
                    className="border-yellow-200"
                    data-testid="input-keterangan-pengeluaran"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nominal-pengeluaran">Nominal (Rp)</Label>
                  <Input
                    id="nominal-pengeluaran"
                    type="number"
                    value={formPengeluaran.nominal}
                    onChange={(e) => setFormPengeluaran({ ...formPengeluaran, nominal: e.target.value })}
                    placeholder="0"
                    required
                    className="border-yellow-200 text-lg font-semibold"
                    data-testid="input-nominal-pengeluaran"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full bg-rose-500 hover:bg-rose-600 text-white"
                  disabled={loading}
                  data-testid="submit-pengeluaran"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Simpan Pengeluaran
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TransaksiPage;
