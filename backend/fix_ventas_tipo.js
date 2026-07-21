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
    console.error('Error al conectar:', err.message);
    process.exit(1);
  }
  console.log('Conectado a MySQL para actualizar tipo_orden en ventas...');

  const updateQuery = `
    UPDATE ventas 
    SET tipo_orden = 'ensamble' 
    WHERE id IN (
      SELECT ventas_id FROM detalle_venta GROUP BY ventas_id HAVING COUNT(*) >= 2
    ) OR id IN (
      SELECT ventas_id FROM detalle_venta WHERE productos_id IS NULL OR productos_id = 9999
    )
  `;

  connection.query(updateQuery, (err, result) => {
    if (err) {
      console.error('Error al actualizar:', err.message);
    } else {
      console.log(`✅ ${result.affectedRows} órdenes actualizadas correctamente como tipo_orden = 'ensamble' en MySQL.`);
    }
    connection.end();
    process.exit(0);
  });
});
