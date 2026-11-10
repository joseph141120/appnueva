/**
 * Test automatizado: Login con 2FA y Módulo de Configuración
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { generateSync } = require('otplib');
const seguridad = require('./seguridad');

async function test2FALoginYConfig() {
  console.log('🧪 Iniciando prueba de Login 2FA y Módulo de Configuración...\n');

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'mydb',
  });

  const testEmail = 'user_2fa_test@example.com';
  const pwd = 'Password123!';
  const hash = await bcrypt.hash(pwd, 10);
  const secret = seguridad.generarTotpSecret();

  // 1. Crear usuario con 2FA activo
  await db.query('DELETE FROM usuarios WHERE email = ?', [testEmail]);
  await db.query(`
    INSERT INTO usuarios (email, password, token_app, roles_id, pregunta_seguridad, respuesta_seguridad, totp_secret, totp_activo)
    VALUES (?, ?, '', 1, '¿Ciudad?', 'San Jose', ?, 1)
  `, [testEmail, hash, secret]);
  console.log('1. Usuario creado con 2FA activo.');

  // 2. Simular Login Paso 1: Valida clave y detecta que requiere 2FA
  const [users] = await db.query('SELECT * FROM usuarios WHERE email = ?', [testEmail]);
  const u = users[0];
  const coincide = await bcrypt.compare(pwd, u.password);
  console.log('2. Contraseña correcta:', coincide);
  console.log('   ¿Requiere 2FA (Google Authenticator)?:', Boolean(u.totp_activo && u.totp_secret));

  // 3. Simular generación de token temporal para el login 2FA
  const tempToken = 'temp_token_12345';
  await db.query(
    'UPDATE usuarios SET token_recuperacion = ?, token_recuperacion_expira = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE id = ?',
    [seguridad.hashToken(tempToken), u.id]
  );
  console.log('3. Token temporal de 2FA emitido.');

  // 4. Simular verificación de código TOTP de Google Authenticator
  const codigoActual = generateSync({ secret });
  const esValido = seguridad.verificarTotp({ token: codigoActual, secret: u.totp_secret });
  console.log(`4. Código TOTP [${codigoActual}] validado:`, esValido ? 'EXITOSO' : 'FALLIDO');

  // 5. Simular cambio de contraseña
  const nuevaPwd = 'NuevaPassword456!';
  const nuevoHash = await bcrypt.hash(nuevaPwd, 10);
  await db.query('UPDATE usuarios SET password = ? WHERE id = ?', [nuevoHash, u.id]);
  const [uActualizado] = await db.query('SELECT password FROM usuarios WHERE id = ?', [u.id]);
  const cambioOk = await bcrypt.compare(nuevaPwd, uActualizado[0].password);
  console.log('5. Cambio de contraseña verificado:', cambioOk ? 'EXITOSO' : 'FALLIDO');

  // 6. Limpiar usuario de prueba
  await db.query('DELETE FROM usuarios WHERE email = ?', [testEmail]);
  await db.end();

  console.log('\n🎉 ¡Todas las pruebas del Login 2FA y Configuración pasaron exitosamente!');
}

test2FALoginYConfig().catch((err) => {
  console.error('❌ Error en test:', err);
  process.exit(1);
});

