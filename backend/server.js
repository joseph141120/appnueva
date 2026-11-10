const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const seguridad = require('./seguridad');
const notificaciones = require('./notifications');

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Ocultar cabecera de fingerprinting (OWASP: Information Disclosure)
app.disable('x-powered-by');

// Cabeceras HTTP de Seguridad recomendadas por OWASP
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors());
// Mitigación DoS por tamaño excesivo de payload
app.use(express.json({ limit: '100kb' }));

// Configuración del pool de la base de datos MariaDB / MySQL (soporte Railway MYSQL_URL / MYSQL_PRIVATE_URL)
const connectionConfig = (process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL || process.env.DATABASE_URL)
  ? {
      uri: process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL || process.env.DATABASE_URL,
      multipleStatements: true,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    }
  : {
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_NAME || 'mydb',
      port: parseInt(process.env.DB_PORT || '3306', 10),
      multipleStatements: true,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    };

const db = mysql.createPool(connectionConfig);

// Inicializar tabla para almacenar tokens de notificación push
notificaciones.inicializarTabla(db);

// Auto-inicializa el esquema y catálogo si la base de datos en la nube es nueva o está vacía
function autoInicializarBaseDatos(dbInstance) {
  if (!dbInstance) return;
  dbInstance.query("SHOW TABLES LIKE 'productos'", (err, rows) => {
    if (err) {
      console.warn('⚠️ No se pudo comprobar tabla productos:', err.message);
      return;
    }
    if (!rows || rows.length === 0) {
      console.log('🔄 [Auto-Init] Base de datos vacía detectada. Inicializando esquema y catálogo...');
      const schemaPath = path.join(__dirname, 'database_schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf8');
        dbInstance.query(sql, (execErr) => {
          if (execErr) {
            console.error('❌ Error al auto-inicializar base de datos:', execErr.message);
          } else {
            console.log('🎉 ¡Base de datos, catálogo de 43 productos y usuarios inicializados con éxito!');
            aplicarNombresPorDefecto(dbInstance);
          }
        });
      }
    } else {
      console.log('✅ Base de datos verificada con productos existentes.');
    }
  });
}

autoInicializarBaseDatos(db);

// Resuelve el nombre del usuario protegiendo la privacidad (evita exponer correos en notificaciones y UI)
function resolverNombreUsuario(usuario) {
  if (usuario && usuario.nombre && typeof usuario.nombre === 'string' && usuario.nombre.trim()) {
    return usuario.nombre.trim();
  }
  const rolId = usuario?.roles_id || usuario?.rol || usuario?.rol_id;
  const email = (usuario?.email || '').toLowerCase();

  if (rolId === 1 || email.includes('admin')) {
    return 'Luis Martínez';
  }
  if (email.includes('joseph') || rolId === 2 || email.includes('vendedor')) {
    return 'Joseph Silva';
  }
  return 'Personal Autorizado';
}

// Inicializar y migrar columna 'nombre' en la tabla usuarios y asignar nombres predeterminados
function migrarTablaUsuarios(dbInstance) {
  if (!dbInstance) return;
  dbInstance.query("SHOW COLUMNS FROM usuarios LIKE 'nombre'", (err, rows) => {
    if (err) {
      console.warn('⚠️ [DB Migration] No se pudo comprobar columna "nombre":', err.message);
      return;
    }
    if (!rows || rows.length === 0) {
      dbInstance.query("ALTER TABLE usuarios ADD COLUMN nombre VARCHAR(100) NULL AFTER email", (alterErr) => {
        if (alterErr && alterErr.code !== 'ER_DUP_FIELDNAME') {
          console.warn('⚠️ [DB Migration] Error al añadir columna nombre:', alterErr.message);
        } else {
          console.log('✅ [DB Migration] Columna "nombre" añadida a la tabla usuarios.');
          aplicarNombresPorDefecto(dbInstance);
        }
      });
    } else {
      aplicarNombresPorDefecto(dbInstance);
    }
  });
}

function aplicarNombresPorDefecto(dbInstance) {
  // 1. Admin = Luis Martínez
  dbInstance.query(
    "UPDATE usuarios SET nombre = 'Luis Martínez' WHERE (roles_id = 1 OR LOWER(email) LIKE '%admin%') AND (nombre IS NULL OR TRIM(nombre) = '')",
    (err, res) => {
      if (!err && res && res.affectedRows > 0) {
        console.log(`✅ [DB Migration] Asignado nombre "Luis Martínez" a ${res.affectedRows} cuenta(s) admin.`);
      }
    }
  );
  // 2. Joseph = Joseph Silva
  dbInstance.query(
    "UPDATE usuarios SET nombre = 'Joseph Silva' WHERE (LOWER(email) LIKE '%joseph%' OR roles_id = 2) AND (nombre IS NULL OR TRIM(nombre) = '')",
    (err, res) => {
      if (!err && res && res.affectedRows > 0) {
        console.log(`✅ [DB Migration] Asignado nombre "Joseph Silva" a ${res.affectedRows} cuenta(s).`);
      }
    }
  );
}

migrarTablaUsuarios(db);

// Utilidades de base de datos con Promesas
const dbq = (sql, params = []) => new Promise((resolve, reject) =>
  db.query(sql, params, (err, r) => (err ? reject(err) : resolve(r))));
const HASH_DUMMY = bcrypt.hashSync('respuesta-dummy', 12);

// Helper para envolver rutas con y sin prefijo, soportando middlewares en cadena
const registerRoutes = (path, method, ...handlers) => {
  app[method](`${API_PREFIX}${path}`, ...handlers);
  app[method](path, ...handlers);
};

// Middleware de Autenticación y Autorización basado en Tokens Bearer (OWASP A01: Broken Access Control)
const requireAuth = (rolesPermitidos = [1, 2]) => async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Acceso no autorizado: Se requiere una sesión iniciada con token de autorización.'
    });
  }

  const token = authHeader.split(' ')[1].trim();
  if (!token) {
    return res.status(401).json({ success: false, message: 'Token de sesión vacío.' });
  }

  try {
    const usuarios = await dbq('SELECT id, email, roles_id, nombre FROM usuarios WHERE token_app = ?', [token]);
    if (!usuarios || usuarios.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Sesión inválida o expirada. Por favor ingresa tus credenciales nuevamente.'
      });
    }

    const u = usuarios[0];
    u.nombre = resolverNombreUsuario(u);

    if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(u.roles_id)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso prohibido: Tu rol de usuario no tiene permisos para realizar esta operación.'
      });
    }

    req.usuario = u;
    next();
  } catch (err) {
    console.error('Error en requireAuth:', err.message);
    res.status(500).json({ success: false, message: 'Error interno de autenticación' });
  }
};

// Middleware opcional para rastreo de pedidos: identifica al usuario si envía token, sin bloquear si es anónimo
const requireOptionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1].trim();
    if (token) {
      try {
        const usuarios = await dbq('SELECT id, email, roles_id, nombre FROM usuarios WHERE token_app = ?', [token]);
        if (usuarios && usuarios.length > 0) {
          const u = usuarios[0];
          u.nombre = resolverNombreUsuario(u);
          req.usuario = u;
        }
      } catch (e) {
        // Continuar como anónimo
      }
    }
  }
  next();
};

