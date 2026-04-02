import React, { useState, useEffect } from 'react';
import { dashboardAPI, stokAPI, investorAPI } from '@/services/api';
import { formatCurrency, MONTHS } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Package, Users, Wallet, BarChart3 } from 'lucide-react';

const DashboardPage = () => {
  const [rekap, setRekap] = useState([]);
  const [sisaStok, setSisaStok] = useState(0);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [rekapRes, stokRes, investorRes] = await Promise.all([
        dashboardAPI.getRekap(),
        stokAPI.getSisa(),
        investorAPI.getAll()
      ]);
      setRekap(rekapRes.data);
      setSisaStok(stokRes.data.sisa_stok);
      setInvestors(investorRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const currentMonth = rekap[0] || { pemasukan: 0, pengeluaran: 0, laba_bersih: 0 };
  const totalPemasukan = rekap.reduce((sum, r) => sum + r.pemasukan, 0);
  const totalPengeluaran = rekap.reduce((sum, r) => sum + r.pengeluaran, 0);
  const totalLaba = rekap.reduce((sum, r) => sum + r.laba_bersih, 0);
  const activeInvestors = investors.filter(inv => !inv.akhir_tahun);
  const totalSaham = activeInvestors.reduce((sum, inv) => sum + inv.persentase, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-page">
      <div>
        <h1 className="font-heading text-3xl font-bold text-neutral-900">Dashboard</h1>
        <p className="text-neutral-500">Ringkasan keuangan bisnis Anda</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white border-yellow-200 shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Pemasukan</CardTitle>
            <TrendingUp className="w-5 h-5 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600" data-testid="total-pemasukan">
              {formatCurrency(totalPemasukan)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Bulan ini: {formatCurrency(currentMonth.pemasukan)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-yellow-200 shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Total Pengeluaran</CardTitle>
            <TrendingDown className="w-5 h-5 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600" data-testid="total-pengeluaran">
              {formatCurrency(totalPengeluaran)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Bulan ini: {formatCurrency(currentMonth.pengeluaran)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-yellow-200 shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Laba Bersih</CardTitle>
            <Wallet className="w-5 h-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalLaba >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} data-testid="total-laba">
              {formatCurrency(totalLaba)}
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              Bulan ini: {formatCurrency(currentMonth.laba_bersih)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-yellow-200 shadow-sm card-hover">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">Sisa Stok Kertas</CardTitle>
            <Package className="w-5 h-5 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${sisaStok <= 100 ? 'text-rose-600' : 'text-neutral-900'}`} data-testid="sisa-stok">
              {sisaStok.toLocaleString('id-ID')} lbr
            </div>
            <p className="text-xs text-neutral-500 mt-1">
              {sisaStok <= 100 ? 'Stok kritis!' : 'Stok aman'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rekap Bulanan Table */}
      <Card className="bg-white border-yellow-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-xl">Rekapitulasi Bulanan</CardTitle>
            <p className="text-sm text-neutral-500">Data keuangan per bulan</p>
          </div>
          <BarChart3 className="w-6 h-6 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="rekap-table">
              <thead>
                <tr className="border-b border-yellow-200">
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Periode</th>
                  <th className="text-right py-3 px-4 font-semibold text-neutral-700">Pemasukan</th>
                  <th className="text-right py-3 px-4 font-semibold text-neutral-700">Pengeluaran</th>
                  <th className="text-right py-3 px-4 font-semibold text-neutral-700">Laba Bersih</th>
                </tr>
              </thead>
              <tbody>
                {rekap.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-neutral-500">
                      Belum ada data transaksi
                    </td>
                  </tr>
                ) : (
                  rekap.map((r, idx) => (
                    <tr key={idx} className="border-b border-yellow-100 hover:bg-yellow-50/50">
                      <td className="py-3 px-4 font-medium">
                        {MONTHS[r.bulan]} {r.tahun}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600">
                        {formatCurrency(r.pemasukan)}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600">
                        {formatCurrency(r.pengeluaran)}
                      </td>
                      <td className={`py-3 px-4 text-right font-semibold ${r.laba_bersih >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatCurrency(r.laba_bersih)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Investors Summary */}
      <Card className="bg-white border-yellow-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-xl">Pemegang Saham</CardTitle>
            <p className="text-sm text-neutral-500">Total saham aktif: {totalSaham}%</p>
          </div>
          <Users className="w-6 h-6 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {activeInvestors.map((inv) => (
              <div key={inv.id} className="p-4 bg-yellow-50 rounded-xl text-center">
                <p className="font-semibold text-neutral-900">{inv.nama_investor}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-yellow-400 text-neutral-900 text-sm font-bold rounded">
                  {inv.persentase}%
                </span>
              </div>
            ))}
            {activeInvestors.length === 0 && (
              <div className="col-span-full text-center py-4 text-neutral-500">
                Belum ada data investor
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardPage;
