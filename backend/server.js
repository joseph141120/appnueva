require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

app.use(cors());
app.use(express.json());

// Configuración de la base de datos MariaDB / MySQL
const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '1234',
  database: process.env.DB_NAME || 'mydb',
  port: parseInt(process.env.DB_PORT || '3306', 10)
});



// Helper para envolver rutas con y sin el prefijo de la API
const registerRoutes = (path, method, handler) => {
  app[method](`${API_PREFIX}${path}`, handler);
  app[method](path, handler);
};

// Endpoint GET /productos: Trae los componentes realizando un JOIN con categorías
registerRoutes('/productos', 'get', (req, res) => {
  const query = "SELECT p.id, p.nombre, p.descripcion, p.stock, p.precio_costo, p.margen_ganancia, p.imagen, p.descuento_porcentaje, COALESCE(c.descripcion, 'Accesorios') AS categoria_nombre FROM productos p LEFT JOIN categorias c ON p.categorias_id = c.id";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(results);
  });
});

// Endpoint POST /productos: Inserta nuevos productos en la base de datos
registerRoutes('/productos', 'post', (req, res) => {
  const { nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, imagen, descuento_porcentaje } = req.body;
  const query = 'INSERT INTO productos (nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, imagen, descuento_porcentaje) VALUES (?, ?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, imagen || null, descuento_porcentaje || 0], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Producto insertado en MySQL', id: result.insertId });
  });
});

// Endpoint GET /categorias: Trae todas las categorías
registerRoutes('/categorias', 'get', (req, res) => {
  db.query('SELECT * FROM categorias WHERE estado = 1 OR estado IS NULL', (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(results);
  });
});

// Endpoint POST /categorias: Registra una nueva categoría
registerRoutes('/categorias', 'post', (req, res) => {
  const { descripcion } = req.body;
  if (!descripcion) return res.status(400).json({ success: false, message: 'Descripción requerida' });
  db.query('INSERT INTO categorias (descripcion, estado) VALUES (?, 1)', [descripcion], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Categoría agregada exitosamente', id: result.insertId });
  });
});

// Endpoint PUT /productos/:id/reabastecer: Reabastece stock
registerRoutes('/productos/:id/reabastecer', 'put', (req, res) => {
  const { id } = req.params;
  const { stock_adicional } = req.body;
  const query = 'UPDATE productos SET stock = stock + ? WHERE id = ?';
  db.query(query, [stock_adicional, id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Stock actualizado' });
  });
});

// Endpoint PUT /productos/:id: Actualiza detalles de un producto existente
registerRoutes('/productos/:id', 'put', (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio_costo, margen_ganancia, categorias_id, imagen, descuento_porcentaje } = req.body;
  const query = 'UPDATE productos SET nombre = ?, descripcion = ?, precio_costo = ?, margen_ganancia = ?, categorias_id = ?, imagen = ?, descuento_porcentaje = ? WHERE id = ?';
  db.query(query, [nombre, descripcion, precio_costo, margen_ganancia, categorias_id, imagen || null, descuento_porcentaje || 0, id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Producto actualizado exitosamente en MySQL' });
  });
});

// Endpoint POST /login: Verifica credenciales contra base de datos
registerRoutes('/login', 'post', (req, res) => {
  const { email, password } = req.body;
  const query = 'SELECT * FROM usuarios WHERE email = ?';
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const usuario = results[0];
    const coinciden = await bcrypt.compare(password, usuario.password);
    if (!coinciden) return res.status(401).json({ success: false, message: 'Contraseña incorrecta' });

    res.json({ success: true, rol: usuario.roles_id, email: usuario.email });
  });
});

// Endpoint POST /usuarios/registro: Añade empleados encriptando la clave con bcryptjs
registerRoutes('/usuarios/registro', 'post', (req, res) => {
  const { email, password, rol_id } = req.body;
  db.query('SELECT * FROM usuarios WHERE email = ?', [email], async (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length > 0) return res.status(400).json({ success: false, message: 'El correo ya existe' });

    try {
      const hash = await bcrypt.hash(password, 10);
      const query = 'INSERT INTO usuarios (email, password, token_app, roles_id) VALUES (?, ?, ?, ?)';
      db.query(query, [email, hash, '', rol_id], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: err.message });
        res.json({ success: true, message: 'Personal registrado exitosamente', id: result.insertId });
      });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
});

