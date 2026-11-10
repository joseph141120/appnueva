const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function syncAppJs() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'mydb',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  });

  const [rows] = await conn.query('SELECT id, imagen FROM productos');
  await conn.end();

  const urlMap = new Map();
  for (const r of rows) {
    if (r.imagen) urlMap.set(r.id, r.imagen);
  }

  const appPath = path.join(__dirname, '..', 'App.js');
  let code = fs.readFileSync(appPath, 'utf8');
  const lines = code.split('\n');
  let inMock = false;
  let updatedLines = [];

  for (let line of lines) {
    if (line.includes('const productosMockDef = [')) inMock = true;
    else if (inMock && line.trim().startsWith('];')) inMock = false;

    if (inMock) {
      const idMatch = line.match(/\{\s*id:\s*(\d+)/);
      if (idMatch) {
        const id = parseInt(idMatch[1], 10);
        const imgUrl = urlMap.get(id);
        if (imgUrl && !line.includes('imagen:')) {
          const insertIdx = line.indexOf('descripcion:');
          if (insertIdx !== -1) {
            line = line.slice(0, insertIdx) + `imagen: '${imgUrl}', ` + line.slice(insertIdx);
          }
        }
      }
    }
    updatedLines.push(line);
  }

  fs.writeFileSync(appPath, updatedLines.join('\n'), 'utf8');
  console.log('✅ App.js productosMockDef sincronizado con URLs de Google Drive.');
}

syncAppJs().catch(console.error);

