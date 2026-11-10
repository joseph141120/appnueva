// Utilidades de seguridad compartidas (recuperación de contraseña, 2FA TOTP y Gmail OTP)
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const QRCode = require('qrcode');
const { generateSecret, generateURI, verifySync } = require('otplib');

const PREGUNTAS_SEGURIDAD = [
  '¿Cuál es el nombre de tu primera mascota?',
  '¿En qué ciudad naciste?',
  '¿Cuál es el segundo nombre de tu madre?',
  '¿Cómo se llamaba tu escuela primaria?',
  '¿Cuál fue el modelo de tu primer carro?',
  '¿Cuál es el nombre de tu mejor amigo de la infancia?',
];

const MAX_INTENTOS = 5;          // intentos fallidos antes de bloquear
const MINUTOS_BLOQUEO = 15;      // duración del bloqueo
const MINUTOS_TOKEN = 10;        // vigencia del token para cambiar contraseña
const MINUTOS_CODIGO_CORREO = 10; // vigencia del código numérico enviado por Gmail

// Minúsculas, sin tildes, sin espacios extra: "  Cártago " === "cartago"
const normalizarRespuesta = (txt = '') =>
  txt.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');

// Mín. 8 caracteres, mayúscula, minúscula, número y símbolo
const validarPasswordSegura = (pwd = '') => {
  const errores = [];
  if (pwd.length < 8) errores.push('al menos 8 caracteres');
  if (!/[A-Z]/.test(pwd)) errores.push('una letra mayúscula');
  if (!/[a-z]/.test(pwd)) errores.push('una letra minúscula');
  if (!/[0-9]/.test(pwd)) errores.push('un número');
  if (!/[^A-Za-z0-9]/.test(pwd)) errores.push('un símbolo (ej: !@#$%)');
  return errores;
};

const generarToken = () => crypto.randomBytes(32).toString('hex');
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

// Genera un código OTP de 6 dígitos numéricos (ej: '483921')
const generarCodigoOTP = () => crypto.randomInt(100000, 1000000).toString();

// Enmascara correo para mostrar al usuario sin exponer la cuenta completa (ej: j****z@gmail.com)
const enmascararCorreo = (email = '') => {
  const [usuario, dominio] = (email || '').split('@');
  if (!dominio) return email;
  if (usuario.length <= 2) return `${usuario[0] || '*'}***@${dominio}`;
  return `${usuario.slice(0, 2)}${'*'.repeat(Math.max(2, usuario.length - 3))}${usuario.slice(-1)}@${dominio}`;
};

// Pregunta "señuelo" estable para correos inexistentes (evita revelar qué correos existen)
const preguntaSenuelo = (email = '') => {
  const h = crypto.createHash('sha256').update(email.toLowerCase()).digest();
  return PREGUNTAS_SEGURIDAD[h[0] % PREGUNTAS_SEGURIDAD.length];
};

const INTENTOS_LOGIN_INICIALES = 5;       // Intentos libres antes del 1.er bloqueo
const ESCALA_BLOQUEO_LOGIN_MINUTOS = [1, 5, 10, 15, 30, 60]; // Progresión de espera

/**
 * Calcula los minutos de bloqueo progresivos estilo iPhone:
 * - Intento 5: 1 min
 * - Intento 6: 5 min
 * - Intento 7: 10 min
 * - Intento 8: 15 min
 * - Intento 9: 30 min
 * - Intento 10+: 60 min
 */
const calcularMinutosBloqueoLogin = (intentosFallidos) => {
  if (intentosFallidos < INTENTOS_LOGIN_INICIALES) return 0;
  const idx = intentosFallidos - INTENTOS_LOGIN_INICIALES;
  return ESCALA_BLOQUEO_LOGIN_MINUTOS[Math.min(idx, ESCALA_BLOQUEO_LOGIN_MINUTOS.length - 1)];
};

// ==========================================
// UTILIDADES 2FA / TOTP (Google Authenticator)
// ==========================================

const generarTotpSecret = () => generateSecret();

const generarTotpUri = ({ email, secret }) => {
  const appName = process.env.APP_NAME || 'JLK Solutions Security';
  return generateURI({
    issuer: appName,
    label: email,
    secret,
  });
};

