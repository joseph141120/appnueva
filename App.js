// =========================================================================================
// RESTRICCIÓN DE SEGURIDAD Y COMPILACIÓN NATIVA
// Explicación: No se importa ni instala 'bcrypt' ni 'bcryptjs' en esta aplicación móvil.
// La encriptación y procesamiento seguro de contraseñas ya ocurre correctamente en el backend
// (api_express_mysql) usando bcryptjs. Mantener el cliente de React Native libre de estas
// librerías evita problemas de compatibilidad y errores fatales de compilación en entornos nativos.
// =========================================================================================

import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, TextInput, ScrollView, Platform, StatusBar, Image, Modal, useWindowDimensions, LogBox } from 'react-native';
import { StatusBar as ExpoStatusBar } from 'expo-status-bar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// Silenciar avisos informativos de Expo Go sobre notificaciones remotas en desarrollo
LogBox.ignoreLogs([
  'Android Push notifications (remote notifications)',
  'expo-notifications was removed from Expo Go',
  '`expo-notifications` functionality is not fully supported in Expo Go',
  'expo-notifications: Android Push notifications',
]);

const _originalConsoleError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Android Push notifications') || args[0].includes('removed from Expo Go'))
  ) {
    return; // Silenciar el aviso interno de Expo Go
  }
  _originalConsoleError(...args);
};

// Mapeo opcional de imágenes personalizadas por ID de producto
const IMAGENES_PRODUCTOS = {
  // Las imágenes se cargan dinámicamente desde la BD o usan el icono de JLK Solutions Security
  7: require('./assets/logitech_streamcam.png'),
};

const IMAGEN_DEFAULT = require('./assets/icon.png');

// Importación del servicio centralizado de la API y manejador de token en memoria
import { apiService, setAuthToken } from './src/services/api';
import { PREGUNTAS_SEGURIDAD, REGLAS_PASSWORD, validarPasswordSegura } from './src/constants/seguridad';
import { API_CONFIG } from './src/constants/Api';
import PantallaPagoTilopay from './src/screens/PantallaPagoTilopay';
import notificationService from './src/services/notificationService';

// Configuración de la URL de red propia
const API_URL = API_CONFIG.BASE_URL;

// Función global para emitir notificaciones push nativas y en pantalla ante CUALQUIER movimiento
const enviarNotificacionMovimiento = (titulo, cuerpo, tipo = 'general', meta = {}) => {
  notificationService.notificarMovimiento(titulo, cuerpo, tipo, meta);
};

// Mantiene compatibilidad total con llamadas históricas
const enviarNotificacionWeb = (titulo, cuerpo) => {
  enviarNotificacionMovimiento(titulo, cuerpo, 'general');
};

// Categorías completas para catálogo de seguridad electrónica y automatización
const CATEGORIAS = [
  'Todas',
  'Cámaras de Seguridad',
  'Grabadores DVR y NVR',
  'Cercos Eléctricos',
  'Motores para Portones',
  'Controles y Mandos',
  'Alarmas y Sensores',
  'Accesorios y Conectividad'
];

// Catálogo offline extendido para el negocio de Seguridad Electrónica
const productosMockDef = [
  // 1. Cámaras de Seguridad
  { id: 1, nombre: 'Cámara Domo HD 1080p Visión Nocturna Infrarroja', precio_base: 18500.00, precio: 18500.00, descuento_porcentaje: 0, stock: 35, categoria_nombre: 'Cámaras de Seguridad', imagen: 'https://lh3.googleusercontent.com/d/1yorcQl3X0P-4Mq-pixMsV_zzulAz6n8Z', descripcion: 'Cámara domo para interiores con lente de 2.8mm, ángulo amplio de 103° y visión nocturna IR hasta 20 metros.' },
  { id: 2, nombre: 'Cámara Bullet IP 4K Exterior Metálica IP67', precio_base: 48000.00, precio: 43200.00, descuento_porcentaje: 10, stock: 18, categoria_nombre: 'Cámaras de Seguridad', imagen: 'https://lh3.googleusercontent.com/d/1x3jV1nVAdxi92Vao4x6IewIymHKRqdHG', descripcion: 'Cámara bullet impermeable con resolución 4K Ultra HD, sensor de movimiento inteligente y visión nocturna de 30m.' },
  { id: 3, nombre: 'Cámara PTZ WiFi Robótica 360° Seguimiento Inteligente', precio_base: 35000.00, precio: 35000.00, descuento_porcentaje: 0, stock: 22, categoria_nombre: 'Cámaras de Seguridad', imagen: 'https://lh3.googleusercontent.com/d/1U9c7JlzVVmes_Pz_9vxkGLjzEeR_7P72', descripcion: 'Cámara de seguimiento automático con giro 355° horizontal y 90° vertical, audio bidireccional y alertas al celular.' },
  { id: 4, nombre: 'Cámara Domo IP PoE 5MP con Micrófono Integrado', precio_base: 38000.00, precio: 38000.00, descuento_porcentaje: 0, stock: 14, categoria_nombre: 'Cámaras de Seguridad', imagen: 'https://lh3.googleusercontent.com/d/1yorcQl3X0P-4Mq-pixMsV_zzulAz6n8Z', descripcion: 'Cámara PoE de alta definición para techo, carcasa antivandálica IK10 y captura de audio ambiental en tiempo real.' },
  { id: 5, nombre: 'Cámara de Seguridad Solar WiFi 4G Exterior', precio_base: 80000.00, precio: 68000.00, descuento_porcentaje: 15, stock: 10, categoria_nombre: 'Cámaras de Seguridad', imagen: 'https://lh3.googleusercontent.com/d/1yorcQl3X0P-4Mq-pixMsV_zzulAz6n8Z', descripcion: 'Cámara autónoma con panel solar integrado y batería de litio recargable. No requiere cables de corriente.' },
  { id: 6, nombre: 'Cámara Tipo Domo Varifocal Motorizada 2.8-12mm', precio_base: 60000.00, precio: 60000.00, descuento_porcentaje: 0, stock: 8, categoria_nombre: 'Cámaras de Seguridad', imagen: 'https://lh3.googleusercontent.com/d/1yorcQl3X0P-4Mq-pixMsV_zzulAz6n8Z', descripcion: 'Zoom óptico motorizado 4X para enfocar rostros o placas vehiculares a distancia con nitidez superior.' },

  // 2. Grabadores DVR y NVR
  { id: 7, nombre: 'Grabador DVR 4 Canales 1080p Lite H.265+', precio_base: 39000.00, precio: 39000.00, descuento_porcentaje: 0, stock: 12, categoria_nombre: 'Grabadores DVR y NVR', imagen: 'https://lh3.googleusercontent.com/d/11mVsqaGr0AXUpsWmPuJ6zdLN8ZSvt9I6', descripcion: 'DVR pentahíbrido de 4 canales para cámaras analógicas y HD. Compresión H.265+ para ahorrar espacio en disco.' },
  { id: 8, nombre: 'Grabador DVR 8 Canales 5MP con Reconocimiento Facial', precio_base: 57000.00, precio: 57000.00, descuento_porcentaje: 0, stock: 15, categoria_nombre: 'Grabadores DVR y NVR', imagen: 'https://lh3.googleusercontent.com/d/11mVsqaGr0AXUpsWmPuJ6zdLN8ZSvt9I6', descripcion: 'DVR de 8 canales con inteligencia artificial, detección de vehículos/humanos y salida HDMI/VGA.' },
  { id: 9, nombre: 'Grabador NVR 16 Canales PoE 4K Ultra HD', precio_base: 140000.00, precio: 133000.00, descuento_porcentaje: 5, stock: 6, categoria_nombre: 'Grabadores DVR y NVR', imagen: 'https://lh3.googleusercontent.com/d/11mVsqaGr0AXUpsWmPuJ6zdLN8ZSvt9I6', descripcion: 'NVR profesional de 16 puertos PoE integrados para conectar cámaras IP directamente sin fuentes externas.' },
  { id: 10, nombre: 'Disco Duro 1TB Western Digital Purple CCTV 24/7', precio_base: 45000.00, precio: 45000.00, descuento_porcentaje: 0, stock: 20, categoria_nombre: 'Grabadores DVR y NVR', imagen: 'https://lh3.googleusercontent.com/d/1vZXhXNGBPBWDqATm_dnG86c3_DaEA_GW', descripcion: 'Disco duro grado vigilancia optimizado para grabación continua sin interrupciones ni pérdida de cuadros.' },
  { id: 11, nombre: 'Disco Duro 2TB Western Digital Purple CCTV 24/7', precio_base: 63000.00, precio: 63000.00, descuento_porcentaje: 0, stock: 16, categoria_nombre: 'Grabadores DVR y NVR', imagen: 'https://lh3.googleusercontent.com/d/1vZXhXNGBPBWDqATm_dnG86c3_DaEA_GW', descripcion: 'Capacidad de 2 Terabytes para almacenar hasta 30 días de grabación continua en alta definición.' },
  { id: 12, nombre: 'Disco Duro 4TB Seagate SkyHawk Surveillance', precio_base: 90000.00, precio: 90000.00, descuento_porcentaje: 0, stock: 8, categoria_nombre: 'Grabadores DVR y NVR', imagen: 'https://lh3.googleusercontent.com/d/1vZXhXNGBPBWDqATm_dnG86c3_DaEA_GW', descripcion: 'Almacenamiento masivo para DVRs y NVRs empresariales de alta exigencia.' },

  // 3. Cercos Eléctricos
  { id: 13, nombre: 'Energizador de Cerco Eléctrico 10.000V con Batería', precio_base: 95000.00, precio: 95000.00, descuento_porcentaje: 0, stock: 14, categoria_nombre: 'Cercos Eléctricos', imagen: 'https://lh3.googleusercontent.com/d/1N9tiACwaNF-y7kALIrKcTjsVUtk20w3E', descripcion: 'Equipo central para cerco perimetral con descarga disuasiva no letal de 10.000 voltios y alarma sonora.' },
  { id: 14, nombre: 'Energizador Inteligente WiFi 15.000V Control por App', precio_base: 130000.00, precio: 123500.00, descuento_porcentaje: 5, stock: 9, categoria_nombre: 'Cercos Eléctricos', imagen: 'https://lh3.googleusercontent.com/d/1N9tiACwaNF-y7kALIrKcTjsVUtk20w3E', descripcion: 'Energizador con conexión WiFi para activar/desactivar y recibir notificaciones de corte de línea en el celular.' },
  { id: 15, nombre: 'Kit 25 Aisladores Tubulares Templadores para Cerco', precio_base: 14000.00, precio: 14000.00, descuento_porcentaje: 0, stock: 40, categoria_nombre: 'Cercos Eléctricos', imagen: 'https://lh3.googleusercontent.com/d/15CcVzG1YpOJW1LFZYJq-2xy5PRu2AXmi', descripcion: 'Aisladores reforzados con protección UV contra rayos solares e intemperie para postes esquineros.' },
  { id: 16, nombre: 'Bobina de Alambre de Aluminio Especial para Cerco 500m', precio_base: 33000.00, precio: 33000.00, descuento_porcentaje: 0, stock: 25, categoria_nombre: 'Cercos Eléctricos', imagen: 'https://lh3.googleusercontent.com/d/1N9tiACwaNF-y7kALIrKcTjsVUtk20w3E', descripcion: 'Alambre de aleación de aluminio de alta conductividad eléctrica y libre de óxido para perímetro seguro.' },
  { id: 17, nombre: 'Sirena de Alta Potencia 30W Doble Tono para Cerco', precio_base: 12500.00, precio: 12500.00, descuento_porcentaje: 0, stock: 30, categoria_nombre: 'Cercos Eléctricos', imagen: 'https://lh3.googleusercontent.com/d/1ptlQSC9Ai-MOkoMvp50sE-3gxmNNDqxC', descripcion: 'Sirena acústica de 120 decibeles con sonido penetrante para disuasión perimetral inmediata.' },
  { id: 18, nombre: 'Letrero de Advertencia Reglamentario Peligro Cerco Eléctrico', precio_base: 3000.00, precio: 3000.00, descuento_porcentaje: 0, stock: 60, categoria_nombre: 'Cercos Eléctricos', imagen: 'https://lh3.googleusercontent.com/d/1N9tiACwaNF-y7kALIrKcTjsVUtk20w3E', descripcion: 'Placa plástica de alta visibilidad con texto normativo obligatorio para cercos electrificados.' },

  // 4. Motores para Portones
  { id: 19, nombre: 'Motor Corredizo Rápido 800kg para Portón Eléctrico', precio_base: 210000.00, precio: 189000.00, descuento_porcentaje: 10, stock: 10, categoria_nombre: 'Motores para Portones', imagen: 'https://lh3.googleusercontent.com/d/1EMqu4LEhHhgd_lR9YYc0LNjuyKeqvOYr', descripcion: 'Kit de motor para portón corredizo de hasta 800 kilos de peso. Apertura rápida y silenciosa.' },
  { id: 20, nombre: 'Motor Corredizo Industrial 1500kg Alto Tráfico', precio_base: 335000.00, precio: 335000.00, descuento_porcentaje: 0, stock: 5, categoria_nombre: 'Motores para Portones', imagen: 'https://lh3.googleusercontent.com/d/1EMqu4LEhHhgd_lR9YYc0LNjuyKeqvOYr', descripcion: 'Motor de uso rudo para portones pesados de condominios o bodegas con engranajes de bronce bañados en aceite.' },
  { id: 21, nombre: 'Kit Motor Batiente de 2 Brazos Hidráulicos 3m por Hoja', precio_base: 390000.00, precio: 390000.00, descuento_porcentaje: 0, stock: 4, categoria_nombre: 'Motores para Portones', imagen: 'https://lh3.googleusercontent.com/d/1EMqu4LEhHhgd_lR9YYc0LNjuyKeqvOYr', descripcion: 'Sistema completo para portones de 2 hojas abatibles con desaceleración suave y llaves de desbloqueo manual.' },
  { id: 22, nombre: 'Tramo de Cremallera de Acero Galvanizado M4 (1 Metro)', precio_base: 10500.00, precio: 10500.00, descuento_porcentaje: 0, stock: 50, categoria_nombre: 'Motores para Portones', imagen: 'https://lh3.googleusercontent.com/d/1EMqu4LEhHhgd_lR9YYc0LNjuyKeqvOYr', descripcion: 'Barra dentada de acero zincado de 1 metro con espaciadores para fijar en portones corredizos.' },
  { id: 23, nombre: 'Sensor de Fotocelda Anti-Aplastamiento para Portón', precio_base: 20000.00, precio: 20000.00, descuento_porcentaje: 0, stock: 24, categoria_nombre: 'Motores para Portones', imagen: 'https://lh3.googleusercontent.com/d/1EMqu4LEhHhgd_lR9YYc0LNjuyKeqvOYr', descripcion: 'Par de sensores infrarrojos de seguridad que detienen e invierten el portón si detectan autos o personas.' },
  { id: 24, nombre: 'Luz Estroboscópica Destellante de Seguridad 12V/24V', precio_base: 14000.00, precio: 14000.00, descuento_porcentaje: 0, stock: 20, categoria_nombre: 'Motores para Portones', imagen: 'https://lh3.googleusercontent.com/d/1EMqu4LEhHhgd_lR9YYc0LNjuyKeqvOYr', descripcion: 'Lámpara indicadora de movimiento para advertir la apertura o cierre del portón eléctrico a peatones.' },

  // 5. Controles y Mandos de Portón
  { id: 25, nombre: 'Control Remoto 4 Botones 433MHz para Portón Eléctrico', precio_base: 9000.00, precio: 9000.00, descuento_porcentaje: 0, stock: 80, categoria_nombre: 'Controles y Mandos', imagen: 'https://lh3.googleusercontent.com/d/1AfZClVA-rSIEMkMiTL9-mb3946iyFdea', descripcion: 'Control transmisor de largo alcance con 4 canales para operar hasta 4 portones o luces distintas.' },
  { id: 26, nombre: 'Control Metálico Llavero Clonador Universal Multicódigo', precio_base: 11000.00, precio: 11000.00, descuento_porcentaje: 0, stock: 50, categoria_nombre: 'Controles y Mandos', imagen: 'https://lh3.googleusercontent.com/d/1AfZClVA-rSIEMkMiTL9-mb3946iyFdea', descripcion: 'Control portátil reforzado en aluminio con capacidad de clonar códigos fijos y variables comunes.' },
  { id: 27, nombre: 'Módulo Receptor Inalámbrico Universal 2 Canales', precio_base: 22500.00, precio: 22500.00, descuento_porcentaje: 0, stock: 25, categoria_nombre: 'Controles y Mandos', imagen: 'https://lh3.googleusercontent.com/d/1AfZClVA-rSIEMkMiTL9-mb3946iyFdea', descripcion: 'Receptor de radiofrecuencia para adaptar controles modernos a cualquier marca de motor de portón.' },
  { id: 28, nombre: 'Pulsador Inalámbrico de Pared para Portón Eléctrico', precio_base: 15000.00, precio: 15000.00, descuento_porcentaje: 0, stock: 20, categoria_nombre: 'Controles y Mandos', imagen: 'https://lh3.googleusercontent.com/d/1AfZClVA-rSIEMkMiTL9-mb3946iyFdea', descripcion: 'Botonera de pared sin cables para abrir o cerrar el portón desde el interior de la casa u oficina.' },
  { id: 29, nombre: 'Receptor WiFi Inteligente para Portón (Apertura por Celular)', precio_base: 26000.00, precio: 26000.00, descuento_porcentaje: 0, stock: 15, categoria_nombre: 'Controles y Mandos', imagen: 'https://lh3.googleusercontent.com/d/1AfZClVA-rSIEMkMiTL9-mb3946iyFdea', descripcion: 'Módulo inteligente compatible con Tuya/SmartLife para abrir el portón desde cualquier parte del mundo.' },

  // 6. Alarmas y Sensores
  { id: 30, nombre: 'Panel de Alarma Inteligente WiFi / GSM con Sirena', precio_base: 86000.00, precio: 77400.00, descuento_porcentaje: 10, stock: 10, categoria_nombre: 'Alarmas y Sensores', imagen: 'https://lh3.googleusercontent.com/d/1ptlQSC9Ai-MOkoMvp50sE-3gxmNNDqxC', descripcion: 'Central de alarma híbrida inalámbrica con llamada automática por SIM celular y notificaciones por aplicación.' },
  { id: 31, nombre: 'Sensor de Movimiento PIR Inalámbrico Antimascotas', precio_base: 16000.00, precio: 16000.00, descuento_porcentaje: 0, stock: 35, categoria_nombre: 'Alarmas y Sensores', imagen: 'https://lh3.googleusercontent.com/d/1geGeOsmENSdjVV4-OO4GeclD80vswl7p', descripcion: 'Detector de presencia infrarrojo pasivo que ignora mascotas de hasta 20kg para evitar falsas alarmas.' },
  { id: 32, nombre: 'Sensor Magnético Inalámbrico para Puertas y Ventanas', precio_base: 10000.00, precio: 10000.00, descuento_porcentaje: 0, stock: 50, categoria_nombre: 'Alarmas y Sensores', imagen: 'https://lh3.googleusercontent.com/d/1nFpzo-NgwHcrSNqw1lNb0kA1W35WRyvc', descripcion: 'Contacto magnético compacto con batería de larga duración para alertar aperturas no autorizadas.' },
  { id: 33, nombre: 'Botón de Pánico Inalámbrico SOS para Emergencias', precio_base: 7500.00, precio: 7500.00, descuento_porcentaje: 0, stock: 25, categoria_nombre: 'Alarmas y Sensores', imagen: 'https://lh3.googleusercontent.com/d/1AfZClVA-rSIEMkMiTL9-mb3946iyFdea', descripcion: 'Pulsador de auxilio para adultos mayores o cajas de cobro que dispara la alarma silenciosa al instante.' },
  { id: 34, nombre: 'Sensor de Humo Fotoeléctrico Inalámbrico Autónomo', precio_base: 18000.00, precio: 18000.00, descuento_porcentaje: 0, stock: 20, categoria_nombre: 'Alarmas y Sensores', imagen: 'https://lh3.googleusercontent.com/d/1nFpzo-NgwHcrSNqw1lNb0kA1W35WRyvc', descripcion: 'Detector de humo con alarma acústica incorporada de 85dB y enlace al sistema de seguridad central.' },
  { id: 35, nombre: 'Teclado Táctil Inalámbrico con Lector de Tarjetas RFID', precio_base: 29000.00, precio: 29000.00, descuento_porcentaje: 0, stock: 12, categoria_nombre: 'Alarmas y Sensores', imagen: 'https://lh3.googleusercontent.com/d/1nFpzo-NgwHcrSNqw1lNb0kA1W35WRyvc', descripcion: 'Teclado de acceso para armar y desarmar el sistema de alarma mediante clave numérica o llavero de proximidad.' },

  // 7. Accesorios y Conectividad
  { id: 36, nombre: 'Fuente de Poder 12V 10A Tipo Malla para 8 Cámaras', precio_base: 21000.00, precio: 21000.00, descuento_porcentaje: 0, stock: 25, categoria_nombre: 'Accesorios y Conectividad', imagen: 'https://lh3.googleusercontent.com/d/1g82HdfiMbyi-xSJFQakoRJSxHqKMZbnV', descripcion: 'Fuente conmutada centralizada regulada de alta estabilidad con potenciómetro de ajuste de voltaje.' },
  { id: 37, nombre: 'Fuente de Poder Regulada 12V 2A para Cámara Individual', precio_base: 7000.00, precio: 7000.00, descuento_porcentaje: 0, stock: 60, categoria_nombre: 'Accesorios y Conectividad', imagen: 'https://lh3.googleusercontent.com/d/1g82HdfiMbyi-xSJFQakoRJSxHqKMZbnV', descripcion: 'Adaptador de pared estándar 12V 2000mA con conector macho 5.5x2.1mm para cámaras y routers.' },
  { id: 38, nombre: 'Kit Par de Video Baluns Pasivos HD 4K con Conector BNC', precio_base: 5000.00, precio: 5000.00, descuento_porcentaje: 0, stock: 70, categoria_nombre: 'Accesorios y Conectividad', imagen: 'https://lh3.googleusercontent.com/d/1NFDfE6KbW0XTcgqn_dYwnEOqotpwNrG0', descripcion: 'Transceptores pasivos para transmitir video de alta definición a través de cable UTP hasta 300 metros.' },
  { id: 39, nombre: 'Paquete de 10 Conectores Macho DC 12V con Tornillo', precio_base: 4000.00, precio: 4000.00, descuento_porcentaje: 0, stock: 80, categoria_nombre: 'Accesorios y Conectividad', imagen: 'https://lh3.googleusercontent.com/d/1g82HdfiMbyi-xSJFQakoRJSxHqKMZbnV', descripcion: 'Conectores rápidos sin soldadura para energizar cámaras de seguridad de forma prolija.' },
  { id: 40, nombre: 'Paquete de 10 Conectores Hembra DC 12V con Tornillo', precio_base: 4000.00, precio: 4000.00, descuento_porcentaje: 0, stock: 80, categoria_nombre: 'Accesorios y Conectividad', imagen: 'https://lh3.googleusercontent.com/d/1g82HdfiMbyi-xSJFQakoRJSxHqKMZbnV', descripcion: 'Conectores hembra de bornera rápida para empalmes y extensiones de alimentación.' },
  { id: 41, nombre: 'Rollo de Cable UTP Cat6 100% Cobre para CCTV (305m)', precio_base: 70000.00, precio: 66500.00, descuento_porcentaje: 5, stock: 15, categoria_nombre: 'Accesorios y Conectividad', imagen: 'https://lh3.googleusercontent.com/d/1g82HdfiMbyi-xSJFQakoRJSxHqKMZbnV', descripcion: 'Bobina de cable de red categoría 6 con conductores de cobre puro para máxima velocidad y distancia en video HD.' },
  { id: 42, nombre: 'Caja de Registro Plástica 10x10cm Estanca para Cámaras', precio_base: 3500.00, precio: 3500.00, descuento_porcentaje: 0, stock: 100, categoria_nombre: 'Accesorios y Conectividad', imagen: 'https://lh3.googleusercontent.com/d/1NFDfE6KbW0XTcgqn_dYwnEOqotpwNrG0', descripcion: 'Caja de montaje impermeable IP65 para proteger baluns, cables y conectores a la intemperie.' },
  { id: 43, nombre: 'Batería de Respaldo Recargable 12V 7Ah para Alarma y Cerco', precio_base: 19500.00, precio: 19500.00, descuento_porcentaje: 0, stock: 30, categoria_nombre: 'Accesorios y Conectividad', imagen: 'https://lh3.googleusercontent.com/d/1g82HdfiMbyi-xSJFQakoRJSxHqKMZbnV', descripcion: 'Batería sellada libre de mantenimiento para mantener el cerco y la alarma encendidos ante cortes de luz.' }
];

