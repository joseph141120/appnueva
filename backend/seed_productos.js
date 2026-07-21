const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '1234',
  database: 'mydb',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10
});

const categoriasList = [
  'Procesadores',
  'Tarjetas Madre',
  'Memorias RAM',
  'Tarjetas de Video',
  'Almacenamiento',
  'Fuentes de Poder',
  'Gabinetes / Cases',
  'Enfriamiento Líquido',
  'Ventiladores / Fans',
  'Periféricos',
  'PCs Completas',
  'Accesorios',
  'Audífonos'
];

const productosSeed = [
  // 1. Procesadores
  { nombre: 'AMD Ryzen 7 7800X3D 4.2GHz', descripcion: 'Procesador gaming tope de gama con 3D V-Cache.', stock: 8, costo: 210000, ganancia: 35000, cat: 'Procesadores' },
  { nombre: 'Intel Core i7-14700K 5.6GHz', descripcion: 'Procesador de 20 núcleos para gaming y renderizado.', stock: 6, costo: 220000, ganancia: 45000, cat: 'Procesadores' },
  { nombre: 'AMD Ryzen 5 7600X 4.7GHz', descripcion: 'Procesador Socket AM5 eficiente de gran rendimiento.', stock: 12, costo: 120000, ganancia: 25000, cat: 'Procesadores' },

  // 2. Tarjetas Madre
  { nombre: 'ASUS ROG Strix B650-A Gaming WiFi', descripcion: 'Tarjeta madre Socket AM5 con soporte DDR5 y WiFi 6E.', stock: 7, costo: 120000, ganancia: 25000, cat: 'Tarjetas Madre' },
  { nombre: 'MSI MAG Z790 Tomahawk WiFi', descripcion: 'Tarjeta madre LGA 1700 robusta para procesadores Intel.', stock: 5, costo: 145000, ganancia: 30000, cat: 'Tarjetas Madre' },
  { nombre: 'Gigabyte B650M DS3H Micro-ATX', descripcion: 'Placa base compacta y económica para ensambles AM5.', stock: 10, costo: 70000, ganancia: 15000, cat: 'Tarjetas Madre' },

  // 3. Memorias RAM
  { nombre: 'Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz', descripcion: 'Memoria RAM ultra veloz de 6000MHz Optimizada EXPO/XMP.', stock: 15, costo: 70000, ganancia: 15000, cat: 'Memorias RAM' },
  { nombre: 'Kingston FURY Beast 16GB DDR5 5600MHz', descripcion: 'Memoria RAM de alto rendimiento para gaming.', stock: 20, costo: 32000, ganancia: 10000, cat: 'Memorias RAM' },
  { nombre: 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5', descripcion: 'Memorias con iluminación RGB radiante a 6400MHz.', stock: 8, costo: 80000, ganancia: 18000, cat: 'Memorias RAM' },

  // 4. Tarjetas de Video
  { nombre: 'NVIDIA GeForce RTX 4090 24GB', descripcion: 'La tarjeta gráfica de consumo más potente del mundo.', stock: 4, costo: 950000, ganancia: 200000, cat: 'Tarjetas de Video' },
  { nombre: 'NVIDIA GeForce RTX 4070 Super 12GB', descripcion: 'Rendimiento supremo para juegos a 1440p en ultra.', stock: 9, costo: 385000, ganancia: 60000, cat: 'Tarjetas de Video' },
  { nombre: 'AMD Radeon RX 7800 XT 16GB', descripcion: 'Tarjeta gráfica potente de 16GB VRAM de AMD.', stock: 6, costo: 330000, ganancia: 55000, cat: 'Tarjetas de Video' },

  // 5. Almacenamiento
  { nombre: 'SSD NVMe Samsung 990 PRO 2TB PCIe 4.0', descripcion: 'SSD ultra rápido de 7450 MB/s de lectura.', stock: 12, costo: 95000, ganancia: 20000, cat: 'Almacenamiento' },
  { nombre: 'SSD NVMe Kingston NV2 1TB M.2', descripcion: 'Almacenamiento veloz M.2 PCIe 4.0 para juegos y SO.', stock: 18, costo: 38000, ganancia: 10000, cat: 'Almacenamiento' },
  { nombre: 'SSD WD Black SN850X 1TB NVMe Gaming', descripcion: 'Unidad de estado sólido optimizada para carga de juegos rápida.', stock: 14, costo: 52000, ganancia: 13000, cat: 'Almacenamiento' },

  // 6. Fuentes de Poder
  { nombre: 'Corsair RM850x 850W 80 Plus Gold Modular', descripcion: 'Fuente de poder 100% modular con certificación Gold.', stock: 10, costo: 78000, ganancia: 17000, cat: 'Fuentes de Poder' },
  { nombre: 'EVGA 700W 80 Plus Bronze', descripcion: 'Fuente de energía confiable para ensambles estándar.', stock: 14, costo: 35000, ganancia: 10000, cat: 'Fuentes de Poder' },
  { nombre: 'ASUS ROG Thor 1000W Platinum II Modular', descripcion: 'Fuente de nivel entusiasta con pantalla OLED de consumo.', stock: 4, costo: 155000, ganancia: 30000, cat: 'Fuentes de Poder' },

  // 7. Gabinetes / Cases
  { nombre: 'Gabinete NZXT H9 Flow RGB Cristal Templado', descripcion: 'Chasis panorámico con diseño de doble cámara y flujo de aire.', stock: 6, costo: 110000, ganancia: 25000, cat: 'Gabinetes / Cases' },
  { nombre: 'Gabinete Corsair 4000D Airflow Mid-Tower', descripcion: 'Gabinete optimizado con frontal de malla metálica de gran ventilación.', stock: 11, costo: 55000, ganancia: 13000, cat: 'Gabinetes / Cases' },
  { nombre: 'Gabinete Lian Li O11 Dynamic EVO RGB', descripcion: 'Gabinete premium de vidrio doble para lucir tu hardware.', stock: 5, costo: 102000, ganancia: 23000, cat: 'Gabinetes / Cases' },

  // 8. Enfriamiento Líquido
  { nombre: 'Enfriamiento Líquido NZXT Kraken Elite 360 RGB', descripcion: 'AIO 360mm con pantalla LCD personalizable y ventiladores RGB.', stock: 5, costo: 138000, ganancia: 27000, cat: 'Enfriamiento Líquido' },
  { nombre: 'Disipador Thermalright Peerless Assassin 120 SE', descripcion: 'Disipador de aire de torre doble con 6 heatpipes de cobre.', stock: 16, costo: 30000, ganancia: 8000, cat: 'Enfriamiento Líquido' },
  { nombre: 'Enfriamiento Líquido Corsair iCUE H150i Elite LCD', descripcion: 'Sistema AIO de triple radiador de 360mm con pantalla IPS LCD.', stock: 3, costo: 145000, ganancia: 30000, cat: 'Enfriamiento Líquido' },

  // 9. Ventiladores / Fans
  { nombre: 'Kit 3x Ventiladores Lian Li UNI FAN SL-Infinity 120 RGB', descripcion: 'Ventiladores modulares de encaje sin cables con efecto espejo infinito.', stock: 8, costo: 52000, ganancia: 13000, cat: 'Ventiladores / Fans' },
  { nombre: 'Kit 3x Ventiladores Corsair LL120 RGB Dual Light', descripcion: 'Ventiladores de doble aro de iluminación RGB programable.', stock: 10, costo: 40000, ganancia: 12000, cat: 'Ventiladores / Fans' },
  { nombre: 'Ventilador Noctua NF-A12x25 PWM 120mm Silencioso', descripcion: 'Ventilador ultra silencioso con polímero Sterrox de máxima durabilidad.', stock: 15, costo: 17000, ganancia: 5000, cat: 'Ventiladores / Fans' },

  // 10. Periféricos
  { nombre: 'Monitor Gaming ASUS TUF 27" 180Hz 1ms IPS', descripcion: 'Monitor gaming 1440p QHD de tasa de refresco ultra fluida.', stock: 7, costo: 125000, ganancia: 30000, cat: 'Periféricos' },
  { nombre: 'Teclado Mecánico Razer BlackWidow V4', descripcion: 'Teclado mecánico con switches táctiles e iluminación RGB.', stock: 10, costo: 65000, ganancia: 15750, cat: 'Periféricos' },
  { nombre: 'Mouse Inalámbrico Logitech G502 LIGHTSPEED', descripcion: 'Mouse icónico con sensor HERO 25K de alta precisión.', stock: 12, costo: 48000, ganancia: 14000, cat: 'Periféricos' },

  // 11. PCs Completas
  { nombre: 'PC Gamer BattleBox Ryzen 5 RTX 4060', descripcion: 'Computadora armada lista para jugar a 1080p.', stock: 3, costo: 480000, ganancia: 100000, cat: 'PCs Completas' },
  { nombre: 'PC Master Race Ryzen 7 RTX 4080 Super', descripcion: 'Potencia bruta para 4K Gaming extrema.', stock: 2, costo: 1100000, ganancia: 250000, cat: 'PCs Completas' },
  { nombre: 'PC Entry Gamer Intel i5 GTX 1650', descripcion: 'Equipo económico perfecto para eSports e iniciación.', stock: 5, costo: 280000, ganancia: 70000, cat: 'PCs Completas' },

  // 12. Accesorios
  { nombre: 'Soporte Vertical GPU Cooler Master Universal', descripcion: 'Kit de montaje vertical con cable Riser PCIe 4.0.', stock: 8, costo: 22000, ganancia: 6000, cat: 'Accesorios' },
  { nombre: 'Pasta Térmica Arctic MX-6 High Performance 4g', descripcion: 'Compuesto térmico de micropartículas de carbono para CPU/GPU.', stock: 25, costo: 5500, ganancia: 2000, cat: 'Accesorios' },
  { nombre: 'Mousepad Extra Large RGB Gaming 90x40cm', descripcion: 'Alfombrilla extendida impermeabilizada con borde iluminado.', stock: 18, costo: 10000, ganancia: 4000, cat: 'Accesorios' },

  // 13. Audífonos
  { nombre: 'Audífonos Logitech G PRO X Wireless', descripcion: 'Audífonos inalámbricos con tecnología de micrófono BLUE VO!CE.', stock: 6, costo: 95000, ganancia: 30000, cat: 'Audífonos' },
  { nombre: 'Audífonos HyperX Cloud II Wireless', descripcion: 'Comodidad legendaria con sonido envolvente 7.1 virtual.', stock: 9, costo: 68000, ganancia: 17000, cat: 'Audífonos' },
  { nombre: 'Audífonos Razer BlackShark V2 Pro Wireless', descripcion: 'Audífonos de eSports con micrófono de banda ultra ancha.', stock: 7, costo: 78000, ganancia: 20000, cat: 'Audífonos' }
];

async function seedDatabase() {
  try {
    console.log('🌱 Iniciando seed de categorías y productos en MySQL (tabla categorias)...');

    const catMap = {};

    for (const catName of categoriasList) {
      const [rows] = await pool.query('SELECT id FROM categorias WHERE LOWER(descripcion) = LOWER(?)', [catName]);
      if (rows.length > 0) {
        catMap[catName] = rows[0].id;
      } else {
        const [res] = await pool.query('INSERT INTO categorias (descripcion, estado) VALUES (?, 1)', [catName]);
        catMap[catName] = res.insertId;
        console.log(`✅ Categoría creada: ${catName} (ID: ${res.insertId})`);
      }
    }

    let creados = 0;
    for (const p of productosSeed) {
      const catId = catMap[p.cat] || 1;
      const [existing] = await pool.query('SELECT id FROM productos WHERE LOWER(nombre) = LOWER(?)', [p.nombre]);
      if (existing.length === 0) {
        await pool.query(
          'INSERT INTO productos (nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id) VALUES (?, ?, ?, ?, ?, ?)',
          [p.nombre, p.descripcion, p.stock, p.costo, p.ganancia, catId]
        );
        creados++;
      }
    }

    console.log(`🎉 Seed completado con éxito. Se insertaron ${creados} nuevos productos en MySQL.`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error durante el seed:', error);
    process.exit(1);
  }
}

seedDatabase();
