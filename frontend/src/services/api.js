import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refresh_token');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_URL}/api/auth/refresh`, {
            refresh_token: refreshToken
          });
          
          const { access_token, refresh_token: newRefreshToken } = response.data;
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);
          
          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          window.location.href = '/login';
          return Promise.reject(refreshError);
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    return response;
  },
  register: async (data) => {
    const response = await api.post('/auth/register', data);
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    return response;
  },
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
    }
  },
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh', { 
    refresh_token: localStorage.getItem('refresh_token') 
  }),
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

// ML Training Data API
export const mlAPI = {
  getTrainingData: () => api.get('/ml/training-data'),
  addTrainingData: (data) => api.post('/ml/training-data', data),
  bulkAddTrainingData: (data) => api.post('/ml/training-data/bulk', data),
  deleteTrainingData: (id) => api.delete(`/ml/training-data/${id}`),
  syncFromTransactions: () => api.get('/ml/sync-from-transactions'),
};

// Notifications API
export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getSettings: () => api.get('/notifications/settings'),
  updateSettings: (data) => api.post('/notifications/settings', data),
  dismiss: (id) => api.post(`/notifications/${id}/dismiss`),
};

export default api;
