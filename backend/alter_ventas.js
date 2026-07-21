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
    console.error('Error connecting: ' + err.stack);
    process.exit(1);
  }
  console.log('Connected to database.');
  
  connection.query("ALTER TABLE ventas ADD COLUMN tipo_orden VARCHAR(50) DEFAULT 'venta';", (err, results) => {
    if (err) {
      console.log('Column might already exist or error occurred:', err.message);
    } else {
      console.log('Successfully added tipo_orden column to ventas table.');
    }
    connection.end();
    process.exit(0);
  });
});
