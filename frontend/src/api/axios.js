import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Bearer Token
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

// Response Interceptor: Handle auth failures & network availability errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      console.error('[API Error] Backend API server is unreachable. Please verify server on port 5000.');
      return Promise.reject(new Error('API Server Unavailable. Please check backend connection.'));
    }

    if (error.response.status === 401) {
      // Clear token on authentication failure
      localStorage.removeItem('token');
    }

    return Promise.reject(error);
  }
);

export default api;
