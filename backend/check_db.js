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
  connection.query('SELECT p.id, p.nombre, p.categorias_id, c.descripcion AS cat FROM productos p LEFT JOIN categorias c ON p.categorias_id = c.id', (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log('TOTAL PRODUCTS IN DB:', rows.length);
      console.log('SAMPLE PRODUCTS:', rows.slice(0, 45));
    }
    connection.end();
    process.exit(0);
  });
});
