// Preguntas de seguridad y reglas de contraseña (deben coincidir con backend/seguridad.js)
export const PREGUNTAS_SEGURIDAD = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es el segundo nombre de tu madre?',
  '¿Cómo se llamaba tu escuela primaria?',
  '¿Cuál fue el modelo de tu primer carro?',
  '¿Cuál es el nombre de tu mejor amigo de la infancia?',
];

export const REGLAS_PASSWORD = [
  { texto: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { texto: 'Una letra mayúscula', test: (p) => /[A-Z]/.test(p) },
  { texto: 'Una letra minúscula', test: (p) => /[a-z]/.test(p) },
  { texto: 'Un número', test: (p) => /[0-9]/.test(p) },
  { texto: 'Un símbolo (ej: !@#$%)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

// Devuelve la lista de requisitos que faltan (vacía = contraseña segura)
export const validarPasswordSegura = (pwd = '') =>
  REGLAS_PASSWORD.filter((r) => !r.test(pwd)).map((r) => r.texto.toLowerCase());
