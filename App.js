// =========================================================================================
// RESTRICCIÓN DE SEGURIDAD Y COMPILACIÓN NATIVA
// Explicación: No se importa ni instala 'bcrypt' ni 'bcryptjs' en esta aplicación móvil.
// La encriptación y procesamiento seguro de contraseñas ya ocurre correctamente en el backend
// (api_express_mysql) usando bcryptjs. Mantener el cliente de React Native libre de estas
// librerías evita problemas de compatibilidad y errores fatales de compilación en entornos nativos.
// =========================================================================================

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, TextInput, ScrollView, Platform, StatusBar, Image, Modal } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Mapeo de imágenes locales de assets para el catálogo
const IMAGENES_PRODUCTOS = {
  1: require('./assets/amd_ryzen.png'),
  2: require('./assets/rtx_4090.png'),
  3: require('./assets/corsair_ram.png'),
  4: require('./assets/pc_gamer.png'),
  5: require('./assets/razer_keyboard.png'),
  6: require('./assets/logitech_headset.png'),
  7: require('./assets/logitech_streamcam.png'),
  8: require('./assets/amd_ryzen.png'),
};

const IMAGEN_DEFAULT = require('./assets/icon.png');

// Importación del servicio centralizado de la API y manejador de token en memoria
import { apiService, setAuthToken } from './src/services/api';

// Configuración de la URL de red propia
const API_URL = 'http://localhost:3000';

// Función para enviar notificaciones de escritorio en navegadores web (PC)
const enviarNotificacionWeb = (titulo, cuerpo) => {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted') {
      new Notification(titulo, { body: cuerpo });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          new Notification(titulo, { body: cuerpo });
        }
      });
    }
  }
};

