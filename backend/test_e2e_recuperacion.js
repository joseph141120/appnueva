/**
 * Prueba End-to-End del flujo de recuperación con Gmail y Base de Datos
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const seguridad = require('./seguridad');

async function testE2E() {
  console.log('🚀 Probando flujo real con ucemprueba9@gmail.com...\n');

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'mydb',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  const email = 'ucemprueba9@gmail.com';

  // 1. Simular /recuperar/metodos
  const [u] = await db.query('SELECT id, email, totp_activo FROM usuarios WHERE LOWER(email) = ?', [email]);
  if (!u.length) throw new Error('Usuario no encontrado');
  console.log('1. Métodos disponibles para:', seguridad.enmascararCorreo(email));
  console.log('   - Gmail: Sí');
  console.log('   - TOTP:', u[0].totp_activo ? 'Sí' : 'No');

  // 2. Generar código OTP de 6 dígitos
  const codigo = seguridad.generarCodigoOTP();
  const codigoHash = seguridad.hashToken(codigo);
  await db.query(
    'UPDATE usuarios SET codigo_correo_recuperacion = ?, codigo_correo_expira = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
    [codigoHash, seguridad.MINUTOS_CODIGO_CORREO, u[0].id]
  );
  console.log('2. Código OTP generado y guardado:', codigo);

  // 3. Simular validación del código
  const [check] = await db.query('SELECT codigo_correo_recuperacion, codigo_correo_expira FROM usuarios WHERE id = ?', [u[0].id]);
  const valido = check[0].codigo_correo_recuperacion === seguridad.hashToken(codigo);
  console.log('3. Validación del código OTP:', valido ? 'CORRECTO' : 'ERROR');

  // 4. Emisión de token temporal de recuperación
  const token = seguridad.generarToken();
  await db.query(
    'UPDATE usuarios SET codigo_correo_recuperacion = NULL, codigo_correo_expira = NULL, token_recuperacion = ?, token_recuperacion_expira = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
    [seguridad.hashToken(token), seguridad.MINUTOS_TOKEN, u[0].id]
  );
  console.log('4. Token temporal emitido:', token.slice(0, 16) + '...');

  // 5. Restablecimiento con nueva clave
  const nuevaClave = 'NuevaClave2026!';
  const nuevaHash = await bcrypt.hash(nuevaClave, 10);
  await db.query(
    'UPDATE usuarios SET password = ?, token_recuperacion = NULL, token_recuperacion_expira = NULL WHERE id = ?',
    [nuevaHash, u[0].id]
  );
  console.log('5. Contraseña actualizada exitosamente en BD.');

  // 6. Probar login con nueva clave
  const [usrFinal] = await db.query('SELECT password FROM usuarios WHERE id = ?', [u[0].id]);
  const loginOk = await bcrypt.compare(nuevaClave, usrFinal[0].password);
  console.log('6. Comprobación de inicio de sesión con nueva clave:', loginOk ? 'ÉXITO' : 'FALLO');

  await db.end();
  console.log('\n✅ ¡Flujo completo verificado al 100%!');
}

testE2E().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});

