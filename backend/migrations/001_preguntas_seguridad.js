/**
 * Migración: preguntas de seguridad para recuperación de contraseña.
 * - Agrega columnas de pregunta/respuesta (respuesta hasheada con bcrypt),
 *   control de intentos fallidos, bloqueo temporal y expiración del token.
 * - Asigna pregunta y respuesta a los usuarios existentes.
 * Uso: node migrations/001_preguntas_seguridad.js   (es idempotente)
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const { normalizarRespuesta } = require('../seguridad');

// Pregunta/respuesta inicial para los usuarios existentes (cámbialas luego desde la app/BD)
const ASIGNACIONES = {
  'admin@hardwarestore.com': { pregunta: '¿En qué ciudad naciste?', respuesta: 'Cartago' },
  'empleo@hardware.com': { pregunta: '¿Cuál es el nombre de tu primera mascota?', respuesta: 'Rocky' },
};

const COLUMNAS = [
  ['pregunta_seguridad', 'VARCHAR(255) NULL'],
  ['respuesta_seguridad', 'VARCHAR(255) NULL'],
  ['intentos_recuperacion', 'INT NOT NULL DEFAULT 0'],
  ['bloqueo_recuperacion_hasta', 'DATETIME NULL'],
  ['token_recuperacion_expira', 'DATETIME NULL'],
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
    }
  }
  // El token ahora se guarda como hash SHA-256 (64 caracteres)
  await db.query('ALTER TABLE usuarios MODIFY COLUMN token_recuperacion VARCHAR(255) NULL');

  const [usuarios] = await db.query('SELECT id, email, pregunta_seguridad FROM usuarios');
  for (const u of usuarios) {
    const asig = ASIGNACIONES[u.email.toLowerCase()];
    if (!asig) {
      if (!u.pregunta_seguridad) console.warn(`⚠️  ${u.email} no tiene pregunta de seguridad asignada.`);
      continue;
    }
    const hash = await bcrypt.hash(normalizarRespuesta(asig.respuesta), 12);
    await db.query(
      'UPDATE usuarios SET pregunta_seguridad = ?, respuesta_seguridad = ?, intentos_recuperacion = 0, bloqueo_recuperacion_hasta = NULL, token_recuperacion = NULL, token_recuperacion_expira = NULL WHERE id = ?',
      [asig.pregunta, hash, u.id]
    );
    console.log(`🔐 ${u.email} → "${asig.pregunta}"`);
  }

  await db.end();
  console.log('✅ Migración completada');
})().catch((e) => {
  console.error('❌ Error en migración:', e.message);
  process.exit(1);
});