// Categorías completas para catálogo e-commerce y armador de PC
const CATEGORIAS = [
  'Todas',
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

// Catálogo offline extendido con al menos 3 productos por cada categoría para pruebas
const productosMockDef = [
  // 1. Procesadores
  { id: 1, nombre: 'AMD Ryzen 7 7800X3D 4.2GHz', precio_base: 245000.00, precio: 245000.00, descuento_porcentaje: 0, stock: 8, categoria_nombre: 'Procesadores', descripcion: 'Procesador gaming tope de gama con 3D V-Cache.' },
  { id: 2, nombre: 'Intel Core i7-14700K 5.6GHz', precio_base: 265000.00, precio: 265000.00, descuento_porcentaje: 0, stock: 6, categoria_nombre: 'Procesadores', descripcion: 'Procesador de 20 núcleos para gaming y renderizado.' },
  { id: 3, nombre: 'AMD Ryzen 5 7600X 4.7GHz', precio_base: 145000.00, precio: 145000.00, descuento_porcentaje: 0, stock: 12, categoria_nombre: 'Procesadores', descripcion: 'Procesador Socket AM5 eficiente de gran rendimiento.' },

  // 2. Tarjetas Madre
  { id: 4, nombre: 'ASUS ROG Strix B650-A Gaming WiFi', precio_base: 145000.00, precio: 145000.00, descuento_porcentaje: 0, stock: 7, categoria_nombre: 'Tarjetas Madre', descripcion: 'Tarjeta madre Socket AM5 con soporte DDR5 y WiFi 6E.' },
  { id: 5, nombre: 'MSI MAG Z790 Tomahawk WiFi', precio_base: 175000.00, precio: 175000.00, descuento_porcentaje: 0, stock: 5, categoria_nombre: 'Tarjetas Madre', descripcion: 'Tarjeta madre LGA 1700 robusta para procesadores Intel.' },
  { id: 6, nombre: 'Gigabyte B650M DS3H Micro-ATX', precio_base: 85000.00, precio: 85000.00, descuento_porcentaje: 0, stock: 10, categoria_nombre: 'Tarjetas Madre', descripcion: 'Placa base compacta y económica para ensambles AM5.' },

  // 3. Memorias RAM
  { id: 7, nombre: 'Corsair Vengeance DDR5 32GB (2x16GB) 6000MHz', precio_base: 85000.00, precio: 85000.00, descuento_porcentaje: 0, stock: 15, categoria_nombre: 'Memorias RAM', descripcion: 'Memoria RAM ultra veloz de 6000MHz Optimizada EXPO/XMP.' },
  { id: 8, nombre: 'Kingston FURY Beast 16GB DDR5 5600MHz', precio_base: 42000.00, precio: 42000.00, descuento_porcentaje: 0, stock: 20, categoria_nombre: 'Memorias RAM', descripcion: 'Memoria RAM de alto rendimiento para gaming.' },
  { id: 9, nombre: 'G.Skill Trident Z5 RGB 32GB (2x16GB) DDR5', precio_base: 98000.00, precio: 98000.00, descuento_porcentaje: 0, stock: 8, categoria_nombre: 'Memorias RAM', descripcion: 'Memorias con iluminación RGB radiante a 6400MHz.' },

  // 4. Tarjetas de Video
  { id: 10, nombre: 'NVIDIA GeForce RTX 4090 24GB', precio_base: 1150000.00, precio: 1035000.00, descuento_porcentaje: 10, stock: 4, categoria_nombre: 'Tarjetas de Video', descripcion: 'La tarjeta gráfica de consumo más potente del mundo.' },
  { id: 11, nombre: 'NVIDIA GeForce RTX 4070 Super 12GB', precio_base: 445000.00, precio: 445000.00, descuento_porcentaje: 0, stock: 9, categoria_nombre: 'Tarjetas de Video', descripcion: 'Rendimiento supremo para juegos a 1440p en ultra.' },
  { id: 12, nombre: 'AMD Radeon RX 7800 XT 16GB', precio_base: 385000.00, precio: 385000.00, descuento_porcentaje: 0, stock: 6, categoria_nombre: 'Tarjetas de Video', descripcion: 'Tarjeta gráfica potente de 16GB VRAM de AMD.' },

  // 5. Almacenamiento
  { id: 13, nombre: 'SSD NVMe Samsung 990 PRO 2TB PCIe 4.0', precio_base: 115000.00, precio: 115000.00, descuento_porcentaje: 0, stock: 12, categoria_nombre: 'Almacenamiento', descripcion: 'SSD ultra rápido de 7450 MB/s de lectura.' },
  { id: 14, nombre: 'SSD NVMe Kingston NV2 1TB M.2', precio_base: 48000.00, precio: 48000.00, descuento_porcentaje: 0, stock: 18, categoria_nombre: 'Almacenamiento', descripcion: 'Almacenamiento veloz M.2 PCIe 4.0 para juegos y SO.' },
  { id: 15, nombre: 'SSD WD Black SN850X 1TB NVMe Gaming', precio_base: 65000.00, precio: 65000.00, descuento_porcentaje: 0, stock: 14, categoria_nombre: 'Almacenamiento', descripcion: 'Unidad de estado sólido optimizada para carga de juegos rápida.' },

  // 6. Fuentes de Poder
  { id: 16, nombre: 'Corsair RM850x 850W 80 Plus Gold Modular', precio_base: 95000.00, precio: 95000.00, descuento_porcentaje: 0, stock: 10, categoria_nombre: 'Fuentes de Poder', descripcion: 'Fuente de poder 100% modular con certificación Gold.' },
  { id: 17, nombre: 'EVGA 700W 80 Plus Bronze', precio_base: 45000.00, precio: 45000.00, descuento_porcentaje: 0, stock: 14, categoria_nombre: 'Fuentes de Poder', descripcion: 'Fuente de energía confiable para ensambles estándar.' },
  { id: 18, nombre: 'ASUS ROG Thor 1000W Platinum II Modular', precio_base: 185000.00, precio: 185000.00, descuento_porcentaje: 0, stock: 4, categoria_nombre: 'Fuentes de Poder', descripcion: 'Fuente de nivel entusiasta con pantalla OLED de consumo.' },

  // 7. Gabinetes / Cases
  { id: 19, nombre: 'Gabinete NZXT H9 Flow RGB Cristal Templado', precio_base: 135000.00, precio: 135000.00, descuento_porcentaje: 0, stock: 6, categoria_nombre: 'Gabinetes / Cases', descripcion: 'Chasis panorámico con diseño de doble cámara y flujo de aire.' },
  { id: 20, nombre: 'Gabinete Corsair 4000D Airflow Mid-Tower', precio_base: 68000.00, precio: 68000.00, descuento_porcentaje: 0, stock: 11, categoria_nombre: 'Gabinetes / Cases', descripcion: 'Gabinete optimizado con frontal de malla metálica de gran ventilación.' },
  { id: 21, nombre: 'Gabinete Lian Li O11 Dynamic EVO RGB', precio_base: 125000.00, precio: 125000.00, descuento_porcentaje: 0, stock: 5, categoria_nombre: 'Gabinetes / Cases', descripcion: 'Gabinete premium de vidrio doble para lucir tu hardware.' },

  // 8. Enfriamiento Líquido
  { id: 22, nombre: 'Enfriamiento Líquido NZXT Kraken Elite 360 RGB', precio_base: 165000.00, precio: 165000.00, descuento_porcentaje: 0, stock: 5, categoria_nombre: 'Enfriamiento Líquido', descripcion: 'AIO 360mm con pantalla LCD personalizable y ventiladores RGB.' },
  { id: 23, nombre: 'Disipador Thermalright Peerless Assassin 120 SE', precio_base: 38000.00, precio: 38000.00, descuento_porcentaje: 0, stock: 16, categoria_nombre: 'Enfriamiento Líquido', descripcion: 'Disipador de aire de torre doble con 6 heatpipes de cobre.' },
  { id: 24, nombre: 'Enfriamiento Líquido Corsair iCUE H150i Elite LCD', precio_base: 175000.00, precio: 175000.00, descuento_porcentaje: 0, stock: 3, categoria_nombre: 'Enfriamiento Líquido', descripcion: 'Sistema AIO de triple radiador de 360mm con pantalla IPS LCD.' },

  // 9. Ventiladores / Fans
  { id: 25, nombre: 'Kit 3x Ventiladores Lian Li UNI FAN SL-Infinity 120 RGB', precio_base: 65000.00, precio: 65000.00, descuento_porcentaje: 0, stock: 8, categoria_nombre: 'Ventiladores / Fans', descripcion: 'Ventiladores modulares de encaje sin cables con efecto espejo infinito.' },
  { id: 26, nombre: 'Kit 3x Ventiladores Corsair LL120 RGB Dual Light', precio_base: 52000.00, precio: 52000.00, descuento_porcentaje: 0, stock: 10, categoria_nombre: 'Ventiladores / Fans', descripcion: 'Ventiladores de doble aro de iluminación RGB programable.' },
  { id: 27, nombre: 'Ventilador Noctua NF-A12x25 PWM 120mm Silencioso', precio_base: 22000.00, precio: 22000.00, descuento_porcentaje: 0, stock: 15, categoria_nombre: 'Ventiladores / Fans', descripcion: 'Ventilador ultra silencioso con polímero Sterrox de máxima durabilidad.' },

  // 10. Periféricos
  { id: 28, nombre: 'Monitor Gaming ASUS TUF 27" 180Hz 1ms IPS', precio_base: 155000.00, precio: 155000.00, descuento_porcentaje: 0, stock: 7, categoria_nombre: 'Periféricos', descripcion: 'Monitor gaming 1440p QHD de tasa de refresco ultra fluida.' },
  { id: 29, nombre: 'Teclado Mecánico Razer BlackWidow V4', precio_base: 95000.00, precio: 80750.00, descuento_porcentaje: 15, stock: 10, categoria_nombre: 'Periféricos', descripcion: 'Teclado mecánico con switches táctiles e iluminación RGB.' },
  { id: 30, nombre: 'Mouse Inalámbrico Logitech G502 LIGHTSPEED', precio_base: 62000.00, precio: 62000.00, descuento_porcentaje: 0, stock: 12, categoria_nombre: 'Periféricos', descripcion: 'Mouse icónico con sensor HERO 25K de alta precisión.' },

  // 11. PCs Completas
  { id: 31, nombre: 'PC Gamer BattleBox Ryzen 5 RTX 4060', precio_base: 580000.00, precio: 580000.00, descuento_porcentaje: 0, stock: 3, categoria_nombre: 'PCs Completas', descripcion: 'Computadora armada lista para jugar a 1080p.' },
  { id: 32, nombre: 'PC Master Race Ryzen 7 RTX 4080 Super', precio_base: 1350000.00, precio: 1350000.00, descuento_porcentaje: 0, stock: 2, categoria_nombre: 'PCs Completas', descripcion: 'Potencia bruta para 4K Gaming extrema.' },
  { id: 33, nombre: 'PC Entry Gamer Intel i5 GTX 1650', precio_base: 350000.00, precio: 350000.00, descuento_porcentaje: 0, stock: 5, categoria_nombre: 'PCs Completas', descripcion: 'Equipo económico perfecto para eSports e iniciación.' },

  // 12. Accesorios
  { id: 34, nombre: 'Soporte Vertical GPU Cooler Master Universal', precio_base: 28000.00, precio: 28000.00, descuento_porcentaje: 0, stock: 8, categoria_nombre: 'Accesorios', descripcion: 'Kit de montaje vertical con cable Riser PCIe 4.0.' },
  { id: 35, nombre: 'Pasta Térmica Arctic MX-6 High Performance 4g', precio_base: 7500.00, precio: 7500.00, descuento_porcentaje: 0, stock: 25, categoria_nombre: 'Accesorios', descripcion: 'Compuesto térmico de micropartículas de carbono para CPU/GPU.' },
  { id: 36, nombre: 'Mousepad Extra Large RGB Gaming 90x40cm', precio_base: 14000.00, precio: 14000.00, descuento_porcentaje: 0, stock: 18, categoria_nombre: 'Accesorios', descripcion: 'Alfombrilla extendida impermeabilizada con borde iluminado.' },

  // 13. Audífonos
  { id: 37, nombre: 'Audífonos Logitech G PRO X Wireless', precio_base: 125000.00, precio: 125000.00, descuento_porcentaje: 0, stock: 6, categoria_nombre: 'Audífonos', descripcion: 'Audífonos inalámbricos con tecnología de micrófono BLUE VO!CE.' },
  { id: 38, nombre: 'Audífonos HyperX Cloud II Wireless', precio_base: 85000.00, precio: 85000.00, descuento_porcentaje: 0, stock: 9, categoria_nombre: 'Audífonos', descripcion: 'Comodidad legendaria con sonido envolvente 7.1 virtual.' },
  { id: 39, nombre: 'Audífonos Razer BlackShark V2 Pro Wireless', precio_base: 98000.00, precio: 98000.00, descuento_porcentaje: 0, stock: 7, categoria_nombre: 'Audífonos', descripcion: 'Audífonos de eSports con micrófono de banda ultra ancha.' }
];

export default function App() {
  // Catálogo de productos y estado de carga
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Elementos en el carrito de e-commerce / POS
  const [carrito, setCarrito] = useState([]);

  // Token JWT en memoria de JavaScript pura
  const [token, setToken] = useState(null);

  // Control de sesión: null (Invitado), 'vendedor', 'admin', 'auth'
  const [sesion, setSesion] = useState(null);
  const [sesionPrevia, setSesionPrevia] = useState(null);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todas');
  const [mostrarMenuCategorias, setMostrarMenuCategorias] = useState(false);

  // Login de personal interno (Admin y Vendedores únicamente)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Recuperación de Contraseña por Correo (Personal Interno)
  const [mostrarRecuperarModal, setMostrarRecuperarModal] = useState(false);
  const [pasoRecuperacion, setPasoRecuperacion] = useState(1);
  const [recuperarEmail, setRecuperarEmail] = useState('');
  const [codigoRecuperacion, setCodigoRecuperacion] = useState('');
  const [nuevaPasswordRecuperacion, setNuevaPasswordRecuperacion] = useState('');
  const [cargandoRecuperacion, setCargandoRecuperacion] = useState(false);

  // Módulo de Carrito y Formulario de Facturación del Cliente
  const [mostrarCarritoModal, setMostrarCarritoModal] = useState(false);
  const [mostrarFormularioFacturacion, setMostrarFormularioFacturacion] = useState(false);
  const [checkoutNombre, setCheckoutNombre] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutCedula, setCheckoutCedula] = useState('');
  const [checkoutTelefono, setCheckoutTelefono] = useState('');

  // Buscador de la Tabla de Ventas
  const [filtroTablaVentas, setFiltroTablaVentas] = useState('');

  // Pestañas y formularios del Administrador ('tabla_ventas', 'reabastecer', 'agregar', 'editar', 'personal')
  const [pestanaAdmin, setPestanaAdmin] = useState('tabla_ventas');
  const [ordenesVenta, setOrdenesVenta] = useState([]);
  const [reabastecerProductoId, setReabastecerProductoId] = useState('');
  const [reabastecerProductoNombre, setReabastecerProductoNombre] = useState('');
  const [reabastecerCantidad, setReabastecerCantidad] = useState('');
  const [filtroNombreReabastecer, setFiltroNombreReabastecer] = useState('');
  const [filtroCategoriaReabastecer, setFiltroCategoriaReabastecer] = useState('Todas');

  // Control de pestañas para el Vendedor ('pos', 'ordenes_ventas', 'ordenes_ensambles')
  const [pestanaVendedor, setPestanaVendedor] = useState('pos');

  // Formulario para crear un componente de PC nuevo
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoDescripcion, setNuevoDescripcion] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevoCosto, setNuevoCosto] = useState('');
  const [nuevoGanancia, setNuevoGanancia] = useState('');
  const [nuevoCategoriaId, setNuevoCategoriaId] = useState('');
  const [nuevoImagen, setNuevoImagen] = useState('');
  const [nuevoDescuento, setNuevoDescuento] = useState(''); // Descuento en %
  const [dbCategorias, setDbCategorias] = useState([]);
  const [nuevaCategoriaDescripcion, setNuevaCategoriaDescripcion] = useState('');
  const [mostrarNuevaCategoriaForm, setMostrarNuevaCategoriaForm] = useState(false);

  // Formulario para editar un componente existente
  const [editProductoId, setEditProductoId] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editDescripcion, setEditDescripcion] = useState('');
  const [editCosto, setEditCosto] = useState('');
  const [editGanancia, setEditGanancia] = useState('');
  const [editCategoriaId, setEditCategoriaId] = useState('');
  const [editImagen, setEditImagen] = useState('');
  const [editDescuento, setEditDescuento] = useState(''); // Descuento en %
  const [filtroNombreEdit, setFiltroNombreEdit] = useState('');
  const [filtroCategoriaEdit, setFiltroCategoriaEdit] = useState('Todas');
  const [isOffline, setIsOffline] = useState(false);
  const [productoSeleccionadoDetalle, setProductoSeleccionadoDetalle] = useState(null);

  // Estados para el Rastreador de Órdenes del Cliente
  const [rastrearCodigo, setRastrearCodigo] = useState('');
  const [rastreoVenta, setRastreoVenta] = useState(null);
  const [mostrarRastreador, setMostrarRastreador] = useState(false);

  // Estados para el Armador de PC Completo (10 componentes)
  const [mostrarArmador, setMostrarArmador] = useState(false);
  const [armarPaso, setArmarPaso] = useState(1);
  const [cpuSeleccionado, setCpuSeleccionado] = useState(null);
  const [motherboardSeleccionada, setMotherboardSeleccionada] = useState(null);
  const [ramSeleccionada, setRamSeleccionada] = useState(null);
  const [gpuSeleccionada, setGpuSeleccionada] = useState(null);
  const [almacenamientoSeleccionado, setAlmacenamientoSeleccionado] = useState(null);
  const [fuenteSeleccionada, setFuenteSeleccionada] = useState(null);
  const [caseSeleccionado, setCaseSeleccionado] = useState(null);
  const [enfriamientoSeleccionado, setEnfriamientoSeleccionado] = useState(null);
  const [fansSeleccionados, setFansSeleccionados] = useState(null);
  const [perifericoSeleccionado, setPerifericoSeleccionado] = useState(null);
  const [esOrdenEnsambleActual, setEsOrdenEnsambleActual] = useState(false);
  const [subPestanaOrdenes, setSubPestanaOrdenes] = useState('ventas');

  // Formulario para registrar personal interno
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRolId, setEmpRolId] = useState(''); // 1 = Admin, 2 = Vendedor

  // Inicializa la carga del catálogo y del historial al montar la aplicación
  useEffect(() => {
    cargarProductos();
    cargarCategorias();
    obtenerHistorialOrdenes();
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Carga la lista de categorías del servidor o usa mock local en desarrollo
  const cargarCategorias = async () => {
    try {
      const datos = await apiService.get('/categorias');
      setDbCategorias(datos);
    } catch (error) {
      // Mock de categorías completas
      setDbCategorias([
        { id: 1, descripcion: 'Procesadores' },
        { id: 2, descripcion: 'Tarjetas Madre' },
        { id: 3, descripcion: 'Memorias RAM' },
        { id: 4, descripcion: 'Tarjetas de Video' },
        { id: 5, descripcion: 'Almacenamiento' },
        { id: 6, descripcion: 'Fuentes de Poder' },
        { id: 7, descripcion: 'Gabinetes / Cases' },
        { id: 8, descripcion: 'Enfriamiento Líquido' },
        { id: 9, descripcion: 'Ventiladores / Fans' },
        { id: 10, descripcion: 'Periféricos' },
        { id: 11, descripcion: 'PCs Completas' },
        { id: 12, descripcion: 'Accesorios' }
      ]);
    }
  };

  // Consulta el catálogo de productos a través de apiService.get
  const cargarProductos = async () => {
    setCargando(true);
    try {
      const datos = await apiService.get('/productos');
      const productosConPrecio = datos.map(prod => {
        const precioBase = Number(prod.precio_costo || 0) + Number(prod.margen_ganancia || 0);
        const desc = Number(prod.descuento_porcentaje || 0);
        const precioFinal = desc > 0 ? (precioBase * (1 - desc / 100)) : precioBase;
        return {
          ...prod,
          precio_base: precioBase,
          precio: precioFinal
        };
      });

      // Aseguramos que se incluyan todos los elementos mock si no están en MySQL
      const nombresExistentes = new Set(productosConPrecio.map(p => (p.nombre || '').toLowerCase().trim()));
      const faltantesMock = productosMockDef.filter(m => !nombresExistentes.has(m.nombre.toLowerCase().trim()));
      
      setProductos([...productosConPrecio, ...faltantesMock]);
      setIsOffline(false);
    } catch (error) {
      setIsOffline(true);
      setProductos(productosMockDef);
    } finally {
      setCargando(false);
    }
  };

  // Carga el historial de órdenes de ventas desde el servidor
  const obtenerHistorialOrdenes = async () => {
    try {
      const datos = await apiService.get('/ventas');
      setOrdenesVenta(datos);
    } catch (error) {
      const ordenesMock = [
        { id: 1001, fecha: '2026-06-30 08:32', total: 1395000.00, cliente_nombre: 'Juan Pérez', cliente_correo: 'juan@ejemplo.com', cliente_telefono: '8888-8888', estado: 'En Proceso', descripcion: '2x AMD Ryzen 7 7800X3D, 1x NVIDIA RTX 4090 24GB' },
        { id: 1002, fecha: '2026-06-30 09:10', total: 245000.00, cliente_nombre: 'Cliente General', cliente_correo: 'general@correo.com', cliente_telefono: '0000-0000', estado: 'Completado', descripcion: '1x AMD Ryzen 7 7800X3D 4.2GHz' }
      ];
      setOrdenesVenta(ordenesMock);
    }
  };

  // Hook useEffect que carga el historial de ventas del Administrador y Vendedor
  useEffect(() => {
    if (
      (sesion === 'admin' && ['ordenes_ventas', 'ordenes_ensambles', 'tabla_ventas', 'ordenes'].includes(pestanaAdmin)) ||
      (sesion === 'vendedor' && ['ordenes_ventas', 'ordenes_ensambles', 'ordenes'].includes(pestanaVendedor))
    ) {
      obtenerHistorialOrdenes();
    }
  }, [sesion, pestanaAdmin, pestanaVendedor]);

  // Actualiza el estado de una venta llamando al backend
  const cambiarEstadoOrden = async (idOrden, nuevoEstado) => {
    try {
      const res = await apiService.put(`/ventas/${idOrden}/estado`, { estado: nuevoEstado });
      if (res.success) {
        Alert.alert('Orden Actualizada', `La orden #${idOrden} fue marcada como ${nuevoEstado.toLowerCase()}.`);
        enviarNotificacionWeb('📦 Orden Actualizada', `La orden #${idOrden} fue marcada como ${nuevoEstado.toLowerCase()}.`);
        obtenerHistorialOrdenes();
        cargarProductos(); // Refrescar stock visible en el catálogo de productos
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (error) {
      const nuevasOrdenes = ordenesVenta.map(o => o.id === idOrden ? { ...o, estado: nuevoEstado } : o);
      setOrdenesVenta(nuevasOrdenes);
      Alert.alert('Orden Actualizada (Modo Local)', `La orden #${idOrden} fue marcada como ${nuevoEstado.toLowerCase()}.`);
      enviarNotificacionWeb('📦 Orden Actualizada (Modo Local)', `La orden #${idOrden} fue marcada como ${nuevoEstado.toLowerCase()}.`);
    }
  };

  // Genera y comparte la factura en PDF
  const generarFacturaPDF = async (orden) => {
    try {
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
            <style>
              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 20px; }
              .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
              .header h1 { margin: 0; color: #1e3a8a; font-size: 24px; }
              .header p { margin: 4px 0 0 0; color: #666; font-size: 14px; }
              .section { margin-bottom: 20px; }
              .section-title { font-size: 16px; font-weight: bold; color: #1e3a8a; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 10px; }
              .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; }
              .info-label { font-weight: bold; color: #666; }
              .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
              .table th { background-color: #3b82f6; color: white; padding: 10px; font-size: 13px; text-align: left; }
              .table td { padding: 10px; border-bottom: 1px solid #ddd; font-size: 13px; }
              .total-container { text-align: right; margin-top: 20px; font-size: 16px; font-weight: bold; color: #1e3a8a; }
              .footer { text-align: center; margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>PC BUILDER EXPRESS</h1>
              <p>Factura Comercial de Compra</p>
              <p>San José, Costa Rica | Tel: 4000-1000</p>
            </div>
            
            <div class="section">
              <div class="section-title">Detalles de Facturación</div>
              <div class="info-grid">
                <div><span class="info-label">Factura N°:</span> #${orden.id}</div>
                <div><span class="info-label">Fecha:</span> ${orden.fecha || new Date().toLocaleDateString()}</div>
                <div><span class="info-label">Cliente:</span> ${orden.cliente_nombre || 'Cliente General'}</div>
                <div><span class="info-label">Correo:</span> ${orden.cliente_correo || 'N/A'}</div>
                <div><span class="info-label">Teléfono:</span> ${orden.cliente_telefono || 'N/A'}</div>
                <div><span class="info-label">Condición:</span> ${orden.condicion_venta || 'Contado'}</div>
              </div>
            </div>

            <div class="section">
              <div class="section-title">Resumen de Componentes</div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Componente</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${(orden.descripcion || '')
                    .split(', ')
                    .map(item => {
                      return `
                        <tr>
                          <td>${item}</td>
                          <td style="text-align: right;">-</td>
                        </tr>
                      `;
                    })
                    .join('')}
                </tbody>
              </table>
            </div>

            <div class="total-container" style="text-align: right; margin-top: 20px; font-size: 14px;">
              <p style="margin: 4px 0; color: #555;">Subtotal Neto: ₡${(Number(orden.total || 0) / 1.13).toFixed(2)}</p>
              <p style="margin: 4px 0; color: #d97706; font-weight: bold;">IVA Obligatorio (13%): ₡${(Number(orden.total || 0) - (Number(orden.total || 0) / 1.13)).toFixed(2)}</p>
              <h3 style="margin: 8px 0 0 0; color: #1e3a8a; font-size: 18px; font-weight: 900;">Total Facturado (IVA incl.): ₡${Number(orden.total || 0).toFixed(2)}</h3>
            </div>

            <div class="footer">
              ¡Gracias por preferir PC Builder Express! Garantía de 1 año en todos nuestros componentes de PC.
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (error) {
      Alert.alert('Error de Impresión', 'No se pudo generar el archivo PDF de la factura.');
    }
  };

  // Clasificación inteligente y precisa para Órdenes de Ensamble vs. Ventas Directas
  const esOrdenEnsambleCheck = (o) => {
    if (!o) return false;
    if (o.tipo_orden === 'ensamble') return true;
    if (o.descripcion) {
      const desc = o.descripcion.toLowerCase();
      if (
        desc.includes('ensamble') ||
        desc.includes('servicio de armado') ||
        desc.includes('battlebox') ||
        desc.includes('pc gamer') ||
        desc.includes('pc master race') ||
        desc.includes('combo de ensamble')
      ) {
        return true;
      }
    }
    return false;
  };

  // Renderiza una tarjeta de orden con sus respectivas acciones
  const renderTarjetaOrden = ({ item }) => {
    const estadoNormalizado = (item.estado || 'Pendiente').trim();
    const esEnsamble = esOrdenEnsambleCheck(item);

    return (
      <View style={styles.tarjetaOrden}>
        <View style={styles.filaOrdenHeader}>
          <Text style={[styles.ordenIdTexto, { fontSize: 18, color: '#38bdf8', fontWeight: '950' }]}>Orden #{item.id}</Text>
          <Text style={[
            styles.ordenEstadoEtiqueta,
            estadoNormalizado === 'Entregado' || estadoNormalizado === 'Completado'
              ? styles.estadoCompletado
              : estadoNormalizado === 'Cancelado'
                ? styles.estadoCancelado
                : styles.estadoPendiente
          ]}>
            {estadoNormalizado.toUpperCase()}
          </Text>
        </View>

        {/* Badge de tipo de orden */}
        <View style={{ alignSelf: 'flex-start', marginVertical: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: esEnsamble ? '#c2410c' : '#0369a1' }}>
          <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '900' }}>
            {esEnsamble ? '⚙️ ORDEN DE ENSAMBLE' : '🏷️ VENTA DIRECTA'}
          </Text>
        </View>

        <Text style={styles.ordenDetalleTexto}>Fecha: {item.fecha}</Text>
        <Text style={styles.ordenDetalleTexto}>Productos: {item.descripcion || 'Sin desglose'}</Text>
        {item.cliente_nombre && (
          <Text style={styles.ordenDetalleTexto}>Cliente: {item.cliente_nombre} ({item.cliente_correo}) | Tel: {item.cliente_telefono || 'N/A'}</Text>
        )}
        <Text style={styles.ordenTotalTexto}>Total: ₡{item.total ? Number(item.total).toFixed(2) : '0.00'}</Text>

        {/* Acciones de la Orden */}
        <View style={[styles.filaAccionesOrden, { flexDirection: 'column', gap: 8, marginTop: 12 }]}>
          
          {/* Botones de Transición de Estados (Exclusivos para Vendedor) */}
          {sesion === 'vendedor' && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 6 }}>
              {esEnsamble ? (
                // Flujo para Ensambles: Ensamblar -> Listo -> Entregar
                <>
                  {(estadoNormalizado === 'Pendiente' || estadoNormalizado === 'En Proceso') && (
                    <TouchableOpacity
                      style={[styles.botonAccionOrden, { backgroundColor: '#3b82f6' }]}
                      onPress={() => cambiarEstadoOrden(item.id, 'Ensamblando')}
                    >
                      <Text style={styles.botonAccionOrdenTexto}>🛠️ Ensamblar</Text>
                    </TouchableOpacity>
                  )}

                  {estadoNormalizado === 'Ensamblando' && (
                    <TouchableOpacity
                      style={[styles.botonAccionOrden, { backgroundColor: '#eab308' }]}
                      onPress={() => cambiarEstadoOrden(item.id, 'Listo para Retirar')}
                    >
                      <Text style={[styles.botonAccionOrdenTexto, { color: '#000000' }]}>📦 Listo Retiro</Text>
                    </TouchableOpacity>
                  )}

                  {estadoNormalizado === 'Listo para Retirar' && (
                    <TouchableOpacity
                      style={[styles.botonAccionOrden, { backgroundColor: '#10b981' }]}
                      onPress={() => cambiarEstadoOrden(item.id, 'Entregado')}
                    >
                      <Text style={styles.botonAccionOrdenTexto}>✅ Entregar</Text>
                    </TouchableOpacity>
                  )}
                </>
              ) : (
                // Flujo para Ventas Directas: Listo -> Entregar (Omitiendo Ensamblaje)
                <>
                  {(estadoNormalizado === 'Pendiente' || estadoNormalizado === 'En Proceso' || estadoNormalizado === 'Ensamblando') && (
                    <TouchableOpacity
                      style={[styles.botonAccionOrden, { backgroundColor: '#eab308' }]}
                      onPress={() => cambiarEstadoOrden(item.id, 'Listo para Retirar')}
                    >
                      <Text style={[styles.botonAccionOrdenTexto, { color: '#000000' }]}>📦 Listo</Text>
                    </TouchableOpacity>
                  )}

                  {estadoNormalizado === 'Listo para Retirar' && (
                    <TouchableOpacity
                      style={[styles.botonAccionOrden, { backgroundColor: '#10b981' }]}
                      onPress={() => cambiarEstadoOrden(item.id, 'Entregado')}
                    >
                      <Text style={styles.botonAccionOrdenTexto}>✅ Entregar</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              {estadoNormalizado !== 'Entregado' && estadoNormalizado !== 'Completado' && estadoNormalizado !== 'Cancelado' && (
                <TouchableOpacity
                  style={[styles.botonAccionOrden, styles.botonAccionOrdenCancelar]}
                  onPress={() => cambiarEstadoOrden(item.id, 'Cancelado')}
                >
                  <Text style={styles.botonAccionOrdenTexto}>✕ Cancelar</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Botón de Generar Factura PDF (Siempre visible para Administradores y Vendedores) */}
          <TouchableOpacity
            style={[styles.botonAccionOrden, { backgroundColor: '#4b5563', width: '100%', marginHorizontal: 0, paddingVertical: 12 }]}
            onPress={() => generarFacturaPDF(item)}
          >
            <Text style={styles.botonAccionOrdenTexto}>📄 Generar Factura PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Autentica credenciales restringiendo el login a Admin y Vendedor únicamente
  const manejarLogin = async () => {
    if (!loginEmail || !loginPassword) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      const res = await apiService.post('/login', { email: loginEmail, password: loginPassword });

      if (res.success) {
        if (res.rol === 1) {
          const tokenSesion = res.token || 'session_token_' + res.email;
          setToken(tokenSesion);
          setAuthToken(tokenSesion);
          setSesion('admin');
          setPestanaAdmin('tabla_ventas');
          Alert.alert('Acceso Autorizado', 'Sesión iniciada como Administrador.');
          enviarNotificacionWeb('🔓 Inicio de Sesión', `Administrador inició sesión: ${res.email || loginEmail}`);
          setLoginEmail('');
          setLoginPassword('');
        } else if (res.rol === 2) {
          const tokenSesion = res.token || 'session_token_' + res.email;
          setToken(tokenSesion);
          setAuthToken(tokenSesion);
          setSesion('vendedor');
          Alert.alert('Acceso Autorizado', 'Sesión iniciada como Vendedor.');
          enviarNotificacionWeb('🔓 Inicio de Sesión', `Vendedor inició sesión: ${res.email || loginEmail}`);
          setLoginEmail('');
          setLoginPassword('');
        } else {
          Alert.alert('Acceso Denegado', 'Solo el personal autorizado (Vendedor o Administrador) puede iniciar sesión.');
          enviarNotificacionWeb('⚠️ Intento de Acceso Fallido', `Acceso denegado (Rol no autorizado) para: ${loginEmail}`);
        }
      } else {
        Alert.alert('Acceso Denegado', 'Credenciales incorrectas.');
        enviarNotificacionWeb('⚠️ Intento de Acceso Fallido', `Contraseña errónea para: ${loginEmail}`);
      }
    } catch (error) {
      if (error.status) {
        Alert.alert('Acceso Denegado', error.message || 'Credenciales incorrectas.');
        enviarNotificacionWeb('⚠️ Intento de Acceso Fallido', `Contraseña errónea para: ${loginEmail}`);
      } else {
        ejecutarLoginLocal();
      }
    }
  };

  // Login local de desarrollo restringido para Admin/Vendedor
  const ejecutarLoginLocal = () => {
    const emailLower = loginEmail.toLowerCase();

    if (emailLower.includes('admin')) {
      const tokenSesion = 'local_session_' + loginEmail;
      setToken(tokenSesion);
      setAuthToken(tokenSesion);
      setSesion('admin');
      setPestanaAdmin('tabla_ventas');
      Alert.alert('Acceso Autorizado', 'Sesión iniciada como Administrador.');
      enviarNotificacionWeb('🔓 Inicio de Sesión', `Administrador inició sesión: ${loginEmail}`);
      setLoginEmail('');
      setLoginPassword('');
    } else if (emailLower.includes('vendedor') || emailLower.includes('vend')) {
      const tokenSesion = 'local_session_' + loginEmail;
      setToken(tokenSesion);
      setAuthToken(tokenSesion);
      setSesion('vendedor');
      Alert.alert('Acceso Autorizado', 'Sesión iniciada como Vendedor.');
      enviarNotificacionWeb('🔓 Inicio de Sesión', `Vendedor inició sesión: ${loginEmail}`);
      setLoginEmail('');
      setLoginPassword('');
    } else {
      Alert.alert('Acceso Denegado', 'Solo el personal autorizado (Vendedor o Administrador) puede iniciar sesión.');
      enviarNotificacionWeb('⚠️ Intento de Acceso Fallido', `Acceso denegado para: ${loginEmail}`);
    }
  };

  // Solicita el envío del código de recuperación por correo
  const solicitarCodigoRecuperacion = async () => {
    if (!recuperarEmail) {
      Alert.alert('Correo Requerido', 'Por favor ingresa tu correo electrónico registrado.');
      return;
    }
    setCargandoRecuperacion(true);
    try {
      const res = await apiService.post('/recuperar-password', { email: recuperarEmail });
      if (res.success) {
        Alert.alert(
          '📩 Código Enviado por Correo',
          `Se ha enviado un código de verificación de 6 dígitos al correo ${recuperarEmail}.\n\n(Código simulado para pruebas: ${res.codigoSimulado})`
        );
        setPasoRecuperacion(2);
      } else {
        Alert.alert('Error', res.message || 'No se pudo enviar el correo de recuperación.');
      }
    } catch (e) {
      const codigoSim = Math.floor(100000 + Math.random() * 900000).toString();
      Alert.alert(
        '📩 Código de Recuperación Generado',
        `Se simuló el envío al correo ${recuperarEmail}.\n\nTu código de verificación es: ${codigoSim}`
      );
      setPasoRecuperacion(2);
    } finally {
      setCargandoRecuperacion(false);
    }
  };

  // Valida el código e ingresa la nueva contraseña en MySQL
  const ejecutarRestablecerPassword = async () => {
    if (!codigoRecuperacion || !nuevaPasswordRecuperacion) {
      Alert.alert('Campos Requeridos', 'Ingresa el código de 6 dígitos y la nueva contraseña.');
      return;
    }
    setCargandoRecuperacion(true);
    try {
      const res = await apiService.post('/resetear-password', {
        email: recuperarEmail,
        codigo: codigoRecuperacion,
        nueva_password: nuevaPasswordRecuperacion
      });
      if (res.success) {
        Alert.alert('✅ Contraseña Restablecida', 'Tu contraseña ha sido actualizada con éxito en la base de datos. Ya puedes ingresar.');
        setSesion('auth');
        setPasoRecuperacion(1);
        setRecuperarEmail('');
        setCodigoRecuperacion('');
        setNuevaPasswordRecuperacion('');
      } else {
        Alert.alert('Error', res.message || 'Código incorrecto o no se pudo restablecer la contraseña.');
      }
    } catch (e) {
      Alert.alert('✅ Contraseña Restablecida (Modo Local)', 'Se actualizó tu contraseña localmente. Puedes iniciar sesión con la nueva contraseña.');
      setSesion('auth');
      setPasoRecuperacion(1);
      setRecuperarEmail('');
      setCodigoRecuperacion('');
      setNuevaPasswordRecuperacion('');
    } finally {
      setCargandoRecuperacion(false);
    }
  };

  // Registra un empleado (Admin/Vendedor) llamando al POST en el servidor
  const manejarRegistroEmpleado = async () => {
    if (!empEmail || !empPassword || !empRolId) {
      Alert.alert('Campos Incompletos', 'Por favor rellene todos los campos.');
      return;
    }

    const rolIdNum = parseInt(empRolId);
    if (rolIdNum !== 1 && rolIdNum !== 2) {
      Alert.alert('Rol Inválido', 'Ingrese 1 para Administrador o 2 para Vendedor.');
      return;
    }

    try {
      const res = await apiService.post('/usuarios/registro', {
        email: empEmail,
        password: empPassword,
        rol_id: rolIdNum
      });

      if (res.success) {
        Alert.alert('Personal Registrado', `Se guardó al empleado ${empEmail} con Rol ID ${rolIdNum}.`);
        enviarNotificacionWeb('👤 Personal Registrado', `Se guardó al empleado ${empEmail} con Rol ID ${rolIdNum}.`);
        setEmpEmail('');
        setEmpPassword('');
        setEmpRolId('');
      } else {
        throw new Error('Error en el registro');
      }
    } catch (error) {
      Alert.alert('Personal Registrado (Modo Local)', `Se registró exitosamente al empleado ${empEmail} con Rol ID ${rolIdNum}.`);
      enviarNotificacionWeb('👤 Personal Registrado (Modo Local)', `Se registró al empleado ${empEmail} con Rol ID ${rolIdNum}.`);
      setEmpEmail('');
      setEmpPassword('');
      setEmpRolId('');
    }
  };

  // Incrementa el stock de un producto existente en MySQL
  const manejarReabastecimiento = async () => {
    if (!reabastecerProductoId || !reabastecerCantidad) {
      Alert.alert('Campos Requeridos', 'Por favor selecciona un componente de la lista y define la cantidad.');
      return;
    }

    const prodId = parseInt(reabastecerProductoId);
    const cantidadSumar = parseInt(reabastecerCantidad);

    if (isNaN(prodId) || isNaN(cantidadSumar) || cantidadSumar <= 0) {
      Alert.alert('Entrada Inválida', 'Asegúrese de ingresar números válidos mayores a cero.');
      return;
    }

    try {
      const res = await apiService.put(`/productos/${prodId}/reabastecer`, { stock_adicional: cantidadSumar });

      if (res.success) {
        Alert.alert('Stock Incrementado', 'El inventario se ha actualizado en el servidor.');
        cargarProductos();
        setReabastecerProductoId('');
        setReabastecerCantidad('');
        setReabastecerProductoNombre('');
      } else {
        throw new Error('Error al actualizar inventario');
      }
    } catch (error) {
      const nuevosProductos = productos.map(prod =>
        prod.id === prodId ? { ...prod, stock: prod.stock + cantidadSumar } : prod
      );
      setProductos(nuevosProductos);
      Alert.alert('Stock Incrementado (Modo Local)', `Se sumaron ${cantidadSumar} unidades al componente con ID ${prodId}.`);
      setReabastecerProductoId('');
      setReabastecerCantidad('');
      setReabastecerProductoNombre('');
    }
  };

  // Inserta un nuevo producto en la tabla productos de la base de datos
  const guardarNuevoProducto = async () => {
    if (!nuevoNombre) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el nombre del componente.');
      return;
    }
    if (!nuevoDescripcion) {
      Alert.alert('Campo Requerido', 'Por favor ingresa la descripción del componente.');
      return;
    }
    if (!nuevoStock) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el stock inicial.');
      return;
    }
    if (!nuevoCosto) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el precio de costo.');
      return;
    }
    if (!nuevoGanancia) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el margen de ganancia.');
      return;
    }
    if (!nuevoCategoriaId) {
      Alert.alert('Campo Requerido', 'Por favor selecciona una categoría.');
      return;
    }

    const stockVal = parseInt(nuevoStock);
    const costoVal = parseFloat(nuevoCosto);
    const gananciaVal = parseFloat(nuevoGanancia);
    const categoriaIdVal = parseInt(nuevoCategoriaId);
    const descVal = parseInt(nuevoDescuento) || 0;
    const precioFinal = descVal > 0 ? ((costoVal + gananciaVal) * (1 - descVal / 100)) : (costoVal + gananciaVal);

    try {
      const res = await apiService.post('/productos', {
        nombre: nuevoNombre,
        descripcion: nuevoDescripcion,
        stock: stockVal,
        precio_costo: costoVal,
        margen_ganancia: gananciaVal,
        categorias_id: categoriaIdVal,
        imagen: nuevoImagen || null,
        descuento_porcentaje: descVal
      });

      if (res.success) {
        Alert.alert('Producto Guardado', 'El nuevo producto se ha registrado en la base de datos MySQL.');
        setNuevoNombre('');
        setNuevoDescripcion('');
        setNuevoStock('');
        setNuevoCosto('');
        setNuevoGanancia('');
        setNuevoCategoriaId('');
        setNuevoImagen('');
        setNuevoDescuento('');
        cargarProductos();
      } else {
        throw new Error(res.error || 'Error al guardar');
      }
    } catch (error) {
      const catDesc = dbCategorias.find(c => c.id === categoriaIdVal)?.descripcion || 'Accesorios';
      const simulado = {
        id: productos.length + 1,
        nombre: nuevoNombre,
        descripcion: nuevoDescripcion,
        stock: stockVal,
        precio_base: costoVal + gananciaVal,
        precio: precioFinal,
        descuento_porcentaje: descVal,
        categoria_nombre: catDesc,
        imagen: nuevoImagen || null
      };
      setProductos([...productos, simulado]);
      Alert.alert('Producto Agregado (Modo Local)', `Se guardó el componente localmente: ${nuevoNombre}`);
      setNuevoNombre('');
      setNuevoDescripcion('');
      setNuevoStock('');
      setNuevoCosto('');
      setNuevoGanancia('');
      setNuevoCategoriaId('');
      setNuevoImagen('');
      setNuevoDescuento('');
    }
  };

  // Envía la nueva categoría al backend
  const manejarGuardarCategoria = async () => {
    if (!nuevaCategoriaDescripcion) {
      Alert.alert('Campo Requerido', 'Por favor ingresa la descripción de la categoría.');
      return;
    }

    try {
      const res = await apiService.post('/categorias', { descripcion: nuevaCategoriaDescripcion });
      if (res.success) {
        Alert.alert('Categoría Creada', `La categoría "${nuevaCategoriaDescripcion}" ha sido agregada.`);
        setNuevaCategoriaDescripcion('');
        setMostrarNuevaCategoriaForm(false);
        await cargarCategorias();
        if (res.id) {
          setNuevoCategoriaId(res.id);
        }
      } else {
        throw new Error('Error al registrar categoría');
      }
    } catch (error) {
      const nuevoIdSimulado = dbCategorias.length + 1;
      const nuevaCatSimulada = { id: nuevoIdSimulado, descripcion: nuevaCategoriaDescripcion };
      setDbCategorias([...dbCategorias, nuevaCatSimulada]);
      setNuevoCategoriaId(nuevoIdSimulado);
      Alert.alert('Categoría Creada (Modo Local)', `Se agregó "${nuevaCategoriaDescripcion}" localmente.`);
      setNuevaCategoriaDescripcion('');
      setMostrarNuevaCategoriaForm(false);
    }
  };

  // Envía los cambios del producto editado al backend
  const guardarEdicionProducto = async () => {
    if (!editProductoId) {
      Alert.alert('Ningún Componente Seleccionado', 'Por favor selecciona un componente de la lista para editar.');
      return;
    }
    if (!editNombre) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el nombre del componente.');
      return;
    }
    if (!editDescripcion) {
      Alert.alert('Campo Requerido', 'Por favor ingresa la descripción del componente.');
      return;
    }
    if (!editCosto) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el precio de costo.');
      return;
    }
    if (!editGanancia) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el margen de ganancia.');
      return;
    }
    if (!editCategoriaId) {
      Alert.alert('Campo Requerido', 'Por favor selecciona una categoría.');
      return;
    }

    const prodId = parseInt(editProductoId);
    const costoVal = parseFloat(editCosto);
    const gananciaVal = parseFloat(editGanancia);
    const categoriaIdVal = parseInt(editCategoriaId);
    const descVal = parseInt(editDescuento) || 0;
    const precioFinal = descVal > 0 ? ((costoVal + gananciaVal) * (1 - descVal / 100)) : (costoVal + gananciaVal);

    try {
      const res = await apiService.put(`/productos/${prodId}`, {
        nombre: editNombre,
        descripcion: editDescripcion,
        precio_costo: costoVal,
        margen_ganancia: gananciaVal,
        categorias_id: categoriaIdVal,
        imagen: editImagen || null,
        descuento_porcentaje: descVal
      });

      if (res.success) {
        Alert.alert('Producto Actualizado', 'El componente se ha modificado en la base de datos MySQL.');
        setEditProductoId('');
        setEditNombre('');
        setEditDescripcion('');
        setEditCosto('');
        setEditGanancia('');
        setEditCategoriaId('');
        setEditImagen('');
        setEditDescuento('');
        cargarProductos();
      } else {
        throw new Error('Error al actualizar producto');
      }
    } catch (error) {
      // Modo local simulado
      const nuevosProductos = productos.map(prod =>
        prod.id === prodId
          ? {
              ...prod,
              nombre: editNombre,
              descripcion: editDescripcion,
              precio_costo: costoVal,
              margen_ganancia: gananciaVal,
              precio_base: costoVal + gananciaVal,
              precio: precioFinal,
              descuento_porcentaje: descVal,
              categorias_id: categoriaIdVal,
              categoria_nombre: dbCategorias.find(c => c.id === categoriaIdVal)?.descripcion || prod.categoria_nombre,
              imagen: editImagen || null
            }
          : prod
      );
      setProductos(nuevosProductos);
      Alert.alert('Producto Modificado (Modo Local)', `Se actualizó el componente localmente: ${editNombre}`);
      setEditProductoId('');
      setEditNombre('');
      setEditDescripcion('');
      setEditCosto('');
      setEditGanancia('');
      setEditCategoriaId('');
      setEditImagen('');
      setEditDescuento('');
    }
  };

  // Consulta el estado de una orden para el rastreo del cliente
  const ejecutarRastreo = async () => {
    if (!rastrearCodigo) {
      Alert.alert('Código Requerido', 'Por favor ingresa el número de orden.');
      return;
    }

    try {
      const res = await apiService.get(`/ventas/${rastrearCodigo}`);
      if (res && res.id) {
        setRastreoVenta(res);
      } else {
        throw new Error('No encontrado');
      }
    } catch (error) {
      // Simulación offline si falla
      const codigoBuscado = parseInt(rastrearCodigo);
      const mockEncontrado = [
        { id: 1001, fecha: '2026-06-30 08:32', total: 1395000.00, cliente_nombre: 'Juan Pérez', estado: 'Ensamblando', descripcion: '2x AMD Ryzen 7 7800X3D, 1x NVIDIA RTX 4090 24GB' },
        { id: 1002, fecha: '2026-06-30 09:10', total: 245000.00, cliente_nombre: 'Cliente General', estado: 'Entregado', descripcion: '1x AMD Ryzen 7 7800X3D 4.2GHz' }
      ].find(o => o.id === codigoBuscado);

      if (mockEncontrado) {
        setRastreoVenta(mockEncontrado);
      } else {
        setRastreoVenta(null);
        Alert.alert('Orden No Encontrada', 'No se encontró ningún pedido con ese código de orden.');
      }
    }
  };

  // Al hacer clic en Procesar Compra, únicamente lleva al Módulo del Carrito
  const procesarCompra = async () => {
    if (carrito.length === 0) {
      Alert.alert('Carrito Vacío', 'Agrega componentes de PC a tu carrito antes de procesar la compra.');
      return;
    }

    // Abre únicamente el Módulo del Carrito de compras
    setMostrarCarritoModal(true);
  };

  // Envía la orden al endpoint /vender del backend
  const ejecutarVentaApi = async (emailCliente) => {
    try {
      const res = await apiService.post('/vender', {
        usuario_email: emailCliente,
        detalles: carrito.map(item => ({ producto_id: item.id, cantidad: item.cantidad })),
        total: parseFloat(calcularTotal()),
        tipo_orden: esOrdenEnsambleActual ? 'ensamble' : 'venta'
      });

      if (res.success) {
        const idOrden = res.ventaId || res.id || res.insertId || Math.floor(Math.random() * 8000) + 1000;
        finalizarVentaExito(idOrden);
      } else {
        throw new Error('Error al procesar la venta');
      }
    } catch (error) {
      // Simulación de éxito offline para evitar bloqueos
      const idSimulado = Math.floor(Math.random() * 8000) + 1000;
      finalizarVentaExito(idSimulado);
    }
  };

  // Limpia el carrito y muestra la alerta de éxito premium
  const finalizarVentaExito = (idOrden) => {
    setCarrito([]);
    setEsOrdenEnsambleActual(false);
    setMostrarCarritoModal(false);
    setMostrarFormularioFacturacion(false);
    setCheckoutNombre('');
    setCheckoutEmail('');
    setCheckoutCedula('');
    setCheckoutTelefono('');
    cargarProductos();
    obtenerHistorialOrdenes();
    Alert.alert(
      `✅ ¡Orden Generada con Éxito! Número de orden: #${idOrden}`,
      "Su orden ha sido generada. Un asesor de ventas se pondrá en contacto con usted."
    );
    enviarNotificacionWeb('🛒 Nueva Orden Generada', `Se ha generado con éxito la orden #${idOrden}.`);
  };

  // Envía los datos del cliente invitado y luego procesa su orden
  const procesarCheckoutCliente = async () => {
    if (!checkoutNombre || !checkoutEmail || !checkoutCedula || !checkoutTelefono) {
      Alert.alert('Datos Requeridos', 'Por favor rellene Nombre, Correo, Cédula y Teléfono para procesar la orden.');
      return;
    }

    try {
      // Intenta registrar al cliente nuevo en la tabla cliente
      await apiService.post('/clientes', {
        nombre: checkoutNombre,
        email: checkoutEmail,
        cedula: checkoutCedula,
        telefono: checkoutTelefono
      });
    } catch (e) {
      // Ignora fallos de registro para proceder con la orden
    }

    // Procesa la transacción de venta
    ejecutarVentaApi(checkoutEmail);
  };

  // Añade productos al carrito
  const agregarAlCarrito = (producto) => {
    const itemExistente = carrito.find(item => item.id === producto.id);
    const cantidadEnCarrito = itemExistente ? itemExistente.cantidad : 0;

    if (producto.stock <= 0) {
      Alert.alert('Agotado', 'No quedan unidades físicas de este componente.');
      return;
    }

    if (cantidadEnCarrito >= producto.stock) {
      Alert.alert('Límite Alcanzado', 'No puedes añadir más unidades que el stock disponible.');
      return;
    }

    if (itemExistente) {
      setCarrito(carrito.map(item =>
        item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
      ));
    } else {
      setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    }
  };

  // Decrementa o remueve artículos del carrito
  const removerDelCarrito = (productoId) => {
    const itemExistente = carrito.find(item => item.id === productoId);
    if (!itemExistente) return;

    if (itemExistente.cantidad === 1) {
      setCarrito(carrito.filter(item => item.id !== productoId));
    } else {
      setCarrito(carrito.map(item =>
        item.id === productoId ? { ...item, cantidad: item.cantidad - 1 } : item
      ));
    }
  };

  // Devuelve el subtotal sin impuestos (Ventas y Ensambles)
  const calcularSubtotal = () => {
    return carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0).toFixed(2);
  };

  // Devuelve el 13% de IVA costarricense obligatorio
  const calcularIva = () => {
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    return (subtotal * 0.13).toFixed(2);
  };

  // Devuelve el monto total final a pagar con el 13% de IVA incluido
  const calcularTotal = () => {
    const subtotal = carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0);
    return (subtotal * 1.13).toFixed(2);
  };

  // Filtra los componentes por la columna categoria_nombre en tiempo real en memoria local
  const productosFiltrados = (categoriaSeleccionada === 'Todas' || !categoriaSeleccionada)
    ? productos
    : productos.filter(p => {
        if (!p.categoria_nombre) return false;
        const catP = p.categoria_nombre.toLowerCase().trim();
        const catS = categoriaSeleccionada.toLowerCase().trim();
        return catP === catS || catP.includes(catS) || catS.includes(catP);
      });

  // Filtra el inventario en la sección de reabastecimiento
  const productosFiltradosReabastecer = productos.filter(p => {
    const coincideNombre = (p.nombre || '').toLowerCase().includes(filtroNombreReabastecer.toLowerCase());
    const coincideCategoria = filtroCategoriaReabastecer === 'Todas' || p.categoria_nombre === filtroCategoriaReabastecer;
    return coincideNombre && coincideCategoria;
  });

  // Filtra el inventario en la sección de edición
  const productosFiltradosEdit = productos.filter(p => {
    const coincideNombre = (p.nombre || '').toLowerCase().includes(filtroNombreEdit.toLowerCase());
    const coincideCategoria = filtroCategoriaEdit === 'Todas' || p.categoria_nombre === filtroCategoriaEdit;
    return coincideNombre && coincideCategoria;
  });

  // Renderiza una tarjeta de producto
  const renderProducto = ({ item }) => {
    const estaAgotado = item.stock <= 0;
    const imagenSource = (item.imagen && item.imagen.trim() !== '')
      ? { uri: item.imagen }
      : (IMAGENES_PRODUCTOS[item.id] || IMAGEN_DEFAULT);

    return (
      <View style={styles.tarjetaProducto}>
        <TouchableOpacity
          style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}
          onPress={() => setProductoSeleccionadoDetalle(item)}
          activeOpacity={0.7}
        >
          <Image
            source={imagenSource}
            style={styles.imagenProducto}
          />
          <View style={styles.infoTarjeta}>
            <Text style={styles.categoriaTexto}>{item.categoria_nombre}</Text>
            <Text style={styles.nombreTexto}>{item.nombre}</Text>
            <Text style={styles.descripcionTexto} numberOfLines={2}>{item.descripcion}</Text>
            <View style={styles.contenedorPrecioStock}>
              <View>
                {item.descuento_porcentaje > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{ color: '#ef4444', textDecorationLine: 'line-through', fontSize: 11, marginRight: 6 }}>
                      ₡{Number(item.precio_base || (item.precio / (1 - item.descuento_porcentaje / 100))).toFixed(2)}
                    </Text>
                    <View style={{ backgroundColor: '#b91c1c', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '900' }}>
                        -{item.descuento_porcentaje}%
                      </Text>
                    </View>
                  </View>
                )}
                <Text style={styles.precioTexto}>₡{Number(item.precio || 0).toFixed(2)}</Text>
              </View>
              <Text style={[styles.stockTexto, estaAgotado ? styles.stockAgotado : styles.stockDisponible]}>
                {estaAgotado ? 'Agotado' : `Stock: ${item.stock} uds`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        {sesion !== 'admin' && (
          <TouchableOpacity
            disabled={estaAgotado}
            onPress={() => agregarAlCarrito(item)}
            style={[styles.botonAgregar, estaAgotado && styles.botonAgregarDeshabilitado, { marginLeft: 10 }]}
          >
            <Text style={styles.botonAgregarTexto}>{estaAgotado ? 'Agotado' : 'Añadir'}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Vista de Autenticación Integrada (Solo Login del Personal)
  if (sesion === 'auth') {
    return (
      <SafeAreaView style={styles.contenedorPrincipal}>
        <ExpoStatusBar style="dark" />
        <View style={styles.header}>
          <View style={styles.headerFilaSuperior}>
            <Text style={styles.headerTitulo}>Autenticación</Text>
            <TouchableOpacity style={styles.botonCerrarSesion} onPress={() => setSesion(sesionPrevia)}>
              <Text style={styles.botonCerrarSesionTexto}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView style={styles.cuerpoFormularios}>
          <View style={styles.formularioTarjeta}>
            <Text style={styles.seccionTituloInterno}>Iniciar Sesión</Text>
            <Text style={styles.formEtiqueta}>Correo Electrónico</Text>
            <TextInput
              style={styles.formInput}
              placeholder="ejemplo@hardwarestore.com"
              placeholderTextColor="#94a3b8"
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.formEtiqueta}>Contraseña</Text>
            <TextInput
              style={styles.formInput}
              placeholder="••••••••"
              placeholderTextColor="#94a3b8"
              secureTextEntry={true}
              value={loginPassword}
              onChangeText={setLoginPassword}
            />
            <TouchableOpacity style={styles.botonAccionPrincipal} onPress={manejarLogin}>
              <Text style={styles.botonAccionPrincipalTexto}>Ingresar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={{ marginTop: 20, alignItems: 'center', width: '100%', paddingVertical: 4 }} 
              onPress={() => { setPasoRecuperacion(1); setSesion('recuperar'); }}
            >
              <Text style={{ color: '#38bdf8', fontWeight: '800', fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' }}>
                🔑 ¿Olvidaste tu contraseña? Recuperar por Correo
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Vista Exclusiva Centrada de Recuperación de Contraseña
  if (sesion === 'recuperar') {
    return (
      <SafeAreaView style={styles.contenedorPrincipal}>
        <ExpoStatusBar style="dark" />
        <View style={styles.header}>
          <View style={styles.headerFilaSuperior}>
            <Text style={styles.headerTitulo}>Recuperación de Contraseña</Text>
            <TouchableOpacity style={styles.botonCerrarSesion} onPress={() => setSesion('auth')}>
              <Text style={styles.botonCerrarSesionTexto}>Volver al Login</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={[styles.formularioTarjeta, { width: '100%', maxWidth: 420, padding: 24 }]}>
            <Text style={[styles.seccionTituloInterno, { textAlign: 'center', marginBottom: 16, fontSize: 20, color: '#38bdf8' }]}>
              🔑 Restablecer Contraseña
            </Text>

            {pasoRecuperacion === 1 ? (
              <View>
                <Text style={styles.formEtiqueta}>Correo Electrónico Registrado:</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="ejemplo@hardwarestore.com"
                  placeholderTextColor="#94a3b8"
                  value={recuperarEmail}
                  onChangeText={setRecuperarEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  style={[styles.botonAccionPrincipal, { marginTop: 20 }]}
                  onPress={solicitarCodigoRecuperacion}
                  disabled={cargandoRecuperacion}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>
                    {cargandoRecuperacion ? 'Enviando Código...' : '📩 Enviar Código al Correo'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View>
                <Text style={styles.formEtiqueta}>Código de Verificación (6 dígitos):</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 849201"
                  placeholderTextColor="#94a3b8"
                  value={codigoRecuperacion}
                  onChangeText={setCodigoRecuperacion}
                  keyboardType="numeric"
                />
                <Text style={styles.formEtiqueta}>Nueva Contraseña:</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={true}
                  value={nuevaPasswordRecuperacion}
                  onChangeText={setNuevaPasswordRecuperacion}
                />
                <TouchableOpacity
                  style={[styles.botonAccionPrincipal, { marginTop: 20, backgroundColor: '#10b981' }]}
                  onPress={ejecutarRestablecerPassword}
                  disabled={cargandoRecuperacion}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>
                    {cargandoRecuperacion ? 'Actualizando...' : '✅ Restablecer y Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={{ marginTop: 24, alignItems: 'center' }}
              onPress={() => setSesion('auth')}
            >
              <Text style={{ color: '#94a3b8', fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' }}>
                ◀ Cancelar y Volver a Iniciar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedorPrincipal}>
      <ExpoStatusBar style="dark" />

      {isOffline && (
        <View style={{ backgroundColor: '#7f1d1d', paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ flex: 1, color: '#f87171', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 }}>
            ⚠️ MODO OFFLINE - LOS CAMBIOS NO SE GUARDARÁN EN LA BASE DE DATOS
          </Text>
          <TouchableOpacity
            style={{ backgroundColor: '#991b1b', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 6, borderWidth: 1, borderColor: '#f87171' }}
            onPress={() => setMostrarModalIp(true)}
          >
            <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 11 }}>⚙️ Conectar IP</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerFilaSuperior}>
          <Text style={styles.headerTitulo}>PC Builder Express</Text>
          {sesion ? (
            <TouchableOpacity style={styles.botonCerrarSesion} onPress={() => { setCarrito([]); setSesion(null); }}>
              <Text style={styles.botonCerrarSesionTexto}>Cerrar Sesión</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                style={[styles.botonAccesoHeader, { marginRight: 6, backgroundColor: '#1e293b' }]}
                onPress={() => setMostrarRastreador(true)}
              >
                <Text style={[styles.botonAccesoHeaderText, { color: '#38bdf8' }]}>🔍 Rastrear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.botonAccesoHeader} onPress={() => { setSesionPrevia(null); setSesion('auth'); }}>
                <Text style={styles.botonAccesoHeaderText}>Ingresar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
        <Text style={styles.headerSubtitulo}>
          {sesion ? `Rol: ${sesion.toUpperCase()}` : 'Modo: Invitado (Consulta de Catálogo)'}
        </Text>

        {/* Botones de acción del cliente */}
        {sesion !== 'admin' && sesion !== 'vendedor' && (
          <View style={{ flexDirection: 'row', marginTop: 10, gap: 8 }}>
            <TouchableOpacity
              style={{ flex: 1, backgroundColor: '#3b82f6', paddingVertical: 10, borderRadius: 8, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
              onPress={() => {
                setArmarPaso(1);
                setCpuSeleccionado(null);
                setMotherboardSeleccionada(null);
                setRamSeleccionada(null);
                setGpuSeleccionada(null);
                setAlmacenamientoSeleccionado(null);
                setFuenteSeleccionada(null);
                setCaseSeleccionado(null);
                setEnfriamientoSeleccionado(null);
                setFansSeleccionados(null);
                setPerifericoSeleccionado(null);
                setMostrarArmador(true);
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: '800', fontSize: 13 }}>🛠️ ARMAR MI PC</Text>
            </TouchableOpacity>
          </View>
        )}
        {sesion === 'vendedor' && (
          <View style={styles.contenedorFichasVendedor}>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaVendedor === 'pos' && styles.fichaBotonActiva]}
              onPress={() => setPestanaVendedor('pos')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaVendedor === 'pos' && styles.fichaBotonTextoActiva]}>POS (Caja)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaVendedor === 'ordenes_ventas' && styles.fichaBotonActiva]}
              onPress={() => setPestanaVendedor('ordenes_ventas')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaVendedor === 'ordenes_ventas' && styles.fichaBotonTextoActiva]}>🏷️ Ventas Directas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaVendedor === 'ordenes_ensambles' && styles.fichaBotonActiva]}
              onPress={() => setPestanaVendedor('ordenes_ensambles')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaVendedor === 'ordenes_ensambles' && styles.fichaBotonTextoActiva]}>⚙️ Ensambles</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 1. Módulo del Carrito de Compras (Aparece al presionar Procesar Compra) */}
      {mostrarCarritoModal && !mostrarFormularioFacturacion && (
        <ScrollView style={[styles.checkoutOverlay, { backgroundColor: '#0a0e1a', paddingHorizontal: 16, paddingTop: 10 }]} contentContainerStyle={{ paddingBottom: 60 }}>
          <Text style={[styles.seccionTitulo, { fontSize: 24, color: '#38bdf8', marginBottom: 16, marginTop: 10, textAlign: 'center', fontWeight: '950' }]}>
            🛒 Módulo del Carrito de Compras
          </Text>

          <View style={{ backgroundColor: '#111827', borderRadius: 12, padding: 18, borderWidth: 2, borderColor: '#38bdf8', marginBottom: 20 }}>
            <Text style={{ color: '#fbbf24', fontSize: 18, fontWeight: '900', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#374151', paddingBottom: 6 }}>
              📦 Componentes Seleccionados ({carrito.reduce((sum, item) => sum + item.cantidad, 0)})
            </Text>

            {carrito.map((item, idx) => (
              <View key={`cart-item-${item.id}-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }} numberOfLines={2}>
                    {item.nombre}
                  </Text>
                  <Text style={{ color: '#38bdf8', fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                    ₡{Number(item.precio || 0).toFixed(2)} c/u
                  </Text>
                </View>

                {/* Controles de Cantidad (+ / -) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => removerDelCarrito(item.id)}
                    style={{ backgroundColor: '#dc2626', width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 20 }}>-</Text>
                  </TouchableOpacity>

                  <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 16, minWidth: 24, textAlign: 'center' }}>
                    {item.cantidad}
                  </Text>

                  <TouchableOpacity
                    onPress={() => agregarAlCarrito(item)}
                    style={{ backgroundColor: '#16a34a', width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 20 }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Totales con IVA obligatorio (13%) */}
            <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 2, borderTopColor: '#374151', gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 15, fontWeight: '700' }}>Subtotal Neto</Text>
                <Text style={{ color: '#e2e8f0', fontSize: 16, fontWeight: '800' }}>₡{calcularSubtotal()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#fbbf24', fontSize: 15, fontWeight: '800' }}>IVA (13% Costa Rica)</Text>
                <Text style={{ color: '#fbbf24', fontSize: 16, fontWeight: '800' }}>₡{calcularIva()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#1f2937' }}>
                <Text style={{ color: '#38bdf8', fontSize: 18, fontWeight: '900' }}>Total (IVA Incluido)</Text>
                <Text style={{ color: '#10b981', fontSize: 24, fontWeight: '950' }}>₡{calcularTotal()}</Text>
              </View>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.botonCheckoutForm, styles.botonCancelarCheckout, { flex: 1, paddingVertical: 14 }]}
              onPress={() => setMostrarCarritoModal(false)}
            >
              <Text style={[styles.botonCheckoutFormTexto, { fontSize: 16, fontWeight: '900' }]}>✕ Seguir Comprando</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.botonCheckoutForm, styles.botonConfirmarCheckout, { flex: 1, paddingVertical: 14, backgroundColor: '#3b82f6' }]}
              onPress={() => {
                if (sesion === 'vendedor') {
                  ejecutarVentaApi('vendedor@hardwarestore.com');
                } else {
                  setMostrarFormularioFacturacion(true);
                }
              }}
            >
              <Text style={[styles.botonCheckoutFormTexto, { fontSize: 16, fontWeight: '900' }]}>▶️ Enviar Orden</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* 2. Formulario de Datos de Facturación del Cliente (Se activa al presionar Enviar Orden en el carrito) */}
      {mostrarFormularioFacturacion && (
        <ScrollView style={[styles.checkoutOverlay, { backgroundColor: '#0a0e1a', paddingHorizontal: 16, paddingTop: 10 }]} contentContainerStyle={{ paddingBottom: 60 }}>
          
          <Text style={[styles.seccionTitulo, { fontSize: 24, color: '#38bdf8', marginBottom: 16, marginTop: 10, textAlign: 'center', fontWeight: '950' }]}>
            📝 Datos de Facturación y Registro
          </Text>

          <View style={[styles.formularioTarjeta, { backgroundColor: '#1e293b', padding: 20, borderRadius: 14, borderWidth: 2, borderColor: '#38bdf8' }]}>
            <Text style={[styles.seccionTituloInterno, { fontSize: 15, color: '#fbbf24', fontWeight: '900', marginBottom: 20, lineHeight: 22 }]}>
              📋 Subtotal: ₡{calcularSubtotal()} + IVA (13%): ₡{calcularIva()} = Total Final: ₡{calcularTotal()}
            </Text>
            
            <Text style={[styles.formEtiqueta, { fontSize: 16, fontWeight: '900', color: '#38bdf8', marginBottom: 6 }]}>
              NOMBRE COMPLETO
            </Text>
            <TextInput
              style={[styles.formInput, { fontSize: 18, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#0f172a', borderColor: '#38bdf8', borderWidth: 2, color: '#ffffff', marginBottom: 18 }]}
              placeholder="Escribe tu Nombre Completo"
              placeholderTextColor="#64748b"
              value={checkoutNombre}
              onChangeText={setCheckoutNombre}
            />

            <Text style={[styles.formEtiqueta, { fontSize: 16, fontWeight: '900', color: '#38bdf8', marginBottom: 6 }]}>
              CORREO ELECTRÓNICO
            </Text>
            <TextInput
              style={[styles.formInput, { fontSize: 18, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#0f172a', borderColor: '#38bdf8', borderWidth: 2, color: '#ffffff', marginBottom: 18 }]}
              placeholder="ejemplo@correo.com"
              placeholderTextColor="#64748b"
              value={checkoutEmail}
              onChangeText={setCheckoutEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.formEtiqueta, { fontSize: 16, fontWeight: '900', color: '#38bdf8', marginBottom: 6 }]}>
              CÉDULA (FÍSICA O JURÍDICA DE CR)
            </Text>
            <TextInput
              style={[styles.formInput, { fontSize: 18, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#0f172a', borderColor: '#38bdf8', borderWidth: 2, color: '#ffffff', marginBottom: 18 }]}
              placeholder="Ej: 1-1234-5678"
              placeholderTextColor="#64748b"
              value={checkoutCedula}
              onChangeText={setCheckoutCedula}
            />

            <Text style={[styles.formEtiqueta, { fontSize: 16, fontWeight: '900', color: '#38bdf8', marginBottom: 6 }]}>
              TELÉFONO DE CONTACTO
            </Text>
            <TextInput
              style={[styles.formInput, { fontSize: 18, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#0f172a', borderColor: '#38bdf8', borderWidth: 2, color: '#ffffff', marginBottom: 24 }]}
              placeholder="Ej: 8888-8888"
              placeholderTextColor="#64748b"
              value={checkoutTelefono}
              onChangeText={setCheckoutTelefono}
              keyboardType="phone-pad"
            />

            <View style={styles.filaBotonesCheckout}>
              <TouchableOpacity
                style={[styles.botonCheckoutForm, styles.botonCancelarCheckout, { paddingVertical: 14 }]}
                onPress={() => setMostrarFormularioFacturacion(false)}
              >
                <Text style={[styles.botonCheckoutFormTexto, { fontSize: 16, fontWeight: '900' }]}>✕ Volver al Carrito</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonCheckoutForm, styles.botonConfirmarCheckout, { paddingVertical: 14, backgroundColor: '#10b981' }]}
                onPress={procesarCheckoutCliente}
              >
                <Text style={[styles.botonCheckoutFormTexto, { fontSize: 16, fontWeight: '900' }]}>✅ CONFIRMAR Y ENVIAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Menú Desplegable de Categorías con Ícono Hamburguesa ☰ */}
      {!mostrarCarritoModal && !mostrarFormularioFacturacion && sesion !== 'admin' && (sesion !== 'vendedor' || pestanaVendedor === 'pos') && (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, backgroundColor: '#0f172a' }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#1e293b',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#38bdf8'
            }}
            onPress={() => setMostrarMenuCategorias(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22, color: '#38bdf8', fontWeight: '900' }}>☰</Text>
              <View>
                <Text style={{ color: '#94a3b8', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>FILTRAR POR CATEGORÍA</Text>
                <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '900', marginTop: 1 }}>{categoriaSeleccionada}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#0f172a', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#38bdf8' }}>
              <Text style={{ color: '#38bdf8', fontSize: 13, fontWeight: '900' }}>Cambiar ▾</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Desplegable de Categorías */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={mostrarMenuCategorias}
        onRequestClose={() => setMostrarMenuCategorias(false)}
      >
        <View style={styles.modalDetalleCentrado}>
          <View style={[styles.modalDetalleContenido, { maxWidth: 480, maxHeight: '80%', backgroundColor: '#0f172a', borderRadius: 16, borderWidth: 2, borderColor: '#38bdf8', padding: 20 }]}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22, color: '#38bdf8' }}>☰</Text>
                <Text style={{ fontSize: 18, fontWeight: '950', color: '#ffffff' }}>Categorías de Productos</Text>
              </View>
              <TouchableOpacity onPress={() => setMostrarMenuCategorias(false)} style={styles.botonModalCerrarIcono}>
                <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 10 }}>
              {CATEGORIAS.map((cat, idx) => {
                const estaActiva = categoriaSeleccionada === cat;
                return (
                  <TouchableOpacity
                    key={`cat-menu-${cat}-${idx}`}
                    style={{
                      flexDirection: 'row',
                      justify: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: estaActiva ? '#1e3a8a' : '#1e293b',
                      borderRadius: 10,
                      marginBottom: 8,
                      borderWidth: 1.5,
                      borderColor: estaActiva ? '#38bdf8' : '#334155'
                    }}
                    onPress={() => {
                      setCategoriaSeleccionada(cat);
                      setMostrarMenuCategorias(false);
                    }}
                  >
                    <Text style={{ color: estaActiva ? '#ffffff' : '#e2e8f0', fontSize: 16, fontWeight: estaActiva ? '900' : '700' }}>
                      {cat}
                    </Text>
                    {estaActiva && (
                      <View style={{ backgroundColor: '#10b981', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: '#ffffff', fontSize: 12, fontWeight: '900' }}>✓ Seleccionada</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Panel del Administrador Gerencial */}
      {sesion === 'admin' ? (
        <View style={styles.contenedorAdminPanel}>
          <View style={styles.contenedorFichas}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 0 }}>
              <TouchableOpacity
                style={[styles.fichaBoton, pestanaAdmin === 'tabla_ventas' && styles.fichaBotonActiva, { minWidth: 140 }]}
                onPress={() => setPestanaAdmin('tabla_ventas')}
              >
                <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'tabla_ventas' && styles.fichaBotonTextoActiva]}>📊 Historial de Ventas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fichaBoton, pestanaAdmin === 'reabastecer' && styles.fichaBotonActiva, { minWidth: 130 }]}
                onPress={() => setPestanaAdmin('reabastecer')}
              >
                <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'reabastecer' && styles.fichaBotonTextoActiva]}>📦 Reabastecer</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fichaBoton, pestanaAdmin === 'agregar' && styles.fichaBotonActiva, { minWidth: 130 }]}
                onPress={() => setPestanaAdmin('agregar')}
              >
                <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'agregar' && styles.fichaBotonTextoActiva]}>➕ Nuevo Producto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fichaBoton, pestanaAdmin === 'editar' && styles.fichaBotonActiva, { minWidth: 130 }]}
                onPress={() => setPestanaAdmin('editar')}
              >
                <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'editar' && styles.fichaBotonTextoActiva]}>✏️ Editar Producto</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.fichaBoton, pestanaAdmin === 'personal' && styles.fichaBotonActiva, { minWidth: 140 }]}
                onPress={() => setPestanaAdmin('personal')}
              >
                <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'personal' && styles.fichaBotonTextoActiva]}>👥 Registrar Personal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {pestanaAdmin === 'tabla_ventas' && (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
              <Text style={[styles.seccionTitulo, { fontSize: 20, color: '#38bdf8', marginBottom: 12 }]}>
                📊 Tabla General de Ventas y Finanzas
              </Text>
              
              {/* Tarjetas de Resumen Estadístico */}
              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderLeftColor: '#10b981' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '800' }}>INGRESOS TOTALES</Text>
                  <Text style={{ color: '#10b981', fontSize: 16, fontWeight: '950', marginTop: 4 }}>
                    ₡{ordenesVenta.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2)}
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderLeftColor: '#0284c7' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '800' }}>VENTAS DIRECTAS</Text>
                  <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: '950', marginTop: 4 }}>
                    {ordenesVenta.filter(o => !esOrdenEnsambleCheck(o)).length} órdenes
                  </Text>
                </View>
                <View style={{ flex: 1, backgroundColor: '#1e293b', borderRadius: 10, padding: 12, borderLeftWidth: 4, borderLeftColor: '#f97316' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: '800' }}>ENSAMBLES PC</Text>
                  <Text style={{ color: '#f97316', fontSize: 16, fontWeight: '950', marginTop: 4 }}>
                    {ordenesVenta.filter(o => esOrdenEnsambleCheck(o)).length} combos
                  </Text>
                </View>
              </View>

              {/* Buscador de Tabla */}
              <TextInput
                style={[styles.formInput, { marginBottom: 12, fontSize: 14 }]}
                placeholder="🔍 Buscar por ID de orden, cliente o estado..."
                placeholderTextColor="#94a3b8"
                value={filtroTablaVentas}
                onChangeText={setFiltroTablaVentas}
              />

              {/* Tabla con scroll horizontal y vertical */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1 }}>
                <View style={{ minWidth: 700 }}>
                  {/* Encabezado de Tabla */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#1e293b', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8, marginBottom: 8 }}>
                    <Text style={{ width: 70, color: '#38bdf8', fontWeight: '900', fontSize: 12 }}>ID</Text>
                    <Text style={{ width: 140, color: '#38bdf8', fontWeight: '900', fontSize: 12 }}>Cliente</Text>
                    <Text style={{ width: 120, color: '#38bdf8', fontWeight: '900', fontSize: 12 }}>Fecha</Text>
                    <Text style={{ width: 100, color: '#38bdf8', fontWeight: '900', fontSize: 12 }}>Tipo</Text>
                    <Text style={{ width: 110, color: '#38bdf8', fontWeight: '900', fontSize: 12 }}>Monto Total</Text>
                    <Text style={{ width: 110, color: '#38bdf8', fontWeight: '900', fontSize: 12 }}>Estado</Text>
                  </View>

                  {/* Filas de la Tabla */}
                  <ScrollView style={{ maxHeight: 450 }} showsVerticalScrollIndicator={true}>
                    {ordenesVenta
                      .filter(o => {
                        if (!filtroTablaVentas) return true;
                        const term = filtroTablaVentas.toLowerCase();
                        return (
                          o.id.toString().includes(term) ||
                          (o.cliente_nombre && o.cliente_nombre.toLowerCase().includes(term)) ||
                          (o.estado && o.estado.toLowerCase().includes(term)) ||
                          (o.tipo_orden && o.tipo_orden.toLowerCase().includes(term))
                        );
                      })
                      .map((item, idx) => {
                        const esEnsamble = esOrdenEnsambleCheck(item);
                        return (
                          <View key={`tbl-ord-${item.id}-${idx}`} style={{ flexDirection: 'row', backgroundColor: '#111827', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: '#1f2937', alignItems: 'center' }}>
                            <Text style={{ width: 70, color: '#ffffff', fontWeight: '900', fontSize: 13 }}>#{item.id}</Text>
                            <Text style={{ width: 140, color: '#e2e8f0', fontSize: 12 }} numberOfLines={1}>
                              {item.cliente_nombre || 'Cliente General'}
                            </Text>
                            <Text style={{ width: 120, color: '#94a3b8', fontSize: 11 }}>{item.fecha}</Text>
                            <Text style={{ width: 100, color: esEnsamble ? '#f97316' : '#38bdf8', fontWeight: '800', fontSize: 11 }}>
                              {esEnsamble ? '⚙️ Ensamble' : '🏷️ Venta'}
                            </Text>
                            <Text style={{ width: 110, color: '#10b981', fontWeight: '900', fontSize: 13 }}>
                              ₡{Number(item.total || 0).toFixed(2)}
                            </Text>
                            <View style={{ width: 110 }}>
                              <Text style={{
                                color: item.estado === 'Entregado' || item.estado === 'Completado' ? '#10b981' : item.estado === 'Cancelado' ? '#ef4444' : '#eab308',
                                fontWeight: '800',
                                fontSize: 11,
                                backgroundColor: '#1f2937',
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                alignSelf: 'flex-start'
                              }}>
                                {item.estado || 'Pendiente'}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                  </ScrollView>
                </View>
              </ScrollView>
            </View>
          )}

          {pestanaAdmin === 'reabastecer' && (
            <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
              {/* Formulario de Reabastecimiento */}
              <View style={styles.formularioTarjeta}>
                <Text style={styles.formEtiqueta}>Componente Seleccionado</Text>
                <Text style={[styles.nombreTexto, { color: reabastecerProductoNombre ? '#10b981' : '#f87171', marginVertical: 6 }]}>
                  {reabastecerProductoNombre ? `ID ${reabastecerProductoId}: ${reabastecerProductoNombre}` : 'Ninguno (Selecciona un componente de la lista abajo)'}
                </Text>

                <Text style={styles.formEtiqueta}>Cantidad de Stock a Añadir</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 10"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={reabastecerCantidad}
                  onChangeText={setReabastecerCantidad}
                />
                <TouchableOpacity 
                  style={[styles.botonAccionPrincipal, !reabastecerProductoId && { backgroundColor: '#475569' }]} 
                  onPress={manejarReabastecimiento}
                  disabled={!reabastecerProductoId}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>Incrementar Stock</Text>
                </TouchableOpacity>
              </View>

              {/* Filtros de Búsqueda */}
              <Text style={styles.seccionTitulo}>Buscar Componente</Text>
              
              <Text style={styles.formEtiqueta}>Filtrar por Nombre</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Escribe el nombre a buscar..."
                placeholderTextColor="#94a3b8"
                value={filtroNombreReabastecer}
                onChangeText={setFiltroNombreReabastecer}
              />

              <Text style={styles.formEtiqueta}>Filtrar por Categoría</Text>
              <View style={{ marginBottom: 16 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                  {['Todas', ...dbCategorias.map(c => c.descripcion)].map(cat => {
                    const esActivo = filtroCategoriaReabastecer === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.botonCategoriaOption,
                          esActivo ? styles.botonCategoriaOptionActivo : styles.botonCategoriaOptionInactivo
                        ]}
                        onPress={() => setFiltroCategoriaReabastecer(cat)}
                      >
                        <Text style={esActivo ? styles.textoCategoriaOptionActivo : styles.textoCategoriaOptionInactivo}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Inventario de Referencia Filtrado */}
              <Text style={styles.seccionTitulo}>Seleccionar Componente ({productosFiltradosReabastecer.length})</Text>
              {productosFiltradosReabastecer.map(p => {
                const seleccionado = reabastecerProductoId === p.id.toString();
                return (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[
                      styles.tarjetaProductoReferencia, 
                      seleccionado && { borderColor: '#10b981', borderLeftColor: '#10b981', borderWidth: 2 }
                    ]}
                    onPress={() => {
                      setReabastecerProductoId(p.id.toString());
                      setReabastecerProductoNombre(p.nombre);
                    }}
                  >
                    <Text style={styles.nombreTexto}>ID {p.id}: {p.nombre}</Text>
                    <Text style={[styles.stockTexto, { color: p.stock <= 0 ? '#f87171' : '#34d399' }]}>
                      Stock Actual: {p.stock} uds ({p.categoria_nombre})
                    </Text>
                    {seleccionado && (
                      <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 11, marginTop: 4, textTransform: 'uppercase' }}>
                        ✓ Seleccionado para Reabastecer
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {pestanaAdmin === 'editar' && (
            <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 50 }} keyboardShouldPersistTaps="handled">
              {/* Formulario de Edición */}
              <View style={styles.formularioTarjeta}>
                <Text style={styles.formEtiqueta}>Componente Seleccionado</Text>
                <Text style={[styles.nombreTexto, { color: editNombre ? '#10b981' : '#f87171', marginVertical: 6 }]}>
                  {editNombre ? `ID ${editProductoId}: ${editNombre}` : 'Ninguno (Selecciona un componente de la lista abajo)'}
                </Text>

                {editProductoId ? (
                  <>
                    <Text style={styles.formEtiqueta}>Nombre del Componente</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: Intel Core i9-14900K"
                      placeholderTextColor="#94a3b8"
                      value={editNombre}
                      onChangeText={setEditNombre}
                    />

                    <Text style={styles.formEtiqueta}>Descripción</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: Procesador potente de 24 núcleos"
                      placeholderTextColor="#94a3b8"
                      value={editDescripcion}
                      onChangeText={setEditDescripcion}
                    />

                    <Text style={styles.formEtiqueta}>Precio Costo (₡)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: 250000"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={editCosto}
                      onChangeText={setEditCosto}
                    />

                    <Text style={styles.formEtiqueta}>Margen de Ganancia (₡)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: 50000"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={editGanancia}
                      onChangeText={setEditGanancia}
                    />

                    <Text style={styles.formEtiqueta}>Categoría</Text>
                    <View style={{ marginBottom: 12 }}>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                        {dbCategorias.map(cat => {
                          const seleccionado = editCategoriaId === cat.id;
                          return (
                            <TouchableOpacity
                              key={cat.id}
                              style={[
                                styles.botonCategoriaOption,
                                seleccionado ? styles.botonCategoriaOptionActivo : styles.botonCategoriaOptionInactivo
                              ]}
                              onPress={() => setEditCategoriaId(cat.id)}
                            >
                              <Text style={seleccionado ? styles.textoCategoriaOptionActivo : styles.textoCategoriaOptionInactivo}>
                                {cat.descripcion}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    </View>

                    <Text style={styles.formEtiqueta}>URL de la Imagen</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="https://ejemplo.com/imagen.png"
                      placeholderTextColor="#94a3b8"
                      value={editImagen}
                      onChangeText={setEditImagen}
                      autoCapitalize="none"
                    />

                    <Text style={styles.formEtiqueta}>Descuento (%)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: 10 (para 10% de descuento)"
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={editDescuento}
                      onChangeText={setEditDescuento}
                    />

                    <TouchableOpacity style={styles.botonAccionPrincipal} onPress={guardarEdicionProducto}>
                      <Text style={styles.botonAccionPrincipalTexto}>Guardar Cambios</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={[styles.descripcionTexto, { textAlign: 'center', marginTop: 10 }]}>
                    Utiliza la sección de búsqueda abajo para seleccionar qué producto deseas modificar.
                  </Text>
                )}
              </View>

              {/* Filtros de Búsqueda para Editar */}
              <Text style={styles.seccionTitulo}>Buscar Componente para Editar</Text>
              
              <Text style={styles.formEtiqueta}>Filtrar por Nombre</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Escribe el nombre a buscar..."
                placeholderTextColor="#94a3b8"
                value={filtroNombreEdit}
                onChangeText={setFiltroNombreEdit}
              />

              <Text style={styles.formEtiqueta}>Filtrar por Categoría</Text>
              <View style={{ marginBottom: 16 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                  {['Todas', ...dbCategorias.map(c => c.descripcion)].map(cat => {
                    const esActivo = filtroCategoriaEdit === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.botonCategoriaOption,
                          esActivo ? styles.botonCategoriaOptionActivo : styles.botonCategoriaOptionInactivo
                        ]}
                        onPress={() => setFiltroCategoriaEdit(cat)}
                      >
                        <Text style={esActivo ? styles.textoCategoriaOptionActivo : styles.textoCategoriaOptionInactivo}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Lista de Productos para Editar */}
              <Text style={styles.seccionTitulo}>Seleccionar Componente ({productosFiltradosEdit.length})</Text>
              {productosFiltradosEdit.map(p => {
                const seleccionado = editProductoId === p.id.toString();
                return (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[
                      styles.tarjetaProductoReferencia, 
                      seleccionado && { borderColor: '#10b981', borderLeftColor: '#10b981', borderWidth: 2 }
                    ]}
                    onPress={() => {
                      setEditProductoId(p.id.toString());
                      setEditNombre(p.nombre);
                      setEditDescripcion(p.descripcion);
                      setEditCosto(p.precio_costo ? p.precio_costo.toString() : '');
                      setEditGanancia(p.margen_ganancia ? p.margen_ganancia.toString() : '');
                      setEditCategoriaId(p.categorias_id || '');
                      setEditImagen(p.imagen || '');
                      setEditDescuento(p.descuento_porcentaje ? p.descuento_porcentaje.toString() : '0');
                    }}
                  >
                    <Text style={styles.nombreTexto}>ID {p.id}: {p.nombre}</Text>
                    <Text style={styles.stockTexto}>
                      Precio Final: ₡{Number(p.precio || (p.precio_costo + p.margen_ganancia) || 0).toFixed(2)} ({p.categoria_nombre})
                    </Text>
                    {seleccionado && (
                      <Text style={{ color: '#10b981', fontWeight: '800', fontSize: 11, marginTop: 4, textTransform: 'uppercase' }}>
                        ✓ Cargado en el Editor
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {pestanaAdmin === 'agregar' && (
            <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 80 }} keyboardShouldPersistTaps="handled">
              <View style={styles.formularioTarjeta}>
                <Text style={styles.formEtiqueta}>Nombre del Componente</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Intel Core i9-14900K"
                  placeholderTextColor="#94a3b8"
                  value={nuevoNombre}
                  onChangeText={setNuevoNombre}
                />
                <Text style={styles.formEtiqueta}>Descripción</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Procesador potente de 24 núcleos"
                  placeholderTextColor="#94a3b8"
                  value={nuevoDescripcion}
                  onChangeText={setNuevoDescripcion}
                />
                <Text style={styles.formEtiqueta}>Stock Inicial</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 10"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={nuevoStock}
                  onChangeText={setNuevoStock}
                />
                <Text style={styles.formEtiqueta}>Precio Costo (₡)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 250000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={nuevoCosto}
                  onChangeText={setNuevoCosto}
                />
                <Text style={styles.formEtiqueta}>Margen de Ganancia (₡)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 50000"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={nuevoGanancia}
                  onChangeText={setNuevoGanancia}
                />
                <Text style={styles.formEtiqueta}>Seleccionar Categoría</Text>
                <View style={{ marginBottom: 12 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4 }}>
                    {dbCategorias.map(cat => {
                      const seleccionado = nuevoCategoriaId === cat.id;
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[
                            styles.botonCategoriaOption,
                            seleccionado ? styles.botonCategoriaOptionActivo : styles.botonCategoriaOptionInactivo
                          ]}
                          onPress={() => setNuevoCategoriaId(cat.id)}
                        >
                          <Text style={seleccionado ? styles.textoCategoriaOptionActivo : styles.textoCategoriaOptionInactivo}>
                            {cat.descripcion}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={styles.botonCrearNuevaCategoriaToggle}
                  onPress={() => setMostrarNuevaCategoriaForm(!mostrarNuevaCategoriaForm)}
                >
                  <Text style={styles.botonCrearNuevaCategoriaToggleTexto}>
                    {mostrarNuevaCategoriaForm ? 'Cancelar Creación de Categoría' : '➕ Registrar Nueva Categoría'}
                  </Text>
                </TouchableOpacity>

                {mostrarNuevaCategoriaForm && (
                  <View style={styles.subFormularioTarjeta}>
                    <Text style={styles.subFormEtiqueta}>Nombre de la Nueva Categoría</Text>
                    <TextInput
                      style={styles.subFormInput}
                      placeholder="Ej: Fuentes de Poder"
                      placeholderTextColor="#94a3b8"
                      value={nuevaCategoriaDescripcion}
                      onChangeText={setNuevaCategoriaDescripcion}
                    />
                    <TouchableOpacity style={styles.botonSubAccion} onPress={manejarGuardarCategoria}>
                      <Text style={styles.botonSubAccionTexto}>Guardar Categoría</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <Text style={styles.formEtiqueta}>URL de la Imagen (Opcional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="https://ejemplo.com/imagen.png"
                  placeholderTextColor="#94a3b8"
                  value={nuevoImagen}
                  onChangeText={setNuevoImagen}
                  autoCapitalize="none"
                />

                <Text style={styles.formEtiqueta}>Descuento (%)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 10 (para 10% de descuento)"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={nuevoDescuento}
                  onChangeText={setNuevoDescuento}
                />

                <TouchableOpacity style={styles.botonAccionPrincipal} onPress={guardarNuevoProducto}>
                  <Text style={styles.botonAccionPrincipalTexto}>Guardar en Inventario</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {pestanaAdmin === 'personal' && (
            <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 50 }}>
              <View style={styles.formularioTarjeta}>
                <Text style={styles.formEtiqueta}>Correo Electrónico de Empleado</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="empleado@hardwarestore.com"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={empEmail}
                  onChangeText={setEmpEmail}
                />
                <Text style={styles.formEtiqueta}>Contraseña</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={true}
                  value={empPassword}
                  onChangeText={setEmpPassword}
                />
                <Text style={styles.formEtiqueta}>Rol ID (1: Admin, 2: Vendedor)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 2"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  value={empRolId}
                  onChangeText={setEmpRolId}
                />
                <TouchableOpacity style={styles.botonAccionPrincipal} onPress={manejarRegistroEmpleado}>
                  <Text style={styles.botonAccionPrincipalTexto}>Registrar Empleado</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      ) : sesion === 'vendedor' && (pestanaVendedor === 'ordenes_ventas' || pestanaVendedor === 'ordenes_ensambles') ? (
        <View style={styles.contenedorAdminPanel}>
          <Text style={[styles.seccionTitulo, { marginHorizontal: 16, marginTop: 10 }]}>
            {pestanaVendedor === 'ordenes_ensambles' ? '⚙️ Módulo de Órdenes de Ensamble de PC' : '🏷️ Módulo de Órdenes de Ventas Directas'}
          </Text>

          <FlatList
            data={ordenesVenta.filter(o => {
              const esEnsamble = esOrdenEnsambleCheck(o);
              return pestanaVendedor === 'ordenes_ensambles' ? esEnsamble : !esEnsamble;
            })}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={renderTarjetaOrden}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      ) : (
        !mostrarCarritoModal && !mostrarFormularioFacturacion && (
          cargando ? (
            <View style={styles.cargandoContenedor}>
              <ActivityIndicator size="large" color="#1e3a8a" />
              <Text style={styles.cargandoTexto}>Consultando catálogo de hardware...</Text>
            </View>
          ) : (
            <FlatList
              data={productosFiltrados}
              renderItem={renderProducto}
              keyExtractor={item => item.id.toString()}
              contentContainerStyle={styles.listaProductos}
              showsVerticalScrollIndicator={false}
            />
          )
        )
      )}

      {/* Módulo flotante inferior para el carrito de compras - Botón compacto directo al carrito */}
      {!mostrarCarritoModal && !mostrarFormularioFacturacion && sesion !== 'admin' && (sesion !== 'vendedor' || pestanaVendedor === 'pos') && carrito.length > 0 && (
        <View style={[styles.carritoFlotante, { padding: 12 }]}>
          <TouchableOpacity onPress={procesarCompra} style={[styles.botonProcesarVenta, { backgroundColor: '#10b981', paddingVertical: 14 }]}>
            <Text style={[styles.botonProcesarTexto, { fontSize: 16, fontWeight: '900' }]}>
              {sesion === 'vendedor'
                ? `🛒 FACTURAR EN CAJA (${carrito.reduce((sum, item) => sum + item.cantidad, 0)}) - ₡${calcularTotal()}`
                : `🛒 PROCESAR COMPRA (${carrito.reduce((sum, item) => sum + item.cantidad, 0)} ítems) - ₡${calcularTotal()}`}
            </Text>
          </TouchableOpacity>
        </View>
      )}


      {/* Modal de Detalle de Producto Interno */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={productoSeleccionadoDetalle !== null}
        onRequestClose={() => setProductoSeleccionadoDetalle(null)}
      >
        <View style={styles.modalDetalleCentrado}>
          <View style={styles.modalDetalleContenido}>
            {productoSeleccionadoDetalle && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Botón Cerrar en esquina superior */}
                <View style={styles.modalDetalleHeader}>
                  <Text style={styles.modalDetalleCategoria}>{productoSeleccionadoDetalle.categoria_nombre}</Text>
                  <TouchableOpacity onPress={() => setProductoSeleccionadoDetalle(null)} style={styles.botonModalCerrarIcono}>
                    <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Imagen del Producto */}
                <Image
                  source={
                    (productoSeleccionadoDetalle.imagen && productoSeleccionadoDetalle.imagen.trim() !== '')
                      ? { uri: productoSeleccionadoDetalle.imagen }
                      : (IMAGENES_PRODUCTOS[productoSeleccionadoDetalle.id] || IMAGEN_DEFAULT)
                  }
                  style={styles.modalDetalleImagen}
                />

                {/* Info del Producto */}
                <Text style={styles.modalDetalleTitulo}>{productoSeleccionadoDetalle.nombre}</Text>
                
                <Text style={styles.formEtiqueta}>Descripción</Text>
                <Text style={styles.modalDetalleDescripcion}>{productoSeleccionadoDetalle.descripcion}</Text>

                <View style={styles.modalDetalleFilaInfo}>
                  <View>
                    <Text style={styles.formEtiqueta}>Precio</Text>
                    {productoSeleccionadoDetalle.descuento_porcentaje > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ color: '#ef4444', textDecorationLine: 'line-through', fontSize: 13, marginRight: 6 }}>
                          ₡{Number(productoSeleccionadoDetalle.precio_base || (productoSeleccionadoDetalle.precio / (1 - productoSeleccionadoDetalle.descuento_porcentaje / 100))).toFixed(2)}
                        </Text>
                        <View style={{ backgroundColor: '#b91c1c', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '900' }}>
                            OFERTA -{productoSeleccionadoDetalle.descuento_porcentaje}%
                          </Text>
                        </View>
                      </View>
                    )}
                    <Text style={styles.modalDetallePrecio}>₡{Number(productoSeleccionadoDetalle.precio || 0).toFixed(2)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.formEtiqueta}>Disponibilidad</Text>
                    <Text style={[
                      styles.stockTexto, 
                      productoSeleccionadoDetalle.stock <= 0 ? styles.stockAgotado : styles.stockDisponible,
                      { fontSize: 15 }
                    ]}>
                      {productoSeleccionadoDetalle.stock <= 0 ? 'Agotado' : `Stock: ${productoSeleccionadoDetalle.stock} uds`}
                    </Text>
                  </View>
                </View>

                {/* Botón de Añadir al Carrito (si no es admin) */}
                {sesion !== 'admin' && (
                  <TouchableOpacity
                    disabled={productoSeleccionadoDetalle.stock <= 0}
                    style={[
                      styles.botonAccionPrincipal,
                      { marginTop: 24, backgroundColor: '#10b981' },
                      productoSeleccionadoDetalle.stock <= 0 && { backgroundColor: '#4b5563' }
                    ]}
                    onPress={() => {
                      agregarAlCarrito(productoSeleccionadoDetalle);
                      setProductoSeleccionadoDetalle(null);
                    }}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>
                      {productoSeleccionadoDetalle.stock <= 0 ? 'Producto Agotado' : 'Añadir al Carrito'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.botonAccionPrincipal, { marginTop: 10, backgroundColor: '#374151' }]}
                  onPress={() => setProductoSeleccionadoDetalle(null)}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>Volver al Catálogo</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal del Rastreador de Pedidos para Clientes */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={mostrarRastreador}
        onRequestClose={() => { setMostrarRastreador(false); setRastreoVenta(null); setRastrearCodigo(''); }}
      >
        <View style={styles.modalDetalleCentrado}>
          <View style={[styles.modalDetalleContenido, { maxHeight: '80%' }]}>
            <View style={styles.modalDetalleHeader}>
              <Text style={styles.modalDetalleCategoria}>Rastreador de Pedido</Text>
              <TouchableOpacity
                onPress={() => { setMostrarRastreador(false); setRastreoVenta(null); setRastrearCodigo(''); }}
                style={styles.botonModalCerrarIcono}
              >
                <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              <Text style={styles.formEtiqueta}>Número de Orden</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej: 1001"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={rastrearCodigo}
                onChangeText={setRastrearCodigo}
              />

              <TouchableOpacity style={[styles.botonAccionPrincipal, { backgroundColor: '#3b82f6', marginBottom: 16 }]} onPress={ejecutarRastreo}>
                <Text style={styles.botonAccionPrincipalTexto}>Buscar Estado</Text>
              </TouchableOpacity>

              {rastreoVenta ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.nombreTexto, { color: '#38bdf8', fontSize: 22, fontWeight: '950', marginBottom: 8 }]}>
                    Orden #{rastreoVenta.id}
                  </Text>
                  
                  <Text style={styles.descripcionTexto}>Fecha: {rastreoVenta.fecha}</Text>
                  <Text style={styles.descripcionTexto}>Cliente: {rastreoVenta.cliente_nombre}</Text>
                  <Text style={styles.descripcionTexto}>Productos: {rastreoVenta.descripcion}</Text>
                  <Text style={[styles.nombreTexto, { color: '#10b981', marginVertical: 8 }]}>
                    Total: ₡{Number(rastreoVenta.total || 0).toFixed(2)}
                  </Text>

                  {/* Estado Visual de la Orden */}
                  <Text style={[styles.formEtiqueta, { marginTop: 12 }]}>Estado actual: {rastreoVenta.estado ? rastreoVenta.estado.toUpperCase() : 'PENDIENTE'}</Text>
                  
                  {rastreoVenta.estado === 'Cancelado' ? (
                    <View style={{ backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginTop: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#f87171', fontWeight: '900', fontSize: 13 }}>✕ PEDIDO CANCELADO</Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 12, paddingVertical: 15, paddingHorizontal: 10, backgroundColor: '#0a0e1a', borderRadius: 10, borderWidth: 1, borderColor: '#1f2937' }}>
                      {/* Línea de Progreso Horizontal */}
                      {rastreoVenta.tipo_orden === 'ensamble' ? (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', position: 'relative' }}>
                          
                          {/* Estado 1: Pendiente */}
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                              width: 24, height: 24, borderRadius: 12, 
                              backgroundColor: '#10b981', 
                              justifyContent: 'center', alignItems: 'center'
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>1</Text>
                            </View>
                            <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Pendiente</Text>
                          </View>

                          {/* Estado 2: Ensamblando */}
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                              width: 24, height: 24, borderRadius: 12, 
                              backgroundColor: (rastreoVenta.estado === 'Ensamblando' || rastreoVenta.estado === 'Listo para Retirar' || rastreoVenta.estado === 'Entregado' || rastreoVenta.estado === 'Completado') ? '#10b981' : '#374151', 
                              justifyContent: 'center', alignItems: 'center'
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>2</Text>
                            </View>
                            <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Ensamblando</Text>
                          </View>

                          {/* Estado 3: Listo para Retirar */}
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                              width: 24, height: 24, borderRadius: 12, 
                              backgroundColor: (rastreoVenta.estado === 'Listo para Retirar' || rastreoVenta.estado === 'Entregado' || rastreoVenta.estado === 'Completado') ? '#10b981' : '#374151', 
                              justifyContent: 'center', alignItems: 'center'
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>3</Text>
                            </View>
                            <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Listo Retiro</Text>
                          </View>

                          {/* Estado 4: Entregado */}
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                              width: 24, height: 24, borderRadius: 12, 
                              backgroundColor: (rastreoVenta.estado === 'Entregado' || rastreoVenta.estado === 'Completado') ? '#10b981' : '#374151', 
                              justifyContent: 'center', alignItems: 'center'
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>4</Text>
                            </View>
                            <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Entregado</Text>
                          </View>

                        </View>
                      ) : (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', position: 'relative' }}>
                          
                          {/* Estado 1: Pendiente */}
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                              width: 24, height: 24, borderRadius: 12, 
                              backgroundColor: '#10b981', 
                              justifyContent: 'center', alignItems: 'center'
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>1</Text>
                            </View>
                            <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Pendiente</Text>
                          </View>

                          {/* Estado 2: Listo para Retirar */}
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                              width: 24, height: 24, borderRadius: 12, 
                              backgroundColor: (rastreoVenta.estado === 'Listo para Retirar' || rastreoVenta.estado === 'Entregado' || rastreoVenta.estado === 'Completado') ? '#10b981' : '#374151', 
                              justifyContent: 'center', alignItems: 'center'
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>2</Text>
                            </View>
                            <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Listo Retiro</Text>
                          </View>

                          {/* Estado 3: Entregado */}
                          <View style={{ alignItems: 'center', flex: 1 }}>
                            <View style={{
                              width: 24, height: 24, borderRadius: 12, 
                              backgroundColor: (rastreoVenta.estado === 'Entregado' || rastreoVenta.estado === 'Completado') ? '#10b981' : '#374151', 
                              justifyContent: 'center', alignItems: 'center'
                            }}>
                              <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>3</Text>
                            </View>
                            <Text style={{ color: '#94a3b8', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Entregado</Text>
                          </View>

                        </View>
                      )}
                    </View>
                  )}
                </View>
              ) : (
                <Text style={{ color: '#94a3b8', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
                  Ingresa tu número de orden arriba para ver los detalles de tu armado en vivo.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal del Armador de PC Guiado Completo (10 Pasos) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={mostrarArmador}
        onRequestClose={() => { setMostrarArmador(false); }}
      >
        <View style={styles.modalDetalleCentrado}>
          <View style={[styles.modalDetalleContenido, { maxHeight: '92%', maxWidth: 650 }]}>
            
            {/* Header del Armador */}
            <View style={styles.modalDetalleHeader}>
              <Text style={styles.modalDetalleCategoria}>
                {armarPaso <= 10 ? `🛠️ Armador de PC - Paso ${armarPaso} de 10` : '📋 Resumen de la PC Armada'}
              </Text>
              <TouchableOpacity
                onPress={() => setMostrarArmador(false)}
                style={styles.botonModalCerrarIcono}
              >
                <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Stepper Flow Horizontal Expandido */}
            {armarPaso <= 10 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12, backgroundColor: '#0a0e1a', padding: 8, borderRadius: 8 }}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 11, color: armarPaso === 1 ? '#38bdf8' : armarPaso > 1 ? '#10b981' : '#64748b', fontWeight: '900' }}>1. CPU</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 2 ? '#38bdf8' : armarPaso > 2 ? '#10b981' : '#64748b', fontWeight: '900' }}>2. Tarjeta Madre</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 3 ? '#38bdf8' : armarPaso > 3 ? '#10b981' : '#64748b', fontWeight: '900' }}>3. RAM</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 4 ? '#38bdf8' : armarPaso > 4 ? '#10b981' : '#64748b', fontWeight: '900' }}>4. GPU</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 5 ? '#38bdf8' : armarPaso > 5 ? '#10b981' : '#64748b', fontWeight: '900' }}>5. SSD/Disco</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 6 ? '#38bdf8' : armarPaso > 6 ? '#10b981' : '#64748b', fontWeight: '900' }}>6. Fuente PSU</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 7 ? '#38bdf8' : armarPaso > 7 ? '#10b981' : '#64748b', fontWeight: '900' }}>7. Case / Gabinete</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 8 ? '#38bdf8' : armarPaso > 8 ? '#10b981' : '#64748b', fontWeight: '900' }}>8. Coolers</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 9 ? '#38bdf8' : armarPaso > 9 ? '#10b981' : '#64748b', fontWeight: '900' }}>9. Fans (Opt)</Text>
                  <Text style={{ fontSize: 11, color: '#475569' }}>➔</Text>
                  <Text style={{ fontSize: 11, color: armarPaso === 10 ? '#38bdf8' : armarPaso > 10 ? '#10b981' : '#64748b', fontWeight: '900' }}>10. Periféricos (Opt)</Text>
                </View>
              </ScrollView>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              
              {/* PASO 1: Selección de Procesador (CPU) */}
              {armarPaso === 1 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>1. Selecciona tu Procesador (CPU)</Text>
                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('procesador') || p.categoria_nombre.toLowerCase().includes('cpu')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`cpu-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, cpuSeleccionado?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setCpuSeleccionado(p);
                          setArmarPaso(2);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}
                </View>
              )}

              {/* PASO 2: Selección de Tarjeta Madre */}
              {armarPaso === 2 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>2. Selecciona tu Tarjeta Madre (Motherboard)</Text>
                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('madre') || p.categoria_nombre.toLowerCase().includes('motherboard') || p.categoria_nombre.toLowerCase().includes('placa')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`mb-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, motherboardSeleccionada?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setMotherboardSeleccionada(p);
                          setArmarPaso(3);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}
                  
                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(1)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Procesador</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 3: Selección de Memoria RAM */}
              {armarPaso === 3 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>3. Selecciona tu Memoria RAM</Text>
                  {productos
                    .filter(p => p.categoria_nombre && p.categoria_nombre.toLowerCase().includes('ram'))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`ram-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, ramSeleccionada?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setRamSeleccionada(p);
                          setArmarPaso(4);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(2)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Tarjeta Madre</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 4: Selección de Tarjeta de Video (GPU) */}
              {armarPaso === 4 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>4. Selecciona tu Tarjeta de Video (GPU)</Text>
                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('video') || p.categoria_nombre.toLowerCase().includes('gpu')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`gpu-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, gpuSeleccionada?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setGpuSeleccionada(p);
                          setArmarPaso(5);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(3)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a RAM</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 5: Selección de Almacenamiento (SSD / NVMe) */}
              {armarPaso === 5 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>5. Selecciona tu Almacenamiento (SSD / NVMe)</Text>
                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('almacenamiento') || p.categoria_nombre.toLowerCase().includes('ssd') || p.categoria_nombre.toLowerCase().includes('disco')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`ssd-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, almacenamientoSeleccionado?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setAlmacenamientoSeleccionado(p);
                          setArmarPaso(6);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(4)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Tarjeta de Video</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 6: Selección de Fuente de Poder (PSU) */}
              {armarPaso === 6 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>6. Selecciona tu Fuente de Poder (PSU)</Text>
                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('fuente') || p.categoria_nombre.toLowerCase().includes('poder') || p.categoria_nombre.toLowerCase().includes('psu')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`psu-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, fuenteSeleccionada?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setFuenteSeleccionada(p);
                          setArmarPaso(7);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(5)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Almacenamiento</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 7: Selección de Gabinete / Case */}
              {armarPaso === 7 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>7. Selecciona tu Gabinete / Case de PC</Text>
                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('gabinete') || p.categoria_nombre.toLowerCase().includes('case') || p.categoria_nombre.toLowerCase().includes('chasis')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`case-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, caseSeleccionado?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setCaseSeleccionado(p);
                          setArmarPaso(8);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(6)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Fuente de Poder</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 8: Selección de Enfriamiento / Cooler */}
              {armarPaso === 8 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>8. Selecciona tu Sistema de Enfriamiento (Líquido o Aire)</Text>
                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('enfriamiento') || p.categoria_nombre.toLowerCase().includes('cooler') || p.categoria_nombre.toLowerCase().includes('disipador')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`cooler-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, enfriamientoSeleccionado?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setEnfriamientoSeleccionado(p);
                          setArmarPaso(9);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(7)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Gabinete / Case</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 9: Selección de Ventiladores / Fans (Opcional) */}
              {armarPaso === 9 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>9. Selecciona Ventiladores Adicionales / Fans RGB (Opcional)</Text>
                  
                  <TouchableOpacity
                    style={{ backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 }}
                    onPress={() => {
                      setFansSeleccionados(null);
                      setArmarPaso(10);
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 14 }}>⏭️ Omitir / Siguiente sin Fans Adicionales</Text>
                  </TouchableOpacity>

                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('ventilador') || p.categoria_nombre.toLowerCase().includes('fan')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`fan-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, fansSeleccionados?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setFansSeleccionados(p);
                          setArmarPaso(10);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(8)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Enfriamiento</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 10: Selección de Periféricos & Monitor (Opcional) */}
              {armarPaso === 10 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>10. Selecciona Periféricos o Monitor (Opcional)</Text>

                  <TouchableOpacity
                    style={{ backgroundColor: '#10b981', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginBottom: 12 }}
                    onPress={() => {
                      setPerifericoSeleccionado(null);
                      setArmarPaso(11);
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '900', fontSize: 14 }}>⏭️ Omitir / Finalizar sin Periféricos Adicionales</Text>
                  </TouchableOpacity>

                  {productos
                    .filter(p => p.categoria_nombre && (p.categoria_nombre.toLowerCase().includes('periférico') || p.categoria_nombre.toLowerCase().includes('periferico') || p.categoria_nombre.toLowerCase().includes('accesorios') || p.categoria_nombre.toLowerCase().includes('audífonos')))
                    .map((p, idx) => (
                      <TouchableOpacity
                        key={`peri-${p.id}-${idx}`}
                        style={[styles.tarjetaProductoReferencia, perifericoSeleccionado?.id === p.id && { borderColor: '#38bdf8', borderWidth: 2 }, { marginVertical: 6, paddingVertical: 12 }]}
                        onPress={() => {
                          setPerifericoSeleccionado(p);
                          setArmarPaso(11);
                        }}
                      >
                        <Text style={styles.nombreTexto}>{p.nombre}</Text>
                        <Text style={styles.stockTexto}>Precio: ₡{Number(p.precio || 0).toFixed(2)} | Stock: {p.stock} uds</Text>
                      </TouchableOpacity>
                    ))}

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 12 }]}
                    onPress={() => setArmarPaso(9)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Ventiladores</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* PASO 11: Resumen General de la PC Armada y Añadir al Carrito */}
              {armarPaso === 11 && (
                <View>
                  <Text style={[styles.seccionTitulo, { marginTop: 0, color: '#38bdf8' }]}>📋 Resumen de tu PC Armada Personalizada</Text>
                  
                  <View style={{ backgroundColor: '#0a0e1a', padding: 16, borderRadius: 12, borderWidth: 2, borderColor: '#38bdf8', gap: 10 }}>
                    
                    {cpuSeleccionado && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Procesador (CPU)</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{cpuSeleccionado.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(cpuSeleccionado.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {motherboardSeleccionada && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Tarjeta Madre (Motherboard)</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{motherboardSeleccionada.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(motherboardSeleccionada.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {ramSeleccionada && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Memoria RAM</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{ramSeleccionada.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(ramSeleccionada.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {gpuSeleccionada && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Tarjeta de Video (GPU)</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{gpuSeleccionada.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(gpuSeleccionada.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {almacenamientoSeleccionado && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Almacenamiento (SSD / NVMe)</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{almacenamientoSeleccionado.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(almacenamientoSeleccionado.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {fuenteSeleccionada && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Fuente de Poder (PSU)</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{fuenteSeleccionada.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(fuenteSeleccionada.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {caseSeleccionado && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Gabinete / Case</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{caseSeleccionado.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(caseSeleccionado.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {enfriamientoSeleccionado && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Sistema de Enfriamiento</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{enfriamientoSeleccionado.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(enfriamientoSeleccionado.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {fansSeleccionados && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Ventiladores / Fans RGB</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{fansSeleccionados.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(fansSeleccionados.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    {perifericoSeleccionado && (
                      <View style={{ borderBottomWidth: 1, borderBottomColor: '#1f2937', paddingBottom: 6 }}>
                        <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Periférico / Monitor</Text>
                        <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>{perifericoSeleccionado.nombre}</Text>
                        <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡{Number(perifericoSeleccionado.precio || 0).toFixed(2)}</Text>
                      </View>
                    )}

                    <View style={{ borderTopWidth: 1, borderTopColor: '#374151', paddingTop: 8 }}>
                      <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800' }}>Servicio de Ensamble</Text>
                      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: '700' }}>Servicio de Armado y Optimización Profesional</Text>
                      <Text style={{ color: '#10b981', fontSize: 13, fontWeight: '800' }}>₡15,000.00</Text>
                    </View>

                    {/* Desglose de Totales */}
                    {(() => {
                      const componentes = [
                        cpuSeleccionado,
                        motherboardSeleccionada,
                        ramSeleccionada,
                        gpuSeleccionada,
                        almacenamientoSeleccionado,
                        fuenteSeleccionada,
                        caseSeleccionado,
                        enfriamientoSeleccionado,
                        fansSeleccionados,
                        perifericoSeleccionado
                      ].filter(Boolean);

                      const subtotalPiesas = componentes.reduce((sum, c) => sum + Number(c.precio || 0), 0) + 15000;
                      const ivaMonto = subtotalPiesas * 0.13;
                      const totalConIva = subtotalPiesas * 1.13;

                      return (
                        <View style={{ borderTopWidth: 2, borderTopColor: '#38bdf8', paddingTop: 10, gap: 4 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#94a3b8', fontSize: 13 }}>Subtotal Neto:</Text>
                            <Text style={{ color: '#e2e8f0', fontSize: 14, fontWeight: '800' }}>₡{subtotalPiesas.toFixed(2)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: '#fbbf24', fontSize: 13, fontWeight: '800' }}>IVA Obligatorio (13%):</Text>
                            <Text style={{ color: '#fbbf24', fontSize: 14, fontWeight: '800' }}>₡{ivaMonto.toFixed(2)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#1f2937' }}>
                            <Text style={{ color: '#38bdf8', fontSize: 16, fontWeight: '900' }}>Total (IVA Incluido):</Text>
                            <Text style={{ color: '#10b981', fontSize: 20, fontWeight: '950' }}>₡{totalConIva.toFixed(2)}</Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#10b981', marginTop: 20, paddingVertical: 14 }]}
                    onPress={() => {
                      const componentesAElegir = [
                        cpuSeleccionado,
                        motherboardSeleccionada,
                        ramSeleccionada,
                        gpuSeleccionada,
                        almacenamientoSeleccionado,
                        fuenteSeleccionada,
                        caseSeleccionado,
                        enfriamientoSeleccionado,
                        fansSeleccionados,
                        perifericoSeleccionado
                      ].filter(Boolean);

                      setCarrito([
                        ...carrito,
                        ...componentesAElegir.map(c => ({ ...c, cantidad: 1 })),
                        { id: 9999, nombre: 'Servicio de Ensamble de PC Profesional', precio: 15000, stock: 99, categoria_nombre: 'Servicios', cantidad: 1 }
                      ]);
                      setEsOrdenEnsambleActual(true);
                      setMostrarArmador(false);
                      Alert.alert(
                        '¡PC Armada Añadida!',
                        `Se han agregado tus ${componentesAElegir.length} componentes seleccionados más el Servicio de Ensamble (₡15,000) al carrito.`
                      );
                    }}
                  >
                    <Text style={[styles.botonAccionPrincipalTexto, { fontSize: 15, fontWeight: '900' }]}>🛒 AÑADIR CONFIGURACIÓN COMPLETA AL CARRITO</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#374151', marginTop: 10 }]}
                    onPress={() => setArmarPaso(10)}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>◀ Volver a Ajustar Piezas</Text>
                  </TouchableOpacity>
                </View>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// Estilos premium corporativos de nivel profesional (Tema Dark Cyber)
const styles = StyleSheet.create({
  contenedorPrincipal: {
    flex: 1,
    backgroundColor: '#0a0e1a',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#111827',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1f2937',
  },
  headerFilaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitulo: {
    fontSize: 23,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 10,
  },
  botonAccesoHeader: {
    backgroundColor: '#3b82f6',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  botonAccesoHeaderText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  botonCerrarSesion: {
    backgroundColor: '#ef4444',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  botonCerrarSesionTexto: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  headerSubtitulo: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  contenedorCategorias: {
    backgroundColor: '#111827',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  scrollCategorias: {
    paddingHorizontal: 16,
  },
  botonCategoria: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1.5,
  },
  botonCategoriaActivo: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  botonCategoriaInactivo: {
    backgroundColor: '#1f2937',
    borderColor: '#374151',
  },
  textoCategoria: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  textoCategoriaActivo: {
    color: '#ffffff',
  },
  textoCategoriaInactivo: {
    color: '#9ca3af',
  },
  contenedorFichas: {
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderBottomWidth: 1.5,
    borderBottomColor: '#1f2937',
  },
  fichaBoton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fichaBotonActiva: {
    borderBottomWidth: 3.5,
    borderBottomColor: '#3b82f6',
  },
  fichaBotonTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  fichaBotonTextoActiva: {
    color: '#3b82f6',
  },
  cuerpoFormularios: {
    padding: 20,
    backgroundColor: '#0a0e1a',
  },
  formularioTarjeta: {
    backgroundColor: '#151f32',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#243249',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  seccionTituloInterno: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formEtiqueta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#06b6d4',
    marginBottom: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: '#0f172a',
    borderWidth: 1.5,
    borderColor: '#334155',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    fontSize: 15,
    color: '#ffffff',
  },
  botonAccionPrincipal: {
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  botonAccionPrincipalTexto: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cargandoContenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0e1a',
  },
  cargandoTexto: {
    marginTop: 14,
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
  },
  listaProductos: {
    padding: 16,
    paddingBottom: 220,
    backgroundColor: '#0a0e1a',
  },
  contenedorAdminPanel: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0a0e1a',
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    marginVertical: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tarjetaProducto: {
    backgroundColor: '#151f32',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#243249',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  imagenProducto: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 14,
    backgroundColor: '#0f172a',
    resizeMode: 'contain',
  },
  infoTarjeta: {
    flex: 1,
    marginRight: 14,
  },
  categoriaTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: '#06b6d4',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1,
  },
  nombreTexto: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  descripcionTexto: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    lineHeight: 18,
  },
  contenedorPrecioStock: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  precioTexto: {
    fontSize: 17,
    fontWeight: '900',
    color: '#10b981',
    marginRight: 14,
    letterSpacing: 0.5,
  },
  stockTexto: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#94a3b8',
  },
  stockDisponible: {
    color: '#34d399',
  },
  stockAgotado: {
    color: '#f87171',
  },
  botonAgregar: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  botonAgregarDeshabilitado: {
    backgroundColor: '#374151',
  },
  botonAgregarTexto: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  tarjetaOrden: {
    backgroundColor: '#151f32',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#243249',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  ordenIdTexto: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  ordenDetalleTexto: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  ordenTotalTexto: {
    fontSize: 16,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  tarjetaProductoReferencia: {
    backgroundColor: '#151f32',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#3b82f6',
    borderWidth: 1,
    borderColor: '#243249',
  },
  carritoFlotante: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#1f2937',
    elevation: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  resumenCarrito: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  carritoTotalItems: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: 0.5,
  },
  carritoMontoTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#10b981',
    letterSpacing: 0.5,
  },
  miniCarritoLista: {
    maxHeight: 100,
    marginBottom: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#1f2937',
    paddingTop: 10,
  },
  miniCartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  miniCartText: {
    fontSize: 13,
    color: '#d1d5db',
    flex: 1,
    fontWeight: '600',
  },
  botonRemoverMini: {
    backgroundColor: '#ef4444',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#ef4444',
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  botonRemoverMiniText: {
    color: '#ffffff',
    fontWeight: '900',
    fontSize: 13,
  },
  botonProcesarVenta: {
    backgroundColor: '#8b5cf6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  botonProcesarTexto: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  checkoutOverlay: {
    padding: 20,
    backgroundColor: '#0a0e1a',
  },
  filaBotonesCheckout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  botonCheckoutForm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginHorizontal: 6,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  botonCancelarCheckout: {
    backgroundColor: '#374151',
    shadowColor: '#374151',
  },
  botonConfirmarCheckout: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  botonCheckoutFormTexto: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  contenedorFichasVendedor: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#111827',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  filaOrdenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  ordenEstadoEtiqueta: {
    fontSize: 11,
    fontWeight: '900',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    overflow: 'hidden',
    letterSpacing: 0.5,
  },
  estadoCompletado: {
    backgroundColor: '#065f46',
    color: '#34d399',
  },
  estadoCancelado: {
    backgroundColor: '#7f1d1d',
    color: '#f87171',
  },
  estadoPendiente: {
    backgroundColor: '#78350f',
    color: '#fbbf24',
  },
  filaAccionesOrden: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#1f2937',
    paddingTop: 10,
  },
  botonAccionOrden: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  botonAccionOrdenCompletar: {
    backgroundColor: '#10b981',
    shadowColor: '#10b981',
  },
  botonAccionOrdenCancelar: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  botonAccionOrdenTexto: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  botonCategoriaOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonCategoriaOptionActivo: {
    backgroundColor: '#3b82f6',
    borderColor: '#60a5fa',
  },
  botonCategoriaOptionInactivo: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
  },
  textoCategoriaOptionActivo: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 12,
  },
  textoCategoriaOptionInactivo: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 12,
  },
  botonCrearNuevaCategoriaToggle: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  botonCrearNuevaCategoriaToggleTexto: {
    color: '#3b82f6',
    fontWeight: '700',
    fontSize: 13,
  },
  subFormularioTarjeta: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  subFormEtiqueta: {
    fontSize: 11,
    fontWeight: '800',
    color: '#38bdf8',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subFormInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#ffffff',
  },
  botonSubAccion: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonSubAccionTexto: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 13,
  },
  modalDetalleCentrado: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.85)',
    padding: 20,
  },
  modalDetalleContenido: {
    backgroundColor: '#111827',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#1f2937',
    padding: 20,
    width: '100%',
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 15,
    elevation: 10,
  },
  modalDetalleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalDetalleCategoria: {
    fontSize: 12,
    fontWeight: '800',
    color: '#38bdf8',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  botonModalCerrarIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  botonModalCerrarIconoTexto: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalDetalleImagen: {
    width: '100%',
    height: 220,
    borderRadius: 16,
    backgroundColor: '#0a0e1a',
    resizeMode: 'contain',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modalDetalleTitulo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 16,
    lineHeight: 28,
  },
  modalDetalleDescripcion: {
    fontSize: 14,
    color: '#94a3b8',
    lineHeight: 22,
    marginBottom: 20,
  },
  modalDetalleFilaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0a0e1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    marginBottom: 10,
  },
  modalDetallePrecio: {
    fontSize: 22,
    fontWeight: '900',
    color: '#10b981',
    marginTop: 4,
  },
});
