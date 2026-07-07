import axios from 'axios';
import { API_CONFIG } from '../constants/Api';
import { getAuthToken } from './api';

// Cliente de Axios configurado con la URL base del backend
const axiosClient = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de peticiones Axios leyendo desde el almacén en memoria
axiosClient.interceptors.request.use(
  async (config) => {
    try {
      const token = getAuthToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error al recuperar el token de memoria:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosClient;
