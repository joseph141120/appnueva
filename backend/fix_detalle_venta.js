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
  console.log('Conectado a MySQL para corregir detalle_venta...');

  // Si existe una restricción de llave primaria restrictiva en (cliente_id, ventas_id), agregamos (productos_id) a la llave o un UNIQUE ID
  connection.query("ALTER TABLE detalle_venta ADD COLUMN id INT NOT NULL AUTO_INCREMENT UNIQUE KEY FIRST", (err) => {
    if (err) {
      console.log('Resultado / aviso:', err.message);
    } else {
      console.log('✅ Columna id AUTO_INCREMENT UNIQUE KEY agregada con éxito a detalle_venta.');
    }
    connection.end();
    process.exit(0);
  });
});