// Endpoint POST /recuperar-password: Genera un código de verificación para recuperar contraseña por correo
registerRoutes('/recuperar-password', 'post', (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Correo electrónico requerido' });

  db.query('SELECT id, email FROM usuarios WHERE LOWER(email) = LOWER(?)', [email], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: 'No existe una cuenta registrada con este correo electrónico.' });
    }

    const codigoHex = Math.floor(100000 + Math.random() * 900000).toString();
    db.query('UPDATE usuarios SET token_recuperacion = ? WHERE id = ?', [codigoHex, results[0].id], (errUpd) => {
      if (errUpd) return res.status(500).json({ success: false, error: errUpd.message });
      console.log(`📩 Simulación de correo enviado a ${email}: Su código de recuperación de contraseña es: ${codigoHex}`);
      return res.json({
        success: true,
        message: `Código de recuperación enviado al correo ${email}.`,
        codigoSimulado: codigoHex
      });
    });
  });
});

// Endpoint POST /resetear-password: Valida el código y actualiza la contraseña en MySQL
registerRoutes('/resetear-password', 'post', async (req, res) => {
  const { email, codigo, nueva_password } = req.body;
  if (!email || !codigo || !nueva_password) {
    return res.status(400).json({ success: false, message: 'Todos los campos son requeridos.' });
  }

  db.query('SELECT id, token_recuperacion FROM usuarios WHERE LOWER(email) = LOWER(?)', [email], async (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (!results || results.length === 0) {
      return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const usuario = results[0];
    if (!usuario.token_recuperacion || usuario.token_recuperacion.trim() !== codigo.toString().trim()) {
      return res.status(400).json({ success: false, message: 'Código de verificación incorrecto o expirado.' });
    }

    try {
      const hash = await bcrypt.hash(nueva_password, 10);
      db.query('UPDATE usuarios SET password = ?, token_recuperacion = NULL WHERE id = ?', [hash, usuario.id], (errUpd) => {
        if (errUpd) return res.status(500).json({ success: false, error: errUpd.message });
        return res.json({ success: true, message: 'Contraseña restablecida exitosamente.' });
      });
    } catch (e) {
      return res.status(500).json({ success: false, error: e.message });
    }
  });
});

// Endpoint POST /clientes: Guarda un cliente en la tabla 'cliente' (sin contraseñas)
registerRoutes('/clientes', 'post', (req, res) => {
  const { nombre, email, cedula, telefono } = req.body;
  const query = 'INSERT INTO cliente (nombre_completo, correo, identificacion, telefono) VALUES (?, ?, ?, ?)';
  db.query(query, [nombre, email, cedula, telefono], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Cliente registrado exitosamente', id: result.insertId });
  });
});