export default function App() {
  const { width: windowWidth } = useWindowDimensions();
  const numColumns = windowWidth >= 1100 ? 3 : windowWidth >= 700 ? 2 : 1;

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
  const [modalSelectorTarget, setModalSelectorTarget] = useState(null);

  // Login de personal interno (Admin y Vendedores únicamente)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [segundosBloqueoLogin, setSegundosBloqueoLogin] = useState(0);

  // Doble Factor 2FA en el Inicio de Sesión (Google Authenticator)
  const [loginRequiere2FA, setLoginRequiere2FA] = useState(false);
  const [loginTempToken2FA, setLoginTempToken2FA] = useState('');
  const [loginCodigo2FA, setLoginCodigo2FA] = useState('');
  const [loginEmailPendiente, setLoginEmailPendiente] = useState('');

  // Estados para Módulo de Configuración de Cuenta y Perfil
  const [usuarioNombre, setUsuarioNombre] = useState('');
  const [perfilUsuario, setPerfilUsuario] = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [cambioPwdActual, setCambioPwdActual] = useState('');
  const [cambioPwdNueva, setCambioPwdNueva] = useState('');
  const [cambioPwdConfirmar, setCambioPwdConfirmar] = useState('');
  const [cargandoCambioPwd, setCargandoCambioPwd] = useState(false);
  const [cambioEmailNuevo, setCambioEmailNuevo] = useState('');
  const [cambioEmailPassword, setCambioEmailPassword] = useState('');
  const [cargandoCambioEmail, setCargandoCambioEmail] = useState(false);

  // Recuperación de Contraseña (Gmail OTP y 2FA TOTP Google Authenticator)
  const [pasoRecuperacion, setPasoRecuperacion] = useState(1); // 1: Correo / Método, 2: Código 6 dígitos, 3: Nueva Contraseña
  const [recuperarEmail, setRecuperarEmail] = useState('');
  const [emailEnmascarado, setEmailEnmascarado] = useState('');
  const [metodoRecuperacion, setMetodoRecuperacion] = useState('gmail'); // 'gmail' o 'totp'
  const [totpHabilitado, setTotpHabilitado] = useState(false);
  const [mostrarOpcionesMetodo, setMostrarOpcionesMetodo] = useState(false);
  const [codigoRecuperacion, setCodigoRecuperacion] = useState('');
  const [tokenRecuperacion, setTokenRecuperacion] = useState('');
  const [nuevaPasswordRecuperacion, setNuevaPasswordRecuperacion] = useState('');
  const [confirmarPasswordRecuperacion, setConfirmarPasswordRecuperacion] = useState('');
  const [cargandoRecuperacion, setCargandoRecuperacion] = useState(false);
  const [segundosReenvioCorreo, setSegundosReenvioCorreo] = useState(0);

  // Estados para configuración de 2FA TOTP (Google Authenticator)
  const [modal2FAVisible, setModal2FAVisible] = useState(false);
  const [modalDesactivar2FAVisible, setModalDesactivar2FAVisible] = useState(false);
  const [claveODesactivar2FA, setClaveODesactivar2FA] = useState('');
  const [datosConfiguracion2FA, setDatosConfiguracion2FA] = useState(null);
  const [codigoActivacion2FA, setCodigoActivacion2FA] = useState('');
  const [estado2FAUsuario, setEstado2FAUsuario] = useState(false);
  const [cargando2FA, setCargando2FA] = useState(false);

  // Módulo de Carrito y Formulario de Facturación del Cliente
  const [mostrarCarritoModal, setMostrarCarritoModal] = useState(false);
  const [mostrarFormularioFacturacion, setMostrarFormularioFacturacion] = useState(false);
  const [checkoutNombre, setCheckoutNombre] = useState('');
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutCedula, setCheckoutCedula] = useState('');
  const [checkoutTelefono, setCheckoutTelefono] = useState('');

  // Estados para la Pasarela de Pagos Tilopay (Modo Sandbox via WebView)
  const [mostrarTilopayModal, setMostrarTilopayModal] = useState(false);
  const [datosPagoTilopay, setDatosPagoTilopay] = useState(null);

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

  // Control de pestañas para el Vendedor ('pos', 'ordenes_ventas', 'configuracion')
  const [pestanaVendedor, setPestanaVendedor] = useState('pos');

  // Formulario para crear un producto nuevo
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

  // Formulario para editar un producto existente
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
  const [ordenSeleccionadaDetalle, setOrdenSeleccionadaDetalle] = useState(null);

  // Estados para el Rastreador de Órdenes del Cliente
  const [rastrearCodigo, setRastrearCodigo] = useState('');
  const [rastreoVenta, setRastreoVenta] = useState(null);
  const [mostrarRastreador, setMostrarRastreador] = useState(false);

  // Formulario para registrar personal interno
  const [empNombre, setEmpNombre] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');
  const [empRolId, setEmpRolId] = useState(''); // 1 = Admin, 2 = Vendedor
  const [empPregunta, setEmpPregunta] = useState(PREGUNTAS_SEGURIDAD[0]);
  const [empRespuesta, setEmpRespuesta] = useState('');

  // Temporizador regresivo estilo iPhone para bloqueo progresivo de login
  useEffect(() => {
    if (segundosBloqueoLogin <= 0) return;
    const interval = setInterval(() => {
      setSegundosBloqueoLogin((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [segundosBloqueoLogin]);

  // Temporizador regresivo para reenvío de código Gmail OTP (60s)
  useEffect(() => {
    if (segundosReenvioCorreo <= 0) return;
    const interval = setInterval(() => {
      setSegundosReenvioCorreo((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [segundosReenvioCorreo]);

  // Inicializa la carga del catálogo, historial y servicio de notificaciones push
  useEffect(() => {
    notificationService.inicializarNotificaciones();
    cargarProductos();
    cargarCategorias();
    obtenerHistorialOrdenes();

    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      let meta = document.querySelector('meta[name="referrer"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'referrer';
        meta.content = 'no-referrer';
        document.head.appendChild(meta);
      }
    }
  }, []);

  // Carga la lista de categorías del servidor o usa mock local de seguridad electrónica
  const cargarCategorias = async () => {
    try {
      const datos = await apiService.get('/categorias');
      setDbCategorias(datos);
    } catch (error) {
      // Mock de categorías completas de seguridad electrónica
      setDbCategorias([
        { id: 1, descripcion: 'Cámaras de Seguridad' },
        { id: 2, descripcion: 'Grabadores DVR y NVR' },
        { id: 3, descripcion: 'Cercos Eléctricos' },
        { id: 4, descripcion: 'Motores para Portones' },
        { id: 5, descripcion: 'Controles y Mandos' },
        { id: 6, descripcion: 'Alarmas y Sensores' },
        { id: 7, descripcion: 'Accesorios y Conectividad' }
      ]);
    }
  };

  // Consulta el catálogo de productos a través de apiService.get
  const cargarProductos = async () => {
    setCargando(true);
    try {
      const datos = await apiService.get('/productos');
      const productosConPrecio = datos.map(prod => {
        const precioCalculado = Number(prod.precio_costo || 0) + Number(prod.margen_ganancia || 0);
        const precioBase = Number(prod.precio != null && prod.precio !== undefined ? prod.precio : precioCalculado);
        const desc = Number(prod.descuento_porcentaje || 0);
        const precioFinal = desc > 0 ? (precioBase * (1 - desc / 100)) : precioBase;
        return {
          ...prod,
          precio_base: precioBase,
          precio: precioFinal
        };
      });

      // Aseguramos que se incluyan elementos mock sólo para los IDs que no existan en MySQL
      const idsExistentes = new Set(productosConPrecio.map(p => Number(p.id)));
      const faltantesMock = productosMockDef.filter(m => !idsExistentes.has(Number(m.id)));
      
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
      (sesion === 'admin' && ['ordenes_ventas', 'tabla_ventas', 'ordenes'].includes(pestanaAdmin)) ||
      (sesion === 'vendedor' && ['ordenes_ventas', 'ordenes'].includes(pestanaVendedor))
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
        enviarNotificacionMovimiento('📦 Orden Actualizada', `La orden #${idOrden} fue marcada como ${nuevoEstado.toLowerCase()}.`, 'orden', { idOrden, nuevoEstado });
        obtenerHistorialOrdenes();
        cargarProductos(); // Refrescar stock visible en el catálogo de productos
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (error) {
      const nuevasOrdenes = ordenesVenta.map(o => o.id === idOrden ? { ...o, estado: nuevoEstado } : o);
      setOrdenesVenta(nuevasOrdenes);
      Alert.alert('Orden Actualizada (Modo Local)', `La orden #${idOrden} fue marcada como ${nuevoEstado.toLowerCase()}.`);
      enviarNotificacionMovimiento('📦 Orden Actualizada (Modo Local)', `La orden #${idOrden} fue marcada como ${nuevoEstado.toLowerCase()}.`, 'orden', { idOrden, nuevoEstado });
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
              <h1>JLK SOLUTIONS SECURITY</h1>
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
              <div class="section-title">Resumen de Productos</div>
              <table class="table">
                <thead>
                  <tr>
                    <th>Producto</th>
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
              ¡Gracias por su compra en JLK Solutions Security!
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

  // Renderiza una tarjeta de orden de venta con sus respectivas acciones
  const renderTarjetaOrden = ({ item }) => {
    const estadoNormalizado = (item.estado || 'Pendiente').trim();

    return (
      <View style={styles.tarjetaOrden}>
        <View style={styles.filaOrdenHeader}>
          <Text style={[styles.ordenIdTexto, { fontSize: 18, color: '#6cc04a', fontWeight: '950' }]}>Orden #{item.id}</Text>
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

        {/* Badge de orden de venta */}
        <View style={{ alignSelf: 'flex-start', marginVertical: 6, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, backgroundColor: '#ea580c' }}>
          <Text style={{ color: '#1c2b22', fontSize: 10, fontWeight: '900' }}>
            🏷️ ORDEN DE VENTA
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
              {(estadoNormalizado === 'Pendiente' || estadoNormalizado === 'En Proceso') && (
                <TouchableOpacity
                  style={[styles.botonAccionOrden, { backgroundColor: '#eab308' }]}
                  onPress={() => cambiarEstadoOrden(item.id, 'Listo para Retirar')}
                >
                  <Text style={[styles.botonAccionOrdenTexto, { color: '#000000' }]}>📦 Listo</Text>
                </TouchableOpacity>
              )}

              {estadoNormalizado === 'Listo para Retirar' && (
                <TouchableOpacity
                  style={[styles.botonAccionOrden, { backgroundColor: '#22a34a' }]}
                  onPress={() => cambiarEstadoOrden(item.id, 'Entregado')}
                >
                  <Text style={styles.botonAccionOrdenTexto}>✅ Entregar</Text>
                </TouchableOpacity>
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

          {/* Botón para abrir el Modal con el Desglose de Productos de la Orden */}
          <TouchableOpacity
            style={[styles.botonAccionOrden, { backgroundColor: '#f97316', width: '100%', marginHorizontal: 0, paddingVertical: 12, marginBottom: 6 }]}
            onPress={() => setOrdenSeleccionadaDetalle(item)}
          >
            <Text style={styles.botonAccionOrdenTexto}>👁️ Ver Detalle Completo de Productos</Text>
          </TouchableOpacity>

          {/* Botón de Generar Factura PDF (Siempre visible para Administradores y Vendedores) */}
          <TouchableOpacity
            style={[styles.botonAccionOrden, { backgroundColor: '#b9d4ae', width: '100%', marginHorizontal: 0, paddingVertical: 12 }]}
            onPress={() => generarFacturaPDF(item)}
          >
            <Text style={styles.botonAccionOrdenTexto}>📄 Generar Factura PDF</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Autentica credenciales restringiendo el login a Admin y Vendedor únicamente contra MySQL
  const manejarLogin = async () => {
    if (segundosBloqueoLogin > 0) {
      const min = Math.floor(segundosBloqueoLogin / 60);
      const seg = segundosBloqueoLogin % 60;
      Alert.alert(
        'Acceso Bloqueado',
        `El acceso está temporalmente bloqueado por seguridad. Inténtalo de nuevo en ${min > 0 ? `${min}m ${seg}s` : `${seg}s`}.`
      );
      return;
    }

    const emailLimpio = loginEmail.trim();
    if (!emailLimpio || !loginPassword) {
      Alert.alert('Campos requeridos', 'Por favor ingresa tu correo y contraseña.');
      return;
    }

    try {
      const res = await apiService.post('/login', { email: emailLimpio, password: loginPassword });

      if (res && res.success) {
        if (res.requiere2FA) {
          // El usuario tiene Google Authenticator activo: solicitar segundo factor
          setLoginRequiere2FA(true);
          setLoginTempToken2FA(res.tokenTemporal);
          setLoginEmailPendiente(emailLimpio);
          setLoginCodigo2FA('');
          return;
        }

        setSegundosBloqueoLogin(0);
        const nombreDetectado = res.nombre || (res.rol === 1 ? 'Luis Martínez' : (emailLimpio.toLowerCase().includes('admin') ? 'Luis Martínez' : 'Joseph Silva'));
        setUsuarioNombre(nombreDetectado);

        if (res.rol === 1) {
          const tokenSesion = res.token || 'session_token_' + res.email;
          setToken(tokenSesion);
          setAuthToken(tokenSesion);
          setSesion('admin');
          setPestanaAdmin('tabla_ventas');
          cargarPerfilUsuario();
          enviarNotificacionMovimiento('🔐 Inicio de Sesión', `${nombreDetectado} inició sesión (Administrador).`, 'login');
          Alert.alert('Acceso Autorizado', `Bienvenido, ${nombreDetectado} (Administrador).`);
          setLoginEmail('');
          setLoginPassword('');
        } else if (res.rol === 2) {
          const tokenSesion = res.token || 'session_token_' + res.email;
          setToken(tokenSesion);
          setAuthToken(tokenSesion);
          setSesion('vendedor');
          setPestanaVendedor('pos');
          cargarPerfilUsuario();
          enviarNotificacionMovimiento('🔐 Inicio de Sesión', `${nombreDetectado} inició sesión (Vendedor).`, 'login');
          Alert.alert('Acceso Autorizado', `Bienvenido, ${nombreDetectado} (Vendedor).`);
          setLoginEmail('');
          setLoginPassword('');
        } else {
          Alert.alert('Acceso Denegado', 'Solo el personal autorizado (Vendedor o Administrador) puede iniciar sesión.');
        }
      } else {
        Alert.alert('Acceso Denegado', (res && res.message) || 'Credenciales incorrectas.');
      }
    } catch (error) {
      if (error && error.data && error.data.bloqueado) {
        // Bloqueo progresivo estilo iPhone activado tras 5 intentos
        const segs = error.data.segundosRestantes || 60;
        setSegundosBloqueoLogin(segs);
        Alert.alert('Acceso Bloqueado (Seguridad)', error.message || 'Has superado el límite de intentos.');
      } else if (error && error.data && error.data.intentosRestantes !== undefined) {
        Alert.alert('Contraseña Incorrecta', error.message);
      } else if (error && error.status) {
        Alert.alert('Acceso Denegado', error.message || 'Credenciales incorrectas.');
      } else {
        // Modo offline / contingencia si el servidor está apagado
        if (emailLimpio.toLowerCase().includes('admin')) {
          setUsuarioNombre('Luis Martínez');
          setSesion('admin');
          setPestanaAdmin('tabla_ventas');
          enviarNotificacionMovimiento('🔐 Inicio de Sesión', 'Luis Martínez inició sesión (Administrador).', 'login');
          Alert.alert('Acceso Autorizado (Modo Offline)', 'Sesión iniciada como Luis Martínez (Administrador).');
          setLoginEmail('');
          setLoginPassword('');
        } else if (emailLimpio.toLowerCase().includes('vendedor')) {
          setUsuarioNombre('Joseph Silva');
          setSesion('vendedor');
          setPestanaVendedor('pos');
          enviarNotificacionMovimiento('🔐 Inicio de Sesión', 'Joseph Silva inició sesión (Vendedor).', 'login');
          Alert.alert('Acceso Autorizado (Modo Offline)', 'Sesión iniciada como Joseph Silva (Vendedor).');
          setLoginEmail('');
          setLoginPassword('');
        } else {
          Alert.alert('Error de Conexión', 'El backend no está conectado. Usa admin@demo.com o vendedor@demo.com para probar en modo local.');
        }
      }
    }
  };

  // Valida el código 2FA de Google Authenticator durante el inicio de sesión
  const verificarLogin2FA = async () => {
    if (loginCodigo2FA.trim().length !== 6) {
      Alert.alert('Código Incompleto', 'Por favor ingresa los 6 dígitos que muestra Google Authenticator.');
      return;
    }

    try {
      const res = await apiService.postConEstado('/login/verificar-2fa', {
        email: loginEmailPendiente,
        tokenTemporal: loginTempToken2FA,
        codigo: loginCodigo2FA.trim(),
      });

      if (res && res.success && res.token) {
        setLoginRequiere2FA(false);
        setLoginTempToken2FA('');
        setLoginCodigo2FA('');
        setSegundosBloqueoLogin(0);
        const tokenSesion = res.token;
        setToken(tokenSesion);
        setAuthToken(tokenSesion);
        const nombreDetectado = res.nombre || (res.rol === 1 ? 'Luis Martínez' : 'Joseph Silva');
        setUsuarioNombre(nombreDetectado);
        if (res.rol === 1) {
          setSesion('admin');
          setPestanaAdmin('tabla_ventas');
        } else {
          setSesion('vendedor');
          setPestanaVendedor('pos');
        }
        cargarPerfilUsuario();
        Alert.alert('Autenticación Exitosa', `Verificación 2FA completada. Bienvenido, ${nombreDetectado}.`);
        const rolTexto = res.rol === 1 ? 'Administrador' : 'Vendedor';
        enviarNotificacionMovimiento('🔐 Inicio de Sesión', `${nombreDetectado} inició sesión (${rolTexto}).`, 'login');
        setLoginEmail('');
        setLoginPassword('');
      } else {
        Alert.alert('Código Incorrecto', res.message || 'El código 2FA no coincide o ya expiró.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con el servidor para validar 2FA.');
    }
  };

  // Carga los datos del perfil y estado de 2FA del usuario conectado
  const cargarPerfilUsuario = async () => {
    setCargandoPerfil(true);
    try {
      const res = await apiService.get('/usuarios/perfil');
      if (res && res.success && res.usuario) {
        setPerfilUsuario(res.usuario);
        if (res.usuario.nombre) {
          setUsuarioNombre(res.usuario.nombre);
        }
        setEstado2FAUsuario(Boolean(res.usuario.totp_activo));
      }
    } catch (e) {
      console.log('Error al cargar perfil:', e);
    } finally {
      setCargandoPerfil(false);
    }
  };

  // Cambiar contraseña desde el módulo de configuración
  const ejecutarCambioPassword = async () => {
    if (!cambioPwdActual || !cambioPwdNueva) {
      Alert.alert('Campos Requeridos', 'Por favor ingresa tu contraseña actual y la nueva contraseña.');
      return;
    }
    const errores = validarPasswordSegura(cambioPwdNueva);
    if (errores.length) {
      Alert.alert('Contraseña Débil', `La nueva contraseña debe tener: ${errores.join(', ')}.`);
      return;
    }
    if (cambioPwdNueva !== cambioPwdConfirmar) {
      Alert.alert('No Coinciden', 'La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setCargandoCambioPwd(true);
    try {
      const res = await apiService.postConEstado('/usuarios/cambiar-password', {
        passwordActual: cambioPwdActual,
        nuevaPassword: cambioPwdNueva,
      });

      if (res && res.success) {
        Alert.alert('✅ Contraseña Actualizada', 'Tu contraseña ha sido cambiada exitosamente.');
        setCambioPwdActual('');
        setCambioPwdNueva('');
        setCambioPwdConfirmar('');
      } else {
        Alert.alert('Error', res.message || 'No se pudo actualizar la contraseña.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error de conexión con el servidor.');
    } finally {
      setCargandoCambioPwd(false);
    }
  };

  // Cambiar correo desde el módulo de configuración
  const ejecutarCambioEmail = async () => {
    const nuevo = cambioEmailNuevo.trim().toLowerCase();
    if (!nuevo || !cambioEmailPassword) {
      Alert.alert('Campos Requeridos', 'Ingresa el nuevo correo y tu contraseña actual para confirmar.');
      return;
    }
    if (!nuevo.includes('@') || !nuevo.includes('.')) {
      Alert.alert('Correo Inválido', 'Por favor ingresa un correo electrónico válido.');
      return;
    }

    setCargandoCambioEmail(true);
    try {
      const res = await apiService.postConEstado('/usuarios/cambiar-email', {
        nuevoEmail: nuevo,
        password: cambioEmailPassword,
      });

      if (res && res.success) {
        Alert.alert('✅ Correo Actualizado', `Tu correo fue cambiado a: ${nuevo}`);
        setCambioEmailNuevo('');
        setCambioEmailPassword('');
        cargarPerfilUsuario();
      } else {
        Alert.alert('Error', res.message || 'No se pudo actualizar el correo.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error de conexión al cambiar correo.');
    } finally {
      setCargandoCambioEmail(false);
    }
  };

  // Reinicia por completo el flujo de recuperación
  const reiniciarRecuperacion = () => {
    setPasoRecuperacion(1);
    setRecuperarEmail('');
    setEmailEnmascarado('');
    setMetodoRecuperacion('gmail');
    setTotpHabilitado(false);
    setMostrarOpcionesMetodo(false);
    setCodigoRecuperacion('');
    setTokenRecuperacion('');
    setNuevaPasswordRecuperacion('');
    setConfirmarPasswordRecuperacion('');
    setSegundosReenvioCorreo(0);
  };

  // Paso 1: Consultar métodos disponibles para el correo ingresado
  const solicitarMetodosRecuperacion = async () => {
    const emailLimpio = recuperarEmail.trim().toLowerCase();
    if (!emailLimpio) {
      Alert.alert('Correo Requerido', 'Por favor ingresa tu correo electrónico registrado.');
      return;
    }
    setCargandoRecuperacion(true);
    try {
      const res = await apiService.postConEstado('/recuperar/metodos', { email: emailLimpio });
      if (res.status === 429) {
        Alert.alert('🚫 Acceso Bloqueado', res.message || 'Demasiados intentos fallidos. Intenta más tarde.');
        return;
      }
      setEmailEnmascarado(res.emailEnmascarado || emailLimpio);
      const tieneTotp = Boolean(res.totpHabilitado);
      setTotpHabilitado(tieneTotp);

      if (tieneTotp) {
        // La cuenta tiene 2FA configurado, se despliega selector de método
        setMostrarOpcionesMetodo(true);
      } else {
        // Solo tiene Gmail: envía el código y avanza al paso 2
        setMetodoRecuperacion('gmail');
        const ok = await ejecutarEnvioCodigoGmail(emailLimpio);
        if (ok) setPasoRecuperacion(2);
      }
    } catch (e) {
      Alert.alert('Sin conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setCargandoRecuperacion(false);
    }
  };

  // Enviar / Reenviar código OTP de 6 dígitos por Gmail
  const ejecutarEnvioCodigoGmail = async (correo = null) => {
    const targetEmail = (typeof correo === 'string' && correo ? correo : recuperarEmail).trim().toLowerCase();
    setCargandoRecuperacion(true);
    try {
      const res = await apiService.postConEstado('/recuperar/enviar-codigo-gmail', { email: targetEmail });
      if (res.status === 429) {
        Alert.alert('🚫 Límite de intentos', res.message || 'Demasiados intentos. Intenta más tarde.');
        return false;
      }
      if (res.success) {
        setSegundosReenvioCorreo(60);
        Alert.alert('📧 Código Enviado', `Hemos enviado un código numérico de 6 dígitos a ${res.emailEnmascarado || targetEmail}. Revisa tu bandeja de entrada.`);
        enviarNotificacionWeb('Código Enviado', `Revisa tu correo ${res.emailEnmascarado || targetEmail}`);
        return true;
      } else {
        Alert.alert('Error', res.message || 'No se pudo enviar el correo de verificación.');
        return false;
      }
    } catch (e) {
      Alert.alert('Sin conexión', 'No se pudo comunicar con el servidor.');
      return false;
    } finally {
      setCargandoRecuperacion(false);
    }
  };

  // Continuar tras seleccionar método cuando hay múltiples opciones (Gmail o TOTP)
  const continuarConMetodoSeleccionado = async () => {
    if (metodoRecuperacion === 'gmail') {
      const ok = await ejecutarEnvioCodigoGmail();
      if (ok) setPasoRecuperacion(2);
    } else {
      // Método Google Authenticator: pasa directo al paso 2
      setPasoRecuperacion(2);
    }
  };

  // Paso 2: Verificar el código de 6 dígitos (Gmail o Google Authenticator)
  const verificarCodigoRecuperacion = async () => {
    const cod = codigoRecuperacion.trim();
    if (cod.length !== 6) {
      Alert.alert('Código Inválido', 'Por favor ingresa el código numérico completo de 6 dígitos.');
      return;
    }
    setCargandoRecuperacion(true);
    try {
      const endpoint = metodoRecuperacion === 'totp' ? '/recuperar/verificar-totp' : '/recuperar/verificar-codigo-gmail';
      const res = await apiService.postConEstado(endpoint, {
        email: recuperarEmail.trim().toLowerCase(),
        codigo: cod,
      });

      if (res.success && res.token) {
        setTokenRecuperacion(res.token);
        setCodigoRecuperacion('');
        setPasoRecuperacion(3);
      } else if (res.status === 429) {
        Alert.alert('🚫 Cuenta Bloqueada', res.message || 'Demasiados intentos fallidos. Intenta más tarde.');
        reiniciarRecuperacion();
        setSesion('auth');
      } else {
        Alert.alert('Código Incorrecto', res.message || 'El código ingresado no es válido o ha expirado.');
      }
    } catch (e) {
      Alert.alert('Sin conexión', 'Error al verificar con el servidor.');
    } finally {
      setCargandoRecuperacion(false);
    }
  };

  // Paso 3: Guardar la nueva contraseña con el token de un solo uso
  const ejecutarRestablecerPassword = async () => {
    const errores = validarPasswordSegura(nuevaPasswordRecuperacion);
    if (errores.length) {
      Alert.alert('Contraseña Débil', `La contraseña debe tener: ${errores.join(', ')}.`);
      return;
    }
    if (nuevaPasswordRecuperacion !== confirmarPasswordRecuperacion) {
      Alert.alert('No Coinciden', 'La confirmación no coincide con la nueva contraseña.');
      return;
    }
    setCargandoRecuperacion(true);
    try {
      const res = await apiService.postConEstado('/resetear-password', {
        email: recuperarEmail.trim().toLowerCase(),
        token: tokenRecuperacion,
        nueva_password: nuevaPasswordRecuperacion,
      });
      if (res.success) {
        Alert.alert('✅ Contraseña Restablecida', 'Tu contraseña fue actualizada exitosamente. Ya puedes iniciar sesión.');
        enviarNotificacionWeb('Contraseña Actualizada', 'Tu contraseña ha sido restablecida.');
        reiniciarRecuperacion();
        setSesion('auth');
      } else {
        Alert.alert('Error', res.message || 'No se pudo restablecer la contraseña.');
        if (res.status === 400 && /expir|inválida/i.test(res.message || '')) reiniciarRecuperacion();
      }
    } catch (e) {
      Alert.alert('Sin conexión', 'No se pudo conectar con el servidor.');
    } finally {
      setCargandoRecuperacion(false);
    }
  };

  // Funciones para gestionar 2FA desde la app
  const abrirModal2FA = async (forzarRegenerar = false) => {
    const regenerar = forzarRegenerar === true;
    setCargando2FA(true);
    try {
      const estadoRes = await apiService.get('/2fa/estado');
      setEstado2FAUsuario(Boolean(estadoRes && estadoRes.activo));

      const genRes = await apiService.post('/2fa/generar', { regenerar });
      if (genRes.success) {
        setDatosConfiguracion2FA(genRes);
        setCodigoActivacion2FA('');
        setModal2FAVisible(true);
      } else {
        Alert.alert('Error', genRes.message || 'No se pudo preparar la configuración 2FA.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo conectar con el servidor para 2FA.');
    } finally {
      setCargando2FA(false);
    }
  };

  const confirmarActivar2FA = async () => {
    if (codigoActivacion2FA.trim().length !== 6) {
      Alert.alert('Código Incompleto', 'Ingresa el código de 6 dígitos de Google Authenticator.');
      return;
    }
    setCargando2FA(true);
    try {
      const res = await apiService.postConEstado('/2fa/activar', { codigo: codigoActivacion2FA.trim() });
      if (res.success) {
        setEstado2FAUsuario(true);
        Alert.alert('✅ 2FA Activado', 'Google Authenticator ha quedado vinculado y activado para tu cuenta.');
        setModal2FAVisible(false);
      } else {
        Alert.alert('Código Incorrecto', res.message || 'El código no coincide. Asegúrate de tener la hora sincronizada en tu teléfono.');
      }
    } catch (e) {
      Alert.alert('Error', 'No se pudo activar 2FA.');
    } finally {
      setCargando2FA(false);
    }
  };

  const desactivar2FA = async (claveOCodigo) => {
    const valor = (claveOCodigo || '').trim();
    if (!valor) {
      Alert.alert('Dato Requerido', 'Por favor ingresa tu contraseña o el código de 6 dígitos de Google Authenticator.');
      return;
    }
    setCargando2FA(true);
    try {
      const esCodigo = /^\d{6}$/.test(valor);
      const payload = esCodigo ? { codigo: valor } : { password: valor };
      const res = await apiService.postConEstado('/2fa/desactivar', payload);
      if (res.success) {
        setEstado2FAUsuario(false);
        setModal2FAVisible(false);
        setModalDesactivar2FAVisible(false);
        setClaveODesactivar2FA('');
        Alert.alert('✅ 2FA Desactivado', 'La autenticación en dos pasos ha sido deshabilitada exitosamente.');
      } else {
        Alert.alert('Error', res.message || 'Contraseña o código 2FA incorrecto.');
      }
    } catch (e) {
      Alert.alert('Error', 'Error al desactivar 2FA.');
    } finally {
      setCargando2FA(false);
    }
  };

  // Registra un empleado (Admin/Vendedor) llamando al POST en el servidor
  const manejarRegistroEmpleado = async () => {
    const nombreLimpio = empNombre.trim();
    if (!nombreLimpio || !empEmail.trim() || !empPassword || !empRolId || !empPregunta || !empRespuesta.trim()) {
      Alert.alert('Campos Incompletos', 'Por favor rellene todos los campos (nombre completo, correo, contraseña, rol, pregunta y respuesta de seguridad).');
      return;
    }

    const rolIdNum = parseInt(empRolId);
    if (rolIdNum !== 1 && rolIdNum !== 2) {
      Alert.alert('Rol Inválido', 'Ingrese 1 para Administrador o 2 para Vendedor.');
      return;
    }

    const erroresPwd = validarPasswordSegura(empPassword);
    if (erroresPwd.length) {
      Alert.alert('Contraseña Débil', `La contraseña debe tener: ${erroresPwd.join(', ')}.`);
      return;
    }

    try {
      const res = await apiService.postConEstado('/usuarios/registro', {
        nombre: nombreLimpio,
        email: empEmail.trim(),
        password: empPassword,
        rol_id: rolIdNum,
        pregunta_seguridad: empPregunta,
        respuesta_seguridad: empRespuesta
      });

      if (res.success) {
        const rolTexto = rolIdNum === 1 ? 'Administrador' : 'Vendedor';
        Alert.alert('Personal Registrado', `Se guardó a ${nombreLimpio} con el rol de ${rolTexto}.`);
        enviarNotificacionWeb('Personal Registrado', `Se registró a ${nombreLimpio} como ${rolTexto}.`);
        setEmpNombre('');
        setEmpEmail('');
        setEmpPassword('');
        setEmpRolId('');
        setEmpPregunta(PREGUNTAS_SEGURIDAD[0]);
        setEmpRespuesta('');
      } else {
        Alert.alert('No se pudo registrar', res.message || 'Error en el registro.');
      }
    } catch (error) {
      Alert.alert('Sin conexión', 'No se pudo conectar con el servidor para registrar al empleado.');
    }
  };

  // Incrementa el stock de un producto existente en MySQL
  const manejarReabastecimiento = async () => {
    if (!reabastecerProductoId || !reabastecerCantidad) {
      Alert.alert('Campos Requeridos', 'Por favor selecciona un producto de la lista y define la cantidad.');
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
        enviarNotificacionMovimiento('🔄 Stock Incrementado', `Se agregaron ${cantidadSumar} unidades al producto #${prodId}.`, 'stock', { prodId, cantidadSumar });
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
      enviarNotificacionMovimiento('🔄 Stock Incrementado (Modo Local)', `Se sumaron ${cantidadSumar} unidades al producto #${prodId}.`, 'stock', { prodId, cantidadSumar });
      setReabastecerProductoId('');
      setReabastecerCantidad('');
      setReabastecerProductoNombre('');
    }
  };

  // Inserta un nuevo producto en la tabla productos de la base de datos
  const guardarNuevoProducto = async () => {
    if (!nuevoNombre) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el nombre del producto.');
      return;
    }
    if (!nuevoDescripcion) {
      Alert.alert('Campo Requerido', 'Por favor ingresa la descripción del producto.');
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
        enviarNotificacionMovimiento('✨ Nuevo Producto Registrado', `"${nuevoNombre}" añadido al catálogo de productos.`, 'producto', { nombre: nuevoNombre });
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
      enviarNotificacionMovimiento('✨ Nuevo Producto (Modo Local)', `"${nuevoNombre}" guardado localmente.`, 'producto', { nombre: nuevoNombre });
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
        enviarNotificacionMovimiento('🏷️ Nueva Categoría Creada', `Se creó la categoría: ${nuevaCategoriaDescripcion}`, 'categoria');
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
      enviarNotificacionMovimiento('🏷️ Nueva Categoría (Modo Local)', `Se agregó "${nuevaCategoriaDescripcion}" localmente.`, 'categoria');
      setNuevaCategoriaDescripcion('');
      setMostrarNuevaCategoriaForm(false);
    }
  };

  // Envía los cambios del producto editado al backend
  const guardarEdicionProducto = async () => {
    if (!editProductoId) {
      Alert.alert('Ningún Producto Seleccionado', 'Por favor selecciona un producto de la lista para editar.');
      return;
    }
    if (!editNombre) {
      Alert.alert('Campo Requerido', 'Por favor ingresa el nombre del producto.');
      return;
    }
    if (!editDescripcion) {
      Alert.alert('Campo Requerido', 'Por favor ingresa la descripción del producto.');
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
        Alert.alert('Producto Actualizado', 'El producto se ha modificado en la base de datos MySQL.');
        enviarNotificacionMovimiento('✏️ Producto Modificado', `Se actualizaron los datos de: ${editNombre}`, 'producto', { prodId, nombre: editNombre });
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
      enviarNotificacionMovimiento('✏️ Producto Modificado (Modo Local)', `Se actualizó localmente: ${editNombre}`, 'producto', { prodId, nombre: editNombre });
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
      Alert.alert('Carrito Vacío', 'Agrega productos a tu carrito antes de procesar la compra.');
      return;
    }

    // Abre únicamente el Módulo del Carrito de compras
    setMostrarCarritoModal(true);
  };

  // Envía la orden al endpoint /vender del backend
  const ejecutarVentaApi = async (emailCliente) => {
    if (!carrito || carrito.length === 0) return;

    try {
      const res = await apiService.post('/vender', {
        usuario_email: emailCliente,
        detalles: carrito.map(item => ({ producto_id: item.id, cantidad: item.cantidad })),
        total: parseFloat(calcularTotal()),
        tipo_orden: 'venta'
      });

      if (res && res.success) {
        const idOrden = res.ventaId || res.id || res.insertId || Math.floor(Math.random() * 8000) + 1000;
        finalizarVentaExito(idOrden);
      } else {
        // Fallback a venta local
        const idOrdenLocal = Math.floor(Math.random() * 8000) + 1000;
        finalizarVentaExito(idOrdenLocal);
      }
    } catch (error) {
      console.warn('Backend desconectado, registrando venta en modo local:', error.message);
      // Fallback a venta local de contingencia
      const idOrdenLocal = Math.floor(Math.random() * 8000) + 1000;
      finalizarVentaExito(idOrdenLocal);
    }
  };

  // Limpia el carrito y muestra la alerta de éxito premium
  const finalizarVentaExito = (idOrden) => {
    // 1. Disparar notificación push del movimiento INMEDIATAMENTE
    enviarNotificacionMovimiento('🛒 ¡Nueva Venta Registrada!', `Se ha generado con éxito la orden #${idOrden}.`, 'venta', { idOrden });

    setCarrito([]);
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

  // Inicia el proceso de pago seguro en la pasarela Tilopay (Modo Sandbox via WebView)
  const procesarPagoTilopay = () => {
    if (!checkoutNombre || !checkoutEmail || !checkoutCedula || !checkoutTelefono) {
      Alert.alert('Datos Requeridos', 'Por favor rellene Nombre, Correo, Cédula y Teléfono antes de procesar el pago.');
      return;
    }

    const totalPagar = calcularTotal();
    const idOrdenTemp = Math.floor(Math.random() * 8000) + 1000;
    const listaProductosTexto = carrito.map(i => `${i.cantidad}x ${i.nombre} (₡${Number(i.precio * i.cantidad).toFixed(2)})`).join(', ');

    setDatosPagoTilopay({
      monto: totalPagar,
      ordenId: idOrdenTemp,
      clienteNombre: checkoutNombre,
      clienteEmail: checkoutEmail,
      clienteTelefono: checkoutTelefono,
      descripcion: `Detalle del pedido: ${listaProductosTexto}`,
      items: carrito
    });

    enviarNotificacionMovimiento(
      '💳 Pasarela de Pago Tilopay',
      `Iniciando pago seguro por ₡${Number(totalPagar).toLocaleString()} (Orden #${idOrdenTemp}).`,
      'pago',
      { ordenId: idOrdenTemp, total: totalPagar }
    );

    setMostrarTilopayModal(true);
  };

  // Callback al ser procesado y aprobado el pago en Tilopay WebView
  const manejarExitoTilopay = async (resultado) => {
    setMostrarTilopayModal(false);

    try {
      await apiService.post('/clientes', {
        nombre: checkoutNombre,
        email: checkoutEmail,
        cedula: checkoutCedula,
        telefono: checkoutTelefono
      });
    } catch (e) {}

    enviarNotificacionMovimiento(
      '💳 Pago Aprobado en Tilopay',
      `Transacción autorizada con éxito por ₡${Number(calcularTotal()).toLocaleString()}.`,
      'pago'
    );

    // Finalizar orden
    ejecutarVentaApi(checkoutEmail);
  };

  // Callback al cancelar el pago por el cliente
  const manejarCancelarTilopay = () => {
    setMostrarTilopayModal(false);
    Alert.alert(
      '❌ Pago Cancelado / Orden No Procesada',
      'Has cancelado la transacción en la pasarela Tilopay. La orden NO ha sido generada y tu carrito permanece guardado.'
    );
    enviarNotificacionMovimiento('❌ Pago Cancelado', 'El cliente canceló la transacción en Tilopay.', 'pago');
  };

  // Callback al ocurrir un error o rechazo de tarjeta en el pago
  const manejarErrorTilopay = (error) => {
    setMostrarTilopayModal(false);
    const mensajeDetallado = error.error || 'La transacción fue rechazada por el banco emisor o la tarjeta no está disponible.';
    Alert.alert(
      '❌ Transacción Denegada / Orden Cancelada',
      `${mensajeDetallado}\n\nLa orden NO ha sido procesada por la tienda y su carrito se mantiene intacto.`
    );
    enviarNotificacionMovimiento('⚠️ Transacción Denegada', `Pago rechazado en Tilopay: ${mensajeDetallado}`, 'pago');
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

    if (numColumns > 1) {
      // Diseño en Tarjetas de Cuadrícula (Grid) para Pantallas Anchas (Web / Tablet)
      return (
        <View style={styles.tarjetaProductoGrid}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setProductoSeleccionadoDetalle(item)}
            activeOpacity={0.7}
          >
            <Image
              source={imagenSource}
              style={styles.imagenProductoGrid}
              {...(Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } : {})}
            />
            <View style={{ padding: 14, flex: 1, justifyContent: 'space-between' }}>
              <View>
                <Text style={styles.categoriaTexto}>{item.categoria_nombre}</Text>
                <Text style={[styles.nombreTexto, { fontSize: 16 }]} numberOfLines={2}>{item.nombre}</Text>
                <Text style={[styles.descripcionTexto, { fontSize: 12, marginVertical: 6 }]} numberOfLines={2}>{item.descripcion}</Text>
              </View>

              <View style={{ marginTop: 10 }}>
                {item.descuento_porcentaje > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                    <Text style={{ color: '#ef4444', textDecorationLine: 'line-through', fontSize: 11, marginRight: 6 }}>
                      ₡{Number(item.precio_base || (item.precio / (1 - item.descuento_porcentaje / 100))).toFixed(2)}
                    </Text>
                    <View style={{ backgroundColor: '#b91c1c', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                      <Text style={{ color: '#1c2b22', fontSize: 9, fontWeight: '900' }}>
                        -{item.descuento_porcentaje}%
                      </Text>
                    </View>
                  </View>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.precioTexto, { fontSize: 18 }]}>₡{Number(item.precio || 0).toFixed(2)}</Text>
                  <Text style={[styles.stockTexto, estaAgotado ? styles.stockAgotado : styles.stockDisponible, { fontSize: 12 }]}>
                    {estaAgotado ? 'Agotado' : `Stock: ${item.stock}`}
                  </Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>

          {sesion !== 'admin' && (
            <TouchableOpacity
              disabled={estaAgotado}
              onPress={() => agregarAlCarrito(item)}
              style={[
                styles.botonAgregar,
                estaAgotado && styles.botonAgregarDeshabilitado,
                { marginHorizontal: 14, marginBottom: 14, paddingVertical: 12, alignItems: 'center' }
              ]}
            >
              <Text style={[styles.botonAgregarTexto, { textAlign: 'center', fontSize: 14 }]}>
                {estaAgotado ? 'Agotado' : '🛒 Añadir al Carrito'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Diseño en Lista Horizontal para Teléfonos Celulares
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
            {...(Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } : {})}
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
                      <Text style={{ color: '#1c2b22', fontSize: 9, fontWeight: '900' }}>
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

        <ScrollView style={styles.cuerpoFormularios} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          {loginRequiere2FA ? (
            <View style={[styles.formularioTarjeta, { width: '100%', maxWidth: 420, padding: 24 }]}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <Image
                  source={require('./assets/logo.png')}
                  style={{ width: 80, height: 80, marginBottom: 8, borderRadius: 8, backgroundColor: '#ffffff' }}
                  resizeMode="contain"
                />
                <Text style={[styles.seccionTituloInterno, { marginBottom: 6, color: '#22a34a', fontSize: 19 }]}>
                  Doble Factor (2FA)
                </Text>
                <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center', lineHeight: 18 }}>
                  Tu cuenta <Text style={{ fontWeight: '800', color: '#1c2b22' }}>{loginEmailPendiente}</Text> requiere verificación con Google Authenticator.
                </Text>
                <Text style={{ color: '#64748b', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Abre tu app autenticadora e ingresa el código temporal de 6 dígitos.
                </Text>
              </View>

              <Text style={[styles.formEtiqueta, { textAlign: 'center' }]}>Código de 6 Dígitos:</Text>
              <TextInput
                style={[
                  styles.formInput,
                  {
                    textAlign: 'center',
                    fontSize: 26,
                    fontWeight: '900',
                    letterSpacing: 10,
                    paddingVertical: 12,
                    color: '#1c2b22',
                    borderColor: '#22a34a',
                  },
                ]}
                placeholder="000000"
                placeholderTextColor="#94a3b8"
                keyboardType="number-pad"
                maxLength={6}
                value={loginCodigo2FA}
                onChangeText={(txt) => setLoginCodigo2FA(txt.replace(/[^0-9]/g, '').slice(0, 6))}
                autoFocus={true}
              />

              <TouchableOpacity
                style={[
                  styles.botonAccionPrincipal,
                  loginCodigo2FA.length !== 6 && { backgroundColor: '#94a3b8' },
                ]}
                onPress={verificarLogin2FA}
                disabled={loginCodigo2FA.length !== 6}
              >
                <Text style={styles.botonAccionPrincipalTexto}>
                  Verificar e Iniciar Sesión
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{ marginTop: 18, alignItems: 'center' }}
                onPress={() => {
                  setLoginRequiere2FA(false);
                  setLoginCodigo2FA('');
                }}
              >
                <Text style={{ color: '#64748b', fontSize: 12, textDecorationLine: 'underline' }}>
                  Cancelar y volver a ingresar credenciales
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.formularioTarjeta, { width: '100%', maxWidth: 420 }]}>
              <Image 
                source={require('./assets/logo.png')} 
                style={{ width: 110, height: 110, alignSelf: 'center', marginBottom: 10, borderRadius: 12, backgroundColor: '#ffffff' }} 
                resizeMode="contain" 
              />
              <Text style={styles.seccionTituloInterno}>Iniciar Sesión</Text>
              <Text style={styles.formEtiqueta}>Correo Electrónico</Text>
              <TextInput
                style={styles.formInput}
                placeholder="ejemplo@hardwarestore.com"
                placeholderTextColor="#5b6b62"
                value={loginEmail}
                onChangeText={setLoginEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.formEtiqueta}>Contraseña</Text>
              <TextInput
                style={styles.formInput}
                placeholder="••••••••"
                placeholderTextColor="#5b6b62"
                secureTextEntry={true}
                value={loginPassword}
                onChangeText={setLoginPassword}
              />
              {segundosBloqueoLogin > 0 && (
                <View style={{ backgroundColor: '#fff1f2', borderColor: '#f43f5e', borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 16 }}>
                  <Text style={{ color: '#be123c', fontWeight: '800', fontSize: 13, textAlign: 'center' }}>
                    🔒 Acceso bloqueado por intentos fallidos
                  </Text>
                  <Text style={{ color: '#e11d48', fontSize: 13, fontWeight: '700', textAlign: 'center', marginTop: 4 }}>
                    Inténtalo de nuevo en {Math.floor(segundosBloqueoLogin / 60)}:{(segundosBloqueoLogin % 60).toString().padStart(2, '0')} min
                  </Text>
                </View>
              )}

              <TouchableOpacity 
                style={[styles.botonAccionPrincipal, segundosBloqueoLogin > 0 && { backgroundColor: '#94a3b8' }]} 
                onPress={manejarLogin}
                disabled={segundosBloqueoLogin > 0}
              >
                <Text style={styles.botonAccionPrincipalTexto}>
                  {segundosBloqueoLogin > 0 
                    ? `Bloqueado (${Math.floor(segundosBloqueoLogin / 60)}:${(segundosBloqueoLogin % 60).toString().padStart(2, '0')})` 
                    : 'Ingresar'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={{ marginTop: 20, alignItems: 'center', width: '100%', paddingVertical: 4 }} 
                onPress={() => { reiniciarRecuperacion(); setSesion('recuperar'); }}
              >
                <Text style={{ color: '#6cc04a', fontWeight: '800', fontSize: 13, textAlign: 'center', textDecorationLine: 'underline' }}>
                  ¿Olvidaste tu contraseña?
                </Text>
              </TouchableOpacity>
            </View>
          )}
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
            <Text style={[styles.headerTitulo, { fontSize: 17 }]} numberOfLines={1} adjustsFontSizeToFit>
              Recuperación de Contraseña
            </Text>
            <TouchableOpacity style={styles.botonCerrarSesion} onPress={() => setSesion('auth')}>
              <Text style={styles.botonCerrarSesionTexto}>Volver</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <View style={[styles.formularioTarjeta, { width: '100%', maxWidth: 420, padding: 24 }]}>
            <Text style={[styles.seccionTituloInterno, { textAlign: 'center', marginBottom: 16, fontSize: 20, color: '#6cc04a' }]}>
              Restablecer Contraseña
            </Text>

            {/* Indicador de pasos */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 18, gap: 8 }}>
              {[1, 2, 3].map((n) => (
                <View key={`paso-rec-${n}`} style={{ width: 34, height: 6, borderRadius: 3, backgroundColor: pasoRecuperacion >= n ? (n === 3 ? '#f97316' : '#6cc04a') : '#e1eed9' }} />
              ))}
            </View>

            {pasoRecuperacion === 1 && !mostrarOpcionesMetodo && (
              <View>
                <Text style={styles.formEtiqueta}>Correo Electrónico Registrado:</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="ejemplo@gmail.com"
                  placeholderTextColor="#5b6b62"
                  value={recuperarEmail}
                  onChangeText={setRecuperarEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
                <Text style={{ color: '#6b7c74', fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                  Ingresa tu correo para recibir un código de verificación o autenticarte con tu app 2FA.
                </Text>
                <TouchableOpacity
                  style={[styles.botonAccionPrincipal, { marginTop: 14 }]}
                  onPress={solicitarMetodosRecuperacion}
                  disabled={cargandoRecuperacion}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>
                    {cargandoRecuperacion ? 'Consultando...' : 'Continuar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {pasoRecuperacion === 1 && mostrarOpcionesMetodo && (
              <View>
                <Text style={[styles.formEtiqueta, { fontSize: 14, marginBottom: 12 }]}>
                  Elige cómo deseas verificar tu identidad:
                </Text>

                {/* Opción 1: Correo Gmail */}
                <TouchableOpacity
                  style={{
                    backgroundColor: metodoRecuperacion === 'gmail' ? '#eef7ea' : '#f8fafc',
                    borderColor: metodoRecuperacion === 'gmail' ? '#22a34a' : '#cbd5e1',
                    borderWidth: 2,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 12,
                  }}
                  onPress={() => setMetodoRecuperacion('gmail')}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, marginRight: 12 }}>📧</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: '#1c2b22', fontSize: 15 }}>
                        Código por Gmail
                      </Text>
                      <Text style={{ color: '#5b6b62', fontSize: 12, marginTop: 2 }}>
                        Enviaremos un código de 6 dígitos a {emailEnmascarado}
                      </Text>
                    </View>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: metodoRecuperacion === 'gmail' ? '#22a34a' : '#94a3b8',
                      backgroundColor: metodoRecuperacion === 'gmail' ? '#22a34a' : 'transparent',
                    }} />
                  </View>
                </TouchableOpacity>

                {/* Opción 2: Google Authenticator (TOTP) */}
                <TouchableOpacity
                  style={{
                    backgroundColor: metodoRecuperacion === 'totp' ? '#eef7ea' : '#f8fafc',
                    borderColor: metodoRecuperacion === 'totp' ? '#22a34a' : '#cbd5e1',
                    borderWidth: 2,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 16,
                  }}
                  onPress={() => setMetodoRecuperacion('totp')}
                  activeOpacity={0.8}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 24, marginRight: 12 }}>📱</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', color: '#1c2b22', fontSize: 15 }}>
                        Google Authenticator (2FA)
                      </Text>
                      <Text style={{ color: '#5b6b62', fontSize: 12, marginTop: 2 }}>
                        Usa el código temporal de 6 dígitos de tu app autenticadora
                      </Text>
                    </View>
                    <View style={{
                      width: 20,
                      height: 20,
                      borderRadius: 10,
                      borderWidth: 2,
                      borderColor: metodoRecuperacion === 'totp' ? '#22a34a' : '#94a3b8',
                      backgroundColor: metodoRecuperacion === 'totp' ? '#22a34a' : 'transparent',
                    }} />
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.botonAccionPrincipal, { marginTop: 4 }]}
                  onPress={continuarConMetodoSeleccionado}
                  disabled={cargandoRecuperacion}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>
                    {cargandoRecuperacion ? 'Enviando...' : 'Continuar con este método'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ marginTop: 12, alignItems: 'center' }}
                  onPress={() => setMostrarOpcionesMetodo(false)}
                >
                  <Text style={{ color: '#5b6b62', fontSize: 12, textDecorationLine: 'underline' }}>
                    Cambiar correo electrónico
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {pasoRecuperacion === 2 && (
              <View>
                {metodoRecuperacion === 'gmail' ? (
                  <View style={{ backgroundColor: '#eef7ea', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                    <Text style={{ color: '#1c2b22', fontWeight: '800', fontSize: 14, textAlign: 'center' }}>
                      📧 Código enviado a tu correo
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                      Ingresa el código numérico de 6 dígitos enviado a <Text style={{ fontWeight: '700' }}>{emailEnmascarado}</Text> (válido por 10 min).
                    </Text>
                  </View>
                ) : (
                  <View style={{ backgroundColor: '#eef7ea', borderRadius: 10, padding: 12, marginBottom: 14 }}>
                    <Text style={{ color: '#1c2b22', fontWeight: '800', fontSize: 14, textAlign: 'center' }}>
                      📱 Código de Google Authenticator
                    </Text>
                    <Text style={{ color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                      Abre tu aplicación autenticadora e ingresa el código temporal de 6 dígitos de tu cuenta.
                    </Text>
                  </View>
                )}

                <Text style={[styles.formEtiqueta, { textAlign: 'center' }]}>Código de Verificación (6 dígitos):</Text>
                <TextInput
                  style={[
                    styles.formInput,
                    {
                      textAlign: 'center',
                      fontSize: 26,
                      fontWeight: '900',
                      letterSpacing: 10,
                      paddingVertical: 12,
                      color: '#1c2b22',
                      borderColor: '#22a34a',
                    },
                  ]}
                  placeholder="------"
                  placeholderTextColor="#94a3b8"
                  value={codigoRecuperacion}
                  onChangeText={(txt) => setCodigoRecuperacion(txt.replace(/[^0-9]/g, '').slice(0, 6))}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoFocus={true}
                />

                <TouchableOpacity
                  style={[
                    styles.botonAccionPrincipal,
                    { marginTop: 16 },
                    codigoRecuperacion.length !== 6 && { backgroundColor: '#94a3b8' },
                  ]}
                  onPress={verificarCodigoRecuperacion}
                  disabled={cargandoRecuperacion || codigoRecuperacion.length !== 6}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>
                    {cargandoRecuperacion ? 'Verificando...' : 'Verificar Código'}
                  </Text>
                </TouchableOpacity>

                {metodoRecuperacion === 'gmail' && (
                  <TouchableOpacity
                    style={{ marginTop: 14, alignItems: 'center' }}
                    onPress={() => ejecutarEnvioCodigoGmail()}
                    disabled={cargandoRecuperacion || segundosReenvioCorreo > 0}
                  >
                    <Text style={{
                      color: segundosReenvioCorreo > 0 ? '#94a3b8' : '#22a34a',
                      fontWeight: '800',
                      fontSize: 13,
                    }}>
                      {segundosReenvioCorreo > 0
                        ? `⏱️ Reenviar código en ${segundosReenvioCorreo}s`
                        : '🔄 ¿No recibiste el código? Reenviar'}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={{ marginTop: 14, alignItems: 'center' }}
                  onPress={() => {
                    setCodigoRecuperacion('');
                    if (totpHabilitado) {
                      setPasoRecuperacion(1);
                      setMostrarOpcionesMetodo(true);
                    } else {
                      reiniciarRecuperacion();
                    }
                  }}
                >
                  <Text style={{ color: '#5b6b62', fontSize: 12, textDecorationLine: 'underline' }}>
                    {totpHabilitado ? 'Elegir otro método de verificación' : 'Cambiar correo electrónico'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {pasoRecuperacion === 3 && (
              <View>
                <Text style={styles.formEtiqueta}>Nueva Contraseña:</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••••••"
                  placeholderTextColor="#5b6b62"
                  secureTextEntry={true}
                  value={nuevaPasswordRecuperacion}
                  onChangeText={setNuevaPasswordRecuperacion}
                />
                <View style={{ marginTop: 8, marginBottom: 6 }}>
                  {REGLAS_PASSWORD.map((r) => {
                    const ok = r.test(nuevaPasswordRecuperacion);
                    return (
                      <Text key={`regla-${r.texto}`} style={{ fontSize: 12, fontWeight: '700', color: ok ? '#22a34a' : '#6b7c74' }}>
                        {ok ? '✔' : '•'} {r.texto}
                      </Text>
                    );
                  })}
                </View>
                <Text style={styles.formEtiqueta}>Confirmar Contraseña:</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••••••"
                  placeholderTextColor="#5b6b62"
                  secureTextEntry={true}
                  value={confirmarPasswordRecuperacion}
                  onChangeText={setConfirmarPasswordRecuperacion}
                />
                {confirmarPasswordRecuperacion.length > 0 && confirmarPasswordRecuperacion !== nuevaPasswordRecuperacion && (
                  <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', marginTop: 4 }}>Las contraseñas no coinciden</Text>
                )}
                <TouchableOpacity
                  style={[styles.botonAccionPrincipal, { marginTop: 20, backgroundColor: '#f97316' }]}
                  onPress={ejecutarRestablecerPassword}
                  disabled={cargandoRecuperacion}
                >
                  <Text style={[styles.botonAccionPrincipalTexto, { color: '#ffffff' }]}>
                    {cargandoRecuperacion ? 'Actualizando...' : 'Restablecer y Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={{ marginTop: 24, alignItems: 'center' }}
              onPress={() => { reiniciarRecuperacion(); setSesion('auth'); }}
            >
              <Text style={{ color: '#5b6b62', fontWeight: '800', fontSize: 13, textDecorationLine: 'underline' }}>
                Cancelar y Volver a Iniciar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Módulo de Configuración Integral del Usuario (Perfil, Contraseña, Correo, 2FA Google Authenticator)
  const renderModuloConfiguracion = () => (
    <ScrollView style={{ marginTop: 10 }} contentContainerStyle={{ paddingBottom: 80, paddingHorizontal: 16 }} keyboardShouldPersistTaps="handled">
      <View style={[styles.formularioTarjeta, { maxWidth: 650, width: '100%', alignSelf: 'center' }]}>
        
        {/* Cabecera del Perfil */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 16, borderBottomWidth: 1.5, borderBottomColor: '#e1eed9' }}>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#eef7ea', justifyContent: 'center', alignItems: 'center', marginRight: 16, borderWidth: 2, borderColor: '#22a34a' }}>
            <Text style={{ fontSize: 28 }}>👤</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: '#1c2b22' }}>
              {usuarioNombre || perfilUsuario?.nombre || (sesion === 'admin' ? 'Luis Martínez' : sesion === 'vendedor' ? 'Joseph Silva' : perfilUsuario?.email || 'Mi Cuenta')}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
              <View style={{ backgroundColor: perfilUsuario?.rol_id === 1 ? '#ffedd5' : '#eef7ea', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: perfilUsuario?.rol_id === 1 ? '#ea580c' : '#16a34a', fontWeight: '800', fontSize: 11 }}>
                  {perfilUsuario?.rol_id === 1 ? '👑 Administrador' : '💼 Vendedor'}
                </Text>
              </View>
              <View style={{ backgroundColor: estado2FAUsuario ? '#dcfce7' : '#f1f5f9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                <Text style={{ color: estado2FAUsuario ? '#15803d' : '#64748b', fontWeight: '800', fontSize: 11 }}>
                  {estado2FAUsuario ? '🛡️ 2FA Activo' : '⚪ 2FA Inactivo'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 1. SECCIÓN: AUTENTICACIÓN EN DOS PASOS (GOOGLE AUTHENTICATOR) */}
        <View style={{ marginBottom: 26, paddingBottom: 20, borderBottomWidth: 1.5, borderBottomColor: '#e1eed9' }}>
          <Text style={[styles.seccionTituloInterno, { textAlign: 'left', fontSize: 16, marginBottom: 6, color: '#16a34a' }]}>
            🛡️ Autenticación de Dos Factores (Google Authenticator)
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
            Exige un código temporal de 6 dígitos generado por tu app móvil de autenticación tanto para iniciar sesión como para recuperar contraseña.
          </Text>

          {estado2FAUsuario ? (
            <View style={{ backgroundColor: '#f0fdf4', padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#86efac' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ fontSize: 20, marginRight: 8 }}>✅</Text>
                <Text style={{ fontWeight: '800', color: '#16a34a', fontSize: 14 }}>
                  2FA Vinculado y Activo con Google Authenticator
                </Text>
              </View>
              <Text style={{ color: '#475569', fontSize: 12, marginBottom: 12 }}>
                Tu cuenta está protegida. Al iniciar sesión o recuperar contraseña se solicitará el código de 6 dígitos.
              </Text>
              <TouchableOpacity
                style={[styles.botonAccionPrincipal, { backgroundColor: '#ef4444', paddingVertical: 10 }]}
                onPress={() => {
                  setClaveODesactivar2FA('');
                  setModalDesactivar2FAVisible(true);
                }}
                disabled={cargando2FA}
              >
                <Text style={[styles.botonAccionPrincipalTexto, { color: '#ffffff', fontSize: 14 }]}>
                  {cargando2FA ? 'Procesando...' : 'Desactivar 2FA'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.botonAccionPrincipal, { backgroundColor: '#0f172a' }]}
              onPress={() => abrirModal2FA(false)}
              disabled={cargando2FA}
            >
              <Text style={[styles.botonAccionPrincipalTexto, { color: '#ffffff' }]}>
                {cargando2FA ? 'Cargando...' : '📱 Configurar y Activar Google Authenticator (2FA)'}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 2. SECCIÓN: CAMBIAR CONTRASEÑA */}
        <View style={{ marginBottom: 26, paddingBottom: 20, borderBottomWidth: 1.5, borderBottomColor: '#e1eed9' }}>
          <Text style={[styles.seccionTituloInterno, { textAlign: 'left', fontSize: 16, marginBottom: 6, color: '#16a34a' }]}>
            🔑 Cambiar Contraseña
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, marginBottom: 14 }}>
            Actualiza tu contraseña periódicamente para mantener tu cuenta segura.
          </Text>

          <Text style={styles.formEtiqueta}>Contraseña Actual</Text>
          <TextInput
            style={styles.formInput}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={true}
            value={cambioPwdActual}
            onChangeText={setCambioPwdActual}
          />

          <Text style={styles.formEtiqueta}>Nueva Contraseña</Text>
          <TextInput
            style={styles.formInput}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={true}
            value={cambioPwdNueva}
            onChangeText={setCambioPwdNueva}
          />

          {/* Medidor de Requisitos de Contraseña */}
          <View style={{ marginTop: -10, marginBottom: 12 }}>
            {REGLAS_PASSWORD.map((r) => {
              const ok = r.test(cambioPwdNueva);
              return (
                <Text key={`cpwd-${r.texto}`} style={{ fontSize: 12, fontWeight: '700', color: ok ? '#22a34a' : '#64748b' }}>
                  {ok ? '✔' : '•'} {r.texto}
                </Text>
              );
            })}
          </View>

          <Text style={styles.formEtiqueta}>Confirmar Nueva Contraseña</Text>
          <TextInput
            style={styles.formInput}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={true}
            value={cambioPwdConfirmar}
            onChangeText={setCambioPwdConfirmar}
          />

          {cambioPwdConfirmar.length > 0 && cambioPwdConfirmar !== cambioPwdNueva && (
            <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700', marginTop: -12, marginBottom: 12 }}>
              Las contraseñas no coinciden
            </Text>
          )}

          <TouchableOpacity
            style={[styles.botonAccionPrincipal, { backgroundColor: '#22a34a' }]}
            onPress={ejecutarCambioPassword}
            disabled={cargandoCambioPwd}
          >
            <Text style={styles.botonAccionPrincipalTexto}>
              {cargandoCambioPwd ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* 3. SECCIÓN: CAMBIAR CORREO ELECTRÓNICO */}
        <View>
          <Text style={[styles.seccionTituloInterno, { textAlign: 'left', fontSize: 16, marginBottom: 6, color: '#16a34a' }]}>
            ✉️ Cambiar Correo Electrónico
          </Text>
          <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18, marginBottom: 14 }}>
            Ingresa tu nuevo correo y tu contraseña actual para confirmar la modificación.
          </Text>

          <Text style={styles.formEtiqueta}>Nuevo Correo Electrónico</Text>
          <TextInput
            style={styles.formInput}
            placeholder="nuevo_correo@gmail.com"
            placeholderTextColor="#94a3b8"
            value={cambioEmailNuevo}
            onChangeText={setCambioEmailNuevo}
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.formEtiqueta}>Contraseña Actual (Confirmación)</Text>
          <TextInput
            style={styles.formInput}
            placeholder="••••••••"
            placeholderTextColor="#94a3b8"
            secureTextEntry={true}
            value={cambioEmailPassword}
            onChangeText={setCambioEmailPassword}
          />

          <TouchableOpacity
            style={[styles.botonAccionPrincipal, { backgroundColor: '#f97316' }]}
            onPress={ejecutarCambioEmail}
            disabled={cargandoCambioEmail}
          >
            <Text style={[styles.botonAccionPrincipalTexto, { color: '#ffffff' }]}>
              {cargandoCambioEmail ? 'Actualizando...' : 'Actualizar Correo Electrónico'}
            </Text>
          </TouchableOpacity>
        </View>

      </View>
    </ScrollView>
  );

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
            <Text style={{ color: '#1c2b22', fontWeight: '900', fontSize: 11 }}>⚙️ Conectar IP</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.headerFilaSuperior}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
            <Image
              source={require('./assets/logo.png')}
              style={{ width: 36, height: 36, marginRight: 10, borderRadius: 8, backgroundColor: '#ffffff', padding: 2 }}
              resizeMode="contain"
            />
            <View style={{ flex: 1 }}>
              <Text 
                style={{ fontSize: 18, fontWeight: '900', color: '#ffffff', letterSpacing: 0.8, textTransform: 'uppercase' }}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                JLK SOLUTIONS
              </Text>
              <Text style={{ fontSize: 11, fontWeight: '900', color: '#ffedd5', letterSpacing: 2.5, marginTop: -1 }}>
                SECURITY
              </Text>
            </View>
          </View>
          {sesion ? (
            <TouchableOpacity 
              style={styles.botonCerrarSesion} 
              onPress={() => {
                const nombreParaLogout = usuarioNombre || perfilUsuario?.nombre || (sesion === 'admin' ? 'Luis Martínez' : 'Joseph Silva');
                apiService.post('/logout', { nombre: nombreParaLogout }).catch(() => {});
                enviarNotificacionMovimiento('👋 Cierre de Sesión', `${nombreParaLogout} cerró sesión en el sistema.`, 'logout');
                setCarrito([]);
                setToken(null);
                setAuthToken(null);
                setUsuarioNombre('');
                setPerfilUsuario(null);
                setSesion(null);
              }}
            >
              <Text style={styles.botonCerrarSesionTexto}>Cerrar Sesión</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <TouchableOpacity
                style={[styles.botonAccesoHeader, { backgroundColor: '#ffffff', paddingHorizontal: 12 }]}
                onPress={() => setMostrarRastreador(true)}
              >
                <Text style={[styles.botonAccesoHeaderText, { color: '#6cc04a' }]}>🔍 Rastrear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.botonAccesoHeader, { paddingHorizontal: 14 }]} onPress={() => { setSesionPrevia(null); setSesion('auth'); }}>
                <Text style={styles.botonAccesoHeaderText}>Ingresar</Text>
              </TouchableOpacity>
            </View>
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
              style={[styles.fichaBoton, pestanaVendedor === 'ordenes_ventas' && styles.fichaBotonActiva]}
              onPress={() => setPestanaVendedor('ordenes_ventas')}
            >
              <Text style={[styles.fichaBotonTexto, pestanaVendedor === 'ordenes_ventas' && styles.fichaBotonTextoActiva]}>🏷️ Órdenes de Venta</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.fichaBoton, pestanaVendedor === 'configuracion' && styles.fichaBotonActiva]}
              onPress={() => { setPestanaVendedor('configuracion'); cargarPerfilUsuario(); }}
            >
              <Text style={[styles.fichaBotonTexto, pestanaVendedor === 'configuracion' && styles.fichaBotonTextoActiva]}>⚙️ Configuración</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* 1. Módulo del Carrito de Compras (Aparece al presionar Procesar Compra) */}
      {mostrarCarritoModal && !mostrarFormularioFacturacion && (
        <ScrollView style={[styles.checkoutOverlay, { backgroundColor: '#f3faef', paddingHorizontal: 16, paddingTop: 10 }]} contentContainerStyle={{ paddingBottom: 60 }}>
          <Text style={[styles.seccionTitulo, { fontSize: 24, color: '#6cc04a', marginBottom: 16, marginTop: 10, textAlign: 'center', fontWeight: '950' }]}>
            🛒 Módulo del Carrito de Compras
          </Text>

          <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 18, borderWidth: 2, borderColor: '#6cc04a', marginBottom: 20 }}>
            <Text style={{ color: '#f97316', fontSize: 18, fontWeight: '900', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#cfe3c6', paddingBottom: 6 }}>
              📦 Productos Seleccionados ({carrito.reduce((sum, item) => sum + item.cantidad, 0)})
            </Text>

            {carrito.map((item, idx) => (
              <View key={`cart-item-${item.id}-${idx}`} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e1eed9' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={{ color: '#1c2b22', fontSize: 16, fontWeight: '800' }} numberOfLines={2}>
                    {item.nombre}
                  </Text>
                  <Text style={{ color: '#6cc04a', fontSize: 14, fontWeight: '700', marginTop: 2 }}>
                    ₡{Number(item.precio || 0).toFixed(2)} c/u
                  </Text>
                </View>

                {/* Controles de Cantidad (+ / -) */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <TouchableOpacity
                    onPress={() => removerDelCarrito(item.id)}
                    style={{ backgroundColor: '#dc2626', width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#1c2b22', fontWeight: '900', fontSize: 20 }}>-</Text>
                  </TouchableOpacity>

                  <Text style={{ color: '#1c2b22', fontWeight: '900', fontSize: 16, minWidth: 24, textAlign: 'center' }}>
                    {item.cantidad}
                  </Text>

                  <TouchableOpacity
                    onPress={() => agregarAlCarrito(item)}
                    style={{ backgroundColor: '#16a34a', width: 34, height: 34, borderRadius: 8, justifyContent: 'center', alignItems: 'center' }}
                  >
                    <Text style={{ color: '#1c2b22', fontWeight: '900', fontSize: 20 }}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {/* Totales con IVA obligatorio (13%) */}
            <View style={{ marginTop: 16, paddingTop: 12, borderTopWidth: 2, borderTopColor: '#cfe3c6', gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#5b6b62', fontSize: 15, fontWeight: '700' }}>Subtotal Neto</Text>
                <Text style={{ color: '#2d3b33', fontSize: 16, fontWeight: '800' }}>₡{calcularSubtotal()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#f97316', fontSize: 15, fontWeight: '800' }}>IVA (13% Costa Rica)</Text>
                <Text style={{ color: '#f97316', fontSize: 16, fontWeight: '800' }}>₡{calcularIva()}</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e1eed9' }}>
                <Text style={{ color: '#6cc04a', fontSize: 18, fontWeight: '900' }}>Total (IVA Incluido)</Text>
                <Text style={{ color: '#22a34a', fontSize: 24, fontWeight: '950' }}>₡{calcularTotal()}</Text>
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
              style={[styles.botonCheckoutForm, styles.botonConfirmarCheckout, { flex: 1, paddingVertical: 14, backgroundColor: '#f97316' }]}
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
        <ScrollView style={[styles.checkoutOverlay, { backgroundColor: '#f3faef', paddingHorizontal: 16, paddingTop: 10 }]} contentContainerStyle={{ paddingBottom: 60 }}>
          
          <Text style={[styles.seccionTitulo, { fontSize: 24, color: '#6cc04a', marginBottom: 16, marginTop: 10, textAlign: 'center', fontWeight: '950' }]}>
            📝 Datos de Facturación y Registro
          </Text>

          <View style={[styles.formularioTarjeta, { backgroundColor: '#eef7ea', padding: 20, borderRadius: 14, borderWidth: 2, borderColor: '#6cc04a' }]}>
            <Text style={[styles.seccionTituloInterno, { fontSize: 15, color: '#f97316', fontWeight: '900', marginBottom: 20, lineHeight: 22 }]}>
              📋 Subtotal: ₡{calcularSubtotal()} + IVA (13%): ₡{calcularIva()} = Total Final: ₡{calcularTotal()}
            </Text>
            
            <Text style={[styles.formEtiqueta, { fontSize: 16, fontWeight: '900', color: '#6cc04a', marginBottom: 6 }]}>
              NOMBRE COMPLETO
            </Text>
            <TextInput
              style={[styles.formInput, { fontSize: 18, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#ffffff', borderColor: '#6cc04a', borderWidth: 2, color: '#1c2b22', marginBottom: 18 }]}
              placeholder="Escribe tu Nombre Completo"
              placeholderTextColor="#6b7c74"
              value={checkoutNombre}
              onChangeText={setCheckoutNombre}
            />

            <Text style={[styles.formEtiqueta, { fontSize: 16, fontWeight: '900', color: '#6cc04a', marginBottom: 6 }]}>
              CORREO ELECTRÓNICO
            </Text>
            <TextInput
              style={[styles.formInput, { fontSize: 18, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#ffffff', borderColor: '#6cc04a', borderWidth: 2, color: '#1c2b22', marginBottom: 18 }]}
              placeholder="ejemplo@correo.com"
              placeholderTextColor="#6b7c74"
              value={checkoutEmail}
              onChangeText={setCheckoutEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={[styles.formEtiqueta, { fontSize: 16, fontWeight: '900', color: '#6cc04a', marginBottom: 6 }]}>
              CÉDULA (FÍSICA O JURÍDICA DE CR)
            </Text>
            <TextInput
              style={[styles.formInput, { fontSize: 18, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#ffffff', borderColor: '#6cc04a', borderWidth: 2, color: '#1c2b22', marginBottom: 18 }]}
              placeholder="Ej: 1-1234-5678"
              placeholderTextColor="#6b7c74"
              value={checkoutCedula}
              onChangeText={setCheckoutCedula}
            />

            <Text style={[styles.formEtiqueta, { fontSize: 16, fontWeight: '900', color: '#6cc04a', marginBottom: 6 }]}>
              TELÉFONO DE CONTACTO
            </Text>
            <TextInput
              style={[styles.formInput, { fontSize: 18, fontWeight: '700', paddingVertical: 12, paddingHorizontal: 16, backgroundColor: '#ffffff', borderColor: '#6cc04a', borderWidth: 2, color: '#1c2b22', marginBottom: 24 }]}
              placeholder="Ej: 8888-8888"
              placeholderTextColor="#6b7c74"
              value={checkoutTelefono}
              onChangeText={setCheckoutTelefono}
              keyboardType="phone-pad"
            />

            <Text style={[styles.formEtiqueta, { fontSize: 14, fontWeight: '900', color: '#f97316', marginTop: 10, marginBottom: 8, textAlign: 'center' }]}>
              MÉTODO DE PAGO
            </Text>

            {/* Botón Principal: Pagar con Tilopay Sandbox */}
            <TouchableOpacity
              style={[styles.botonCheckoutForm, { backgroundColor: '#f97316', paddingVertical: 16, marginHorizontal: 0, marginBottom: 12, borderWidth: 1.5, borderColor: '#6cc04a' }]}
              onPress={procesarPagoTilopay}
            >
              <Text style={[styles.botonCheckoutFormTexto, { fontSize: 16, fontWeight: '900', color: '#1c2b22' }]}>
                💳 PAGAR CON TILOPAY (TARJETA / SANDBOX)
              </Text>
            </TouchableOpacity>

            <View style={styles.filaBotonesCheckout}>
              <TouchableOpacity
                style={[styles.botonCheckoutForm, styles.botonCancelarCheckout, { paddingVertical: 12 }]}
                onPress={() => setMostrarFormularioFacturacion(false)}
              >
                <Text style={[styles.botonCheckoutFormTexto, { fontSize: 14, fontWeight: '800' }]}>✕ Volver</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.botonCheckoutForm, styles.botonConfirmarCheckout, { paddingVertical: 12, backgroundColor: '#22a34a' }]}
                onPress={procesarCheckoutCliente}
              >
                <Text style={[styles.botonCheckoutFormTexto, { fontSize: 14, fontWeight: '800' }]}>📝 Pago en Efectivo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}

      {/* Menú Desplegable de Categorías con Ícono Hamburguesa ☰ */}
      {!mostrarCarritoModal && !mostrarFormularioFacturacion && sesion !== 'admin' && (sesion !== 'vendedor' || pestanaVendedor === 'pos') && (
        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6, backgroundColor: '#ffffff' }}>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#eef7ea',
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: '#6cc04a'
            }}
            onPress={() => setMostrarMenuCategorias(true)}
            activeOpacity={0.8}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={{ fontSize: 22, color: '#6cc04a', fontWeight: '900' }}>☰</Text>
              <View>
                <Text style={{ color: '#5b6b62', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 }}>FILTRAR POR CATEGORÍA</Text>
                <Text style={{ color: '#1c2b22', fontSize: 16, fontWeight: '900', marginTop: 1 }}>{categoriaSeleccionada}</Text>
              </View>
            </View>
            <View style={{ backgroundColor: '#ffffff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#6cc04a' }}>
              <Text style={{ color: '#6cc04a', fontSize: 13, fontWeight: '900' }}>Cambiar ▾</Text>
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
          <View style={[styles.modalDetalleContenido, { maxWidth: 480, maxHeight: '80%', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 2, borderColor: '#6cc04a', padding: 20 }]}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e1eed9', paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 22, color: '#6cc04a' }}>☰</Text>
                <Text style={{ fontSize: 18, fontWeight: '950', color: '#1c2b22' }}>Categorías de Productos</Text>
              </View>
              <TouchableOpacity onPress={() => setMostrarMenuCategorias(false)} style={styles.botonModalCerrarIcono}>
                <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 10 }}>
              {['Todas', ...(dbCategorias.length > 0 ? dbCategorias.map(c => c.descripcion) : CATEGORIAS.slice(1))].map((cat, idx) => {
                const estaActiva = categoriaSeleccionada === cat;
                return (
                  <TouchableOpacity
                    key={`cat-menu-${cat}-${idx}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: estaActiva ? '#ffedd5' : '#eef7ea',
                      borderRadius: 10,
                      marginBottom: 8,
                      borderWidth: 1.5,
                      borderColor: estaActiva ? '#6cc04a' : '#cfe3c6'
                    }}
                    onPress={() => {
                      setCategoriaSeleccionada(cat);
                      setMostrarMenuCategorias(false);
                    }}
                  >
                    <Text style={{ color: '#1c2b22', fontSize: 16, fontWeight: estaActiva ? '900' : '700' }}>
                      {cat}
                    </Text>
                    {estaActiva && (
                      <View style={{ backgroundColor: '#22a34a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: '#1c2b22', fontSize: 12, fontWeight: '900' }}>✓ Seleccionada</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Modal Desplegable Limpio para Formularios del Administrador */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalSelectorTarget !== null}
        onRequestClose={() => setModalSelectorTarget(null)}
      >
        <View style={styles.modalDetalleCentrado}>
          <View style={[styles.modalDetalleContenido, { maxWidth: 460, maxHeight: '80%', backgroundColor: '#ffffff', borderRadius: 16, borderWidth: 2, borderColor: '#6cc04a', padding: 20 }]}>
            
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#e1eed9', paddingBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20, color: '#6cc04a' }}>🏷️</Text>
                <Text style={{ fontSize: 18, fontWeight: '950', color: '#1c2b22' }}>Seleccionar Categoría</Text>
              </View>
              <TouchableOpacity onPress={() => setModalSelectorTarget(null)} style={styles.botonModalCerrarIcono}>
                <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 10 }}>
              {(modalSelectorTarget === 'reabastecer_filtro' || modalSelectorTarget === 'edit_filtro'
                ? [{ id: 'Todas', descripcion: 'Todas' }, ...dbCategorias]
                : dbCategorias
              ).map((cat, idx) => {
                const valorActual = 
                  modalSelectorTarget === 'reabastecer_filtro' ? filtroCategoriaReabastecer :
                  modalSelectorTarget === 'edit_filtro' ? filtroCategoriaEdit :
                  modalSelectorTarget === 'nuevo_form' ? nuevoCategoriaId :
                  editCategoriaId;

                const esActivo = (typeof cat.id === 'number' ? cat.id === valorActual : cat.descripcion === valorActual);

                return (
                  <TouchableOpacity
                    key={`mod-sel-${cat.id}-${idx}`}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      backgroundColor: esActivo ? '#ffedd5' : '#eef7ea',
                      borderRadius: 10,
                      marginBottom: 8,
                      borderWidth: 1.5,
                      borderColor: esActivo ? '#6cc04a' : '#cfe3c6'
                    }}
                    onPress={() => {
                      if (modalSelectorTarget === 'reabastecer_filtro') setFiltroCategoriaReabastecer(cat.descripcion);
                      else if (modalSelectorTarget === 'edit_filtro') setFiltroCategoriaEdit(cat.descripcion);
                      else if (modalSelectorTarget === 'nuevo_form') setNuevoCategoriaId(cat.id);
                      else if (modalSelectorTarget === 'edit_form') setEditCategoriaId(cat.id);
                      setModalSelectorTarget(null);
                    }}
                  >
                    <Text style={{ color: '#1c2b22', fontSize: 16, fontWeight: esActivo ? '900' : '700' }}>
                      {cat.descripcion}
                    </Text>
                    {esActivo && (
                      <View style={{ backgroundColor: '#22a34a', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ color: '#1c2b22', fontSize: 12, fontWeight: '900' }}>✓ Seleccionada</Text>
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
              <TouchableOpacity
                style={[styles.fichaBoton, pestanaAdmin === 'configuracion' && styles.fichaBotonActiva, { minWidth: 140 }]}
                onPress={() => { setPestanaAdmin('configuracion'); cargarPerfilUsuario(); }}
              >
                <Text style={[styles.fichaBotonTexto, pestanaAdmin === 'configuracion' && styles.fichaBotonTextoActiva]}>⚙️ Configuración</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {pestanaAdmin === 'tabla_ventas' && (
            <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10, width: '100%', maxWidth: 1300, alignSelf: 'center' }}>
              <Text style={[styles.seccionTitulo, { fontSize: 22, color: '#6cc04a', marginBottom: 16 }]}>
                📊 Tabla General de Ventas y Finanzas
              </Text>
              
              {/* Tarjetas de Resumen Estadístico Responsivas */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
                <View style={{ flex: 1, minWidth: 220, backgroundColor: '#eef7ea', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#22a34a' }}>
                  <Text style={{ color: '#5b6b62', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>INGRESOS TOTALES</Text>
                  <Text style={{ color: '#22a34a', fontSize: 20, fontWeight: '950', marginTop: 4 }}>
                    ₡{ordenesVenta.reduce((acc, o) => acc + (Number(o.total) || 0), 0).toFixed(2)}
                  </Text>
                </View>
                <View style={{ flex: 1, minWidth: 220, backgroundColor: '#eef7ea', borderRadius: 12, padding: 16, borderLeftWidth: 4, borderLeftColor: '#f97316' }}>
                  <Text style={{ color: '#5b6b62', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 }}>TOTAL DE VENTAS</Text>
                  <Text style={{ color: '#6cc04a', fontSize: 20, fontWeight: '950', marginTop: 4 }}>
                    {ordenesVenta.length} órdenes registradas
                  </Text>
                </View>
              </View>

              {/* Buscador de Tabla */}
              <TextInput
                style={[styles.formInput, { marginBottom: 16, fontSize: 15, paddingVertical: 12, backgroundColor: '#eef7ea', borderColor: '#cfe3c6' }]}
                placeholder="🔍 Buscar por ID de orden, cliente o estado..."
                placeholderTextColor="#5b6b62"
                value={filtroTablaVentas}
                onChangeText={setFiltroTablaVentas}
              />

              {/* Tabla Responsiva Dinámica */}
              <ScrollView horizontal showsHorizontalScrollIndicator={true} style={{ flex: 1, width: '100%' }} contentContainerStyle={{ flexGrow: 1 }}>
                <View style={{ flex: 1, minWidth: 720 }}>
                  {/* Encabezado de Tabla */}
                  <View style={{ flexDirection: 'row', backgroundColor: '#eef7ea', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: '#cfe3c6' }}>
                    <Text style={{ flex: 0.8, minWidth: 70, color: '#6cc04a', fontWeight: '900', fontSize: 13 }}>ID</Text>
                    <Text style={{ flex: 2, minWidth: 160, color: '#6cc04a', fontWeight: '900', fontSize: 13 }}>Cliente</Text>
                    <Text style={{ flex: 1.5, minWidth: 140, color: '#6cc04a', fontWeight: '900', fontSize: 13 }}>Fecha</Text>
                    <Text style={{ flex: 1.5, minWidth: 130, color: '#6cc04a', fontWeight: '900', fontSize: 13 }}>Monto Total</Text>
                    <Text style={{ flex: 1.5, minWidth: 130, color: '#6cc04a', fontWeight: '900', fontSize: 13 }}>Estado</Text>
                  </View>

                  {/* Filas de la Tabla sin restricción rígida de altura */}
                  <ScrollView showsVerticalScrollIndicator={true} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 60 }}>
                    {ordenesVenta
                      .filter(o => {
                        if (!filtroTablaVentas) return true;
                        const term = filtroTablaVentas.toLowerCase();
                        return (
                          o.id.toString().includes(term) ||
                          (o.cliente_nombre && o.cliente_nombre.toLowerCase().includes(term)) ||
                          (o.estado && o.estado.toLowerCase().includes(term))
                        );
                      })
                      .map((item, idx) => {
                        return (
                          <View key={`tbl-ord-${item.id}-${idx}`} style={{ flexDirection: 'row', backgroundColor: '#ffffff', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 8, marginBottom: 6, borderBottomWidth: 1, borderBottomColor: '#e1eed9', alignItems: 'center' }}>
                            <Text style={{ flex: 0.8, minWidth: 70, color: '#1c2b22', fontWeight: '900', fontSize: 14 }}>#{item.id}</Text>
                            <Text style={{ flex: 2, minWidth: 160, color: '#2d3b33', fontSize: 13, fontWeight: '700' }} numberOfLines={1}>
                              {item.cliente_nombre || 'Cliente General'}
                            </Text>
                            <Text style={{ flex: 1.5, minWidth: 140, color: '#5b6b62', fontSize: 12 }}>{item.fecha}</Text>
                            <Text style={{ flex: 1.5, minWidth: 130, color: '#22a34a', fontWeight: '900', fontSize: 14 }}>
                              ₡{Number(item.total || 0).toFixed(2)}
                            </Text>
                            <View style={{ flex: 1.5, minWidth: 130 }}>
                              <Text style={{
                                color: item.estado === 'Entregado' || item.estado === 'Completado' ? '#22a34a' : item.estado === 'Cancelado' ? '#ef4444' : '#eab308',
                                fontWeight: '800',
                                fontSize: 12,
                                backgroundColor: '#e1eed9',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 6,
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
                <Text style={styles.formEtiqueta}>Producto Seleccionado</Text>
                <Text style={[styles.nombreTexto, { color: reabastecerProductoNombre ? '#22a34a' : '#f87171', marginVertical: 6 }]}>
                  {reabastecerProductoNombre ? `ID ${reabastecerProductoId}: ${reabastecerProductoNombre}` : 'Ninguno (Selecciona un producto de la lista abajo)'}
                </Text>

                <Text style={styles.formEtiqueta}>Cantidad de Stock a Añadir</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 10"
                  placeholderTextColor="#5b6b62"
                  keyboardType="numeric"
                  value={reabastecerCantidad}
                  onChangeText={setReabastecerCantidad}
                />
                <TouchableOpacity 
                  style={[styles.botonAccionPrincipal, !reabastecerProductoId && { backgroundColor: '#6b7c74' }]} 
                  onPress={manejarReabastecimiento}
                  disabled={!reabastecerProductoId}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>Incrementar Stock</Text>
                </TouchableOpacity>
              </View>

              {/* Filtros de Búsqueda */}
              <Text style={styles.seccionTitulo}>Buscar Producto</Text>
              
              <Text style={styles.formEtiqueta}>Filtrar por Nombre</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Escribe el nombre a buscar..."
                placeholderTextColor="#5b6b62"
                value={filtroNombreReabastecer}
                onChangeText={setFiltroNombreReabastecer}
              />

              <Text style={styles.formEtiqueta}>Filtrar por Categoría</Text>
              <TouchableOpacity
                style={styles.dropdownSeleccionable}
                onPress={() => setModalSelectorTarget('reabastecer_filtro')}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#1c2b22', fontSize: 15, fontWeight: '800' }}>
                  {filtroCategoriaReabastecer}
                </Text>
                <Text style={{ color: '#6cc04a', fontSize: 13, fontWeight: '900' }}>Cambiar ▾</Text>
              </TouchableOpacity>

              {/* Inventario de Referencia Filtrado */}
              <Text style={styles.seccionTitulo}>Seleccionar Producto ({productosFiltradosReabastecer.length})</Text>
              {productosFiltradosReabastecer.map(p => {
                const seleccionado = reabastecerProductoId === p.id.toString();
                return (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[
                      styles.tarjetaProductoReferencia, 
                      seleccionado && { borderColor: '#22a34a', borderLeftColor: '#22a34a', borderWidth: 2 }
                    ]}
                    onPress={() => {
                      setReabastecerProductoId(p.id.toString());
                      setReabastecerProductoNombre(p.nombre);
                    }}
                  >
                    <Text style={styles.nombreTexto}>ID {p.id}: {p.nombre}</Text>
                    <Text style={[styles.stockTexto, { color: p.stock <= 0 ? '#f87171' : '#4ade80' }]}>
                      Stock Actual: {p.stock} uds ({p.categoria_nombre})
                    </Text>
                    {seleccionado && (
                      <Text style={{ color: '#22a34a', fontWeight: '800', fontSize: 11, marginTop: 4, textTransform: 'uppercase' }}>
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
                <Text style={styles.formEtiqueta}>Producto Seleccionado</Text>
                <Text style={[styles.nombreTexto, { color: editNombre ? '#22a34a' : '#f87171', marginVertical: 6 }]}>
                  {editNombre ? `ID ${editProductoId}: ${editNombre}` : 'Ninguno (Selecciona un producto de la lista abajo)'}
                </Text>

                {editProductoId ? (
                  <>
                    <Text style={styles.formEtiqueta}>Nombre del Producto</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: Nombre del artículo"
                      placeholderTextColor="#5b6b62"
                      value={editNombre}
                      onChangeText={setEditNombre}
                    />

                    <Text style={styles.formEtiqueta}>Descripción</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: Descripción detallada del producto"
                      placeholderTextColor="#5b6b62"
                      value={editDescripcion}
                      onChangeText={setEditDescripcion}
                    />

                    <Text style={styles.formEtiqueta}>Precio Costo (₡)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: 250000"
                      placeholderTextColor="#5b6b62"
                      keyboardType="numeric"
                      value={editCosto}
                      onChangeText={setEditCosto}
                    />

                    <Text style={styles.formEtiqueta}>Margen de Ganancia (₡)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: 50000"
                      placeholderTextColor="#5b6b62"
                      keyboardType="numeric"
                      value={editGanancia}
                      onChangeText={setEditGanancia}
                    />

                    <Text style={styles.formEtiqueta}>Categoría</Text>
                    <TouchableOpacity
                      style={styles.dropdownSeleccionable}
                      onPress={() => setModalSelectorTarget('edit_form')}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#1c2b22', fontSize: 15, fontWeight: '800' }}>
                        {dbCategorias.find(c => c.id === editCategoriaId)?.descripcion || 'Seleccionar Categoría...'}
                      </Text>
                      <Text style={{ color: '#6cc04a', fontSize: 13, fontWeight: '900' }}>Cambiar ▾</Text>
                    </TouchableOpacity>

                    <Text style={styles.formEtiqueta}>URL de la Imagen</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="https://ejemplo.com/imagen.png"
                      placeholderTextColor="#5b6b62"
                      value={editImagen}
                      onChangeText={setEditImagen}
                      autoCapitalize="none"
                    />

                    <Text style={styles.formEtiqueta}>Descuento (%)</Text>
                    <TextInput
                      style={styles.formInput}
                      placeholder="Ej: 10 (para 10% de descuento)"
                      placeholderTextColor="#5b6b62"
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
              <Text style={styles.seccionTitulo}>Buscar Producto para Editar</Text>
              
              <Text style={styles.formEtiqueta}>Filtrar por Nombre</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Escribe el nombre a buscar..."
                placeholderTextColor="#5b6b62"
                value={filtroNombreEdit}
                onChangeText={setFiltroNombreEdit}
              />

              <Text style={styles.formEtiqueta}>Filtrar por Categoría</Text>
              <TouchableOpacity
                style={styles.dropdownSeleccionable}
                onPress={() => setModalSelectorTarget('edit_filtro')}
                activeOpacity={0.8}
              >
                <Text style={{ color: '#1c2b22', fontSize: 15, fontWeight: '800' }}>
                  {filtroCategoriaEdit}
                </Text>
                <Text style={{ color: '#6cc04a', fontSize: 13, fontWeight: '900' }}>Cambiar ▾</Text>
              </TouchableOpacity>

              {/* Lista de Productos para Editar */}
              <Text style={styles.seccionTitulo}>Seleccionar Producto ({productosFiltradosEdit.length})</Text>
              {productosFiltradosEdit.map(p => {
                const seleccionado = editProductoId === p.id.toString();
                return (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[
                      styles.tarjetaProductoReferencia, 
                      seleccionado && { borderColor: '#22a34a', borderLeftColor: '#22a34a', borderWidth: 2 }
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
                      <Text style={{ color: '#22a34a', fontWeight: '800', fontSize: 11, marginTop: 4, textTransform: 'uppercase' }}>
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
                <Text style={styles.formEtiqueta}>Nombre del Producto</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Nombre del artículo"
                  placeholderTextColor="#5b6b62"
                  value={nuevoNombre}
                  onChangeText={setNuevoNombre}
                />
                <Text style={styles.formEtiqueta}>Descripción</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Descripción detallada del producto"
                  placeholderTextColor="#5b6b62"
                  value={nuevoDescripcion}
                  onChangeText={setNuevoDescripcion}
                />
                <Text style={styles.formEtiqueta}>Stock Inicial</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 10"
                  placeholderTextColor="#5b6b62"
                  keyboardType="numeric"
                  value={nuevoStock}
                  onChangeText={setNuevoStock}
                />
                <Text style={styles.formEtiqueta}>Precio Costo (₡)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 250000"
                  placeholderTextColor="#5b6b62"
                  keyboardType="numeric"
                  value={nuevoCosto}
                  onChangeText={setNuevoCosto}
                />
                <Text style={styles.formEtiqueta}>Margen de Ganancia (₡)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 50000"
                  placeholderTextColor="#5b6b62"
                  keyboardType="numeric"
                  value={nuevoGanancia}
                  onChangeText={setNuevoGanancia}
                />
                <Text style={styles.formEtiqueta}>Seleccionar Categoría</Text>
                <TouchableOpacity
                  style={styles.dropdownSeleccionable}
                  onPress={() => setModalSelectorTarget('nuevo_form')}
                  activeOpacity={0.8}
                >
                  <Text style={{ color: '#1c2b22', fontSize: 15, fontWeight: '800' }}>
                    {dbCategorias.find(c => c.id === nuevoCategoriaId)?.descripcion || 'Seleccionar Categoría...'}
                  </Text>
                  <Text style={{ color: '#6cc04a', fontSize: 13, fontWeight: '900' }}>Cambiar ▾</Text>
                </TouchableOpacity>

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
                      placeholder="Ej: Nueva Categoría"
                      placeholderTextColor="#5b6b62"
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
                  placeholderTextColor="#5b6b62"
                  value={nuevoImagen}
                  onChangeText={setNuevoImagen}
                  autoCapitalize="none"
                />

                <Text style={styles.formEtiqueta}>Descuento (%)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 10 (para 10% de descuento)"
                  placeholderTextColor="#5b6b62"
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
                <Text style={styles.formEtiqueta}>Nombre Completo de la Persona</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: Carlos Mendoza"
                  placeholderTextColor="#5b6b62"
                  value={empNombre}
                  onChangeText={setEmpNombre}
                />
                <Text style={styles.formEtiqueta}>Correo Electrónico de Empleado</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="empleado@hardwarestore.com"
                  placeholderTextColor="#5b6b62"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={empEmail}
                  onChangeText={setEmpEmail}
                />
                <Text style={styles.formEtiqueta}>Contraseña</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="••••••••"
                  placeholderTextColor="#5b6b62"
                  secureTextEntry={true}
                  value={empPassword}
                  onChangeText={setEmpPassword}
                />
                <Text style={styles.formEtiqueta}>Rol ID (1: Admin, 2: Vendedor)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Ej: 2"
                  placeholderTextColor="#5b6b62"
                  keyboardType="numeric"
                  value={empRolId}
                  onChangeText={setEmpRolId}
                />
                <Text style={styles.formEtiqueta}>🔐 Pregunta de Seguridad</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                  {PREGUNTAS_SEGURIDAD.map((p) => (
                    <TouchableOpacity
                      key={`preg-${p}`}
                      onPress={() => setEmpPregunta(p)}
                      style={{ paddingVertical: 6, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1.5, borderColor: empPregunta === p ? '#f97316' : '#cfe3c6', backgroundColor: empPregunta === p ? '#ffedd5' : '#ffffff' }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1c2b22' }}>{p}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.formEtiqueta}>Respuesta de Seguridad</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Respuesta (no importan mayúsculas ni tildes)"
                  placeholderTextColor="#5b6b62"
                  autoCapitalize="none"
                  autoCorrect={false}
                  value={empRespuesta}
                  onChangeText={setEmpRespuesta}
                />
                <TouchableOpacity style={styles.botonAccionPrincipal} onPress={manejarRegistroEmpleado}>
                  <Text style={styles.botonAccionPrincipalTexto}>Registrar Empleado</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {pestanaAdmin === 'configuracion' && renderModuloConfiguracion()}
        </View>
      ) : sesion === 'vendedor' && pestanaVendedor === 'configuracion' ? (
        <View style={styles.contenedorAdminPanel}>
          {renderModuloConfiguracion()}
        </View>
      ) : sesion === 'vendedor' && pestanaVendedor === 'ordenes_ventas' ? (
        <View style={styles.contenedorAdminPanel}>
          <Text style={[styles.seccionTitulo, { marginHorizontal: 16, marginTop: 10 }]}>
            🏷️ Módulo de Órdenes de Venta
          </Text>

          <FlatList
            data={ordenesVenta}
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
              <ActivityIndicator size="large" color="#ffedd5" />
              <Text style={styles.cargandoTexto}>Consultando catálogo de productos...</Text>
            </View>
          ) : (
            <FlatList
              key={`catalog-grid-${numColumns}`}
              data={productosFiltrados}
              renderItem={renderProducto}
              keyExtractor={item => item.id.toString()}
              numColumns={numColumns}
              contentContainerStyle={[styles.listaProductos, { maxWidth: 1300, width: '100%', alignSelf: 'center', paddingHorizontal: 16 }]}
              columnWrapperStyle={numColumns > 1 ? { justifyContent: 'flex-start', gap: 14 } : undefined}
              showsVerticalScrollIndicator={false}
            />
          )
        )
      )}

      {/* Módulo flotante inferior para el carrito de compras - Botón compacto directo al carrito */}
      {!mostrarCarritoModal && !mostrarFormularioFacturacion && sesion !== 'admin' && (sesion !== 'vendedor' || pestanaVendedor === 'pos') && carrito.length > 0 && (
        <View style={[styles.carritoFlotante, { padding: 12 }]}>
          <TouchableOpacity onPress={procesarCompra} style={[styles.botonProcesarVenta, { backgroundColor: '#22a34a', paddingVertical: 14 }]}>
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

                {/* Frame Exhibidor de Imagen del Producto */}
                <View style={styles.modalContenedorImagenFrame}>
                  <Image
                    source={
                      (productoSeleccionadoDetalle.imagen && productoSeleccionadoDetalle.imagen.trim() !== '')
                        ? { uri: productoSeleccionadoDetalle.imagen }
                        : (IMAGENES_PRODUCTOS[productoSeleccionadoDetalle.id] || IMAGEN_DEFAULT)
                    }
                    style={styles.modalDetalleImagen}
                    {...(Platform.OS === 'web' ? { referrerPolicy: 'no-referrer' } : {})}
                  />
                </View>

                {/* Info del Producto */}
                <Text style={styles.modalDetalleTitulo}>{productoSeleccionadoDetalle.nombre}</Text>
                
                <Text style={styles.subFormEtiqueta}>DESCRIPCIÓN DEL PRODUCTO</Text>
                <View style={styles.modalContenedorDescripcion}>
                  <Text style={styles.modalDetalleDescripcion}>{productoSeleccionadoDetalle.descripcion}</Text>
                </View>

                <View style={styles.modalDetalleFilaInfo}>
                  <View>
                    <Text style={styles.formEtiqueta}>Precio</Text>
                    {productoSeleccionadoDetalle.descuento_porcentaje > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                        <Text style={{ color: '#ef4444', textDecorationLine: 'line-through', fontSize: 13, marginRight: 6 }}>
                          ₡{Number(productoSeleccionadoDetalle.precio_base || (productoSeleccionadoDetalle.precio / (1 - productoSeleccionadoDetalle.descuento_porcentaje / 100))).toFixed(2)}
                        </Text>
                        <View style={{ backgroundColor: '#b91c1c', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: '#1c2b22', fontSize: 9, fontWeight: '900' }}>
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
                      { marginTop: 24, backgroundColor: '#22a34a' },
                      productoSeleccionadoDetalle.stock <= 0 && { backgroundColor: '#b9d4ae' }
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
                  style={[styles.botonAccionPrincipal, { marginTop: 10, backgroundColor: '#cfe3c6' }]}
                  onPress={() => setProductoSeleccionadoDetalle(null)}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>Volver al Catálogo</Text>
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>


      {/* Modal de Detalle Completo de la Orden */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={ordenSeleccionadaDetalle !== null}
        onRequestClose={() => setOrdenSeleccionadaDetalle(null)}
      >
        <View style={styles.modalDetalleCentrado}>
          <View style={[styles.modalDetalleContenido, { maxWidth: 550, maxHeight: '90%' }]}>
            {ordenSeleccionadaDetalle && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Header */}
                <View style={styles.modalDetalleHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={[styles.nombreTexto, { color: '#6cc04a', fontSize: 20, fontWeight: '950' }]}>
                      Orden #{ordenSeleccionadaDetalle.id}
                    </Text>
                    <View style={{ backgroundColor: '#22a34a20', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: '#22a34a' }}>
                      <Text style={{ color: '#22a34a', fontSize: 11, fontWeight: '900' }}>
                        {(ordenSeleccionadaDetalle.estado || 'Pendiente').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setOrdenSeleccionadaDetalle(null)} style={styles.botonModalCerrarIcono}>
                    <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.subFormEtiqueta}>DATOS DEL CLIENTE</Text>
                <View style={[styles.subFormularioTarjeta, { marginBottom: 16, backgroundColor: '#ffffff' }]}>
                  <Text style={{ color: '#1c2b22', fontSize: 15, fontWeight: '800' }}>
                    👤 {ordenSeleccionadaDetalle.cliente_nombre || 'Cliente General'}
                  </Text>
                  <Text style={{ color: '#5b6b62', fontSize: 13, marginTop: 2 }}>
                    ✉️ {ordenSeleccionadaDetalle.cliente_correo || 'Sin correo'} | 📞 {ordenSeleccionadaDetalle.cliente_telefono || 'N/A'}
                  </Text>
                  <Text style={{ color: '#6b7c74', fontSize: 12, marginTop: 4 }}>
                    📅 Fecha: {ordenSeleccionadaDetalle.fecha || 'N/A'}
                  </Text>
                </View>

                {/* Desglose de Productos */}
                <Text style={styles.subFormEtiqueta}>DESGLOSE DE PRODUCTOS</Text>
                <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#eef7ea', marginBottom: 16 }}>
                  {(ordenSeleccionadaDetalle.descripcion || 'Sin ítems registrados')
                    .split(', ')
                    .filter(Boolean)
                    .map((prodItem, idx) => (
                      <View key={`item-det-${idx}`} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: idx < ordenSeleccionadaDetalle.descripcion.split(', ').length - 1 ? 1 : 0, borderBottomColor: '#e1eed9' }}>
                        <View style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: '#eef7ea', justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1, borderColor: '#cfe3c6' }}>
                          <Text style={{ fontSize: 16 }}>📦</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: '#1c2b22', fontSize: 14, fontWeight: '800' }}>
                            {prodItem}
                          </Text>
                          <Text style={{ color: '#6cc04a', fontSize: 12, fontWeight: '700', marginTop: 2 }}>
                            ✓ Producto Confirmado
                          </Text>
                        </View>
                      </View>
                    ))}
                </View>

                {/* Totales Financieros */}
                <View style={{ backgroundColor: '#ffffff', borderRadius: 12, padding: 16, borderWidth: 1.5, borderColor: '#6cc04a', marginBottom: 20 }}>
                  {(() => {
                    const totalMonto = Number(ordenSeleccionadaDetalle.total || 0);
                    const subtotalNeto = totalMonto / 1.13;
                    const ivaMonto = totalMonto - subtotalNeto;

                    return (
                      <View style={{ gap: 6 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#5b6b62', fontSize: 13 }}>Subtotal Neto:</Text>
                          <Text style={{ color: '#2d3b33', fontSize: 14, fontWeight: '800' }}>₡{subtotalNeto.toFixed(2)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ color: '#f97316', fontSize: 13, fontWeight: '800' }}>IVA Obligatorio (13%):</Text>
                          <Text style={{ color: '#f97316', fontSize: 14, fontWeight: '800' }}>₡{ivaMonto.toFixed(2)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e1eed9' }}>
                          <Text style={{ color: '#6cc04a', fontSize: 16, fontWeight: '900' }}>Total Orden:</Text>
                          <Text style={{ color: '#22a34a', fontSize: 22, fontWeight: '950' }}>₡{totalMonto.toFixed(2)}</Text>
                        </View>
                      </View>
                    );
                  })()}
                </View>

                <TouchableOpacity
                  style={[styles.botonAccionPrincipal, { backgroundColor: '#b9d4ae', marginBottom: 10 }]}
                  onPress={() => generarFacturaPDF(ordenSeleccionadaDetalle)}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>📄 Generar Factura PDF</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.botonAccionPrincipal, { backgroundColor: '#cfe3c6' }]}
                  onPress={() => setOrdenSeleccionadaDetalle(null)}
                >
                  <Text style={styles.botonAccionPrincipalTexto}>Cerrar Ventana</Text>
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
                placeholderTextColor="#5b6b62"
                keyboardType="numeric"
                value={rastrearCodigo}
                onChangeText={setRastrearCodigo}
              />

              <TouchableOpacity style={[styles.botonAccionPrincipal, { backgroundColor: '#f97316', marginBottom: 16 }]} onPress={ejecutarRastreo}>
                <Text style={styles.botonAccionPrincipalTexto}>Buscar Estado</Text>
              </TouchableOpacity>

              {rastreoVenta ? (
                <View style={{ marginTop: 10 }}>
                  <Text style={[styles.nombreTexto, { color: '#6cc04a', fontSize: 22, fontWeight: '950', marginBottom: 8 }]}>
                    Orden #{rastreoVenta.id}
                  </Text>
                  
                  <Text style={styles.descripcionTexto}>Fecha: {rastreoVenta.fecha}</Text>
                  <Text style={styles.descripcionTexto}>Cliente: {rastreoVenta.cliente_nombre}</Text>
                  <Text style={styles.descripcionTexto}>Productos: {rastreoVenta.descripcion}</Text>
                  <Text style={[styles.nombreTexto, { color: '#22a34a', marginVertical: 8 }]}>
                    Total: ₡{Number(rastreoVenta.total || 0).toFixed(2)}
                  </Text>

                  {/* Estado Visual de la Orden */}
                  <Text style={[styles.formEtiqueta, { marginTop: 12 }]}>Estado actual: {rastreoVenta.estado ? rastreoVenta.estado.toUpperCase() : 'PENDIENTE'}</Text>
                  
                  {rastreoVenta.estado === 'Cancelado' ? (
                    <View style={{ backgroundColor: '#7f1d1d', padding: 12, borderRadius: 8, marginTop: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#f87171', fontWeight: '900', fontSize: 13 }}>✕ PEDIDO CANCELADO</Text>
                    </View>
                  ) : (
                    <View style={{ marginTop: 12, paddingVertical: 15, paddingHorizontal: 10, backgroundColor: '#f3faef', borderRadius: 10, borderWidth: 1, borderColor: '#e1eed9' }}>
                      {/* Línea de Progreso Horizontal */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', position: 'relative' }}>
                        
                        {/* Estado 1: Pendiente */}
                        <View style={{ alignItems: 'center', flex: 1 }}>
                          <View style={{
                            width: 24, height: 24, borderRadius: 12, 
                            backgroundColor: '#22a34a', 
                            justifyContent: 'center', alignItems: 'center'
                          }}>
                            <Text style={{ color: '#1c2b22', fontSize: 10, fontWeight: 'bold' }}>1</Text>
                          </View>
                          <Text style={{ color: '#5b6b62', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Pendiente</Text>
                        </View>

                        {/* Estado 2: Listo para Retirar */}
                        <View style={{ alignItems: 'center', flex: 1 }}>
                          <View style={{
                            width: 24, height: 24, borderRadius: 12, 
                            backgroundColor: (rastreoVenta.estado === 'Listo para Retirar' || rastreoVenta.estado === 'Entregado' || rastreoVenta.estado === 'Completado') ? '#22a34a' : '#cfe3c6', 
                            justifyContent: 'center', alignItems: 'center'
                          }}>
                            <Text style={{ color: '#1c2b22', fontSize: 10, fontWeight: 'bold' }}>2</Text>
                          </View>
                          <Text style={{ color: '#5b6b62', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Listo Retiro</Text>
                        </View>

                        {/* Estado 3: Entregado */}
                        <View style={{ alignItems: 'center', flex: 1 }}>
                          <View style={{
                            width: 24, height: 24, borderRadius: 12, 
                            backgroundColor: (rastreoVenta.estado === 'Entregado' || rastreoVenta.estado === 'Completado') ? '#22a34a' : '#cfe3c6', 
                            justifyContent: 'center', alignItems: 'center'
                          }}>
                            <Text style={{ color: '#1c2b22', fontSize: 10, fontWeight: 'bold' }}>3</Text>
                          </View>
                          <Text style={{ color: '#5b6b62', fontSize: 9, marginTop: 4, textAlign: 'center' }}>Entregado</Text>
                        </View>

                      </View>
                    </View>
                  )}
                </View>
              ) : (
                <Text style={{ color: '#5b6b62', fontSize: 12, textAlign: 'center', marginTop: 20 }}>
                  Ingresa tu número de orden arriba para ver el estado de tu pedido en vivo.
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>


      {/* Pantalla Independiente de Pago Tilopay (WebView Sandbox) */}
      <PantallaPagoTilopay
        visible={mostrarTilopayModal}
        paymentData={datosPagoTilopay}
        onSuccess={manejarExitoTilopay}
        onCancel={manejarCancelarTilopay}
        onError={manejarErrorTilopay}
      />

      {/* Modal de Configuración de Google Authenticator (2FA) */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modal2FAVisible}
        onRequestClose={() => setModal2FAVisible(false)}
      >
        <View style={styles.modalDetalleCentrado}>
          <View style={[styles.modalDetalleContenido, { maxWidth: 440, padding: 22 }]}>
            <View style={styles.modalDetalleHeader}>
              <Text style={[styles.seccionTituloInterno, { marginBottom: 0, fontSize: 16, textAlign: 'left' }]}>
                🛡️ Google Authenticator (2FA)
              </Text>
              <TouchableOpacity onPress={() => setModal2FAVisible(false)} style={styles.botonModalCerrarIcono}>
                <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 10 }}>
              {estado2FAUsuario ? (
                <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ fontSize: 48, marginBottom: 10 }}>✅</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#16a34a', textAlign: 'center' }}>
                    Tu cuenta tiene 2FA activado
                  </Text>
                  <Text style={{ color: '#475569', fontSize: 13, textAlign: 'center', marginTop: 8, marginBottom: 20 }}>
                    Google Authenticator está vinculado y protegiendo tus inicios de sesión y recuperaciones de cuenta.
                  </Text>
                  <TouchableOpacity
                    style={[styles.botonAccionPrincipal, { backgroundColor: '#ef4444', width: '100%' }]}
                    onPress={() => {
                      setClaveODesactivar2FA('');
                      setModalDesactivar2FAVisible(true);
                    }}
                    disabled={cargando2FA}
                  >
                    <Text style={[styles.botonAccionPrincipalTexto, { color: '#ffffff' }]}>
                      {cargando2FA ? 'Procesando...' : 'Desactivar 2FA'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View>
                  <Text style={{ color: '#334155', fontSize: 13, lineHeight: 18, marginBottom: 10 }}>
                    1. Abre tu aplicación <Text style={{ fontWeight: '800' }}>Google Authenticator</Text> en tu teléfono.
                  </Text>
                  <Text style={{ color: '#334155', fontSize: 13, lineHeight: 18, marginBottom: 10 }}>
                    2. Toca el botón <Text style={{ fontWeight: '800' }}>"+"</Text> y escanea este código QR:
                  </Text>

                  {datosConfiguracion2FA?.qrDataUrl ? (
                    <View style={{ alignItems: 'center', marginVertical: 8, backgroundColor: '#ffffff', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0', alignSelf: 'center' }}>
                      <Image
                        source={{ uri: datosConfiguracion2FA.qrDataUrl }}
                        style={{ width: 180, height: 180 }}
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <ActivityIndicator size="large" color="#22a34a" style={{ marginVertical: 20 }} />
                  )}

                  <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 4 }}>
                    O introduce esta clave manual si no puedes escanear:
                  </Text>
                  <View style={{ backgroundColor: '#f1f5f9', padding: 8, borderRadius: 8, marginVertical: 6, alignItems: 'center' }}>
                    <Text selectable style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontSize: 13, fontWeight: '800', color: '#0f172a' }}>
                      {datosConfiguracion2FA?.secret || 'Generando clave...'}
                    </Text>
                  </View>

                  <Text style={{ color: '#334155', fontSize: 13, lineHeight: 18, marginTop: 12, marginBottom: 8 }}>
                    3. Ingresa el código de 6 dígitos que muestra tu app para confirmar la vinculación:
                  </Text>

                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        textAlign: 'center',
                        fontSize: 22,
                        fontWeight: '900',
                        letterSpacing: 8,
                        marginBottom: 14,
                        color: '#0f172a',
                      },
                    ]}
                    placeholder="000000"
                    placeholderTextColor="#94a3b8"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={codigoActivacion2FA}
                    onChangeText={(txt) => setCodigoActivacion2FA(txt.replace(/[^0-9]/g, '').slice(0, 6))}
                  />

                  <TouchableOpacity
                    style={[
                      styles.botonAccionPrincipal,
                      codigoActivacion2FA.length !== 6 && { backgroundColor: '#94a3b8' },
                    ]}
                    onPress={confirmarActivar2FA}
                    disabled={cargando2FA || codigoActivacion2FA.length !== 6}
                  >
                    <Text style={styles.botonAccionPrincipalTexto}>
                      {cargando2FA ? 'Verificando...' : 'Confirmar y Activar 2FA'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={{ marginTop: 14, alignItems: 'center' }}
                    onPress={() => abrirModal2FA(true)}
                    disabled={cargando2FA}
                  >
                    <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '700' }}>
                      🔄 ¿No funciona el código? Generar nuevo código QR
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Modal para Desactivar 2FA ingresando Contraseña o Código */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalDesactivar2FAVisible}
        onRequestClose={() => setModalDesactivar2FAVisible(false)}
      >
        <View style={styles.modalDetalleCentrado}>
          <View style={[styles.modalDetalleContenido, { maxWidth: 400, padding: 22 }]}>
            <View style={styles.modalDetalleHeader}>
              <Text style={[styles.seccionTituloInterno, { marginBottom: 0, fontSize: 16, textAlign: 'left', color: '#be123c' }]}>
                🔒 Desactivar 2FA
              </Text>
              <TouchableOpacity onPress={() => setModalDesactivar2FAVisible(false)} style={styles.botonModalCerrarIcono}>
                <Text style={styles.botonModalCerrarIconoTexto}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={{ color: '#475569', fontSize: 13, lineHeight: 18, marginVertical: 12 }}>
              Para confirmar que eres el dueño de la cuenta, ingresa tu <Text style={{ fontWeight: '700' }}>contraseña actual</Text> o el <Text style={{ fontWeight: '700' }}>código de 6 dígitos</Text> de Google Authenticator:
            </Text>

            <TextInput
              style={styles.formInput}
              placeholder="Contraseña o código de 6 dígitos"
              placeholderTextColor="#94a3b8"
              secureTextEntry={claveODesactivar2FA.length !== 6}
              value={claveODesactivar2FA}
              onChangeText={setClaveODesactivar2FA}
              autoFocus={true}
            />

            <TouchableOpacity
              style={[
                styles.botonAccionPrincipal,
                { backgroundColor: '#ef4444', marginTop: 4 },
                !claveODesactivar2FA.trim() && { backgroundColor: '#94a3b8' },
              ]}
              onPress={() => desactivar2FA(claveODesactivar2FA)}
              disabled={cargando2FA || !claveODesactivar2FA.trim()}
            >
              <Text style={[styles.botonAccionPrincipalTexto, { color: '#ffffff' }]}>
                {cargando2FA ? 'Procesando...' : 'Confirmar y Desactivar 2FA'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 12, alignItems: 'center' }}
              onPress={() => setModalDesactivar2FAVisible(false)}
            >
              <Text style={{ color: '#64748b', fontSize: 12, textDecorationLine: 'underline' }}>
                Cancelar
              </Text>
            </TouchableOpacity>
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
    backgroundColor: '#f3faef',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    backgroundColor: '#6cc04a',
    borderBottomWidth: 4,
    borderBottomColor: '#f97316',
  },
  headerFilaSuperior: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitulo: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    flex: 1,
    marginRight: 10,
  },
  botonAccesoHeader: {
    backgroundColor: '#f97316',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  botonAccesoHeaderText: {
    color: '#1c2b22',
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
    color: '#1c2b22',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  headerSubtitulo: {
    fontSize: 13,
    color: '#f0fbe9',
    marginTop: 8,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  contenedorCategorias: {
    backgroundColor: '#ffffff',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e1eed9',
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
    backgroundColor: '#f97316',
    borderColor: '#fb923c',
  },
  botonCategoriaInactivo: {
    backgroundColor: '#e1eed9',
    borderColor: '#cfe3c6',
  },
  textoCategoria: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  textoCategoriaActivo: {
    color: '#1c2b22',
  },
  textoCategoriaInactivo: {
    color: '#5b6b62',
  },
  contenedorFichas: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1.5,
    borderBottomColor: '#e1eed9',
  },
  fichaBoton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  fichaBotonActiva: {
    borderBottomWidth: 3.5,
    borderBottomColor: '#f97316',
  },
  fichaBotonTexto: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5b6b62',
    letterSpacing: 0.5,
  },
  fichaBotonTextoActiva: {
    color: '#f97316',
  },
  cuerpoFormularios: {
    padding: 20,
    backgroundColor: '#f3faef',
  },
  formularioTarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1.5,
    borderColor: '#d6ebcc',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  seccionTituloInterno: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1c2b22',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formEtiqueta: {
    fontSize: 12,
    fontWeight: '800',
    color: '#6cc04a',
    marginBottom: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  formInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cfe3c6',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 20,
    fontSize: 15,
    color: '#1c2b22',
  },
  dropdownSeleccionable: {
    backgroundColor: '#eef7ea',
    borderWidth: 1.5,
    borderColor: '#6cc04a',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  botonAccionPrincipal: {
    backgroundColor: '#f97316',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 6,
  },
  botonAccionPrincipalTexto: {
    color: '#1c2b22',
    fontWeight: '800',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  cargandoContenedor: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f3faef',
  },
  cargandoTexto: {
    marginTop: 14,
    color: '#5b6b62',
    fontSize: 15,
    fontWeight: '600',
  },
  listaProductos: {
    padding: 16,
    paddingBottom: 220,
    backgroundColor: '#f3faef',
  },
  contenedorAdminPanel: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f3faef',
    width: '100%',
    maxWidth: 1300,
    alignSelf: 'center',
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1c2b22',
    marginVertical: 16,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tarjetaProductoGrid: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#d6ebcc',
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
    minWidth: 260,
  },
  imagenProductoGrid: {
    width: '100%',
    height: 190,
    backgroundColor: '#ffffff',
    resizeMode: 'cover',
  },
  tarjetaProducto: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#d6ebcc',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  imagenProducto: {
    width: 84,
    height: 84,
    borderRadius: 14,
    marginRight: 14,
    backgroundColor: '#ffffff',
    resizeMode: 'cover',
    borderWidth: 1.5,
    borderColor: '#cfe3c6',
    overflow: 'hidden',
  },
  infoTarjeta: {
    flex: 1,
    marginRight: 14,
  },
  categoriaTexto: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6cc04a',
    textTransform: 'uppercase',
    marginBottom: 4,
    letterSpacing: 1,
  },
  nombreTexto: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1c2b22',
    letterSpacing: 0.3,
  },
  descripcionTexto: {
    fontSize: 13,
    color: '#5b6b62',
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
    color: '#22a34a',
    marginRight: 14,
    letterSpacing: 0.5,
  },
  stockTexto: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#5b6b62',
  },
  stockDisponible: {
    color: '#4ade80',
  },
  stockAgotado: {
    color: '#f87171',
  },
  botonAgregar: {
    backgroundColor: '#f97316',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    shadowColor: '#f97316',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  botonAgregarDeshabilitado: {
    backgroundColor: '#cfe3c6',
  },
  botonAgregarTexto: {
    color: '#1c2b22',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.5,
  },
  tarjetaOrden: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#d6ebcc',
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  ordenIdTexto: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1c2b22',
    letterSpacing: 0.5,
  },
  ordenDetalleTexto: {
    fontSize: 13,
    color: '#5b6b62',
    marginTop: 4,
  },
  ordenTotalTexto: {
    fontSize: 16,
    fontWeight: '900',
    color: '#22a34a',
    marginTop: 6,
    letterSpacing: 0.5,
  },
  tarjetaProductoReferencia: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 5,
    borderLeftColor: '#f97316',
    borderWidth: 1,
    borderColor: '#d6ebcc',
  },
  carritoFlotante: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#e1eed9',
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
    color: '#5b6b62',
    letterSpacing: 0.5,
  },
  carritoMontoTotal: {
    fontSize: 20,
    fontWeight: '900',
    color: '#22a34a',
    letterSpacing: 0.5,
  },
  miniCarritoLista: {
    maxHeight: 100,
    marginBottom: 14,
    borderTopWidth: 1.5,
    borderTopColor: '#e1eed9',
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
    color: '#3f4f46',
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
    color: '#1c2b22',
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
    color: '#1c2b22',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 1,
  },
  checkoutOverlay: {
    padding: 20,
    backgroundColor: '#f3faef',
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
    backgroundColor: '#cfe3c6',
    shadowColor: '#cfe3c6',
  },
  botonConfirmarCheckout: {
    backgroundColor: '#22a34a',
    shadowColor: '#22a34a',
  },
  botonCheckoutFormTexto: {
    color: '#1c2b22',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
  contenedorFichasVendedor: {
    flexDirection: 'row',
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e1eed9',
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
    color: '#4ade80',
  },
  estadoCancelado: {
    backgroundColor: '#7f1d1d',
    color: '#f87171',
  },
  estadoPendiente: {
    backgroundColor: '#78350f',
    color: '#f97316',
  },
  filaAccionesOrden: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: '#e1eed9',
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
    backgroundColor: '#22a34a',
    shadowColor: '#22a34a',
  },
  botonAccionOrdenCancelar: {
    backgroundColor: '#ef4444',
    shadowColor: '#ef4444',
  },
  botonAccionOrdenTexto: {
    color: '#1c2b22',
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
    backgroundColor: '#f97316',
    borderColor: '#fb923c',
  },
  botonCategoriaOptionInactivo: {
    backgroundColor: '#eef7ea',
    borderColor: '#cfe3c6',
  },
  textoCategoriaOptionActivo: {
    color: '#1c2b22',
    fontWeight: '700',
    fontSize: 12,
  },
  textoCategoriaOptionInactivo: {
    color: '#5b6b62',
    fontWeight: '600',
    fontSize: 12,
  },
  botonCrearNuevaCategoriaToggle: {
    backgroundColor: '#eef7ea',
    borderWidth: 1,
    borderColor: '#cfe3c6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  botonCrearNuevaCategoriaToggleTexto: {
    color: '#f97316',
    fontWeight: '700',
    fontSize: 13,
  },
  subFormularioTarjeta: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#eef7ea',
  },
  subFormEtiqueta: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6cc04a',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  subFormInput: {
    backgroundColor: '#eef7ea',
    borderWidth: 1,
    borderColor: '#cfe3c6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    fontSize: 14,
    color: '#1c2b22',
  },
  botonSubAccion: {
    backgroundColor: '#22a34a',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonSubAccionTexto: {
    color: '#1c2b22',
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
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e1eed9',
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
    color: '#6cc04a',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  botonModalCerrarIcono: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eef7ea',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cfe3c6',
  },
  botonModalCerrarIconoTexto: {
    color: '#5b6b62',
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalContenedorImagenFrame: {
    width: '100%',
    height: 250,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#cfe3c6',
    overflow: 'hidden',
    marginBottom: 18,
  },
  modalDetalleImagen: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  modalDetalleTitulo: {
    fontSize: 22,
    fontWeight: '950',
    color: '#1c2b22',
    marginBottom: 16,
    lineHeight: 30,
    letterSpacing: 0.3,
  },
  modalContenedorDescripcion: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#eef7ea',
    marginBottom: 18,
  },
  modalDetalleDescripcion: {
    fontSize: 14,
    color: '#3f4f46',
    lineHeight: 22,
  },
  modalDetalleFilaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f3faef',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e1eed9',
    marginBottom: 10,
  },
  modalDetallePrecio: {
    fontSize: 22,
    fontWeight: '900',
    color: '#22a34a',
    marginTop: 4,
  },
});
