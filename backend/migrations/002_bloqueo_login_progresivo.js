/**
 * Migración: bloqueo progresivo de login (estilo iPhone).
 * - Agrega intentos_login e bloqueo_login_hasta a la tabla usuarios.
 * Uso: node migrations/002_bloqueo_login_progresivo.js (idempotente)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const COLUMNAS = [
  ['intentos_login', 'INT NOT NULL DEFAULT 0'],
  ['bloqueo_login_hasta', 'DATETIME NULL'],
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
  console.log('✅ Migración de bloqueo progresivo completada exitosamente.');
})().catch((e) => {
  console.error('❌ Error en migración:', e.message);
  process.exit(1);
});
