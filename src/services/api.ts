import { API_CONFIG } from '../constants/Api';

// Variable en memoria pura de JavaScript para albergar el Token JWT
let memoryToken: string | null = null;

// Registra el token en memoria
export const setAuthToken = (token: string | null) => {
  memoryToken = token;
};

// Recupera el token de la memoria
export const getAuthToken = () => {
  return memoryToken;
};

// Servicio genérico basado en fetch nativo para GET, POST y PUT
export const apiService = {
  get: async (endpoint: string) => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const respuesta = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'GET',
        headers
      });

      if (!respuesta.ok) {
        throw new Error(`Error en petición GET: ${respuesta.status}`);
      }
      return await respuesta.json();
    } catch (error) {
      // Silenciar logs de red innecesarios para el usuario
      throw error;
    }
  },

  post: async (endpoint: string, data: any) => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const respuesta = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      if (!respuesta.ok) {
        const errorData = await respuesta.json().catch(() => ({}));
        const mensaje = errorData.message || `Error en petición POST: ${respuesta.status}`;
        const error = new Error(mensaje);
        (error as any).status = respuesta.status;
        throw error;
      }
      return await respuesta.json();
    } catch (error) {
      // Silenciar logs de red innecesarios para el usuario
      throw error;
    }
  },

  put: async (endpoint: string, data: any) => {
    try {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const respuesta = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(data)
      });

      if (!respuesta.ok) {
        throw new Error(`Error en petición PUT: ${respuesta.status}`);
      }
      return await respuesta.json();
    } catch (error) {
      // Silenciar logs de red innecesarios para el usuario
      throw error;
    }
  }
};
