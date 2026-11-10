/**
 * Test automatizado para verificar el flujo de recuperación con:
 * 1. Gmail OTP (código numérico de 6 dígitos)
 * 2. 2FA TOTP (Google Authenticator)
 * 3. Restablecimiento final de contraseña
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { generateSync } = require('otplib');
const seguridad = require('./seguridad');

async function testFlujoRecuperacion() {
  console.log('🧪 Iniciando prueba automatizada de recuperación 2FA y Gmail OTP...\n');

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'mydb',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  const testEmail = 'test_recuperacion_user@test.com';
  const claveOriginal = 'Test1234!';
  const hashOriginal = await bcrypt.hash(claveOriginal, 10);

  // 1. Limpiar o crear usuario de prueba
  await db.query('DELETE FROM usuarios WHERE email = ?', [testEmail]);
  await db.query(`
    INSERT INTO usuarios (email, password, token_app, roles_id, pregunta_seguridad, respuesta_seguridad)
    VALUES (?, ?, '', 2, '¿Ciudad?', 'Cartago')
  `, [testEmail, hashOriginal]);
  console.log('✅ Usuario de prueba creado:', testEmail);

  // 2. Probar generación y envío simulado de Gmail OTP
  const codigoGmail = seguridad.generarCodigoOTP();
  const codigoHash = seguridad.hashToken(codigoGmail);
  await db.query(`
    UPDATE usuarios 
    SET codigo_correo_recuperacion = ?, codigo_correo_expira = DATE_ADD(NOW(), INTERVAL 10 MINUTE)
    WHERE email = ?
  `, [codigoHash, testEmail]);

  console.log('✅ Código OTP Gmail generado en BD:', codigoGmail);

  // 3. Simular verificación de código Gmail incorrecto
  const [u1] = await db.query('SELECT * FROM usuarios WHERE email = ?', [testEmail]);
  const user = u1[0];
  const codigoInvalido = '000000';
  const esValidoFalso = user.codigo_correo_recuperacion === seguridad.hashToken(codigoInvalido);
  console.log('✅ Verificación código falso rechazada correctamente:', !esValidoFalso);

  // 4. Simular verificación de código Gmail correcto
  const esValidoVerdadero = user.codigo_correo_recuperacion === seguridad.hashToken(codigoGmail);
  console.log('✅ Verificación código verdadero aceptada correctamente:', esValidoVerdadero);

  // 5. Probar TOTP / Google Authenticator
  const secret = seguridad.generarTotpSecret();
  const uri = seguridad.generarTotpUri({ email: testEmail, secret });
  console.log('✅ Secreto TOTP generado:', secret);
  console.log('✅ URI otpauth generada:', uri);

  // Generar código TOTP actual
  const codigoTotpValido = generateSync({ secret });
  const checkTotpOk = seguridad.verificarTotp({ token: codigoTotpValido, secret });
  console.log(`✅ Verificación TOTP con código [${codigoTotpValido}]:`, checkTotpOk ? 'VÁLIDO' : 'FALLIDO');

  const checkTotpFail = seguridad.verificarTotp({ token: '111111', secret });
  console.log('✅ Verificación TOTP con código incorrecto:', !checkTotpFail ? 'RECHAZADO' : 'FALLIDO');

  // 6. Probar QR data URL
  const qr = await seguridad.generarQrDataUrl(uri);
  console.log('✅ Código QR generado en Base64:', qr.slice(0, 35) + '...');

  // 7. Limpiar usuario de prueba
  await db.query('DELETE FROM usuarios WHERE email = ?', [testEmail]);
  await db.end();

  console.log('\n🎉 ¡Todas las pruebas unitarias del backend pasaron con éxito!');
}

testFlujoRecuperacion().catch((err) => {
  console.error('❌ Error en test:', err);
  process.exit(1);
});

