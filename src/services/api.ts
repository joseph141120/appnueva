import { API_CONFIG } from '../constants/Api';
import { Platform } from 'react-native';

// Variable en memoria pura de JavaScript para albergar el Token JWT
let memoryToken: string | null = null;

// Detectar si estamos en navegador web
const isWeb = Platform.OS === 'web' || (typeof window !== 'undefined' && typeof document !== 'undefined');

// Lista de URLs candidatas para la conexión automática con el servidor MySQL
const FALLBACK_URLS = [
  API_CONFIG.BASE_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://192.168.101.2:3000',
  ...(isWeb ? [] : ['http://10.0.2.2:3000'])
];

let workingBaseUrl: string = API_CONFIG.BASE_URL;

// Registra el token en memoria
export const setAuthToken = (token: string | null) => {
  memoryToken = token;
};

// Recupera el token de la memoria
export const getAuthToken = () => {
  return memoryToken;
};

// Intenta realizar una petición probando automáticamente las URLs candidatas
const fetchConAutofallback = async (endpoint: string, options: RequestInit) => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Probar primero la última URL conocida que funcionó
  const urlsAProbar = Array.from(new Set([workingBaseUrl, ...FALLBACK_URLS])).filter(Boolean);
  let ultimoError: any = null;

  for (const baseUrl of urlsAProbar) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500); // 2.5s timeout rápido por intento

      const urlCompleta = `${baseUrl}${endpoint}`;
      const respuesta = await fetch(urlCompleta, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Si el servidor HTTP respondió (sea 200 o un código de error como 401/404),
      // la URL es funcional y el servidor está vivo.
      workingBaseUrl = baseUrl;

      if (!respuesta.ok) {
        const data = await respuesta.json().catch(() => ({}));
        const err: any = new Error(data.message || data.error || `Error ${respuesta.status}`);
        err.status = respuesta.status;
        err.data = data;
        throw err;
      }

      return respuesta;
    } catch (err: any) {
      // Si el error tiene status HTTP (ej: 401 Contraseña incorrecta),
      // fue una respuesta deliberada del servidor, NO un fallo de red. Relanzar de inmediato.
      if (err && err.status) {
        throw err;
      }
      ultimoError = err;
    }
  }

  throw ultimoError || new Error('No se pudo conectar al servidor');
};

// Servicio genérico basado en fetch nativo para GET, POST y PUT
export const apiService = {
  get: async (endpoint: string) => {
    const respuesta = await fetchConAutofallback(endpoint, { method: 'GET' });
    return await respuesta.json();
  },

  post: async (endpoint: string, data: any) => {
    const respuesta = await fetchConAutofallback(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return await respuesta.json();
  },

  put: async (endpoint: string, data: any) => {
    const respuesta = await fetchConAutofallback(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    return await respuesta.json();
  },

  // POST que devuelve el JSON del servidor aunque responda 4xx/5xx (ej: "respuesta incorrecta").
  // Usa solo la última URL funcional para no repetir la petición (evita contar intentos de más).
  postConEstado: async (endpoint: string, data: any) => {
    const urls = Array.from(new Set([workingBaseUrl, ...FALLBACK_URLS])).filter(Boolean);
    let ultimoError: any = null;
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    for (const baseUrl of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const respuesta = await fetch(`${baseUrl}${endpoint}`, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        workingBaseUrl = baseUrl; // El servidor respondió: no probar otras URLs
        const json = await respuesta.json().catch(() => ({}));
        return { success: respuesta.ok && json.success !== false, status: respuesta.status, ...json };
      } catch (err) {
        ultimoError = err; // Solo errores de red pasan a la siguiente URL
      }
    }
    throw ultimoError || new Error('No se pudo conectar al servidor');
  }
};


