import { API_CONFIG } from '../constants/Api';

// Variable en memoria pura de JavaScript para albergar el Token JWT
let memoryToken: string | null = null;

// Lista de URLs candidatas para la conexión automática con el servidor MySQL
const FALLBACK_URLS = [
  API_CONFIG.BASE_URL,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://10.0.2.2:3000'
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
  const urlsAProbar = [workingBaseUrl, ...FALLBACK_URLS.filter(u => u !== workingBaseUrl)];
  let ultimoError: any = null;

  for (const baseUrl of urlsAProbar) {
    try {
      const urlCompleta = `${baseUrl}${endpoint}`;
      const respuesta = await fetch(urlCompleta, { ...options, headers });
      if (respuesta.ok) {
        workingBaseUrl = baseUrl; // Guardar la URL funcional
        return respuesta;
      }
    } catch (err) {
      ultimoError = err;
    }
  }

  throw ultimoError || new Error('No se pudo conectar al servidor MySQL');
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
  }
};