// Endpoint GET /productos: Trae catálogo público ocultando costos y márgenes en F12 Network (OWASP A02)
registerRoutes('/productos', 'get', requireOptionalAuth, (req, res) => {
  const esAdmin = req.usuario && req.usuario.roles_id === 1;
  const camposAdmin = esAdmin ? ', p.precio_costo, p.margen_ganancia' : '';
  const query = `
    SELECT 
      p.id, 
      p.nombre, 
      p.descripcion, 
      p.stock, 
      (p.precio_costo + p.margen_ganancia) AS precio,
      p.imagen, 
      p.descuento_porcentaje, 
      COALESCE(c.descripcion, 'Accesorios') AS categoria_nombre
      ${camposAdmin}
    FROM productos p 
    LEFT JOIN categorias c ON p.categorias_id = c.id
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error en GET /productos:', err.message);
      return res.status(500).json({ success: false, message: 'Error al consultar productos' });
    }
    res.json(results);
  });
});

// Endpoint POST /productos: Inserta nuevos productos en la base de datos (Solo Administrador)
registerRoutes('/productos', 'post', requireAuth([1]), (req, res) => {
  const { nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, imagen, descuento_porcentaje } = req.body;
  if (!nombre || !precio_costo) {
    return res.status(400).json({ success: false, message: 'Nombre y precio de costo son requeridos' });
  }
  if (Number(precio_costo) < 0 || Number(stock || 0) < 0 || Number(margen_ganancia || 0) < 0) {
    return res.status(400).json({ success: false, message: 'Precios y stock deben ser valores positivos' });
  }
  const query = 'INSERT INTO productos (nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, imagen, descuento_porcentaje) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [nombre, descripcion, Math.max(0, parseInt(stock, 10) || 0), Number(precio_costo), Number(margen_ganancia || 0), categorias_id, imagen || null, Number(descuento_porcentaje || 0)], (err, result) => {
    if (err) {
      console.error('Error en POST /productos:', err.message);
      return res.status(500).json({ success: false, message: 'Error al registrar producto' });
    }
    res.json({ success: true, message: 'Producto insertado en MySQL', id: result.insertId });
  });
});

// Endpoint GET /categorias: Trae todas las categorías (Público)
registerRoutes('/categorias', 'get', (req, res) => {
  db.query('SELECT * FROM categorias WHERE estado = 1 OR estado IS NULL', (err, results) => {
    if (err) {
      console.error('Error en GET /categorias:', err.message);
      return res.status(500).json({ success: false, message: 'Error al consultar categorías' });
    }
    res.json(results);
  });
});

// Endpoint POST /categorias: Registra una nueva categoría (Solo Administrador)
registerRoutes('/categorias', 'post', requireAuth([1]), (req, res) => {
  const descripcion = (req.body.descripcion || '').trim();
  if (!descripcion) return res.status(400).json({ success: false, message: 'Descripción requerida' });
  db.query('INSERT INTO categorias (descripcion, estado) VALUES (?, 1)', [descripcion], (err, result) => {
    if (err) {
      console.error('Error en POST /categorias:', err.message);
      return res.status(500).json({ success: false, message: 'Error al registrar categoría' });
    }
    res.json({ success: true, message: 'Categoría agregada exitosamente', id: result.insertId });
  });
});

// Endpoint PUT /productos/:id/reabastecer: Reabastece stock (Admin o Vendedor)
registerRoutes('/productos/:id/reabastecer', 'put', requireAuth([1, 2]), (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  const stockNum = parseInt(req.body.stock_adicional, 10);
  if (isNaN(idNum) || isNaN(stockNum) || stockNum <= 0) {
    return res.status(400).json({ success: false, message: 'El ID y la cantidad adicional deben ser números enteros positivos mayores a 0' });
  }
  const query = 'UPDATE productos SET stock = stock + ? WHERE id = ?';
  db.query(query, [stockNum, idNum], (err, result) => {
    if (err) {
      console.error('Error en reabastecer:', err.message);
      return res.status(500).json({ success: false, message: 'Error al actualizar stock' });
    }
    res.json({ success: true, message: 'Stock actualizado' });
  });
});

// Endpoint PUT /productos/:id: Actualiza detalles de un producto existente (Solo Administrador)
registerRoutes('/productos/:id', 'put', requireAuth([1]), (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  if (isNaN(idNum) || idNum <= 0) {
    return res.status(400).json({ success: false, message: 'ID de producto inválido' });
  }
  const { nombre, descripcion, precio_costo, margen_ganancia, categorias_id, imagen, descuento_porcentaje } = req.body;
  if (Number(precio_costo) < 0 || Number(margen_ganancia || 0) < 0) {
    return res.status(400).json({ success: false, message: 'Precios no pueden ser negativos' });
  }
  const query = 'UPDATE productos SET nombre = ?, descripcion = ?, precio_costo = ?, margen_ganancia = ?, categorias_id = ?, imagen = ?, descuento_porcentaje = ? WHERE id = ?';
  db.query(query, [nombre, descripcion, Number(precio_costo), Number(margen_ganancia || 0), categorias_id, imagen || null, Number(descuento_porcentaje || 0), idNum], (err, result) => {
    if (err) {
      console.error('Error en PUT /productos/:id:', err.message);
      return res.status(500).json({ success: false, message: 'Error al actualizar producto' });
    }
    res.json({ success: true, message: 'Producto actualizado exitosamente en MySQL' });
  });
});

// Endpoint POST /login: Verifica credenciales contra base de datos con bloqueo progresivo estilo iPhone
registerRoutes('/login', 'post', async (req, res) => {
  const email = (req.body.email || '').trim();
  const password = req.body.password || '';
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Correo y contraseña requeridos' });
  }

  try {
    const results = await dbq('SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)', [email]);
    if (results.length === 0) {
      await bcrypt.compare(password, HASH_DUMMY); // tiempo constante
      return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    }

    const usuario = results[0];

    // 1. Verificar si la cuenta se encuentra actualmente bloqueada
    if (usuario.bloqueo_login_hasta) {
      const ahora = Date.now();
      const expira = new Date(usuario.bloqueo_login_hasta).getTime();
      if (expira > ahora) {
        const segundosRestantes = Math.ceil((expira - ahora) / 1000);
        const minutosRestantes = Math.ceil(segundosRestantes / 60);
        const textoTiempo = segundosRestantes > 60
          ? `${minutosRestantes} minuto(s)`
          : `${segundosRestantes} segundo(s)`;
        return res.status(429).json({
          success: false,
          bloqueado: true,
          segundosRestantes,
          minutosRestantes,
          message: `Acceso bloqueado por intentos fallidos. Intenta de nuevo en ${textoTiempo}.`
        });
      }
    }

    // 2. Comparar contraseña
    const coinciden = await bcrypt.compare(password, usuario.password);
    if (!coinciden) {
      const nuevosIntentos = (usuario.intentos_login || 0) + 1;
      const minutosBloqueo = seguridad.calcularMinutosBloqueoLogin(nuevosIntentos);

      if (minutosBloqueo > 0) {
        // Aplica el bloqueo progresivo (1 min, 5 min, 10 min, 15 min...)
        await dbq(
          'UPDATE usuarios SET intentos_login = ?, bloqueo_login_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
          [nuevosIntentos, minutosBloqueo, usuario.id]
        );
        console.warn(`🚫 Login bloqueado ${minutosBloqueo} min para ${email} (intento #${nuevosIntentos})`);
        return res.status(429).json({
          success: false,
          bloqueado: true,
          intentosFallidos: nuevosIntentos,
          segundosRestantes: minutosBloqueo * 60,
          minutosRestantes: minutosBloqueo,
          message: `Has superado los 5 intentos fallidos. Acceso bloqueado por ${minutosBloqueo} minuto(s).`
        });
      }

      // Aún no llega a 5 intentos: registrar fallo y avisar cuántos quedan
      await dbq('UPDATE usuarios SET intentos_login = ? WHERE id = ?', [nuevosIntentos, usuario.id]);
      const intentosRestantes = seguridad.INTENTOS_LOGIN_INICIALES - nuevosIntentos;
      return res.status(401).json({
        success: false,
        intentosRestantes,
        message: `Contraseña incorrecta. Te quedan ${intentosRestantes} intento(s) antes del bloqueo temporal.`
      });
    }

    // 3. Contraseña correcta: resetear intentos y desbloquear
    await dbq('UPDATE usuarios SET intentos_login = 0, bloqueo_login_hasta = NULL WHERE id = ?', [usuario.id]);

    // Si el usuario tiene activo 2FA (Google Authenticator), exigir el segundo factor
    if (usuario.totp_activo && usuario.totp_secret) {
      const tokenTemporal = crypto.randomBytes(24).toString('hex');
      await dbq(
        'UPDATE usuarios SET token_recuperacion = ?, token_recuperacion_expira = DATE_ADD(NOW(), INTERVAL 5 MINUTE) WHERE id = ?',
        [seguridad.hashToken(tokenTemporal), usuario.id]
      );
      return res.json({
        success: true,
        requiere2FA: true,
        tokenTemporal,
        email: usuario.email,
        message: 'Se requiere código de verificación de Google Authenticator.'
      });
    }

    // Si no tiene 2FA: emitir Token Criptográfico seguro de sesión (256-bit)
    const tokenSesion = crypto.randomBytes(32).toString('hex');
    await dbq('UPDATE usuarios SET token_app = ? WHERE id = ?', [tokenSesion, usuario.id]);

    const nombreUsuario = resolverNombreUsuario(usuario);
    const rolTexto = usuario.roles_id === 1 ? 'Administrador' : 'Vendedor';

    // Notificación Push segura vía Firebase (FCM): muestra nombre y rol, protegiendo correos (OWASP)
    notificaciones.enviarExpoPush(
      '🔐 Inicio de Sesión',
      `${nombreUsuario} inició sesión (${rolTexto}).`,
      { tipo: 'login', nombre: nombreUsuario, rol: rolTexto }
    ).catch(() => {});

    res.json({
      success: true,
      rol: usuario.roles_id,
      email: usuario.email,
      nombre: nombreUsuario,
      token: tokenSesion
    });
  } catch (err) {
    console.error('Error en POST /login:', err);
    res.status(500).json({ success: false, message: 'Error interno del servidor durante el inicio de sesión' });
  }
});

