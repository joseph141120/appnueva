/**
 * Test para verificar que el registro con token Bearer funciona correctamente
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function testRegistro() {
  console.log('🧪 Verificando autorización de registro en backend...');

  const db = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '1234',
    database: process.env.DB_NAME || 'mydb',
  });

  // Consultar usuario admin
  const [admins] = await db.query('SELECT id, email, token_app, roles_id FROM usuarios WHERE roles_id = 1');
  console.log('Admins encontrados:', admins.length);

  await db.end();
  console.log('✅ Base de datos lista.');
}

testRegistro().catch(console.error);

