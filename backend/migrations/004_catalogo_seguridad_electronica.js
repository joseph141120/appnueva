/**
 * Migración para actualizar el catálogo de categorías y productos
 * al giro de negocio de JLK SOLUTIONS SECURITY:
 * Cámaras de seguridad, DVRs, Cercos eléctricos, Motores de portón, Controles, Alarmas y Accesorios.
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

const securityCategories = [
  { id: 1, descripcion: 'Cámaras de Seguridad' },
  { id: 2, descripcion: 'Grabadores DVR y NVR' },
  { id: 3, descripcion: 'Cercos Eléctricos' },
  { id: 4, descripcion: 'Motores para Portones' },
  { id: 5, descripcion: 'Controles y Mandos' },
  { id: 6, descripcion: 'Alarmas y Sensores' },
  { id: 7, descripcion: 'Accesorios y Conectividad' }
];

const securityProducts = [
  // Categoría 1: Cámaras de Seguridad
  { id: 1, nombre: 'Cámara Domo HD 1080p Visión Nocturna Infrarroja', descripcion: 'Cámara domo para interiores con lente de 2.8mm, ángulo amplio de 103° y visión nocturna IR hasta 20 metros.', stock: 35, costo: 11000, ganancia: 7500, catId: 1, desc: 0 },
  { id: 2, nombre: 'Cámara Bullet IP 4K Exterior Metálica IP67', descripcion: 'Cámara bullet impermeable con resolución 4K Ultra HD, sensor de movimiento inteligente y visión nocturna de 30m.', stock: 18, costo: 32000, ganancia: 16000, catId: 1, desc: 10 },
  { id: 3, nombre: 'Cámara PTZ WiFi Robótica 360° Seguimiento Inteligente', descripcion: 'Cámara de seguimiento automático con giro 355° horizontal y 90° vertical, audio bidireccional y alertas al celular.', stock: 22, costo: 22000, ganancia: 13000, catId: 1, desc: 0 },
  { id: 4, nombre: 'Cámara Domo IP PoE 5MP con Micrófono Integrado', descripcion: 'Cámara PoE de alta definición para techo, carcasa antivandálica IK10 y captura de audio ambiental en tiempo real.', stock: 14, costo: 26000, ganancia: 12000, catId: 1, desc: 0 },
  { id: 5, nombre: 'Cámara de Seguridad Solar WiFi 4G Exterior', descripcion: 'Cámara autónoma con panel solar integrado y batería de litio recargable. No requiere cables de corriente.', stock: 10, costo: 55000, ganancia: 25000, catId: 1, desc: 15 },
  { id: 6, nombre: 'Cámara Tipo Domo Varifocal Motorizada 2.8-12mm', descripcion: 'Zoom óptico motorizado 4X para enfocar rostros o placas vehiculares a distancia con nitidez superior.', stock: 8, costo: 42000, ganancia: 18000, catId: 1, desc: 0 },

  // Categoría 2: Grabadores DVR y NVR
  { id: 7, nombre: 'Grabador DVR 4 Canales 1080p Lite H.265+', descripcion: 'DVR pentahíbrido de 4 canales para cámaras analógicas y HD. Compresión H.265+ para ahorrar espacio en disco.', stock: 12, costo: 25000, ganancia: 14000, catId: 2, desc: 0 },
  { id: 8, nombre: 'Grabador DVR 8 Canales 5MP con Reconocimiento Facial', descripcion: 'DVR de 8 canales con inteligencia artificial, detección de vehículos/humanos y salida HDMI/VGA.', stock: 15, costo: 38000, ganancia: 19000, catId: 2, desc: 0 },
  { id: 9, nombre: 'Grabador NVR 16 Canales PoE 4K Ultra HD', descripcion: 'NVR profesional de 16 puertos PoE integrados para conectar cámaras IP directamente sin fuentes externas.', stock: 6, costo: 95000, ganancia: 45000, catId: 2, desc: 5 },
  { id: 10, nombre: 'Disco Duro 1TB Western Digital Purple CCTV 24/7', descripcion: 'Disco duro grado vigilancia optimizado para grabación continua sin interrupciones ni pérdida de cuadros.', stock: 20, costo: 32000, ganancia: 13000, catId: 2, desc: 0 },
  { id: 11, nombre: 'Disco Duro 2TB Western Digital Purple CCTV 24/7', descripcion: 'Capacidad de 2 Terabytes para almacenar hasta 30 días de grabación continua en alta definición.', stock: 16, costo: 46000, ganancia: 17000, catId: 2, desc: 0 },
  { id: 12, nombre: 'Disco Duro 4TB Seagate SkyHawk Surveillance', descripcion: 'Almacenamiento masivo para DVRs y NVRs empresariales de alta exigencia.', stock: 8, costo: 68000, ganancia: 22000, catId: 2, desc: 0 },

  // Categoría 3: Cercos Eléctricos
  { id: 13, nombre: 'Energizador de Cerco Eléctrico 10.000V con Batería', descripcion: 'Equipo central para cerco perimetral con descarga disuasiva no letal de 10.000 voltios y alarma sonora.', stock: 14, costo: 65000, ganancia: 30000, catId: 3, desc: 0 },
  { id: 14, nombre: 'Energizador Inteligente WiFi 15.000V Control por App', descripcion: 'Energizador con conexión WiFi para activar/desactivar y recibir notificaciones de corte de línea en el celular.', stock: 9, costo: 92000, ganancia: 38000, catId: 3, desc: 5 },
  { id: 15, nombre: 'Kit 25 Aisladores Tubulares Templadores para Cerco', descripcion: 'Aisladores reforzados con protección UV contra rayos solares e intemperie para postes esquineros.', stock: 40, costo: 8500, ganancia: 5500, catId: 3, desc: 0 },
  { id: 16, nombre: 'Bobina de Alambre de Aluminio Especial para Cerco 500m', descripcion: 'Alambre de aleación de aluminio de alta conductividad eléctrica y libre de óxido para perímetro seguro.', stock: 25, costo: 22000, ganancia: 11000, catId: 3, desc: 0 },
  { id: 17, nombre: 'Sirena de Alta Potencia 30W Doble Tono para Cerco', descripcion: 'Sirena acústica de 120 decibeles con sonido penetrante para disuasión perimetral inmediata.', stock: 30, costo: 7500, ganancia: 5000, catId: 3, desc: 0 },
  { id: 18, nombre: 'Letrero de Advertencia Reglamentario Peligro Cerco Eléctrico', descripcion: 'Placa plástica de alta visibilidad con texto normativo obligatorio para cercos electrificados.', stock: 60, costo: 1500, ganancia: 1500, catId: 3, desc: 0 },

  // Categoría 4: Motores para Portones
  { id: 19, nombre: 'Motor Corredizo Rápido 800kg para Portón Eléctrico', descripcion: 'Kit de motor para portón corredizo de hasta 800 kilos de peso. Apertura rápida y silenciosa.', stock: 10, costo: 145000, ganancia: 65000, catId: 4, desc: 10 },
  { id: 20, nombre: 'Motor Corredizo Industrial 1500kg Alto Tráfico', descripcion: 'Motor de uso rudo para portones pesados de condominios o bodegas con engranajes de bronce bañados en aceite.', stock: 5, costo: 240000, ganancia: 95000, catId: 4, desc: 0 },
  { id: 21, nombre: 'Kit Motor Batiente de 2 Brazos Hidráulicos 3m por Hoja', descripcion: 'Sistema completo para portones de 2 hojas abatibles con desaceleración suave y llaves de desbloqueo manual.', stock: 4, costo: 280000, ganancia: 110000, catId: 4, desc: 0 },
  { id: 22, nombre: 'Tramo de Cremallera de Acero Galvanizado M4 (1 Metro)', descripcion: 'Barra dentada de acero zincado de 1 metro con espaciadores para fijar en portones corredizos.', stock: 50, costo: 6000, ganancia: 4500, catId: 4, desc: 0 },
  { id: 23, nombre: 'Sensor de Fotocelda Anti-Aplastamiento para Portón', descripcion: 'Par de sensores infrarrojos de seguridad que detienen e invierten el portón si detectan autos o personas.', stock: 24, costo: 12000, ganancia: 8000, catId: 4, desc: 0 },
  { id: 24, nombre: 'Luz Estroboscópica Destellante de Seguridad 12V/24V', descripcion: 'Lámpara indicadora de movimiento para advertir la apertura o cierre del portón eléctrico a peatones.', stock: 20, costo: 8500, ganancia: 5500, catId: 4, desc: 0 },

  // Categoría 5: Controles y Mandos de Portón
  { id: 25, nombre: 'Control Remoto 4 Botones 433MHz para Portón Eléctrico', descripcion: 'Control transmisor de largo alcance con 4 canales para operar hasta 4 portones o luces distintas.', stock: 80, costo: 4500, ganancia: 4500, catId: 5, desc: 0 },
  { id: 26, nombre: 'Control Metálico Llavero Clonador Universal Multicódigo', descripcion: 'Control portátil reforzado en aluminio con capacidad de clonar códigos fijos y variables comunes.', stock: 50, costo: 6000, ganancia: 5000, catId: 5, desc: 0 },
  { id: 27, nombre: 'Módulo Receptor Inalámbrico Universal 2 Canales', descripcion: 'Receptor de radiofrecuencia para adaptar controles modernos a cualquier marca de motor de portón.', stock: 25, costo: 14000, ganancia: 8500, catId: 5, desc: 0 },
  { id: 28, nombre: 'Pulsador Inalámbrico de Pared para Portón Eléctrico', descripcion: 'Botonera de pared sin cables para abrir o cerrar el portón desde el interior de la casa u oficina.', stock: 20, costo: 9000, ganancia: 6000, catId: 5, desc: 0 },
  { id: 29, nombre: 'Receptor WiFi Inteligente para Portón (Apertura por Celular)', descripcion: 'Módulo inteligente compatible con Tuya/SmartLife para abrir el portón desde cualquier parte del mundo.', stock: 15, costo: 16000, ganancia: 10000, catId: 5, desc: 0 },

  // Categoría 6: Alarmas y Sensores
  { id: 30, nombre: 'Panel de Alarma Inteligente WiFi / GSM con Sirena', descripcion: 'Central de alarma híbrida inalámbrica con llamada automática por SIM celular y notificaciones por aplicación.', stock: 10, costo: 58000, ganancia: 28000, catId: 6, desc: 10 },
  { id: 31, nombre: 'Sensor de Movimiento PIR Inalámbrico Antimascotas', descripcion: 'Detector de presencia infrarrojo pasivo que ignora mascotas de hasta 20kg para evitar falsas alarmas.', stock: 35, costo: 9500, ganancia: 6500, catId: 6, desc: 0 },
  { id: 32, nombre: 'Sensor Magnético Inalámbrico para Puertas y Ventanas', descripcion: 'Contacto magnético compacto con batería de larga duración para alertar aperturas no autorizadas.', stock: 50, costo: 5500, ganancia: 4500, catId: 6, desc: 0 },
  { id: 33, nombre: 'Botón de Pánico Inalámbrico SOS para Emergencias', descripcion: 'Pulsador de auxilio para adultos mayores o cajas de cobro que dispara la alarma silenciosa al instante.', stock: 25, costo: 4000, ganancia: 3500, catId: 6, desc: 0 },
  { id: 34, nombre: 'Sensor de Humo Fotoeléctrico Inalámbrico Autónomo', descripcion: 'Detector de humo con alarma acústica incorporada de 85dB y enlace al sistema de seguridad central.', stock: 20, costo: 11000, ganancia: 7000, catId: 6, desc: 0 },
  { id: 35, nombre: 'Teclado Táctil Inalámbrico con Lector de Tarjetas RFID', descripcion: 'Teclado de acceso para armar y desarmar el sistema de alarma mediante clave numérica o llavero de proximidad.', stock: 12, costo: 18000, ganancia: 11000, catId: 6, desc: 0 },

  // Categoría 7: Accesorios y Conectividad
  { id: 36, nombre: 'Fuente de Poder 12V 10A Tipo Malla para 8 Cámaras', descripcion: 'Fuente conmutada centralizada regulada de alta estabilidad con potenciómetro de ajuste de voltaje.', stock: 25, costo: 12500, ganancia: 8500, catId: 7, desc: 0 },
  { id: 37, nombre: 'Fuente de Poder Regulada 12V 2A para Cámara Individual', descripcion: 'Adaptador de pared estándar 12V 2000mA con conector macho 5.5x2.1mm para cámaras y routers.', stock: 60, costo: 3500, ganancia: 3500, catId: 7, desc: 0 },
  { id: 38, nombre: 'Kit Par de Video Baluns Pasivos HD 4K con Conector BNC', descripcion: 'Transceptores pasivos para transmitir video de alta definición a través de cable UTP hasta 300 metros.', stock: 70, costo: 2500, ganancia: 2500, catId: 7, desc: 0 },
  { id: 39, nombre: 'Paquete de 10 Conectores Macho DC 12V con Tornillo', descripcion: 'Conectores rápidos sin soldadura para energizar cámaras de seguridad de forma prolija.', stock: 80, costo: 2000, ganancia: 2000, catId: 7, desc: 0 },
  { id: 40, nombre: 'Paquete de 10 Conectores Hembra DC 12V con Tornillo', descripcion: 'Conectores hembra de bornera rápida para empalmes y extensiones de alimentación.', stock: 80, costo: 2000, ganancia: 2000, catId: 7, desc: 0 },
  { id: 41, nombre: 'Rollo de Cable UTP Cat6 100% Cobre para CCTV (305m)', descripcion: 'Bobina de cable de red categoría 6 con conductores de cobre puro para máxima velocidad y distancia en video HD.', stock: 15, costo: 48000, ganancia: 22000, catId: 7, desc: 5 },
  { id: 42, nombre: 'Caja de Registro Plástica 10x10cm Estanca para Cámaras', descripcion: 'Caja de montaje impermeable IP65 para proteger baluns, cables y conectores a la intemperie.', stock: 100, costo: 1800, ganancia: 1700, catId: 7, desc: 0 },
  { id: 43, nombre: 'Batería de Respaldo Recargable 12V 7Ah para Alarma y Cerco', descripcion: 'Batería sellada libre de mantenimiento para mantener el cerco y la alarma encendidos ante cortes de luz.', stock: 30, costo: 12000, ganancia: 7500, catId: 7, desc: 0 }
];

async function applyMigration() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME || 'mydb',
    port: parseInt(process.env.DB_PORT || '3306', 10)
  });

  console.log('🔄 Iniciando actualización a catálogo de seguridad electrónica...');

  // 1. Insertar / Actualizar las 7 categorías principales
  for (const c of securityCategories) {
    await conn.query(
      'INSERT INTO categorias (id, descripcion, estado) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), estado = 1',
      [c.id, c.descripcion]
    );
  }

  // 2. Reasignar cualquier producto que apuntaba a categorías antiguas > 7 a la categoría 7 (Accesorios)
  await conn.query('UPDATE productos SET categorias_id = 7 WHERE categorias_id > 7');

  // 3. Eliminar categorías antiguas innecesarias > 7
  await conn.query('DELETE FROM categorias WHERE id > 7');

  // 4. Actualizar productos 1 a 43 con los equipos reales de seguridad
  for (const p of securityProducts) {
    const [existing] = await conn.query('SELECT id FROM productos WHERE id = ?', [p.id]);
    if (existing.length > 0) {
      await conn.query(
        'UPDATE productos SET nombre = ?, descripcion = ?, stock = ?, precio_costo = ?, margen_ganancia = ?, categorias_id = ?, descuento_porcentaje = ? WHERE id = ?',
        [p.nombre, p.descripcion, p.stock, p.costo, p.ganancia, p.catId, p.desc, p.id]
      );
    } else {
      await conn.query(
        'INSERT INTO productos (id, nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, descuento_porcentaje) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.nombre, p.descripcion, p.stock, p.costo, p.ganancia, p.catId, p.desc]
      );
    }
  }

  const [finalCats] = await conn.query('SELECT id, descripcion FROM categorias ORDER BY id ASC');
  console.log('✅ Categorías activas en DB:');
  finalCats.forEach(c => console.log(`   ${c.id}. ${c.descripcion}`));

  const [sampleProds] = await conn.query(`
    SELECT p.id, p.nombre, c.descripcion as categoria, (p.precio_costo + p.margen_ganancia) as precio, p.stock
    FROM productos p
    JOIN categorias c ON p.categorias_id = c.id
    ORDER BY p.id ASC
    LIMIT 10
  `);
  console.log('\n✅ Muestra de productos actualizados en DB:');
  sampleProds.forEach(p => console.log(`   [ID ${p.id}] ${p.nombre} | ${p.categoria} | ₡${p.precio} (Stock: ${p.stock})`));

  await conn.end();
  console.log('\n🎉 ¡Catálogo de seguridad actualizado con éxito en la base de datos!');
}

applyMigration().catch(err => {
  console.error('❌ Error en migración:', err);
  process.exit(1);
});