// Endpoint POST /login/verificar-2fa: Valida el código de 6 dígitos de Google Authenticator para completar el login
registerRoutes('/login/verificar-2fa', 'post', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const tokenTemporal = req.body.tokenTemporal || '';
  const codigo = (req.body.codigo || '').trim();

  if (!email || !tokenTemporal || !codigo) {
    return res.status(400).json({ success: false, message: 'Correo, token temporal y código 2FA son requeridos' });
  }

  try {
    const results = await dbq(
      'SELECT id, nombre, email, roles_id, totp_secret, totp_activo FROM usuarios WHERE LOWER(email) = ? AND token_recuperacion = ? AND token_recuperacion_expira > NOW()',
      [email, seguridad.hashToken(tokenTemporal)]
    );

    if (results.length === 0) {
      return res.status(401).json({ success: false, message: 'Sesión de verificación 2FA expirada o inválida. Inicia sesión de nuevo.' });
    }

    const usuario = results[0];
    if (!usuario.totp_activo || !usuario.totp_secret) {
      return res.status(400).json({ success: false, message: 'El usuario no tiene 2FA activo' });
    }

    const esValido = seguridad.verificarTotp({ token: codigo, secret: usuario.totp_secret });
    if (!esValido) {
      return res.status(401).json({ success: false, message: 'Código de Google Authenticator incorrecto.' });
    }

    // 2FA válido: generar y guardar token de sesión
    const tokenSesion = crypto.randomBytes(32).toString('hex');
    await dbq(
      'UPDATE usuarios SET token_recuperacion = NULL, token_recuperacion_expira = NULL, token_app = ? WHERE id = ?',
      [tokenSesion, usuario.id]
    );

    const nombreUsuario = resolverNombreUsuario(usuario);
    const rolTexto = usuario.roles_id === 1 ? 'Administrador' : 'Vendedor';

    // Notificación Push segura vía Firebase (FCM)
    notificaciones.enviarExpoPush(
      '🔐 Inicio de Sesión',
      `${nombreUsuario} inició sesión (${rolTexto}).`,
      { tipo: 'login', nombre: nombreUsuario, rol: rolTexto }
    ).catch(() => {});

    res.json({
      success: true,
      rol: usuario.roles_id,
      email: usuario.email,
      nombre: nombreUsuario,
      token: tokenSesion,
      message: 'Inicio de sesión con 2FA exitoso.'
    });
  } catch (err) {
    console.error('Error en /login/verificar-2fa:', err);
    res.status(500).json({ success: false, message: 'Error interno al validar código 2FA' });
  }
});

// Endpoint POST /logout: Invalida el token de sesión en la base de datos (Personal Autenticado)
registerRoutes('/logout', 'post', requireAuth([1, 2]), async (req, res) => {
  try {
    const nombreUsuario = req.body?.nombre || resolverNombreUsuario(req.usuario);
    await dbq('UPDATE usuarios SET token_app = NULL WHERE id = ?', [req.usuario.id]);

    // Notificación Push segura vía Firebase (FCM) al cerrar sesión
    notificaciones.enviarExpoPush(
      '👋 Cierre de Sesión',
      `${nombreUsuario} cerró sesión en el sistema.`,
      { tipo: 'logout', nombre: nombreUsuario }
    ).catch(() => {});

    res.json({ success: true, message: 'Sesión finalizada exitosamente en el servidor' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error al finalizar sesión' });
  }
});

// Endpoint POST /usuarios/registro: Añade empleados encriptando la clave (Solo Administrador Autenticado)
registerRoutes('/usuarios/registro', 'post', requireAuth([1]), (req, res) => {
  const { nombre, email, password, rol_id, pregunta_seguridad, respuesta_seguridad } = req.body;
  if (!nombre || !nombre.trim() || !email || !password || !rol_id || !pregunta_seguridad || !respuesta_seguridad) {
    return res.status(400).json({ success: false, message: 'Nombre completo, correo, contraseña, rol, pregunta y respuesta de seguridad son requeridos.' });
  }
  const nombreLimpio = nombre.trim();
  const erroresPwd = seguridad.validarPasswordSegura(password);
  if (erroresPwd.length) {
    return res.status(400).json({ success: false, message: `La contraseña debe tener: ${erroresPwd.join(', ')}.` });
  }
  if (seguridad.normalizarRespuesta(respuesta_seguridad).length < 3) {
    return res.status(400).json({ success: false, message: 'La respuesta de seguridad debe tener al menos 3 caracteres.' });
  }
  db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Error al verificar usuario' });
    if (results.length > 0) return res.status(400).json({ success: false, message: 'El correo ya existe' });

    try {
      const hash = await bcrypt.hash(password, 10);
      const hashRespuesta = await bcrypt.hash(seguridad.normalizarRespuesta(respuesta_seguridad), 12);
      const query = 'INSERT INTO usuarios (nombre, email, password, token_app, roles_id, pregunta_seguridad, respuesta_seguridad) VALUES (?, ?, ?, ?, ?, ?, ?)';
      db.query(query, [nombreLimpio, email, hash, '', rol_id, pregunta_seguridad, hashRespuesta], (err, result) => {
        if (err) return res.status(500).json({ success: false, message: 'Error al registrar personal' });

        const rolTexto = parseInt(rol_id, 10) === 1 ? 'Administrador' : 'Vendedor';
        notificaciones.enviarExpoPush(
          '👤 Nuevo Personal Registrado',
          `${nombreLimpio} fue registrado(a) como ${rolTexto}.`,
          { tipo: 'registro_personal', nombre: nombreLimpio, rol: rolTexto }
        ).catch(() => {});

        res.json({ success: true, message: 'Personal registrado exitosamente', id: result.insertId });
      });
    } catch (e) {
      res.status(500).json({ success: false, message: 'Error al procesar registro' });
    }
  });
});

