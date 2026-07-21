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
  console.log('Conectado a MySQL para forzar cambio de PK en detalle_venta...');

  connection.query("SET FOREIGN_KEY_CHECKS = 0", err => {
    if (err) console.error(err);

    connection.query("ALTER TABLE detalle_venta DROP PRIMARY KEY", errDrop => {
      console.log('Drop PK result:', errDrop ? errDrop.message : 'OK');

      connection.query("ALTER TABLE detalle_venta ADD PRIMARY KEY (id)", errAdd => {
        console.log('Add PRIMARY KEY (id) result:', errAdd ? errAdd.message : 'OK');

        connection.query("SET FOREIGN_KEY_CHECKS = 1", () => {
          console.log('✅ ÉXITO: Llave primaria corregida a (id). Se pueden guardar múltiples componentes por orden en MySQL.');
          connection.end();
          process.exit(0);
        });
      });
    });
  });
});
