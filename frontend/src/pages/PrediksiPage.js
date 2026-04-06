import React, { useState, useEffect } from 'react';
import { predictAPI, mlAPI } from '@/services/api';
import { formatCurrency, formatApiErrorDetail, formatDate } from '@/utils/helpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, TrendingUp, BarChart3, Calendar, Database, RefreshCw, History, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Area, AreaChart } from 'recharts';

const PrediksiPage = () => {
  const [predictions, setPredictions] = useState([]);
  const [ringkasan, setRingkasan] = useState(null);
  const [dataInfo, setDataInfo] = useState(null);
  const [history, setHistory] = useState([]);
  const [expandedHistory, setExpandedHistory] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nDays, setNDays] = useState(30);
  const [error, setError] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await predictAPI.getHistory();
      setHistory(res.data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handlePredict = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await predictAPI.predict(nDays);
      setPredictions(res.data.predictions);
      setRingkasan(res.data.ringkasan);
      setDataInfo({
        dataSource: res.data.data_source,
        dataPointsUsed: res.data.data_points_used,
        nDays: res.data.n_days
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

  const handleSavePrediction = async () => {
    if (!predictions.length) return;
    
    setSaving(true);
    try {
      await predictAPI.save({
        n_days: dataInfo?.nDays || nDays,
        predictions: predictions,
        ringkasan: ringkasan,
        data_points_used: dataInfo?.dataPointsUsed || 0
      });
      toast({
        title: "Tersimpan!",
        description: "Hasil prediksi telah disimpan ke history",
      });
      fetchHistory();
    } catch (err) {
      toast({
        title: "Error",
        description: formatApiErrorDetail(err.response?.data?.detail),
        variant: "destructive"
      });
    } finally {
      setSaving(false);
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

  const loadHistoryItem = (item) => {
    setPredictions(item.predictions || []);
    setRingkasan(item.ringkasan || null);
    setDataInfo({
      dataSource: "history",
      dataPointsUsed: item.data_points_used || 0,
      nDays: item.n_days
    });
    toast({
      title: "History Loaded",
      description: `Menampilkan prediksi dari ${formatDate(item.created_at)}`,
    });
  };

  const chartData = predictions.map((p, idx) => ({
    tanggal: p.tanggal.slice(5),
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

      <Tabs defaultValue="predict" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-yellow-100">
          <TabsTrigger value="predict" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-neutral-900">
            <TrendingUp className="w-4 h-4 mr-2" />
            Generate Prediksi
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-yellow-500 data-[state=active]:text-neutral-900">
            <History className="w-4 h-4 mr-2" />
            History Prediksi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="predict" className="space-y-6">
          {/* Control Panel */}
          <Card className="bg-white border-yellow-200 shadow-sm">
            <CardHeader className="border-b border-yellow-100">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-500" />
                Generate Prediksi Baru
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
                  <>
                    <Button 
                      onClick={handleSyncData}
                      variant="outline"
                      className="border-blue-400 text-blue-700"
                      disabled={syncing}
                      data-testid="btn-sync-data"
                    >
                      {syncing ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="mr-2 h-4 w-4" />
                      )}
                      Sync Data
                    </Button>
                    {predictions.length > 0 && (
                      <Button 
                        onClick={handleSavePrediction}
                        variant="outline"
                        className="border-emerald-400 text-emerald-700"
                        disabled={saving}
                        data-testid="btn-save-prediction"
                      >
                        {saving ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Simpan
                      </Button>
                    )}
                  </>
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
                  <p className="text-sm text-blue-600">Menggunakan {dataInfo.dataPointsUsed} data points untuk prediksi {dataInfo.nDays} hari</p>
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
                      <XAxis dataKey="tanggal" tick={{ fontSize: 10 }} interval="preserveStartEnd" stroke="#737373" />
                      <YAxis tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M`} stroke="#737373" />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Prediksi']}
                        labelFormatter={(label) => `Tanggal: ${label}`}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #FEF08A', borderRadius: '8px' }}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="prediksi" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorPrediksi)" name="Prediksi Penjualan" />
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
                            <Badge className={p.hari === 'Saturday' || p.hari === 'Sunday' ? 'bg-blue-500 text-white' : 'bg-neutral-200 text-neutral-700'}>
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
                <p className="text-neutral-600">Klik tombol "Generate Prediksi" untuk melihat forecasting penjualan</p>
                <p className="text-sm text-neutral-500 mt-2">Model ML akan menggunakan data transaksi historis untuk prediksi yang lebih akurat</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card className="bg-white border-yellow-200 shadow-sm">
            <CardHeader className="border-b border-yellow-100">
              <CardTitle className="flex items-center gap-2">
                <History className="w-5 h-5 text-yellow-500" />
                History Prediksi Tersimpan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loadingHistory ? (
                <div className="p-8 text-center">
                  <div className="spinner mx-auto"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-neutral-500">
                  <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Belum ada history prediksi tersimpan</p>
                  <p className="text-sm mt-2">Generate prediksi baru dan klik "Simpan" untuk menyimpan ke history</p>
                </div>
              ) : (
                <div className="divide-y divide-yellow-100" data-testid="prediction-history-list">
                  {history.map((item) => (
                    <div key={item.id} className="p-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer hover:bg-yellow-50 rounded-lg p-2 -m-2"
                        onClick={() => setExpandedHistory(expandedHistory === item.id ? null : item.id)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 bg-yellow-100 rounded-lg">
                            <Calendar className="w-5 h-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-neutral-900">
                              Prediksi {item.n_days} Hari
                            </p>
                            <p className="text-sm text-neutral-500">
                              {formatDate(item.created_at)} • {item.data_points_used} data points
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {item.ringkasan && (
                            <Badge className="bg-emerald-100 text-emerald-700">
                              Avg: {formatCurrency(item.ringkasan.rata_rata)}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-400 text-yellow-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              loadHistoryItem(item);
                            }}
                          >
                            Load
                          </Button>
                          {expandedHistory === item.id ? (
                            <ChevronUp className="w-5 h-5 text-neutral-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-neutral-400" />
                          )}
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {expandedHistory === item.id && item.ringkasan && (
                        <div className="mt-4 p-4 bg-yellow-50 rounded-xl">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                              <p className="text-xs text-neutral-500">Rata-rata</p>
                              <p className="font-bold text-emerald-600">{formatCurrency(item.ringkasan.rata_rata)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-neutral-500">Total</p>
                              <p className="font-bold text-blue-600">{formatCurrency(item.ringkasan.total)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-neutral-500">Minimum</p>
                              <p className="font-bold text-yellow-600">{formatCurrency(item.ringkasan.minimum)}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-neutral-500">Maksimum</p>
                              <p className="font-bold text-rose-600">{formatCurrency(item.ringkasan.maksimum)}</p>
                            </div>
                          </div>
                          {item.predictions && item.predictions.length > 0 && (
                            <div className="mt-4">
                              <p className="text-sm font-semibold text-neutral-700 mb-2">Preview (5 hari pertama):</p>
                              <div className="grid grid-cols-5 gap-2">
                                {item.predictions.slice(0, 5).map((p, idx) => (
                                  <div key={idx} className="text-center p-2 bg-white rounded-lg">
                                    <p className="text-xs text-neutral-500">{p.tanggal.slice(5)}</p>
                                    <p className="text-sm font-semibold text-emerald-600">{formatCurrency(p.prediksi)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PrediksiPage;