// Endpoint GET /preguntas-seguridad: lista de preguntas disponibles (Público)
registerRoutes('/preguntas-seguridad', 'get', (req, res) => {
  res.json({ success: true, preguntas: seguridad.PREGUNTAS_SEGURIDAD });
});

// ===== Módulo de Configuración de Cuenta de Usuario =====

// Consultar perfil del usuario autenticado (nombre, correo, rol, estado de 2FA)
registerRoutes('/usuarios/perfil', 'get', requireAuth([1, 2]), async (req, res) => {
  try {
    const r = await dbq('SELECT id, nombre, email, roles_id, totp_activo FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!r.length) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const u = r[0];
    const nombreUsuario = resolverNombreUsuario(u);
    res.json({
      success: true,
      usuario: {
        id: u.id,
        nombre: nombreUsuario,
        email: u.email,
        rol_id: u.roles_id,
        rol_nombre: u.roles_id === 1 ? 'Administrador' : 'Vendedor',
        totp_activo: Boolean(u.totp_activo),
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error al consultar perfil' });
  }
});

// Cambiar contraseña desde la cuenta activa
registerRoutes('/usuarios/cambiar-password', 'post', requireAuth([1, 2]), async (req, res) => {
  const { passwordActual, nuevaPassword } = req.body;
  if (!passwordActual || !nuevaPassword) {
    return res.status(400).json({ success: false, message: 'Contraseña actual y nueva contraseña requeridas' });
  }

  const errores = seguridad.validarPasswordSegura(nuevaPassword);
  if (errores.length) {
    return res.status(400).json({ success: false, message: `La nueva contraseña debe tener: ${errores.join(', ')}.` });
  }

  try {
    const r = await dbq('SELECT password FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!r.length) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(passwordActual, r[0].password);
    if (!coincide) {
      return res.status(401).json({ success: false, message: 'La contraseña actual es incorrecta.' });
    }

    if (await bcrypt.compare(nuevaPassword, r[0].password)) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña no puede ser igual a la anterior.' });
    }

    const hash = await bcrypt.hash(nuevaPassword, 10);
    await dbq('UPDATE usuarios SET password = ? WHERE id = ?', [hash, req.usuario.id]);

    res.json({ success: true, message: 'Contraseña actualizada exitosamente.' });
  } catch (e) {
    console.error('Error en /usuarios/cambiar-password:', e);
    res.status(500).json({ success: false, message: 'Error al actualizar contraseña' });
  }
});

// Cambiar correo desde la cuenta activa
registerRoutes('/usuarios/cambiar-email', 'post', requireAuth([1, 2]), async (req, res) => {
  const nuevoEmail = (req.body.nuevoEmail || '').trim().toLowerCase();
  const password = req.body.password || '';

  if (!nuevoEmail || !password) {
    return res.status(400).json({ success: false, message: 'Nuevo correo y contraseña son requeridos' });
  }

  if (!nuevoEmail.includes('@') || !nuevoEmail.includes('.')) {
    return res.status(400).json({ success: false, message: 'Formato de correo electrónico inválido' });
  }

  try {
    const r = await dbq('SELECT id, password, email FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!r.length) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const coincide = await bcrypt.compare(password, r[0].password);
    if (!coincide) {
      return res.status(401).json({ success: false, message: 'Contraseña incorrecta para confirmar el cambio.' });
    }

    if (r[0].email.toLowerCase() === nuevoEmail) {
      return res.status(400).json({ success: false, message: 'El nuevo correo es idéntico al actual.' });
    }

    const ocupado = await dbq('SELECT id FROM usuarios WHERE LOWER(email) = ? AND id != ?', [nuevoEmail, req.usuario.id]);
    if (ocupado.length > 0) {
      return res.status(400).json({ success: false, message: 'El correo electrónico ya está registrado por otro usuario.' });
    }

    await dbq('UPDATE usuarios SET email = ? WHERE id = ?', [nuevoEmail, req.usuario.id]);

    res.json({ success: true, message: 'Correo electrónico actualizado correctamente.', email: nuevoEmail });
  } catch (e) {
    console.error('Error en /usuarios/cambiar-email:', e);
    res.status(500).json({ success: false, message: 'Error al cambiar correo electrónico' });
  }
});

// ===== Flujo de Recuperación de Contraseña: Gmail OTP y 2FA TOTP =====

// Consulta de métodos disponibles para un correo (Gmail siempre, TOTP si fue activado)
registerRoutes('/recuperar/metodos', 'post', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: 'Correo electrónico requerido' });

  try {
    const r = await dbq('SELECT id, email, totp_activo, bloqueo_recuperacion_hasta FROM usuarios WHERE LOWER(email) = ?', [email]);
    if (r.length === 0) {
      await bcrypt.compare('dummy', HASH_DUMMY);
      // Respuesta uniforme para evitar enumeración de correos
      return res.json({
        success: true,
        emailEnmascarado: seguridad.enmascararCorreo(email),
        metodos: ['gmail'],
        totpHabilitado: false
      });
    }

    const u = r[0];
    if (u.bloqueo_recuperacion_hasta && new Date(u.bloqueo_recuperacion_hasta) > new Date()) {
      const segundosRestantes = Math.ceil((new Date(u.bloqueo_recuperacion_hasta).getTime() - Date.now()) / 1000);
      const minutosRestantes = Math.ceil(segundosRestantes / 60);
      return res.status(429).json({
        success: false,
        bloqueado: true,
        message: `Demasiados intentos fallidos. Recuperación bloqueada por ${minutosRestantes} minuto(s).`
      });
    }

    const metodos = ['gmail'];
    const totpHabilitado = Boolean(u.totp_activo);
    if (totpHabilitado) {
      metodos.push('totp');
    }

    res.json({
      success: true,
      emailEnmascarado: seguridad.enmascararCorreo(u.email),
      metodos,
      totpHabilitado
    });
  } catch (e) {
    console.error('Error en /recuperar/metodos:', e);
    res.status(500).json({ success: false, message: 'Error al consultar métodos de recuperación' });
  }
});

// Método 1: Envía código de 6 dígitos numéricos por Gmail
registerRoutes('/recuperar/enviar-codigo-gmail', 'post', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ success: false, message: 'Correo electrónico requerido' });

  try {
    const r = await dbq('SELECT id, email, bloqueo_recuperacion_hasta FROM usuarios WHERE LOWER(email) = ?', [email]);
    if (r.length === 0) {
      await bcrypt.compare('dummy', HASH_DUMMY);
      // No revela que el correo no existe
      return res.json({
        success: true,
        message: 'Si el correo está registrado, se envió un código de verificación.',
        emailEnmascarado: seguridad.enmascararCorreo(email)
      });
    }

    const u = r[0];
    if (u.bloqueo_recuperacion_hasta && new Date(u.bloqueo_recuperacion_hasta) > new Date()) {
      return res.status(429).json({
        success: false,
        message: 'Demasiados intentos fallidos. Intenta más tarde.'
      });
    }

    const codigo = seguridad.generarCodigoOTP();
    const codigoHash = seguridad.hashToken(codigo);

    await dbq(
      'UPDATE usuarios SET codigo_correo_recuperacion = ?, codigo_correo_expira = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
      [codigoHash, seguridad.MINUTOS_CODIGO_CORREO, u.id]
    );

    const envio = await seguridad.enviarCorreoOTP(u.email, codigo);

    res.json({
      success: true,
      message: 'Código de verificación enviado a tu correo Gmail.',
      emailEnmascarado: seguridad.enmascararCorreo(u.email),
      expiraEnMinutos: seguridad.MINUTOS_CODIGO_CORREO,
      simulado: envio.simulado || false
    });
  } catch (e) {
    console.error('Error en /recuperar/enviar-codigo-gmail:', e);
    res.status(500).json({ success: false, message: 'Error al enviar el código de recuperación' });
  }
});

