import React, { useState, useEffect } from 'react';
import { predictAPI, mlAPI } from '@/services/api';
import { formatCurrency, formatApiErrorDetail } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, BarChart3, Calendar, Database, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

const PrediksiPage = () => {
  const [predictions, setPredictions] = useState([]);
  const [ringkasan, setRingkasan] = useState(null);
  const [dataInfo, setDataInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [nDays, setNDays] = useState(30);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const handlePredict = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await predictAPI.predict(nDays);
      setPredictions(res.data.predictions);
      setRingkasan(res.data.ringkasan);
      setDataInfo({
        dataSource: res.data.data_source,
        dataPointsUsed: res.data.data_points_used
      });
      toast({
        title: "Prediksi Berhasil!",
        description: `${res.data.n_days} hari prediksi telah digenerate menggunakan ${res.data.data_points_used} data points`,
      });
    } catch (err) {
      setError(formatApiErrorDetail(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      const res = await mlAPI.syncFromTransactions();
      toast({
        title: "Sinkronisasi Berhasil!",
        description: res.data.message,
      });
    } catch (err) {
      toast({
        title: "Error",
        description: formatApiErrorDetail(err.response?.data?.detail),
        variant: "destructive"
      });
    } finally {
      setSyncing(false);
    }
  };

  const chartData = predictions.map((p, idx) => ({
    tanggal: p.tanggal.slice(5), // MM-DD format
    hari: p.hari,
    prediksi: p.prediksi,
    day: idx + 1
  }));

  const canManageML = ['admin', 'owner'].includes(user?.role);

  return (
    <div className="space-y-8" data-testid="prediksi-page">
      <div>
        <h1 className="font-heading text-3xl font-bold text-neutral-900">Prediksi Penjualan</h1>
        <p className="text-neutral-500">Forecasting penjualan menggunakan Machine Learning (LSTM-like algorithm)</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
          {error}
        </div>
      )}

      {/* Control Panel */}
      <Card className="bg-white border-yellow-200 shadow-sm">
        <CardHeader className="border-b border-yellow-100">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-500" />
            Generate Prediksi
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 space-y-2">
              <Label htmlFor="nDays">Jumlah Hari Prediksi</Label>
              <Input
                id="nDays"
                type="number"
                min={1}
                max={90}
                value={nDays}
                onChange={(e) => setNDays(parseInt(e.target.value) || 30)}
                className="border-yellow-200"
                data-testid="input-n-days"
              />
              <p className="text-xs text-neutral-500">Maksimal 90 hari</p>
            </div>
            <Button 
              onClick={handlePredict}
              className="bg-yellow-500 hover:bg-yellow-600 text-neutral-900 px-8"
              disabled={loading}
              data-testid="btn-predict"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Memproses...
                </>
              ) : (
                <>
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Generate Prediksi
                </>
              )}
            </Button>
            {canManageML && (
              <Button 
                onClick={handleSyncData}
                variant="outline"
                className="border-blue-400 text-blue-700"
                disabled={syncing}
                data-testid="btn-sync-data"
              >
                {syncing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sinkronisasi...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync dari Transaksi
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Info */}
      {dataInfo && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4 flex items-center gap-4">
            <Database className="w-6 h-6 text-blue-500" />
            <div>
              <p className="font-semibold text-blue-700">Data Source: {dataInfo.dataSource}</p>
              <p className="text-sm text-blue-600">Menggunakan {dataInfo.dataPointsUsed} data points untuk prediksi</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Cards */}
      {ringkasan && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-emerald-50 border-emerald-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-emerald-600">Rata-rata Harian</p>
              <p className="text-xl font-bold text-emerald-700" data-testid="pred-avg">
                {formatCurrency(ringkasan.rata_rata)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-blue-600">Total Prediksi</p>
              <p className="text-xl font-bold text-blue-700" data-testid="pred-total">
                {formatCurrency(ringkasan.total)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-yellow-600">Minimum</p>
              <p className="text-xl font-bold text-yellow-700" data-testid="pred-min">
                {formatCurrency(ringkasan.minimum)}
              </p>
            </CardContent>
          </Card>
          <Card className="bg-rose-50 border-rose-200">
            <CardContent className="p-4 text-center">
              <p className="text-sm text-rose-600">Maksimum</p>
              <p className="text-xl font-bold text-rose-700" data-testid="pred-max">
                {formatCurrency(ringkasan.maksimum)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chart */}
      {predictions.length > 0 && (
        <Card className="bg-white border-yellow-200 shadow-sm">
          <CardHeader className="border-b border-yellow-100">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-yellow-500" />
              Grafik Prediksi Penjualan
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="h-[400px]" data-testid="prediction-chart">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorPrediksi" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#FEF08A" />
                  <XAxis 
                    dataKey="tanggal" 
                    tick={{ fontSize: 10 }} 
                    interval="preserveStartEnd"
                    stroke="#737373"
                  />
                  <YAxis 
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`}
                    stroke="#737373"
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value), 'Prediksi']}
                    labelFormatter={(label) => `Tanggal: ${label}`}
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: '1px solid #FEF08A',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Area 
                    type="monotone" 
                    dataKey="prediksi" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorPrediksi)"
                    name="Prediksi Penjualan"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Prediction Table */}
      {predictions.length > 0 && (
        <Card className="bg-white border-yellow-200 shadow-sm">
          <CardHeader className="border-b border-yellow-100">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-yellow-500" />
              Detail Prediksi Per Hari
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full" data-testid="prediction-table">
                <thead className="sticky top-0 bg-yellow-50">
                  <tr className="border-b border-yellow-200">
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Hari Ke</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Tanggal</th>
                    <th className="text-left py-3 px-4 font-semibold text-neutral-700">Hari</th>
                    <th className="text-right py-3 px-4 font-semibold text-neutral-700">Prediksi</th>
                  </tr>
                </thead>
                <tbody>
                  {predictions.map((p, idx) => (
                    <tr key={idx} className="border-b border-yellow-100 hover:bg-yellow-50/50">
                      <td className="py-3 px-4 font-medium">+{idx + 1}</td>
                      <td className="py-3 px-4">{p.tanggal}</td>
                      <td className="py-3 px-4">
                        <Badge className={
                          p.hari === 'Saturday' || p.hari === 'Sunday' 
                            ? 'bg-blue-500 text-white' 
                            : 'bg-neutral-200 text-neutral-700'
                        }>
                          {p.hari}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold text-emerald-600">
                        {formatCurrency(p.prediksi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {predictions.length === 0 && !loading && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="py-12 text-center">
            <TrendingUp className="w-12 h-12 text-yellow-400 mx-auto mb-4" />
            <p className="text-neutral-600">
              Klik tombol "Generate Prediksi" untuk melihat forecasting penjualan
            </p>
            <p className="text-sm text-neutral-500 mt-2">
              Model ML akan menggunakan data transaksi historis untuk prediksi yang lebih akurat
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PrediksiPage;
