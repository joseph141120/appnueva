/**
 * Configuración oficial de la Pasarela de Pagos Tilopay (Entorno Sandbox / Producción)
 */

export const TILOPAY_CONFIG = {
  isSandbox: true,

  // Endpoint oficial de Tilopay (app.tilopay.com)
  apiUrl: 'https://app.tilopay.com/api/v1',
  loginUrl: 'https://app.tilopay.com/api/v1/login',
  processPaymentUrl: 'https://app.tilopay.com/api/v1/processPayment',

  // Credenciales activas provistas por el usuario
  key: '4797-2929-8000-3603-4263',
  apiuser: 'X0f95h',
  password: 'COdmNV',

  // Moneda predeterminada (CRC = Colones Costa Rica, USD = Dólares)
  currency: 'CRC',

  // URLs de redirección para interceptar el resultado en el WebView
  redirectSuccessUrl: 'https://example.com/success',
  redirectCancelUrl: 'https://example.com/failure'
};