// Método 1: Verifica código numérico de Gmail
registerRoutes('/recuperar/verificar-codigo-gmail', 'post', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const codigo = (req.body.codigo || '').trim();

  if (!email || !codigo) {
    return res.status(400).json({ success: false, message: 'Correo y código son requeridos' });
  }

  try {
    const r = await dbq(
      'SELECT id, codigo_correo_recuperacion, codigo_correo_expira, intentos_recuperacion, bloqueo_recuperacion_hasta FROM usuarios WHERE LOWER(email) = ?',
      [email]
    );
    if (r.length === 0) {
      await bcrypt.compare('dummy', HASH_DUMMY);
      return res.status(401).json({ success: false, message: 'Código incorrecto o expirado.' });
    }

    const u = r[0];
    if (u.bloqueo_recuperacion_hasta && new Date(u.bloqueo_recuperacion_hasta) > new Date()) {
      return res.status(429).json({ success: false, message: 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta más tarde.' });
    }

    const codigoHashIngresado = seguridad.hashToken(codigo);
    const ahora = new Date();
    const expira = u.codigo_correo_expira ? new Date(u.codigo_correo_expira) : null;
    const esValido = u.codigo_correo_recuperacion && u.codigo_correo_recuperacion === codigoHashIngresado && expira && expira > ahora;

    if (!esValido) {
      const intentos = (u.intentos_recuperacion || 0) + 1;
      if (intentos >= seguridad.MAX_INTENTOS) {
        await dbq(
          'UPDATE usuarios SET intentos_recuperacion = 0, bloqueo_recuperacion_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
          [seguridad.MINUTOS_BLOQUEO, u.id]
        );
        return res.status(429).json({
          success: false,
          message: `Demasiados intentos fallidos. Recuperación bloqueada por ${seguridad.MINUTOS_BLOQUEO} minutos.`
        });
      }
      await dbq('UPDATE usuarios SET intentos_recuperacion = ? WHERE id = ?', [intentos, u.id]);
      const restantes = seguridad.MAX_INTENTOS - intentos;
      return res.status(401).json({
        success: false,
        message: `Código incorrecto o expirado. Te quedan ${restantes} intento(s).`
      });
    }

    // Código válido: generar token temporal de restablecimiento
    const token = seguridad.generarToken();
    await dbq(
      'UPDATE usuarios SET intentos_recuperacion = 0, bloqueo_recuperacion_hasta = NULL, codigo_correo_recuperacion = NULL, codigo_correo_expira = NULL, token_recuperacion = ?, token_recuperacion_expira = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
      [seguridad.hashToken(token), seguridad.MINUTOS_TOKEN, u.id]
    );

    res.json({
      success: true,
      token,
      expiraEnMinutos: seguridad.MINUTOS_TOKEN,
      message: 'Código verificado con éxito.'
    });
  } catch (e) {
    console.error('Error en /recuperar/verificar-codigo-gmail:', e);
    res.status(500).json({ success: false, message: 'Error interno al validar código' });
  }
});

// Método 2: Verifica código TOTP de Google Authenticator
registerRoutes('/recuperar/verificar-totp', 'post', async (req, res) => {
  const email = (req.body.email || '').trim().toLowerCase();
  const codigo = (req.body.codigo || '').trim();

  if (!email || !codigo) {
    return res.status(400).json({ success: false, message: 'Correo y código de autenticación son requeridos' });
  }

  try {
    const r = await dbq(
      'SELECT id, totp_secret, totp_activo, intentos_recuperacion, bloqueo_recuperacion_hasta FROM usuarios WHERE LOWER(email) = ?',
      [email]
    );
    if (r.length === 0 || !r[0].totp_activo || !r[0].totp_secret) {
      await bcrypt.compare('dummy', HASH_DUMMY);
      return res.status(401).json({ success: false, message: 'Código 2FA incorrecto o no configurado.' });
    }

    const u = r[0];
    if (u.bloqueo_recuperacion_hasta && new Date(u.bloqueo_recuperacion_hasta) > new Date()) {
      return res.status(429).json({ success: false, message: 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta más tarde.' });
    }

    const esValido = seguridad.verificarTotp({ token: codigo, secret: u.totp_secret });

    if (!esValido) {
      const intentos = (u.intentos_recuperacion || 0) + 1;
      if (intentos >= seguridad.MAX_INTENTOS) {
        await dbq(
          'UPDATE usuarios SET intentos_recuperacion = 0, bloqueo_recuperacion_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
          [seguridad.MINUTOS_BLOQUEO, u.id]
        );
        return res.status(429).json({
          success: false,
          message: `Demasiados intentos fallidos. Recuperación bloqueada por ${seguridad.MINUTOS_BLOQUEO} minutos.`
        });
      }
      await dbq('UPDATE usuarios SET intentos_recuperacion = ? WHERE id = ?', [intentos, u.id]);
      const restantes = seguridad.MAX_INTENTOS - intentos;
      return res.status(401).json({
        success: false,
        message: `Código 2FA incorrecto. Te quedan ${restantes} intento(s).`
      });
    }

    // Código TOTP válido: generar token temporal de restablecimiento
    const token = seguridad.generarToken();
    await dbq(
      'UPDATE usuarios SET intentos_recuperacion = 0, bloqueo_recuperacion_hasta = NULL, token_recuperacion = ?, token_recuperacion_expira = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?',
      [seguridad.hashToken(token), seguridad.MINUTOS_TOKEN, u.id]
    );

    res.json({
      success: true,
      token,
      expiraEnMinutos: seguridad.MINUTOS_TOKEN,
      message: 'Código 2FA verificado con éxito.'
    });
  } catch (e) {
    console.error('Error en /recuperar/verificar-totp:', e);
    res.status(500).json({ success: false, message: 'Error interno al validar código 2FA' });
  }
});

// ===== Gestión de 2FA TOTP (Google Authenticator) para usuarios autenticados =====

// Consultar si el usuario tiene activo 2FA
registerRoutes('/2fa/estado', 'get', requireAuth([1, 2]), async (req, res) => {
  try {
    const r = await dbq('SELECT totp_activo FROM usuarios WHERE id = ?', [req.usuario.id]);
    res.json({ success: true, activo: Boolean(r[0] && r[0].totp_activo) });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error al consultar estado 2FA' });
  }
});

// Generar secreto y código QR para configurar Google Authenticator
registerRoutes('/2fa/generar', 'post', requireAuth([1, 2]), async (req, res) => {
  try {
    const userRow = await dbq('SELECT totp_secret, totp_activo FROM usuarios WHERE id = ?', [req.usuario.id]);
    let secret = userRow[0] && userRow[0].totp_secret;

    // Solo si no existe un secreto previo o si piden regenerar, creamos uno nuevo
    if (!secret || req.body.regenerar) {
      secret = seguridad.generarTotpSecret();
      await dbq('UPDATE usuarios SET totp_secret = ? WHERE id = ?', [secret, req.usuario.id]);
    }

    const uri = seguridad.generarTotpUri({ email: req.usuario.email, secret });
    const qrDataUrl = await seguridad.generarQrDataUrl(uri);

    res.json({
      success: true,
      secret,
      uri,
      qrDataUrl,
      message: 'Escanea el código QR o ingresa la clave secreta en Google Authenticator.'
    });
  } catch (e) {
    console.error('Error en /2fa/generar:', e);
    res.status(500).json({ success: false, message: 'Error al generar configuración 2FA' });
  }
});

// Confirmar y activar 2FA ingresando el primer código de la app
registerRoutes('/2fa/activar', 'post', requireAuth([1, 2]), async (req, res) => {
  const codigo = (req.body.codigo || '').trim();
  if (!codigo) return res.status(400).json({ success: false, message: 'Código de 6 dígitos requerido' });

  try {
    const r = await dbq('SELECT totp_secret FROM usuarios WHERE id = ?', [req.usuario.id]);
    const secret = r[0] && r[0].totp_secret;
    if (!secret) {
      return res.status(400).json({ success: false, message: 'Primero genera la configuración 2FA antes de activarla.' });
    }

    const esValido = seguridad.verificarTotp({ token: codigo, secret });
    if (!esValido) {
      return res.status(400).json({ success: false, message: 'Código de verificación incorrecto. Intenta de nuevo.' });
    }

    await dbq('UPDATE usuarios SET totp_activo = 1 WHERE id = ?', [req.usuario.id]);
    res.json({ success: true, message: 'Google Authenticator (2FA) activado exitosamente.' });
  } catch (e) {
    console.error('Error en /2fa/activar:', e);
    res.status(500).json({ success: false, message: 'Error al activar 2FA' });
  }
});

// Desactivar 2FA (acepta contraseña actual O el código de 6 dígitos de Google Authenticator)
registerRoutes('/2fa/desactivar', 'post', requireAuth([1, 2]), async (req, res) => {
  const password = req.body.password || '';
  const codigo = (req.body.codigo || '').trim();

  if (!password && !codigo) {
    return res.status(400).json({ success: false, message: 'Se requiere tu contraseña o el código de Google Authenticator para desactivar 2FA.' });
  }

  try {
    const r = await dbq('SELECT password, totp_secret FROM usuarios WHERE id = ?', [req.usuario.id]);
    if (!r.length) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    let autorizado = false;
    if (password) {
      autorizado = await bcrypt.compare(password, r[0].password);
    }
    if (!autorizado && codigo && r[0].totp_secret) {
      autorizado = seguridad.verificarTotp({ token: codigo, secret: r[0].totp_secret });
    }

    if (!autorizado) {
      return res.status(401).json({ success: false, message: 'Contraseña o código 2FA incorrecto.' });
    }

    await dbq('UPDATE usuarios SET totp_activo = 0, totp_secret = NULL WHERE id = ?', [req.usuario.id]);
    res.json({ success: true, message: '2FA desactivado exitosamente.' });
  } catch (e) {
    console.error('Error en /2fa/desactivar:', e);
    res.status(500).json({ success: false, message: 'Error al desactivar 2FA' });
  }
});

// ===== Recuperación de contraseña con pregunta de seguridad (3 pasos legacy) =====

// Paso 1 - POST /recuperar-password: devuelve la pregunta de seguridad del correo.
// Para correos inexistentes responde con una pregunta señuelo (no revela qué cuentas existen).
registerRoutes('/recuperar-password', 'post', async (req, res) => {
  const email = (req.body.email || '').trim();
  if (!email) return res.status(400).json({ success: false, message: 'Correo electrónico requerido' });
  try {
    const r = await dbq('SELECT pregunta_seguridad, bloqueo_recuperacion_hasta FROM usuarios WHERE LOWER(email) = LOWER(?)', [email]);
    const u = r[0];
    if (u && u.bloqueo_recuperacion_hasta && new Date(u.bloqueo_recuperacion_hasta) > new Date()) {
      return res.status(429).json({ success: false, message: 'Demasiados intentos fallidos. Intenta de nuevo más tarde.' });
    }
    const pregunta = (u && u.pregunta_seguridad) || seguridad.preguntaSenuelo(email);
    res.json({ success: true, pregunta });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Paso 2 - POST /verificar-respuesta: valida la respuesta; con límite de intentos y bloqueo temporal.
// Si es correcta devuelve un token de un solo uso válido por MINUTOS_TOKEN.
registerRoutes('/verificar-respuesta', 'post', async (req, res) => {
  const email = (req.body.email || '').trim();
  const respuesta = req.body.respuesta || '';
  if (!email || !respuesta) return res.status(400).json({ success: false, message: 'Correo y respuesta son requeridos.' });
  const fallo = () => res.status(401).json({ success: false, message: 'Respuesta incorrecta.' });
  try {
    const r = await dbq('SELECT id, respuesta_seguridad, intentos_recuperacion, bloqueo_recuperacion_hasta FROM usuarios WHERE LOWER(email) = LOWER(?)', [email]);
    const u = r[0];
    if (!u || !u.respuesta_seguridad) {
      await bcrypt.compare('x', HASH_DUMMY); // tiempo constante
      return fallo();
    }
    if (u.bloqueo_recuperacion_hasta && new Date(u.bloqueo_recuperacion_hasta) > new Date()) {
      return res.status(429).json({ success: false, message: 'Cuenta bloqueada temporalmente por intentos fallidos. Intenta más tarde.' });
    }
    const ok = await bcrypt.compare(seguridad.normalizarRespuesta(respuesta), u.respuesta_seguridad);
    if (!ok) {
      const intentos = (u.intentos_recuperacion || 0) + 1;
      if (intentos >= seguridad.MAX_INTENTOS) {
        await dbq('UPDATE usuarios SET intentos_recuperacion = 0, bloqueo_recuperacion_hasta = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?', [seguridad.MINUTOS_BLOQUEO, u.id]);
        console.warn(`🚫 Recuperación bloqueada ${seguridad.MINUTOS_BLOQUEO} min para ${email}`);
        return res.status(429).json({ success: false, message: `Demasiados intentos fallidos. Recuperación bloqueada por ${seguridad.MINUTOS_BLOQUEO} minutos.` });
      }
      await dbq('UPDATE usuarios SET intentos_recuperacion = ? WHERE id = ?', [intentos, u.id]);
      return res.status(401).json({ success: false, message: `Respuesta incorrecta. Te quedan ${seguridad.MAX_INTENTOS - intentos} intento(s).` });
    }
    const token = seguridad.generarToken();
    await dbq('UPDATE usuarios SET intentos_recuperacion = 0, bloqueo_recuperacion_hasta = NULL, token_recuperacion = ?, token_recuperacion_expira = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE id = ?', [seguridad.hashToken(token), seguridad.MINUTOS_TOKEN, u.id]);
    res.json({ success: true, token, expiraEnMinutos: seguridad.MINUTOS_TOKEN });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Paso 3 - POST /resetear-password: cambia la contraseña con el token (un solo uso, con expiración)
registerRoutes('/resetear-password', 'post', async (req, res) => {
  const { email, token, nueva_password } = req.body;
  if (!email || !token || !nueva_password) {
    return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
  }
  const errores = seguridad.validarPasswordSegura(nueva_password);
  if (errores.length) {
    return res.status(400).json({ success: false, message: `La contraseña debe tener: ${errores.join(', ')}.` });
  }
  try {
    const r = await dbq('SELECT id, password FROM usuarios WHERE LOWER(email) = LOWER(?) AND token_recuperacion = ? AND token_recuperacion_expira > NOW()', [email, seguridad.hashToken(String(token))]);
    if (!r.length) return res.status(400).json({ success: false, message: 'La sesión de recuperación es inválida o expiró. Inicia el proceso de nuevo.' });
    if (await bcrypt.compare(nueva_password, r[0].password)) {
      return res.status(400).json({ success: false, message: 'La nueva contraseña no puede ser igual a la anterior.' });
    }
    const hash = await bcrypt.hash(nueva_password, 10);
    await dbq('UPDATE usuarios SET password = ?, token_recuperacion = NULL, token_recuperacion_expira = NULL WHERE id = ?', [hash, r[0].id]);
    console.log(`🔑 Contraseña restablecida para ${email}`);
    res.json({ success: true, message: 'Contraseña restablecida exitosamente.' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Endpoint POST /clientes: Guarda un cliente en la tabla 'cliente' (con sanitización y validación)
registerRoutes('/clientes', 'post', (req, res) => {
  const nombre = (req.body.nombre || '').trim();
  const email = (req.body.email || '').trim().toLowerCase();
  const cedula = (req.body.cedula || '').trim();
  const telefono = (req.body.telefono || '').trim();

  if (!nombre || !email) {
    return res.status(400).json({ success: false, message: 'Nombre y correo electrónico son requeridos' });
  }

  const query = 'INSERT INTO cliente (nombre_completo, correo, identificacion, telefono) VALUES (?, ?, ?, ?)';
  db.query(query, [nombre, email, cedula, telefono], (err, result) => {
    if (err) {
      console.error('Error en POST /clientes:', err.message);
      return res.status(500).json({ success: false, message: 'Error al registrar cliente' });
    }
    res.json({ success: true, message: 'Cliente registrado exitosamente', id: result.insertId });
  });
});

// Endpoint POST /vender: Procesa la compra con validación estricta de stock y cantidades positivas
registerRoutes('/vender', 'post', async (req, res) => {
  const { usuario_email, detalles } = req.body;
  const ordenTipo = 'venta';

  if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ success: false, message: 'Detalles de la compra requeridos.' });
  }

  // Validación estricta de integridad de cada ítem (mitigación de manipulación de stock negativa o nula)
  for (const item of detalles) {
    const cant = Number(item.cantidad);
    if (!Number.isInteger(cant) || cant <= 0) {
      return res.status(400).json({
        success: false,
        message: 'La cantidad de cada producto debe ser un número entero positivo mayor a cero.'
      });
    }
  }

  const queryPromise = (conn, sql, params) => new Promise((resolve, reject) => {
    conn.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });

  let connection;
  try {
    // 1. Obtener cliente_id a partir de usuario_email
    const clientResults = await queryPromise(db, 'SELECT id FROM cliente WHERE LOWER(correo) = LOWER(?)', [usuario_email || '']);
    let cliente_id = 1;
    if (clientResults && clientResults.length > 0) {
      cliente_id = clientResults[0].id;
    }

    // 2. Conexión de transacción atómica
    connection = await new Promise((resolve, reject) => {
      db.getConnection((err, conn) => err ? reject(err) : resolve(conn));
    });

    await new Promise((resolve, reject) => {
      connection.beginTransaction(err => err ? reject(err) : resolve());
    });

    const estadoInicial = usuario_email === 'vendedor@hardwarestore.com' ? 'Completado' : 'En Proceso';
    const queryVenta = 'INSERT INTO ventas (fecha, condicion_venta, estado, tipo_orden) VALUES (NOW(), "Contado", ?, ?)';
    const resultVenta = await queryPromise(connection, queryVenta, [estadoInicial, ordenTipo]);
    const ventaId = resultVenta.insertId;

    // 3. Procesar cada producto validando stock disponible antes de debitar
    for (const item of detalles) {
      let precioUnitario = 0;
      const checkStockQuery = 'SELECT nombre, stock, precio_costo, margen_ganancia FROM productos WHERE id = ? FOR UPDATE';
      const stockResult = await queryPromise(connection, checkStockQuery, [item.producto_id]);

        if (stockResult && stockResult.length > 0) {
          const prod = stockResult[0];
          // Validación de disponibilidad en almacén
          if (prod.stock < item.cantidad) {
            throw new Error(`Stock insuficiente para "${prod.nombre || 'Producto #' + item.producto_id}". Disponible: ${prod.stock}, Solicitado: ${item.cantidad}`);
          }

          precioUnitario = (Number(prod.precio_costo) || 0) + (Number(prod.margen_ganancia) || 0);
          const queryUpdateStock = 'UPDATE productos SET stock = stock - ? WHERE id = ?';
          await queryPromise(connection, queryUpdateStock, [item.cantidad, item.producto_id]);
        } else {
          precioUnitario = Number(item.precio) || 0;
        }

        const queryDetail = 'INSERT INTO detalle_venta (cliente_id, ventas_id, productos_id, cantidad, precio) VALUES (?, ?, ?, ?, ?)';
        await queryPromise(connection, queryDetail, [cliente_id, ventaId, item.producto_id, item.cantidad, precioUnitario]);
      }

      // 4. Finalizar transacción
      await new Promise((resolve, reject) => {
        connection.commit(err => err ? reject(err) : resolve());
      });

      connection.release();

      // Disparar notificación push del movimiento de venta a dispositivos registrados
      const atendidoPor = req.usuario?.nombre || 'Mostrador';
      notificaciones.enviarExpoPush(
        '🛒 ¡Nueva Venta Registrada!',
        `Orden #${ventaId} registrada por un total de ₡${Number(total).toLocaleString()} (${atendidoPor}).`,
        { tipo: 'venta', ventaId, total }
      ).catch(() => {});

      return res.json({ success: true, ventaId });
    } catch (error) {
      if (connection) {
        connection.rollback(() => connection.release());
      }
      console.error('Error en /vender:', error.message);
      return res.status(400).json({ success: false, message: error.message || 'Error al procesar la venta' });
    }
  });

// Endpoint GET /ventas: Historial maestro de ventas y clientes (Solo Personal Autorizado: Admin y Vendedor)
// Protegido contra fuga de información de clientes (OWASP A01 y A02)
registerRoutes('/ventas', 'get', requireAuth([1, 2]), (req, res) => {
  const query = `
    SELECT 
      v.id, 
      v.fecha, 
      v.condicion_venta, 
      v.estado, 
      v.tipo_orden,
      SUM(d.cantidad * d.precio) AS total,
      c.nombre_completo AS cliente_nombre,
      c.correo AS cliente_correo,
      c.telefono AS cliente_telefono,
      GROUP_CONCAT(CONCAT(d.cantidad, 'x ', COALESCE(p.nombre, 'Producto')) SEPARATOR ', ') AS descripcion
    FROM ventas v 
    LEFT JOIN detalle_venta d ON v.id = d.ventas_id 
    LEFT JOIN productos p ON d.productos_id = p.id
    LEFT JOIN cliente c ON d.cliente_id = c.id
    GROUP BY v.id 
    ORDER BY v.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) {
      console.error('Error en GET /ventas:', err.message);
      return res.status(500).json({ success: false, message: 'Error al consultar historial de ventas' });
    }
    res.json(results);
  });
});

// Endpoint GET /ventas/:id: Retorna una sola venta para rastreo
// Para clientes anónimos oculta correo y teléfono para impedir scraping de datos personales (OWASP A02)
registerRoutes('/ventas/:id', 'get', requireOptionalAuth, (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  if (isNaN(idNum) || idNum <= 0) {
    return res.status(400).json({ success: false, message: 'Número de orden inválido' });
  }

  const esPersonal = req.usuario && (req.usuario.roles_id === 1 || req.usuario.roles_id === 2);

  const query = `
    SELECT 
      v.id, 
      v.fecha, 
      v.condicion_venta, 
      v.estado, 
      v.tipo_orden,
      SUM(d.cantidad * d.precio) AS total,
      c.nombre_completo AS cliente_nombre,
      ${esPersonal ? 'c.correo AS cliente_correo,' : 'NULL AS cliente_correo,'}
      ${esPersonal ? 'c.telefono AS cliente_telefono,' : 'NULL AS cliente_telefono,'}
      GROUP_CONCAT(CONCAT(d.cantidad, 'x ', COALESCE(p.nombre, 'Producto')) SEPARATOR ', ') AS descripcion
    FROM ventas v 
    LEFT JOIN detalle_venta d ON v.id = d.ventas_id 
    LEFT JOIN productos p ON d.productos_id = p.id
    LEFT JOIN cliente c ON d.cliente_id = c.id
    WHERE v.id = ?
    GROUP BY v.id
  `;
  db.query(query, [idNum], (err, results) => {
    if (err) {
      console.error('Error en GET /ventas/:id:', err.message);
      return res.status(500).json({ success: false, message: 'Error al consultar orden' });
    }
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    res.json(results[0]);
  });
});

// Endpoint PUT /ventas/:id/estado: Actualiza estado con validación estricta (Solo Admin y Vendedor)
registerRoutes('/ventas/:id/estado', 'put', requireAuth([1, 2]), (req, res) => {
  const idNum = parseInt(req.params.id, 10);
  const { estado } = req.body;
  const estadosValidos = ['Pendiente', 'En Proceso', 'Listo para Retirar', 'Entregado', 'Completado', 'Cancelado'];

  if (isNaN(idNum) || !estado || !estadosValidos.includes(estado)) {
    return res.status(400).json({
      success: false,
      message: `ID o estado inválido. Los estados permitidos son: ${estadosValidos.join(', ')}`
    });
  }

  // Obtener el estado actual de la venta para evitar restaurar stock duplicado
  db.query('SELECT estado FROM ventas WHERE id = ?', [idNum], (err, sales) => {
    if (err) return res.status(500).json({ success: false, message: 'Error al verificar venta' });
    if (sales.length === 0) return res.status(404).json({ success: false, message: 'Venta no encontrada' });

    const estadoAnterior = sales[0].estado;

    // Si el estado no cambia, responder con éxito directo
    if (estadoAnterior === estado) {
      return res.json({ success: true, message: 'El estado es el mismo' });
    }

    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ success: false, message: 'Error de conexión' });

      connection.beginTransaction(err => {
        if (err) {
          connection.release();
          return res.status(500).json({ success: false, message: 'Error al iniciar transacción' });
        }

        const finalizarUpdate = () => {
          connection.query('UPDATE ventas SET estado = ? WHERE id = ?', [estado, idNum], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, message: 'Error al actualizar estado' });
              });
            }

            connection.commit(err => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ success: false, message: 'Error al confirmar cambio' });
                });
              }
              connection.release();

              // Disparar notificación push del cambio de estado
              notificaciones.enviarExpoPush(
                '📦 Estado de Orden Actualizado',
                `La orden #${idNum} cambió su estado a: ${estado}.`,
                { tipo: 'orden', ordenId: idNum, nuevoEstado: estado }
              ).catch(() => {});

              res.json({ success: true, message: 'Estado de venta y stock actualizados correctamente' });
            });
          });
        };

        // Si se cancela la orden (y no estaba cancelada previamente), devolvemos el stock
        if (estado === 'Cancelado' && estadoAnterior !== 'Cancelado') {
          connection.query('SELECT productos_id, cantidad FROM detalle_venta WHERE ventas_id = ?', [idNum], (err, details) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, error: err.message });
              });
            }

            let updatesCompleted = 0;
            const totalDetails = details.length;

            if (totalDetails === 0) {
              return finalizarUpdate();
            }

            details.forEach(item => {
              connection.query('UPDATE productos SET stock = stock + ? WHERE id = ?', [item.cantidad, item.productos_id], (err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ success: false, error: err.message });
                  });
                }

                updatesCompleted++;
                if (updatesCompleted === totalDetails) {
                  finalizarUpdate();
                }
              });
            });
          });
        }
        // Si se reactiva una orden cancelada (ej. cambia de Cancelado a Completado o En Proceso), restamos el stock
        else if (estadoAnterior === 'Cancelado' && estado !== 'Cancelado') {
          connection.query('SELECT productos_id, cantidad FROM detalle_venta WHERE ventas_id = ?', [idNum], (err, details) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, error: err.message });
              });
            }

            let updatesCompleted = 0;
            const totalDetails = details.length;

            if (totalDetails === 0) {
              return finalizarUpdate();
            }

            details.forEach(item => {
              connection.query('UPDATE productos SET stock = stock - ? WHERE id = ?', [item.cantidad, item.productos_id], (err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ success: false, error: err.message });
                  });
                }

                updatesCompleted++;
                if (updatesCompleted === totalDetails) {
                  finalizarUpdate();
                }
              });
            });
          });
        } else {
          finalizarUpdate();
        }
      });
    });
  });
});

