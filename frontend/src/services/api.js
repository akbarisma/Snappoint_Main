import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Transactions API
export const transaksiAPI = {
  getAll: () => api.get('/transaksi'),
  create: (data) => api.post('/transaksi', data),
  update: (id, data) => api.put(`/transaksi/${id}`, data),
  delete: (id) => api.delete(`/transaksi/${id}`),
  getKategori: () => api.get('/kategori'),
};

// Stock API
export const stokAPI = {
  getAll: () => api.get('/stok'),
  getSisa: () => api.get('/stok/sisa'),
  create: (data) => api.post('/stok', data),
  update: (id, data) => api.put(`/stok/${id}`, data),
  delete: (id) => api.delete(`/stok/${id}`),
};

// Kas API
export const kasAPI = {
  getAll: () => api.get('/kas'),
  create: (data) => api.post('/kas', data),
  update: (id, data) => api.put(`/kas/${id}`, data),
  delete: (id) => api.delete(`/kas/${id}`),
  getSetting: () => api.get('/kas/setting'),
  setSetting: (data) => api.post('/kas/setting', data),
};

// Investor API
export const investorAPI = {
  getAll: () => api.get('/investor'),
  create: (data) => api.post('/investor', data),
  update: (id, data) => api.put(`/investor/${id}`, data),
  delete: (id) => api.delete(`/investor/${id}`),
};

// Dashboard API
export const dashboardAPI = {
  getRekap: () => api.get('/dashboard/rekap'),
  getStokBulanan: () => api.get('/dashboard/stok-bulanan'),
};

// Prediction API
export const predictAPI = {
  predict: (n_days) => api.post('/predict', { n_days }),
  save: (data) => api.post('/predict/save', data),
  getHistory: () => api.get('/predict/history'),
};

export default api;
