const mysql = require('mysql2/promise');

async function testSale() {
  const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '1234',
    database: 'mydb',
    port: 3306
  });

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    const [vRes] = await connection.query('INSERT INTO ventas (fecha, condicion_venta, estado, tipo_orden) VALUES (NOW(), "Contado", "En Proceso", "ensamble")');
    const vId = vRes.insertId;

    // Insert 5 components for order vId
    for (let i = 1; i <= 5; i++) {
      await connection.query('INSERT INTO detalle_venta (cliente_id, ventas_id, productos_id, cantidad, precio) VALUES (1, ?, ?, 1, 50000)', [vId, i]);
    }

    await connection.commit();
    connection.release();
    console.log(`🎉 TEST VENTA ENSAMBLE EXITOSA! Orden de ensamble #${vId} insertada en MySQL con 5 componentes.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ FAIL:', err.message);
    process.exit(1);
  }
}

testSale();