// Endpoint POST /vender: Procesa la compra mediante Transacciones SQL secuenciales con Async/Await
registerRoutes('/vender', 'post', async (req, res) => {
  const { usuario_email, detalles, tipo_orden } = req.body;
  const esEnsambleAuto = (tipo_orden === 'ensamble') || 
                         (detalles && Array.isArray(detalles) && detalles.some(d => d.producto_id === 9999));
  const ordenTipo = esEnsambleAuto ? 'ensamble' : 'venta';

  if (!detalles || !Array.isArray(detalles) || detalles.length === 0) {
    return res.status(400).json({ success: false, error: 'Detalles de la venta requeridos.' });
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
    const clientResults = await queryPromise(db, 'SELECT id FROM cliente WHERE correo = ?', [usuario_email]);
    let cliente_id = 1;
    if (clientResults && clientResults.length > 0) {
      cliente_id = clientResults[0].id;
    }

    // 2. Conexión de transacción
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

    // 3. Procesar cada componente secuencialmente soportando ítems de ensamble virtual
    for (const item of detalles) {
      let precioUnitario = 0;
      const esVirtual = item.producto_id === 9999;

      if (esVirtual) {
        precioUnitario = 15000;
      } else {
        const checkStockQuery = 'SELECT stock, precio_costo, margen_ganancia FROM productos WHERE id = ?';
        const stockResult = await queryPromise(connection, checkStockQuery, [item.producto_id]);

        if (stockResult && stockResult.length > 0) {
          const prod = stockResult[0];
          precioUnitario = (Number(prod.precio_costo) || 0) + (Number(prod.margen_ganancia) || 0);
          const queryUpdateStock = 'UPDATE productos SET stock = stock - ? WHERE id = ?';
          await queryPromise(connection, queryUpdateStock, [item.cantidad, item.producto_id]);
        } else {
          precioUnitario = item.precio || 0;
        }
      }

      const queryDetail = 'INSERT INTO detalle_venta (cliente_id, ventas_id, productos_id, cantidad, precio) VALUES (?, ?, ?, ?, ?)';
      await queryPromise(connection, queryDetail, [cliente_id, ventaId, esVirtual ? null : item.producto_id, item.cantidad, precioUnitario]);
    }

    // 4. Finalizar transacción
    await new Promise((resolve, reject) => {
      connection.commit(err => err ? reject(err) : resolve());
    });

    connection.release();
    return res.json({ success: true, ventaId });
  } catch (error) {
    if (connection) {
      connection.rollback(() => connection.release());
    }
    console.error('Error en /vender:', error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint GET /ventas: Historial de la tabla maestra de ventas con sumatoria, descripciones y datos del cliente
registerRoutes('/ventas', 'get', (req, res) => {
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
      GROUP_CONCAT(CONCAT(d.cantidad, 'x ', COALESCE(p.nombre, 'Servicio de Ensamble de PC')) SEPARATOR ', ') AS descripcion
    FROM ventas v 
    LEFT JOIN detalle_venta d ON v.id = d.ventas_id 
    LEFT JOIN productos p ON d.productos_id = p.id
    LEFT JOIN cliente c ON d.cliente_id = c.id
    GROUP BY v.id 
    ORDER BY v.id DESC
  `;
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(results);
  });
});

// Endpoint GET /ventas/:id: Retorna una sola venta para el rastreo del cliente
registerRoutes('/ventas/:id', 'get', (req, res) => {
  const { id } = req.params;
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
      GROUP_CONCAT(CONCAT(d.cantidad, 'x ', p.nombre) SEPARATOR ', ') AS descripcion
    FROM ventas v 
    LEFT JOIN detalle_venta d ON v.id = d.ventas_id 
    LEFT JOIN productos p ON d.productos_id = p.id
    LEFT JOIN cliente c ON d.cliente_id = c.id
    WHERE v.id = ?
    GROUP BY v.id
  `;
  db.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (results.length === 0) return res.status(404).json({ success: false, message: 'Orden no encontrada' });
    res.json(results[0]);
  });
});

// Endpoint PUT /ventas/:id/estado: Actualiza el estado de una venta (Completado o Cancelado) y ajusta stock
registerRoutes('/ventas/:id/estado', 'put', (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  // Obtener el estado actual de la venta para evitar restaurar stock duplicado
  db.query('SELECT estado FROM ventas WHERE id = ?', [id], (err, sales) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    if (sales.length === 0) return res.status(404).json({ success: false, message: 'Venta no encontrada' });

    const estadoAnterior = sales[0].estado;

    // Si el estado no cambia, responder con éxito directo
    if (estadoAnterior === estado) {
      return res.json({ success: true, message: 'El estado es el mismo' });
    }

    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      connection.beginTransaction(err => {
        if (err) {
          connection.release();
          return res.status(500).json({ success: false, error: err.message });
        }

        const finalizarUpdate = () => {
          connection.query('UPDATE ventas SET estado = ? WHERE id = ?', [estado, id], (err) => {
            if (err) {
              return connection.rollback(() => {
                connection.release();
                res.status(500).json({ success: false, error: err.message });
              });
            }

            connection.commit(err => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ success: false, error: err.message });
                });
              }
              connection.release();
              res.json({ success: true, message: 'Estado de venta y stock actualizados correctamente' });
            });
          });
        };

        // Si se cancela la orden (y no estaba cancelada previamente), devolvemos el stock
        if (estado === 'Cancelado' && estadoAnterior !== 'Cancelado') {
          connection.query('SELECT productos_id, cantidad FROM detalle_venta WHERE ventas_id = ?', [id], (err, details) => {
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
          connection.query('SELECT productos_id, cantidad FROM detalle_venta WHERE ventas_id = ?', [id], (err, details) => {
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
