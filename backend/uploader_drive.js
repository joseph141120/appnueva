/**
 * Script de sincronización de imágenes generadas a Google Drive y actualización de MySQL
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const FOLDER_ID = '1L5s-r2RNpKLXsAy_hd2BZZv2KAYJ2dLp';
const BRAIN_DIR = 'C:\\Users\\josep\\.gemini\\antigravity\\brain\\4a58ecb5-caf3-41fb-9abd-509e7eb8dd17';

async function main() {
  console.log('🔍 Consultando archivos existentes en la carpeta de Google Drive...');
  let driveFiles = [];
  try {
    const raw = execSync(`gdrive readonly ls ${FOLDER_ID} --json`, { encoding: 'utf8' });
    driveFiles = JSON.parse(raw);
    console.log(`📂 ${driveFiles.length} archivos en Google Drive.`);
  } catch (err) {
    console.error('Error al listar Drive:', err.message);
  }

  const existingByName = new Map();
  for (const f of driveFiles) {
    existingByName.set(f.name, f.id);
  }

  // Leer imágenes locales generadas en el directorio brain
  const localFiles = fs.readdirSync(BRAIN_DIR).filter(f =>
    (f.endsWith('.jpg') || f.endsWith('.png')) &&
    !f.includes('screenshot') &&
    !f.includes('test') &&
    !f.includes('emulator')
  );

  console.log(`🖼️  Encontradas ${localFiles.length} imágenes generadas localmente.`);

  const uploadedMap = new Map();

  for (const filename of localFiles) {
    const fullPath = path.join(BRAIN_DIR, filename);
    let fileId = existingByName.get(filename);

    if (!fileId) {
      console.log(`⬆️ Subiendo a Google Drive: ${filename}...`);
      try {
        const out = execSync(`gdrive mutate upload "${fullPath}" --parent ${FOLDER_ID} --json`, { encoding: 'utf8' });
        const match = out.match(/ID:\s*([A-Za-z0-9_-]+)/);
        if (match) {
          fileId = match[1];
          existingByName.set(filename, fileId);
        } else {
          // Intentar parsear json
          try {
            const parsed = JSON.parse(out);
            fileId = parsed.id;
          } catch (_) {}
        }
      } catch (uploadErr) {
        console.error(`Error subiendo ${filename}:`, uploadErr.message);
      }
    }

    if (fileId) {
      const publicUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
      uploadedMap.set(filename, { fileId, publicUrl });
      console.log(`✅ [${filename}] -> ${publicUrl}`);
    }
  }

  // Ahora mapeamos las imágenes a los productos en MySQL
  console.log('\n🔗 Actualizando productos en base de datos MySQL...');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'mydb',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  });

  // Mapeos inteligentes por palabra clave en el nombre del archivo
  const fileKeywords = [
    { key: 'camara_domo', pattern: /domo/i },
    { key: 'camara_bullet', pattern: /bullet/i },
    { key: 'camara_seguridad_ptz', pattern: /ptz|robotica/i },
    { key: 'solar', pattern: /solar/i },
    { key: 'dvr_nvr', pattern: /dvr|nvr|grabador/i },
    { key: 'disco_duro', pattern: /disco.*duro|purple|skyhawk/i },
    { key: 'energizador', pattern: /energizador/i },
    { key: 'aislador', pattern: /aislador/i },
    { key: 'alambre', pattern: /alambre/i },
    { key: 'sirena', pattern: /sirena/i },
    { key: 'letrero', pattern: /letrero/i },
    { key: 'motor_porton_corredizo', pattern: /corredizo/i },
    { key: 'batiente', pattern: /batiente/i },
    { key: 'cremallera', pattern: /cremallera/i },
    { key: 'fotocelda', pattern: /fotocelda/i },
    { key: 'control_remoto', pattern: /control.*remoto|llavero.*porton|pulsador|receptor/i },
    { key: 'panel_central_alarma', pattern: /panel.*alarma|central.*alarma/i },
    { key: 'sensor_pir', pattern: /sensor.*movimiento|pir/i },
    { key: 'sensor_magnetico', pattern: /magnetico|humo/i },
    { key: 'fuente_poder', pattern: /fuente.*poder|adaptador/i },
    { key: 'video_balun', pattern: /balun/i },
    { key: 'cable_utp', pattern: /cable.*utp|bobina/i },
    { key: 'bateria', pattern: /bateria/i }
  ];

  // Helper para buscar URL asociada a una palabra clave
  function getUrlForKeyword(key) {
    for (const [fname, data] of uploadedMap.entries()) {
      if (fname.toLowerCase().includes(key)) return data.publicUrl;
    }
    return null;
  }

  const [products] = await conn.query('SELECT id, nombre, descripcion, categorias_id FROM productos');

  let updatedCount = 0;
  for (const prod of products) {
    let matchedUrl = null;

    for (const kw of fileKeywords) {
      if (kw.pattern.test(prod.nombre) || kw.pattern.test(prod.descripcion)) {
        const found = getUrlForKeyword(kw.key);
        if (found) {
          matchedUrl = found;
          break;
        }
      }
    }

    // Fallbacks por categoría si no hubo match específico
    if (!matchedUrl) {
      if (prod.categorias_id === 1) matchedUrl = getUrlForKeyword('camara_domo') || getUrlForKeyword('camara_bullet');
      else if (prod.categorias_id === 2) matchedUrl = getUrlForKeyword('dvr_nvr') || getUrlForKeyword('disco_duro');
      else if (prod.categorias_id === 3) matchedUrl = getUrlForKeyword('energizador') || getUrlForKeyword('sirena');
      else if (prod.categorias_id === 4) matchedUrl = getUrlForKeyword('motor_porton_corredizo') || getUrlForKeyword('cremallera');
      else if (prod.categorias_id === 5) matchedUrl = getUrlForKeyword('control_remoto');
      else if (prod.categorias_id === 6) matchedUrl = getUrlForKeyword('panel_central_alarma') || getUrlForKeyword('sensor_pir');
      else if (prod.categorias_id === 7) matchedUrl = getUrlForKeyword('fuente_poder') || getUrlForKeyword('video_balun');
    }

    if (matchedUrl) {
      await conn.query('UPDATE productos SET imagen = ? WHERE id = ?', [matchedUrl, prod.id]);
      updatedCount++;
      console.log(`✅ [ID ${prod.id}] "${prod.nombre}" -> ${matchedUrl}`);
    }
  }

  console.log(`\n🎉 ${updatedCount} productos actualizados con imágenes de Google Drive.`);
  await conn.end();
}

main().catch(err => {
  console.error('Error general:', err);
  process.exit(1);
});

