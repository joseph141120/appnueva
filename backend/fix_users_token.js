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
  console.log('Conectado a MySQL para agregar token_recuperacion a usuarios...');

  connection.query("ALTER TABLE usuarios ADD COLUMN token_recuperacion VARCHAR(20) NULL", err => {
    if (err) {
      console.log('Resultado / aviso:', err.message);
    } else {
      console.log('✅ Columna token_recuperacion agregada exitosamente a la tabla usuarios.');
    }
    connection.end();
    process.exit(0);
  });
});
