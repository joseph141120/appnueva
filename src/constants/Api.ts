// Configuración centralizada de la API
const getDynamicDefaultUrl = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
};

export const API_CONFIG = {
  BASE_URL: getDynamicDefaultUrl()
};

