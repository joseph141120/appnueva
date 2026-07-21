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
  console.log('Conectado a MySQL para corregir llaves de detalle_venta...');

  // Eliminamos cualquier llave primaria duplicada restrictiva en (cliente_id, ventas_id) o similar
  connection.query("SHOW KEYS FROM detalle_venta WHERE Key_name = 'PRIMARY'", (err, rows) => {
    if (err) console.error(err);
    console.log('Llaves primarias actuales en detalle_venta:', rows);

    // Intentamos drop primary key y establecer id AUTO_INCREMENT como PRIMARY KEY única
    connection.query("ALTER TABLE detalle_venta DROP PRIMARY KEY", (errDrop) => {
      if (errDrop) console.log('Aviso al borrar PK:', errDrop.message);

      connection.query("ALTER TABLE detalle_venta ADD PRIMARY KEY (id)", (errAdd) => {
        if (errAdd) console.log('Aviso al añadir PK id:', errAdd.message);
        else console.log('✅ ÉXITO: id ahora es la PRIMARY KEY única de detalle_venta.');

        connection.end();
        process.exit(0);
      });
    });
  });
});
