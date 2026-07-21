const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'mydb',
  port: 3306
});

connection.connect(err => {
  if (err) {
    console.error('Error connecting:', err);
    process.exit(1);
  }
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
  connection.query(query, (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log('VENTAS TOTALES:', rows.length);
      console.log('VENTAS DATA:', rows);
    }
    connection.end();
    process.exit(0);
  });
});
