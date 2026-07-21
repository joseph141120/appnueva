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
  connection.query("SHOW KEYS FROM detalle_venta", (err, rows) => {
    console.log('KEYS ON detalle_venta:', rows);
    connection.end();
    process.exit(0);
  });
});
