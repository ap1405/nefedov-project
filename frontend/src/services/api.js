import axios from 'axios';

const API_URL = 'http://localhost:5000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('selectedWarehouseId');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Экспортируем базовый api для прямых запросов
export default api;

// Специализированные API объекты
export const authAPI = {
  registerCompany: (data) => api.post('/api/auth/register-company', data),
  loginCompany: (data) => api.post('/api/auth/login-company', data),
  loginUser: (data) => api.post('/api/auth/login-user', data),
};

export const warehousesAPI = {
  getAll: () => api.get('/api/warehouses'),
  create: (data) => api.post('/api/warehouses', data),
  update: (id, data) => api.put(`/api/warehouses/${id}`, data),
  delete: (id) => api.delete(`/api/warehouses/${id}`),
};

export const nomenclatureAPI = {
  getAll: (params) => api.get('/api/nomenclature', { params }),
  getById: (id) => api.get(`/api/nomenclature/${id}`),
  create: (data) => api.post('/api/nomenclature', data),
  update: (id, data) => api.put(`/api/nomenclature/${id}`, data),
  delete: (id) => api.delete(`/api/nomenclature/${id}`),
};

export const categoriesAPI = {
  getAll: () => api.get('/api/categories'),
  create: (data) => api.post('/api/categories', data),
  update: (id, data) => api.put(`/api/categories/${id}`, data),
  delete: (id) => api.delete(`/api/categories/${id}`),
};

export const storageCellsAPI = {
  getAll: (params) => api.get('/api/storage-cells', { params }),
  create: (data) => api.post('/api/storage-cells', data),
  update: (id, data) => api.put(`/api/storage-cells/${id}`, data),
  delete: (id) => api.delete(`/api/storage-cells/${id}`),
};

export const receiptsAPI = {
  getAll: (params) => api.get('/api/receipts', { params }),
  create: (data) => api.post('/api/receipts', data),
  getById: (id) => api.get(`/api/receipts/${id}`),
  delete: (id) => api.delete(`/api/receipts/${id}`),
  complete: (id) => api.post(`/api/receipts/${id}/complete`),
};

export const writeoffsAPI = {
  getAll: (params) => api.get('/api/writeoffs', { params }),
  create: (data) => api.post('/api/writeoffs', data),
  getById: (id) => api.get(`/api/writeoffs/${id}`),
  delete: (id) => api.delete(`/api/writeoffs/${id}`),
  complete: (id) => api.post(`/api/writeoffs/${id}/complete`),
};

export const usersAPI = {
  getAll: () => api.get('/api/users'),
  create: (data) => api.post('/api/users', data),
  update: (id, data) => api.put(`/api/users/${id}`, data),
  delete: (id) => api.delete(`/api/users/${id}`),
};

export const profileAPI = {
  getProfile: () => api.get('/api/profile'),
  updateProfile: (data) => api.put('/api/profile', data),
  changePassword: (data) => api.post('/api/profile/change-password', data),
};

export const dashboardAPI = {
  getStats: (params) => api.get('/api/dashboard/stats', { params }),
  getWarehouseStats: (warehouseId) => api.get(`/api/dashboard/warehouse-stats/${warehouseId}`),
};

export const reportsAPI = {
  stockBalances: (params) => api.get('/api/reports/stock-balances', { params }),
  lowStock: () => api.get('/api/reports/low-stock'),
  movementLog: (params) => api.get('/api/reports/movement-log', { params }),
};

export const movementsAPI = {
  getAll: (params) => api.get('/api/movements', { params }),
  getById: (id) => api.get(`/api/movements/${id}`),
  create: (data) => api.post('/api/movements', data),
  update: (id, data) => api.put(`/api/movements/${id}`, data),
  complete: (id) => api.post(`/api/movements/${id}/complete`),
  cancel: (id) => api.post(`/api/movements/${id}/cancel`),
  delete: (id) => api.delete(`/api/movements/${id}`),
};
