import React, { useState, useEffect } from 'react';
import { transaksiAPI } from '@/services/api';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, TrendingUp, TrendingDown } from 'lucide-react';

const LaporanPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const res = await transaksiAPI.getAll();
      setTransactions(res.data);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate running balance
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(a.tanggal) - new Date(b.tanggal)
  );
  
  let runningBalance = 0;
  const transactionsWithBalance = sortedTransactions.map(t => {
    if (t.jenis === 'PEMASUKAN') {
      runningBalance += t.nominal;
    } else {
      runningBalance -= t.nominal;
    }
    return { ...t, saldo: runningBalance };
  });

  // Reverse for display (newest first)
  const displayTransactions = transactionsWithBalance.reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="laporan-page">
      <div>
        <h1 className="font-heading text-3xl font-bold text-neutral-900">Detail Transaksi</h1>
        <p className="text-neutral-500">Semua record transaksi keuangan</p>
      </div>

      <Card className="bg-white border-yellow-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between border-b border-yellow-100">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-yellow-500" />
            Buku Kas Detail
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full" data-testid="laporan-table">
              <thead>
                <tr className="border-b border-yellow-200 bg-yellow-50">
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Tanggal</th>
                  <th className="text-center py-3 px-4 font-semibold text-neutral-700">Kategori</th>
                  <th className="text-left py-3 px-4 font-semibold text-neutral-700">Keterangan</th>
                  <th className="text-right py-3 px-4 font-semibold text-neutral-700">Masuk</th>
                  <th className="text-right py-3 px-4 font-semibold text-neutral-700">Keluar</th>
                  <th className="text-right py-3 px-4 font-semibold text-neutral-700">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {displayTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-neutral-500">
                      Belum ada data transaksi
                    </td>
                  </tr>
                ) : (
                  displayTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-yellow-100 hover:bg-yellow-50/50">
                      <td className="py-3 px-4">
                        <p className="font-medium">{formatDate(t.tanggal)}</p>
                        <p className="text-xs text-neutral-500">
                          {t.waktu_input ? new Date(t.waktu_input).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge className={t.jenis === 'PEMASUKAN' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}>
                          {t.kategori}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <p>{t.keterangan}</p>
                        {t.is_edited && (
                          <p className="text-xs text-rose-600 mt-1 flex items-center gap-1">
                            Diedit: {t.alasan_edit}
                          </p>
                        )}
                        {t.is_backdated && (
                          <p className="text-xs text-blue-600 mt-1">
                            Susulan: {t.alasan_backdate}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {t.jenis === 'PEMASUKAN' ? (
                          <span className="text-emerald-600 font-semibold flex items-center justify-end gap-1">
                            <TrendingUp className="w-4 h-4" />
                            {formatCurrency(t.nominal)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {t.jenis === 'PENGELUARAN' ? (
                          <span className="text-rose-600 font-semibold flex items-center justify-end gap-1">
                            <TrendingDown className="w-4 h-4" />
                            {formatCurrency(t.nominal)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-blue-600">
                        {formatCurrency(t.saldo)}
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
  );
};

export default LaporanPage;