// Endpoints de retorno y webhook para la pasarela Tilopay (Sandbox)
registerRoutes('/tilopay/redirect', 'get', (req, res) => {
  const { code, result, orderNumber, authCode } = req.query;
  res.send(`
    <html>
      <body style="font-family: sans-serif; text-align: center; padding: 40px; background: #0f172a; color: #fff;">
        <h2>Tilopay Sandbox Response</h2>
        <p>Estado: <strong>${result || 'Completado'}</strong> (Código: ${code})</p>
        <p>Orden #: <strong>${orderNumber}</strong></p>
        <p>Autorización: <strong>${authCode || 'N/A'}</strong></p>
      </body>
    </html>
  `);
});

registerRoutes('/tilopay/webhook', 'post', (req, res) => {
  console.log('💳 Webhook recibido de Tilopay:', req.body);
  res.json({ success: true, message: 'Webhook de Tilopay recibido correctamente' });
});

// Endpoints para gestión de Notificaciones Push Expo
registerRoutes('/notificaciones/token', 'post', (req, res) => {
  const { token, usuario_id } = req.body;
  if (!token) {
    return res.status(400).json({ success: false, message: 'Token es requerido' });
  }
  notificaciones.guardarToken(db, token, usuario_id);
  res.json({ success: true, message: 'Token de notificación registrado correctamente' });
});

