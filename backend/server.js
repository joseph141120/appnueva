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
  const query = "SELECT p.id, p.nombre, p.descripcion, p.stock, p.precio_costo, p.margen_ganancia, p.imagen, c.descripcion AS categoria_nombre FROM productos p JOIN categorias c ON p.categorias_id = c.id";
  db.query(query, (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json(results);
  });
});

// Endpoint POST /productos: Inserta nuevos productos en la base de datos
registerRoutes('/productos', 'post', (req, res) => {
  const { nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, imagen } = req.body;
  const query = 'INSERT INTO productos (nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)';
  db.query(query, [nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, imagen || null], (err, result) => {
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
  const { nombre, descripcion, precio_costo, margen_ganancia, categorias_id, imagen } = req.body;
  const query = 'UPDATE productos SET nombre = ?, descripcion = ?, precio_costo = ?, margen_ganancia = ?, categorias_id = ?, imagen = ? WHERE id = ?';
  db.query(query, [nombre, descripcion, precio_costo, margen_ganancia, categorias_id, imagen || null, id], (err, result) => {
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

// Endpoint POST /clientes: Guarda un cliente en la tabla 'cliente' (sin contraseñas)
registerRoutes('/clientes', 'post', (req, res) => {
  const { nombre, email, cedula, telefono } = req.body;
  const query = 'INSERT INTO cliente (nombre_completo, correo, identificacion, telefono) VALUES (?, ?, ?, ?)';
  db.query(query, [nombre, email, cedula, telefono], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.json({ success: true, message: 'Cliente registrado exitosamente', id: result.insertId });
  });
});

// Endpoint POST /vender: Procesa la compra mediante Transacciones SQL
registerRoutes('/vender', 'post', (req, res) => {
  const { usuario_email, detalles } = req.body;

  // Busca cliente_id a partir de usuario_email, default a Cliente General (ID 1)
  db.query('SELECT id FROM cliente WHERE correo = ?', [usuario_email], (err, clientResults) => {
    let cliente_id = 1;
    if (!err && clientResults && clientResults.length > 0) {
      cliente_id = clientResults[0].id;
    }

    db.getConnection((err, connection) => {
      if (err) return res.status(500).json({ success: false, error: err.message });

      connection.beginTransaction(err => {
        if (err) {
          connection.release();
          return res.status(500).json({ success: false, error: err.message });
        }

        // 1. Registrar la venta en la tabla maestra 'ventas' (id, fecha, condicion_venta, estado)
        const estadoInicial = usuario_email === 'vendedor@hardwarestore.com' ? 'Completado' : 'En Proceso';
        const queryVenta = 'INSERT INTO ventas (fecha, condicion_venta, estado) VALUES (NOW(), "Contado", ?)';
        connection.query(queryVenta, [estadoInicial], (err, resultVenta) => {
          if (err) {
            return connection.rollback(() => {
              connection.release();
              res.status(500).json({ success: false, error: err.message });
            });
          }

          const ventaId = resultVenta.insertId;
          let queriesCompleted = 0;
          const totalDetails = detalles.length;

          if (totalDetails === 0) {
            return connection.commit(err => {
              if (err) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(500).json({ success: false, error: err.message });
                });
              }
              connection.release();
              res.json({ success: true, ventaId });
            });
          }

          // 2. Insertar desglose en 'detalle_venta' y decrementar stock en 'productos'
          detalles.forEach(item => {
            const checkStockQuery = 'SELECT stock, precio_costo, margen_ganancia FROM productos WHERE id = ?';
            connection.query(checkStockQuery, [item.producto_id], (err, stockResult) => {
              if (err || stockResult.length === 0 || stockResult[0].stock < item.cantidad) {
                return connection.rollback(() => {
                  connection.release();
                  res.status(400).json({ success: false, error: 'Stock insuficiente o producto inexistente.' });
                });
              }

              const prod = stockResult[0];
              const precioUnitario = prod.precio_costo + prod.margen_ganancia;

              // Insertar en detalle_venta utilizando columnas correctas (cliente_id, precio)
              const queryDetail = 'INSERT INTO detalle_venta (cliente_id, ventas_id, productos_id, cantidad, precio) VALUES (?, ?, ?, ?, ?)';
              connection.query(queryDetail, [cliente_id, ventaId, item.producto_id, item.cantidad, precioUnitario], (err) => {
                if (err) {
                  return connection.rollback(() => {
                    connection.release();
                    res.status(500).json({ success: false, error: err.message });
                  });
                }

                const queryUpdateStock = 'UPDATE productos SET stock = stock - ? WHERE id = ?';
                connection.query(queryUpdateStock, [item.cantidad, item.producto_id], (err) => {
                  if (err) {
                    return connection.rollback(() => {
                      connection.release();
                      res.status(500).json({ success: false, error: err.message });
                    });
                  }

                  queriesCompleted++;
                  if (queriesCompleted === totalDetails) {
                    connection.commit(err => {
                      if (err) {
                        return connection.rollback(() => {
                          connection.release();
                          res.status(500).json({ success: false, error: err.message });
                        });
                      }
                      connection.release();
                      res.json({ success: true, ventaId });
                    });
                  }
                });
              });
            });
          });
        });
      });
    });
  });
});

// Endpoint GET /ventas: Historial de la tabla maestra de ventas con sumatoria, descripciones y datos del cliente
registerRoutes('/ventas', 'get', (req, res) => {
  const query = `
    SELECT 
      v.id, 
      v.fecha, 
      v.condicion_venta, 
      v.estado, 
      SUM(d.cantidad * d.precio) AS total,
      c.nombre_completo AS cliente_nombre,
      c.correo AS cliente_correo,
      c.telefono AS cliente_telefono,
      GROUP_CONCAT(CONCAT(d.cantidad, 'x ', p.nombre) SEPARATOR ', ') AS descripcion
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
