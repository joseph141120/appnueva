import Constants from 'expo-constants';

// Configuración centralizada de la API
const getDynamicDefaultUrl = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hostname) {
    return `http://${window.location.hostname}:3000`;
  }

  const hostUri = Constants.expoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    if (ip) return `http://${ip}:3000`;
  }

  return 'http://192.168.101.2:3000';
};

export const API_CONFIG = {
  BASE_URL: getDynamicDefaultUrl()
};


