const path = require('path');
const fs = require('fs');

let admin = null;
let messaging = null;
let firebaseActivo = false;

// Inicialización segura del SDK oficial de Firebase Admin
try {
  const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');
  let serviceAccount = null;

  if (process.env.FIREBASE_CONFIG_JSON) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_CONFIG_JSON);
    } catch (_) {
      console.warn('⚠️ FIREBASE_CONFIG_JSON no contiene un JSON válido.');
    }
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (_) {}
  } else if (fs.existsSync(serviceAccountPath)) {
    serviceAccount = require(serviceAccountPath);
  }

  if (serviceAccount) {
    admin = require('firebase-admin');
    const { getMessaging } = require('firebase-admin/messaging');

    const app = admin.initializeApp({
      credential: admin.cert(serviceAccount)
    });
    messaging = getMessaging(app);
    firebaseActivo = true;
    console.log('🔥 [Firebase Cloud Messaging] Conectado exitosamente al proyecto: ' + (serviceAccount.project_id || 'jlk-solutions-security'));
  }
} catch (err) {
  console.warn('⚠️ No se pudo inicializar Firebase Admin SDK:', err.message);
}

// Almacén en memoria de tokens de notificación
const activeTokens = new Set();

/**
 * Registra un token de dispositivo (FCM o Expo)
 */
function registrarToken(token) {
  if (token && typeof token === 'string' && token.length > 10) {
    activeTokens.add(token);
    return true;
  }
  return false;
}

/**
 * Inicializa la tabla en MySQL si existe conexión
 */
function inicializarTabla(db) {
  if (!db) return;
  const sql = `
    CREATE TABLE IF NOT EXISTS push_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE,
      usuario_id INT NULL,
      plataforma VARCHAR(50) DEFAULT 'android',
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `;
  db.query(sql, (err) => {
    if (err) {
      console.warn('⚠️ No se pudo verificar tabla push_tokens:', err.message);
    } else {
      db.query('SELECT token FROM push_tokens', (err, rows) => {
        if (!err && rows) {
          rows.forEach(r => activeTokens.add(r.token));
          console.log(`🔔 ${activeTokens.size} tokens de notificación cargados.`);
        }
      });
    }
  });
}

/**
 * Guarda un token en MySQL y en memoria
 */
function guardarToken(db, token, usuarioId = null) {
  registrarToken(token);
  if (!db) return;
  const sql = 'INSERT INTO push_tokens (token, usuario_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE usuario_id = VALUES(usuario_id)';
  db.query(sql, [token, usuarioId], (err) => {
    if (err) console.warn('Error guardando token en DB:', err.message);
  });
}

/**
 * Emite una notificación push a través de Firebase Cloud Messaging (FCM)
 * y difunde tanto al Topic general 'movimientos_sistema' como a los dispositivos registrados.
 */
async function enviarExpoPush(titulo, cuerpo, datos = {}) {
  const payloadData = {};
  for (const [k, v] of Object.entries(datos)) {
    payloadData[k] = String(v);
  }
  payloadData.timestamp = String(Date.now());

  let enviadoFCM = false;

  // 1. Enviar vía Firebase Cloud Messaging (FCM)
  if (firebaseActivo && messaging) {
    try {
      // Envío al tópico general de la tienda
      const fcmMessage = {
        topic: 'movimientos_sistema',
        notification: {
          title: titulo,
          body: cuerpo
        },
        data: payloadData,
        android: {
          priority: 'high',
          notification: {
            channelId: 'movimientos-sistema',
            sound: 'default'
          }
        }
      };

      const response = await messaging.send(fcmMessage);
      console.log(`🔥 [Firebase FCM] Notificación enviada exitosamente al tópico 'movimientos_sistema': ${response}`);
      enviadoFCM = true;
    } catch (fcmError) {
      console.warn('⚠️ Error enviando FCM topic:', fcmError.message);
    }

    // Envío a tokens individuales registrados si existen
    const fcmTokens = Array.from(activeTokens).filter(t => !t.startsWith('ExponentPushToken['));
    if (fcmTokens.length > 0) {
      try {
        const multicastResponse = await messaging.sendEachForMulticast({
          tokens: fcmTokens,
          notification: { title: titulo, body: cuerpo },
          data: payloadData
        });
        console.log(`🔥 [Firebase FCM] Enviado a ${multicastResponse.successCount} dispositivos específicos.`);
      } catch (multiError) {
        console.warn('⚠️ Error enviando multicast FCM:', multiError.message);
      }
    }
  }

  // 2. Soporte fallback a Expo Push si hubiera tokens Expo registrados
  const expoTokens = Array.from(activeTokens).filter(t => t.startsWith('ExponentPushToken['));
  if (expoTokens.length > 0) {
    const https = require('https');
    const messages = expoTokens.map(to => ({
      to,
      sound: 'default',
      title: titulo,
      body: cuerpo,
      data: datos,
      priority: 'high',
      channelId: 'movimientos-sistema'
    }));

    const dataString = JSON.stringify(messages);
    const options = {
      hostname: 'exp.host',
      path: '/--/api/v2/push/send',
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(dataString)
      }
    };

    const req = https.request(options, (res) => {
      res.on('data', () => {});
    });
    req.on('error', () => {});
    req.write(dataString);
    req.end();
  }

  return { success: true, fcmActivo: firebaseActivo, enviadoFCM };
}

module.exports = {
  registrarToken,
  guardarToken,
  inicializarTabla,
  enviarExpoPush,
  activeTokens,
  getFirebaseStatus: () => ({ activo: firebaseActivo, proyecto: 'jlk-solutions-security' })
};
