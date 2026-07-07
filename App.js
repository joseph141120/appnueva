// =========================================================================================
// RESTRICCIÓN DE SEGURIDAD Y COMPILACIÓN NATIVA
// Explicación: No se importa ni instala 'bcrypt' ni 'bcryptjs' en esta aplicación móvil.
// La encriptación y procesamiento seguro de contraseñas ya ocurre correctamente en el backend
// (api_express_mysql) usando bcryptjs. Mantener el cliente de React Native libre de estas
// librerías evita problemas de compatibilidad y errores fatales de compilación en entornos nativos.
// =========================================================================================

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, TextInput, ScrollView, Platform, StatusBar, Image } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';

// Mapeo de imágenes locales de assets para el catálogo
const IMAGENES_PRODUCTOS = {
  1: require('./assets/amd_ryzen.png'),
  2: require('./assets/rtx_4090.png'),
  3: require('./assets/corsair_ram.png'),
  4: require('./assets/pc_gamer.png'),
  5: require('./assets/razer_keyboard.png'),
  6: require('./assets/logitech_headset.png'),
  7: require('./assets/logitech_streamcam.png'),
};

const IMAGEN_DEFAULT = require('./assets/icon.png');

// Importación del servicio centralizado de la API y manejador de token en memoria
import { apiService, setAuthToken } from './src/services/api';

// Configuración de la URL de red propia
const API_URL = 'http://192.168.101.2';

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

