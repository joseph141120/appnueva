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
    console.error(err);
    process.exit(1);
  }
  connection.query("SET FOREIGN_KEY_CHECKS = 0", () => {
    connection.query("ALTER TABLE detalle_venta MODIFY COLUMN productos_id INT NULL", err => {
      console.log('Modify productos_id NULLABLE result:', err ? err.message : 'OK');
      connection.query("SET FOREIGN_KEY_CHECKS = 1", () => {
        console.log('✅ productos_id en detalle_venta ahora permite NULL.');
        connection.end();
        process.exit(0);
      });
    });
  });
});