const generarQrDataUrl = async (uri) => {
  return await QRCode.toDataURL(uri, {
    margin: 2,
    scale: 6,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
  });
};

const verificarTotp = ({ token, secret }) => {
  if (!token || !secret) return false;
  const t = String(token).trim().replace(/[^0-9]/g, '');
  const s = String(secret).trim();
  if (t.length !== 6) return false;

  try {
    const res = verifySync({
      token: t,
      secret: s,
      epochTolerance: 300, // Margen de tolerancia de hasta 5 minutos para tolerar cualquier desfase de reloj
    });
    return Boolean(res && res.valid);
  } catch (err) {
    console.error('Error al verificar TOTP:', err.message);
    return false;
  }
};

// ==========================================
// ENVÍO DE CORREO (GMAIL SMTP / NODEMAILER)
// ==========================================

let transporterGmail = null;

const obtenerTransporter = () => {
  const user = process.env.GMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;

  if (!user || !pass) {
    return null;
  }

  if (!transporterGmail) {
    transporterGmail = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user,
        pass,
      },
    });
  }
  return transporterGmail;
};

/**
 * Envía el código de recuperación de 6 dígitos al correo del usuario.
 * Si las credenciales de Gmail no están configuradas en .env, simula el envío e imprime
 * el código claramente en la consola del servidor (modo desarrollo).
 */
const enviarCorreoOTP = async (destinatario, codigo) => {
  const appName = process.env.APP_NAME || 'JLK Solutions Security';
  const transporter = obtenerTransporter();

  if (!transporter) {
    console.log(`\n======================================================`);
    console.log(`📧 [MODO SIMULACIÓN - CREDENCIALES GMAIL PENDIENTES]`);
    console.log(`Destinatario : ${destinatario}`);
    console.log(`Código OTP   : 👉 [ ${codigo} ] 👈`);
    console.log(`Expira en    : ${MINUTOS_CODIGO_CORREO} minutos`);
    console.log(`(Para envío real, configura GMAIL_USER y GMAIL_APP_PASSWORD en backend/.env)`);
    console.log(`======================================================\n`);
    return { success: true, simulado: true };
  }

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0;">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0f172a; margin: 0; font-size: 22px;">${appName}</h2>
        <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Recuperación de Contraseña</p>
      </div>

      <p style="color: #334155; font-size: 15px; line-height: 1.5;">
        Has solicitado restablecer tu contraseña de acceso. Utiliza el siguiente código de verificación de 6 dígitos:
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <span style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #16a34a; background: #f0fdf4; border: 2px dashed #86efac; border-radius: 10px; padding: 12px 24px;">
          ${codigo}
        </span>
      </div>

      <p style="color: #64748b; font-size: 13px; line-height: 1.5;">
        ⏱️ Este código es válido durante los próximos <strong>${MINUTOS_CODIGO_CORREO} minutos</strong>.
        Si tú no solicitaste este cambio, puedes ignorar este mensaje de forma segura.
      </p>

      <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 12px;">
        © ${new Date().getFullYear()} ${appName}. Todos los derechos reservados.
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${appName}" <${process.env.GMAIL_USER || process.env.SMTP_USER}>`,
    to: destinatario,
    subject: `🔐 Tu código de recuperación: ${codigo}`,
    text: `Tu código de recuperación para ${appName} es: ${codigo}. Es válido por ${MINUTOS_CODIGO_CORREO} minutos.`,
    html,
  });

  return { success: true, simulado: false };
};

module.exports = {
  PREGUNTAS_SEGURIDAD,
  MAX_INTENTOS,
  MINUTOS_BLOQUEO,
  MINUTOS_TOKEN,
  MINUTOS_CODIGO_CORREO,
  INTENTOS_LOGIN_INICIALES,
  ESCALA_BLOQUEO_LOGIN_MINUTOS,
  calcularMinutosBloqueoLogin,
  normalizarRespuesta,
  validarPasswordSegura,
  generarToken,
  hashToken,
  generarCodigoOTP,
  enmascararCorreo,
  preguntaSenuelo,
  generarTotpSecret,
  generarTotpUri,
  generarQrDataUrl,
  verificarTotp,
  enviarCorreoOTP,
};