registerRoutes('/notificaciones/test', 'post', async (req, res) => {
  const { titulo = '🔔 Notificación de Prueba', cuerpo = 'El sistema de notificaciones está activo.', datos = {} } = req.body;
  const resultado = await notificaciones.enviarExpoPush(titulo, cuerpo, datos);
  res.json({ success: true, resultado });
});

// Endpoints auxiliares para documentación y estado de salud
registerRoutes('/docs', 'get', (req, res) => {
  res.json({ success: true, message: 'Documentación de la API propia' });
});

registerRoutes('/health', 'get', (req, res) => {
  res.json({ success: true, status: 'OK', environment: process.env.NODE_ENV || 'development' });
});

// Verificación de conexión a la base de datos e inicio secuencial de la API
console.log('🔍 Verificando conexión a la base de datos...');
db.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Error de conexión a la base de datos:', err.message);
    process.exit(1);
  }

  console.log('✅ Conexión a MySQL establecida correctamente');
  connection.release();

  app.listen(PORT, () => {
    console.log('🚀 Servidor iniciado correctamente');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`📋 API Base: http://localhost:${PORT}${API_PREFIX}`);
    console.log(`📖 Documentación: http://localhost:${PORT}/docs`);
    console.log(`💚 Health Check: http://localhost:${PORT}/health`);
    console.log(`🔧 Entorno: ${process.env.NODE_ENV || 'development'}`);
  });
});

// Captura de cierre seguro para liberar recursos de MySQL ante señales del sistema (SIGINT)
process.on('SIGINT', () => {
  console.log('\n🛑 Recibida señal SIGINT (Ctrl+C), cerrando servidor...');
  db.end(err => {
    if (err) console.error('Error al desconectar el pool de MySQL:', err.message);
    console.log('✅ Servidor cerrado correctamente');
    process.exit(0);
  });
});