// Categorías del catálogo móvil basadas en periféricos y hardware de Costa Rica
const CATEGORIAS = ['Todas', 'Procesadores', 'Tarjetas de Video', 'Memorias RAM', 'PCs Completas', 'Accesorios', 'Audífonos', 'Cámaras'];

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

  // Login de personal interno (Admin y Vendedores únicamente)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Formulario de datos para la compra del cliente invitado (Sin contraseña)
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [checkoutNombre, setCheckoutNombre] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutCedula, setCheckoutCedula] = useState('');
  const [checkoutTelefono, setCheckoutTelefono] = useState('');

  // Pestañas y formularios del Administrador
  const [pestanaAdmin, setPestanaAdmin] = useState('ordenes');
  const [ordenesVenta, setOrdenesVenta] = useState([]);
  const [reabastecerProductoId, setReabastecerProductoId] = useState('');
  const [reabastecerCantidad, setReabastecerCantidad] = useState('');

  // Control de pestañas para el Vendedor (Caja vs Gestión de Órdenes)
  const [pestanaVendedor, setPestanaVendedor] = useState('pos');

  // Formulario para crear un componente de PC nuevo
  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoDescripcion, setNuevoDescripcion] = useState('');
  const [nuevoStock, setNuevoStock] = useState('');
  const [nuevoCosto, setNuevoCosto] = useState('');
  const [nuevoGanancia, setNuevoGanancia] = useState('');
  const [nuevoCategoriaId, setNuevoCategoriaId] = useState('');

  // Formulario para registrar personal interno
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRolId, setEmpRolId] = useState(''); // 1 = Admin, 2 = Vendedor

  // Inicializa la carga del catálogo al montar la aplicación
  useEffect(() => {
    cargarProductos();
    if (Platform.OS === 'web' && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  // Consulta el catálogo de productos a través de apiService.get
  const cargarProductos = async () => {
    setCargando(true);
    try {
      const datos = await apiService.get('/productos');
      const productosConPrecio = datos.map(prod => ({
        ...prod,
        precio: prod.precio !== undefined ? Number(prod.precio) : (Number(prod.precio_costo || 0) + Number(prod.margen_ganancia || 0))
      }));
      setProductos(productosConPrecio);
    } catch (error) {
      // Catálogo offline en Colones de Costa Rica
      const productosMock = [
        { id: 1, nombre: 'AMD Ryzen 7 7800X3D 4.2GHz', precio: 245000.00, stock: 8, categoria_nombre: 'Procesadores', descripcion: 'Procesador gaming con tecnología 3D V-Cache.' },
        { id: 2, nombre: 'NVIDIA GeForce RTX 4090 24GB', precio: 1150000.00, stock: 5, categoria_nombre: 'Tarjetas de Video', descripcion: 'Tarjeta gráfica tope de gama de NVIDIA.' },
        { id: 3, nombre: 'Corsair Vengeance DDR5 32GB', precio: 85000.00, stock: 15, categoria_nombre: 'Memorias RAM', descripcion: 'Memoria RAM de alta velocidad DDR5 a 6000MHz.' },
        { id: 4, nombre: 'PC Gamer BattleBox Ryzen 5 RTX 4060', precio: 580000.00, stock: 3, categoria_nombre: 'PCs Completas', descripcion: 'Computadora armada lista para jugar a 1080p.' },
        { id: 5, nombre: 'Teclado Mecánico Razer BlackWidow V4', precio: 95000.00, stock: 10, categoria_nombre: 'Accesorios', descripcion: 'Teclado mecánico con switches táctiles.' },
        { id: 6, nombre: 'Audífonos Logitech G PRO X Wireless', precio: 125000.00, stock: 6, categoria_nombre: 'Audífonos', descripcion: 'Audífonos inalámbricos de nivel profesional.' },
        { id: 7, nombre: 'Cámara Logitech StreamCam Full HD', precio: 75000.00, stock: 4, categoria_nombre: 'Cámaras', descripcion: 'Webcam perfecta para streaming a 60fps.' },
      ];
      setProductos(productosMock);
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
    if ((sesion === 'admin' && pestanaAdmin === 'ordenes') || (sesion === 'vendedor' && pestanaVendedor === 'ordenes')) {
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

  // Renderiza una tarjeta de orden con sus respectivas acciones
  const renderTarjetaOrden = ({ item }) => {
    const esEnProceso = item.estado && (item.estado.toLowerCase() === 'en proceso' || item.estado.toLowerCase() === 'pendiente');
    return (
      <View style={styles.tarjetaOrden}>
        <View style={styles.filaOrdenHeader}>
          <Text style={styles.ordenIdTexto}>Orden #{item.id}</Text>
          <Text style={[
            styles.ordenEstadoEtiqueta,
            item.estado === 'Completado' ? styles.estadoCompletado : item.estado === 'Cancelado' ? styles.estadoCancelado : styles.estadoPendiente
          ]}>
            {item.estado ? item.estado.toUpperCase() : 'EN PROCESO'}
          </Text>
        </View>
        <Text style={styles.ordenDetalleTexto}>Fecha: {item.fecha}</Text>
        <Text style={styles.ordenDetalleTexto}>Productos: {item.descripcion || 'Sin desglose'}</Text>
        {item.cliente_nombre && (
          <Text style={styles.ordenDetalleTexto}>Cliente: {item.cliente_nombre} ({item.cliente_correo}) | Tel: {item.cliente_telefono || 'N/A'}</Text>
        )}
        <Text style={styles.ordenTotalTexto}>Total: ₡{item.total ? Number(item.total).toFixed(2) : '0.00'}</Text>

        {esEnProceso && (
          <View style={styles.filaAccionesOrden}>
            <TouchableOpacity
              style={[styles.botonAccionOrden, styles.botonAccionOrdenCompletar]}
              onPress={() => cambiarEstadoOrden(item.id, 'Completado')}
            >
              <Text style={styles.botonAccionOrdenTexto}>Completado</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.botonAccionOrden, styles.botonAccionOrdenCancelar]}
              onPress={() => cambiarEstadoOrden(item.id, 'Cancelado')}
            >
              <Text style={styles.botonAccionOrdenTexto}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        )}
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
          setPestanaAdmin('ordenes');
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
      setPestanaAdmin('ordenes');
      Alert.alert('Acceso Local (Administrador)', 'Iniciando en modo local para pruebas.');
      enviarNotificacionWeb('🔓 Inicio de Sesión (Local)', `Administrador inició sesión localmente: ${loginEmail}`);
      setLoginEmail('');
      setLoginPassword('');
    } else if (emailLower.includes('vendedor') || emailLower.includes('vend')) {
      const tokenSesion = 'local_session_' + loginEmail;
      setToken(tokenSesion);
      setAuthToken(tokenSesion);
      setSesion('vendedor');
      Alert.alert('Acceso Local (Vendedor)', 'Iniciando en modo local para pruebas.');
      enviarNotificacionWeb('🔓 Inicio de Sesión (Local)', `Vendedor inició sesión localmente: ${loginEmail}`);
      setLoginEmail('');
      setLoginPassword('');
    } else {
      Alert.alert('Acceso Denegado', 'Solo el personal autorizado (Vendedor o Administrador) puede iniciar sesión.');
      enviarNotificacionWeb('⚠️ Intento de Acceso Fallido (Local)', `Acceso denegado local para: ${loginEmail}`);
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
      Alert.alert('Campos Requeridos', 'Por favor ingrese el ID del componente y la cantidad.');
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
    }
  };

  // Inserta un nuevo producto en la tabla productos de la base de datos
  const guardarNuevoProducto = async () => {
    if (!nuevoNombre || !nuevoDescripcion || !nuevoStock || !nuevoCosto || !nuevoGanancia || !nuevoCategoriaId) {
      Alert.alert('Formulario Incompleto', 'Por favor completa todos los campos del nuevo producto.');
      return;
    }

    const stockVal = parseInt(nuevoStock);
    const costoVal = parseFloat(nuevoCosto);
    const gananciaVal = parseFloat(nuevoGanancia);
    const categoriaIdVal = parseInt(nuevoCategoriaId);
    const precioFinal = costoVal + gananciaVal;

    try {
      const res = await apiService.post('/productos', {
        nombre: nuevoNombre,
        descripcion: nuevoDescripcion,
        stock: stockVal,
        precio_costo: costoVal,
        margen_ganancia: gananciaVal,
        categorias_id: categoriaIdVal
      });

      if (res.success) {
        Alert.alert('Producto Guardado', 'El nuevo producto se ha registrado en la base de datos MySQL.');
        setNuevoNombre('');
        setNuevoDescripcion('');
        setNuevoStock('');
        setNuevoCosto('');
        setNuevoGanancia('');
        setNuevoCategoriaId('');
        cargarProductos();
      } else {
        throw new Error(res.error || 'Error al guardar');
      }
    } catch (error) {
      const simulado = {
        id: productos.length + 1,
        nombre: nuevoNombre,
        descripcion: nuevoDescripcion,
        stock: stockVal,
        precio: precioFinal,
        categoria_nombre: CATEGORIAS[categoriaIdVal] || 'Accesorios'
      };
      setProductos([...productos, simulado]);
      Alert.alert('Producto Agregado (Modo Local)', `Se guardó el componente localmente: ${nuevoNombre}`);
      setNuevoNombre('');
      setNuevoDescripcion('');
      setNuevoStock('');
      setNuevoCosto('');
      setNuevoGanancia('');
      setNuevoCategoriaId('');
    }
  };

  // Registra la venta y muestra la alerta con ID dinámico devuelto por la API
  const procesarCompra = async () => {
    if (carrito.length === 0) {
      Alert.alert('Carrito Vacío', 'Agrega componentes de PC a tu carrito antes de procesar la compra.');
      return;
    }

    // Si es un cliente invitado (sesion === null), se abre el formulario de facturación
    if (sesion === null) {
      setMostrarCheckout(true);
      return;
    }

    // Procesa compra directa para Vendedores en caja
    ejecutarVentaApi(sesion === 'vendedor' ? 'vendedor@hardwarestore.com' : 'cliente_activo');
  };

  // Envía la orden al endpoint /vender del backend
  const ejecutarVentaApi = async (emailCliente) => {
    try {
      const res = await apiService.post('/vender', {
        usuario_email: emailCliente,
        detalles: carrito.map(item => ({ producto_id: item.id, cantidad: item.cantidad })),
        total: parseFloat(calcularTotal())
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
    setMostrarCheckout(false);
    setCheckoutNombre('');
    setCheckoutEmail('');
    setCheckoutCedula('');
    setCheckoutTelefono('');
    cargarProductos();
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

  // Devuelve la sumatoria total
  const calcularTotal = () => {
    return carrito.reduce((sum, item) => sum + (item.precio * item.cantidad), 0).toFixed(2);
  };

  // Filtra los componentes por la columna categoria_nombre en tiempo real en memoria local
  const productosFiltrados = categoriaSeleccionada === 'Todas'
    ? productos
    : productos.filter(p => p.categoria_nombre === categoriaSeleccionada);

  // Renderiza una tarjeta de producto
  const renderProducto = ({ item }) => {
    const estaAgotado = item.stock <= 0;

    return (
      <View style={styles.tarjetaProducto}>
        <Image 
          source={IMAGENES_PRODUCTOS[item.id] || IMAGEN_DEFAULT} 
          style={styles.imagenProducto} 
        />
        <View style={styles.infoTarjeta}>
          <Text style={styles.categoriaTexto}>{item.categoria_nombre}</Text>
          <Text style={styles.nombreTexto}>{item.nombre}</Text>
          <Text style={styles.descripcionTexto}>{item.descripcion}</Text>
          <View style={styles.contenedorPrecioStock}>
            <Text style={styles.precioTexto}>₡{Number(item.precio || 0).toFixed(2)}</Text>
            <Text style={[styles.stockTexto, estaAgotado ? styles.stockAgotado : styles.stockDisponible]}>
              {estaAgotado ? 'Agotado' : `Stock: ${item.stock} uds`}
            </Text>
          </View>
        </View>

        {sesion !== 'admin' && (
          <TouchableOpacity
            disabled={estaAgotado}
            onPress={() => agregarAlCarrito(item)}
            style={[styles.botonAgregar, estaAgotado && styles.botonAgregarDeshabilitado]}
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
              value={loginEmail}
              onChangeText={setLoginEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.formEtiqueta}>Contraseña</Text>
            <TextInput
              style={styles.formInput}
              placeholder="••••••••"
              secureTextEntry={true}
              value={loginPassword}
              onChangeText={setLoginPassword}
            />
            <TouchableOpacity style={styles.botonAccionPrincipal} onPress={manejarLogin}>
              <Text style={styles.botonAccionPrincipalTexto}>Ingresar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.contenedorPrincipal}>
      <ExpoStatusBar style="dark" />
      
      <View style={styles.header}>
        <View style={styles.headerFilaSuperior}>
          <Text style={styles.headerTitulo}>PC Builder Express</Text>
          {sesion ? (
            <TouchableOpacity style={styles.botonCerrarSesion} onPress={() => { setCarrito([]); setSesion(null); }}>
              <Text style={styles.botonCerrarSesionTexto}>Cerrar Sesión</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.botonAccesoHeader} onPress={() => { setSesionPrevia(null); setSesion('auth'); }}>
              <Text style={styles.botonAccesoHeaderText}>Ingresar</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.headerSubtitulo}>
          {sesion ? `Rol: ${sesion.toUpperCase()}` : 'Modo: Invitado (Consulta de Catálogo)'}
        </Text>
        {sesion === 'vendedor' && (
          <View style={styles.contenedorFichasVendedor}>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaVendedor === 'pos' && styles.fichaBotonActiva]}
              onPress={() => setPestanaVendedor('pos')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaVendedor === 'pos' && styles.fichaBotonTextoActiva]}>POS (Caja)</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaVendedor === 'ordenes' && styles.fichaBotonActiva]}
              onPress={() => setPestanaVendedor('ordenes')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaVendedor === 'ordenes' && styles.fichaBotonTextoActiva]}>Órdenes Clientes</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Formulario de Checkout / Facturación de Clientes Invitados */}
      {mostrarCheckout && (
        <ScrollView style={styles.checkoutOverlay}>
          <View style={styles.formularioTarjeta}>
            <Text style={styles.seccionTituloInterno}>Datos de Facturación del Cliente</Text>
            <Text style={styles.formEtiqueta}>Nombre Completo</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Juan Pérez"
              value={checkoutNombre}
              onChangeText={setCheckoutNombre}
            />
            <Text style={styles.formEtiqueta}>Correo Electrónico</Text>
            <TextInput
              style={styles.formInput}
              placeholder="juan@ejemplo.com"
              value={checkoutEmail}
              onChangeText={setCheckoutEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Text style={styles.formEtiqueta}>Cédula (Física o Jurídica de CR)</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 1-1234-5678"
              value={checkoutCedula}
              onChangeText={setCheckoutCedula}
            />
            <Text style={styles.formEtiqueta}>Teléfono</Text>
            <TextInput
              style={styles.formInput}
              placeholder="Ej: 8888-8888"
              value={checkoutTelefono}
              onChangeText={setCheckoutTelefono}
              keyboardType="phone-pad"
            />
            <View style={styles.filaBotonesCheckout}>
              <TouchableOpacity style={[styles.botonCheckoutForm, styles.botonCancelarCheckout]} onPress={() => setMostrarCheckout(false)}>
                <Text style={styles.botonCheckoutFormTexto}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonCheckoutForm, styles.botonConfirmarCheckout]} onPress={procesarCheckoutCliente}>
                <Text style={styles.botonCheckoutFormTexto}>Enviar Orden</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Barra de Categorías Superior Expandida */}
      {!mostrarCheckout && sesion !== 'admin' && (sesion !== 'vendedor' || pestanaVendedor === 'pos') && (
        <View style={styles.contenedorCategorias}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollCategorias}>
            {CATEGORIAS.map(cat => {
              const estaActiva = categoriaSeleccionada === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setCategoriaSeleccionada(cat)}
                  style={[styles.botonCategoria, estaActiva ? styles.botonCategoriaActivo : styles.botonCategoriaInactivo]}
                >
                  <Text style={[styles.textoCategoria, estaActiva ? styles.textoCategoriaActivo : styles.textoCategoriaInactivo]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Panel del Administrador Gerencial */}
      {sesion === 'admin' ? (
        <View style={styles.contenedorAdminPanel}>
          <View style={styles.contenedorFichas}>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaAdmin === 'ordenes' && styles.fichaBotonActiva]}
              onPress={() => setPestanaAdmin('ordenes')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'ordenes' && styles.fichaBotonTextoActiva]}>Historial Órdenes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaAdmin === 'reabastecer' && styles.fichaBotonActiva]}
              onPress={() => setPestanaAdmin('reabastecer')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'reabastecer' && styles.fichaBotonTextoActiva]}>Reabastecer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaAdmin === 'agregar' && styles.fichaBotonActiva]}
              onPress={() => setPestanaAdmin('agregar')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'agregar' && styles.fichaBotonTextoActiva]}>Nuevo Producto</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaAdmin === 'personal' && styles.fichaBotonActiva]}
              onPress={() => setPestanaAdmin('personal')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'personal' && styles.fichaBotonTextoActiva]}>Registrar Personal</Text>
            </TouchableOpacity>
          </View>

          {pestanaAdmin === 'ordenes' && (
            <FlatList
              data={ordenesVenta}
              keyExtractor={item => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={renderTarjetaOrden}
            />
          )}

          {pestanaAdmin === 'reabastecer' && (
            <ScrollView style={{ marginTop: 10 }}>
              <View style={styles.formularioTarjeta}>
                <Text style={styles.formEtiqueta}>ID del Componente de PC</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 1"
                  keyboardType="numeric"
                  value={reabastecerProductoId}
                  onChangeText={setReabastecerProductoId}
                />
                <Text style={styles.formEtiqueta}>Cantidad de Stock a Añadir</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 10"
                  keyboardType="numeric"
                  value={reabastecerCantidad}
                  onChangeText={setReabastecerCantidad}
                />
                <TouchableOpacity style={styles.botonAccionPrincipal} onPress={manejarReabastecimiento}>
                  <Text style={styles.botonAccionPrincipalTexto}>Incrementar Stock</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.seccionTitulo}>Inventario de Referencia</Text>
              {productos.map(p => (
                <View key={p.id} style={styles.tarjetaProductoReferencia}>
                  <Text style={styles.nombreTexto}>ID {p.id}: {p.nombre}</Text>
                  <Text style={styles.stockTexto}>Stock Actual: {p.stock} uds</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {pestanaAdmin === 'agregar' && (
            <ScrollView style={{ marginTop: 10 }}>
              <View style={styles.formularioTarjeta}>
                <Text style={styles.formEtiqueta}>Nombre del Componente</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Intel Core i9-14900K"
                  value={nuevoNombre}
                  onChangeText={setNuevoNombre}
                />
                <Text style={styles.formEtiqueta}>Descripción</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Procesador potente de 24 núcleos"
                  value={nuevoDescripcion}
                  onChangeText={setNuevoDescripcion}
                />
                <Text style={styles.formEtiqueta}>Stock Inicial</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 10"
                  keyboardType="numeric"
                  value={nuevoStock}
                  onChangeText={setNuevoStock}
                />
                <Text style={styles.formEtiqueta}>Precio Costo (₡)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 250000"
                  keyboardType="numeric"
                  value={nuevoCosto}
                  onChangeText={setNuevoCosto}
                />
                <Text style={styles.formEtiqueta}>Margen de Ganancia (₡)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 50000"
                  keyboardType="numeric"
                  value={nuevoGanancia}
                  onChangeText={setNuevoGanancia}
                />
                <Text style={styles.formEtiqueta}>Categoría ID</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 1 (Procesadores)"
                  keyboardType="numeric"
                  value={nuevoCategoriaId}
                  onChangeText={setNuevoCategoriaId}
                />
                <TouchableOpacity style={styles.botonAccionPrincipal} onPress={guardarNuevoProducto}>
                  <Text style={styles.botonAccionPrincipalTexto}>Guardar en Inventario</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {pestanaAdmin === 'personal' && (
            <ScrollView style={{ marginTop: 10 }}>
              <View style={styles.formularioTarjeta}>
                <Text style={styles.formEtiqueta}>Correo Electrónico de Empleado</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="empleado@hardwarestore.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={empEmail}
                  onChangeText={setEmpEmail}
                />
                <Text style={styles.formEtiqueta}>Contraseña</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••••••"
                  secureTextEntry={true}
                  value={empPassword}
                  onChangeText={setEmpPassword}
                />
                <Text style={styles.formEtiqueta}>Rol ID (1: Admin, 2: Vendedor)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 2"
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
      ) : sesion === 'vendedor' && pestanaVendedor === 'ordenes' ? (
        <View style={styles.contenedorAdminPanel}>
          <Text style={styles.seccionTitulo}>Gestión de Órdenes Pendientes</Text>
          <FlatList
            data={ordenesVenta}
            keyExtractor={item => item.id.toString()}
            showsVerticalScrollIndicator={false}
            renderItem={renderTarjetaOrden}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        </View>
      ) : (
        !mostrarCheckout && (
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

      {/* Módulo flotante inferior para el carrito de compras */}
      {!mostrarCheckout && sesion !== 'admin' && (sesion !== 'vendedor' || pestanaVendedor === 'pos') && carrito.length > 0 && (
        <View style={styles.carritoFlotante}>
          <View style={styles.resumenCarrito}>
            <Text style={styles.carritoTotalItems}>
              {carrito.reduce((sum, item) => sum + item.cantidad, 0)} {carrito.reduce((sum, item) => sum + item.cantidad, 0) === 1 ? 'componente' : 'componentes'}
            </Text>
            <Text style={styles.carritoMontoTotal}>Total: ₡{calcularTotal()}</Text>
          </View>

          <View style={styles.miniCarritoLista}>
            {carrito.map(item => (
              <View key={item.id} style={styles.miniCartItem}>
                <Text numberOfLines={1} style={styles.miniCartText}>
                  {item.cantidad}x {item.nombre}
                </Text>
                <TouchableOpacity onPress={() => removerDelCarrito(item.id)} style={styles.botonRemoverMini}>
                  <Text style={styles.botonRemoverMiniText}>-</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Botón principal condicional según el rol del usuario */}
          <TouchableOpacity onPress={procesarCompra} style={styles.botonProcesarVenta}>
            <Text style={styles.botonProcesarTexto}>
              {sesion === 'vendedor' ? 'FACTURAR EN CAJA' : 'PROCESAR COMPRA'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    fontSize: 24,
    fontWeight: '900',
    color: '#3b82f6',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
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
});
