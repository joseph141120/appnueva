/**
 * Migración: Recuperación con Gmail OTP y 2FA TOTP (Google Authenticator)
 * - Agrega:
 *   - codigo_correo_recuperacion: hash o código de 6 dígitos para recuperación vía correo
 *   - codigo_correo_expira: fecha/hora límite de uso del código enviado por correo
 *   - totp_secret: secreto Base32 para TOTP (Google Authenticator)
 *   - totp_activo: indicador booleano de si el 2FA está confirmado y habilitado
 * Uso: node migrations/003_recuperacion_2fa_totp_gmail.js (idempotente)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const COLUMNAS = [
  ['codigo_correo_recuperacion', 'VARCHAR(64) NULL'],
  ['codigo_correo_expira', 'DATETIME NULL'],
  ['totp_secret', 'VARCHAR(128) NULL'],
  ['totp_activo', 'TINYINT(1) NOT NULL DEFAULT 0'],
];

(async () => {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'mydb',
    port: parseInt(process.env.DB_PORT || '3306', 10),
  });

  const [cols] = await db.query('SHOW COLUMNS FROM usuarios');
  const existentes = cols.map((c) => c.Field);
  for (const [nombre, tipo] of COLUMNAS) {
    if (!existentes.includes(nombre)) {
      await db.query(`ALTER TABLE usuarios ADD COLUMN ${nombre} ${tipo}`);
      console.log(`➕ Columna agregada: ${nombre}`);
    } else {
      console.log(`ℹ️  Columna ya existía: ${nombre}`);
    }
  }

  await db.end();
  console.log('✅ Migración de 2FA TOTP y Gmail OTP completada exitosamente.');
})().catch((e) => {
  console.error('❌ Error en migración:', e.message);
  process.exit(1);
});

