-- ========================================================
-- JLK SOLUTIONS SECURITY - ESTRUCTURA Y DATOS INICIALES
-- Compatible con MySQL 5.7 / 8.0 / MariaDB
-- ========================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. Tabla: roles
CREATE TABLE IF NOT EXISTS roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (id, nombre) VALUES
  (1, "Administrador"),
  (2, "Vendedor"),
  (3, "Cliente")
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 2. Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  token_app VARCHAR(255) NULL,
  roles_id INT NOT NULL DEFAULT 2,
  pregunta_seguridad VARCHAR(255) NULL,
  respuesta_seguridad VARCHAR(255) NULL,
  intentos_login INT DEFAULT 0,
  bloqueo_login_hasta DATETIME NULL,
  totp_secret VARCHAR(255) NULL,
  totp_activo TINYINT(1) DEFAULT 0,
  codigo_correo_recuperacion VARCHAR(10) NULL,
  codigo_correo_expira DATETIME NULL,
  token_recuperacion VARCHAR(255) NULL,
  token_recuperacion_expira DATETIME NULL,
  intentos_recuperacion INT DEFAULT 0,
  bloqueo_recuperacion_hasta DATETIME NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_usuarios_email (email),
  INDEX idx_usuarios_token (token_app)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Usuarios base: Luis Martínez (Admin) y Joseph Silva (Vendedor)
-- Password por defecto: Password123! ($2a$10$wE96XU54h8K7aJ2E7YpLpe7v6oZqjB9l8R01zY9Qe4L7gP9M6R4nO)
INSERT INTO usuarios (id, nombre, email, password, roles_id, pregunta_seguridad, respuesta_seguridad) VALUES
  (1, "Luis Martínez", "admin@hardwarestore.com", "$2a$10$wE96XU54h8K7aJ2E7YpLpe7v6oZqjB9l8R01zY9Qe4L7gP9M6R4nO", 1, "¿Cuál fue el nombre de tu primera mascota?", "$2a$12$DqXb7bN7k1Fz9G5d1mP6euP0Vw9K6G2D7B4M1H8A5J2E9L4C7F0N2"),
  (2, "Joseph Silva", "vendedor@hardwarestore.com", "$2a$10$wE96XU54h8K7aJ2E7YpLpe7v6oZqjB9l8R01zY9Qe4L7gP9M6R4nO", 2, "¿En qué ciudad nació tu madre?", "$2a$12$DqXb7bN7k1Fz9G5d1mP6euP0Vw9K6G2D7B4M1H8A5J2E9L4C7F0N2")
ON DUPLICATE KEY UPDATE 
  nombre = VALUES(nombre),
  roles_id = VALUES(roles_id);

-- 3. Tabla: cliente
CREATE TABLE IF NOT EXISTS cliente (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  correo VARCHAR(150) NULL,
  telefono VARCHAR(50) NULL,
  cedula VARCHAR(50) NULL,
  direccion TEXT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO cliente (id, nombre, correo, telefono, direccion) VALUES
  (1, "Cliente Mostrador General", "mostrador@jlksecurity.com", "8888-8888", "Tienda Central")
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- 4. Tabla: categorias
CREATE TABLE IF NOT EXISTS categorias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  descripcion VARCHAR(100) NOT NULL,
  estado TINYINT(1) DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO categorias (id, descripcion, estado) VALUES
  (1, "Cámaras de Seguridad", 1),
  (2, "Grabadores DVR y NVR", 1),
  (3, "Cercos Eléctricos", 1),
  (4, "Motores para Portones", 1),
  (5, "Controles y Mandos", 1),
  (6, "Alarmas y Sensores", 1),
  (7, "Accesorios y Conectividad", 1)
ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), estado = 1;

-- 5. Tabla: productos
CREATE TABLE IF NOT EXISTS productos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT NULL,
  precio_costo DECIMAL(12,2) DEFAULT 0,
  margen_ganancia DECIMAL(12,2) DEFAULT 0,
  descuento_porcentaje DECIMAL(5,2) DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  categorias_id INT NULL,
  imagen TEXT NULL,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_prod_cat (categorias_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO productos (id, nombre, descripcion, stock, precio_costo, margen_ganancia, categorias_id, descuento_porcentaje) VALUES
  (1, "Cámara Domo HD 1080p Visión Nocturna Infrarroja", "Cámara domo para interiores con lente de 2.8mm, ángulo amplio de 103° y visión nocturna IR hasta 20 metros.", 35, 11000, 7500, 1, 0),
  (2, "Cámara Bullet IP 4K Exterior Metálica IP67", "Cámara bullet impermeable con resolución 4K Ultra HD, sensor de movimiento inteligente y visión nocturna de 30m.", 18, 32000, 16000, 1, 10),
  (3, "Cámara PTZ WiFi Robótica 360° Seguimiento Inteligente", "Cámara de seguimiento automático con giro 355° horizontal y 90° vertical, audio bidireccional y alertas al celular.", 22, 22000, 13000, 1, 0),
  (4, "Cámara Domo IP PoE 5MP con Micrófono Integrado", "Cámara PoE de alta definición para techo, carcasa antivandálica IK10 y captura de audio ambiental en tiempo real.", 14, 26000, 12000, 1, 0),
  (5, "Cámara de Seguridad Solar WiFi 4G Exterior", "Cámara autónoma con panel solar integrado y batería de litio recargable. No requiere cables de corriente.", 10, 55000, 25000, 1, 15),
  (6, "Cámara Tipo Domo Varifocal Motorizada 2.8-12mm", "Zoom óptico motorizado 4X para enfocar rostros o placas vehiculares a distancia con nitidez superior.", 8, 42000, 18000, 1, 0),
  (7, "Grabador DVR 4 Canales 1080p Lite H.265+", "DVR pentahíbrido de 4 canales para cámaras analógicas y HD. Compresión H.265+ para ahorrar espacio en disco.", 12, 25000, 14000, 2, 0),
  (8, "Grabador DVR 8 Canales 5MP con Reconocimiento Facial", "DVR de 8 canales con inteligencia artificial, detección de vehículos/humanos y salida HDMI/VGA.", 15, 38000, 19000, 2, 0),
  (9, "Grabador NVR 16 Canales PoE 4K Ultra HD", "NVR profesional de 16 puertos PoE integrados para conectar cámaras IP directamente sin fuentes externas.", 6, 95000, 45000, 2, 5),
  (10, "Disco Duro 1TB Western Digital Purple CCTV 24/7", "Disco duro grado vigilancia optimizado para grabación continua sin interrupciones ni pérdida de cuadros.", 20, 32000, 13000, 2, 0),
  (11, "Disco Duro 2TB Western Digital Purple CCTV 24/7", "Capacidad de 2 Terabytes para almacenar hasta 30 días de grabación continua en alta definición.", 16, 46000, 17000, 2, 0),
  (12, "Disco Duro 4TB Seagate SkyHawk Surveillance", "Almacenamiento masivo para DVRs y NVRs empresariales de alta exigencia.", 8, 68000, 22000, 2, 0),
  (13, "Energizador de Cerco Eléctrico 10.000V con Batería", "Equipo central para cerco perimetral con descarga disuasiva no letal de 10.000 voltios y alarma sonora.", 14, 65000, 30000, 3, 0),
  (14, "Energizador Inteligente WiFi 15.000V Control por App", "Energizador con conexión WiFi para activar/desactivar y recibir notificaciones de corte de línea en el celular.", 9, 92000, 38000, 3, 5),
  (15, "Kit 25 Aisladores Tubulares Templadores para Cerco", "Aisladores reforzados con protección UV contra rayos solares e intemperie para postes esquineros.", 40, 8500, 5500, 3, 0),
  (16, "Bobina de Alambre de Aluminio Especial para Cerco 500m", "Alambre de aleación de aluminio de alta conductividad eléctrica y libre de óxido para perímetro seguro.", 25, 22000, 11000, 3, 0),
  (17, "Sirena de Alta Potencia 30W Doble Tono para Cerco", "Sirena acústica de 120 decibeles con sonido penetrante para disuasión perimetral inmediata.", 30, 7500, 5000, 3, 0),
  (18, "Letrero de Advertencia Reglamentario Peligro Cerco Eléctrico", "Placa plástica de alta visibilidad con texto normativo obligatorio para cercos electrificados.", 60, 1500, 1500, 3, 0),
  (19, "Motor Corredizo Rápido 800kg para Portón Eléctrico", "Kit de motor para portón corredizo de hasta 800 kilos de peso. Apertura rápida y silenciosa.", 10, 145000, 65000, 4, 10),
  (20, "Motor Corredizo Industrial 1500kg Alto Tráfico", "Motor de uso rudo para portones pesados de condominios o bodegas con engranajes de bronce bañados en aceite.", 5, 240000, 95000, 4, 0),
  (21, "Kit Motor Batiente de 2 Brazos Hidráulicos 3m por Hoja", "Sistema completo para portones de 2 hojas abatibles con desaceleración suave y llaves de desbloqueo manual.", 4, 280000, 110000, 4, 0),
  (22, "Tramo de Cremallera de Acero Galvanizado M4 (1 Metro)", "Barra dentada de acero zincado de 1 metro con espaciadores para fijar en portones corredizos.", 50, 6000, 4500, 4, 0),
  (23, "Sensor de Fotocelda Anti-Aplastamiento para Portón", "Par de sensores infrarrojos de seguridad que detienen e invierten el portón si detectan autos o personas.", 24, 12000, 8000, 4, 0),
  (24, "Luz Estroboscópica Destellante de Seguridad 12V/24V", "Lámpara indicadora de movimiento para advertir la apertura o cierre del portón eléctrico a peatones.", 20, 8500, 5500, 4, 0),
  (25, "Control Remoto 4 Botones 433MHz para Portón Eléctrico", "Control transmisor de largo alcance con 4 canales para operar hasta 4 portones o luces distintas.", 80, 4500, 4500, 5, 0),
  (26, "Control Metálico Llavero Clonador Universal Multicódigo", "Control portátil reforzado en aluminio con capacidad de clonar códigos fijos y variables comunes.", 50, 6000, 5000, 5, 0),
  (27, "Módulo Receptor Inalámbrico Universal 2 Canales", "Receptor de radiofrecuencia para adaptar controles modernos a cualquier marca de motor de portón.", 25, 14000, 8500, 5, 0),
  (28, "Pulsador Inalámbrico de Pared para Portón Eléctrico", "Botonera de pared sin cables para abrir o cerrar el portón desde el interior de la casa u oficina.", 20, 9000, 6000, 5, 0),
  (29, "Receptor WiFi Inteligente para Portón (Apertura por Celular)", "Módulo inteligente compatible con Tuya/SmartLife para abrir el portón desde cualquier parte del mundo.", 15, 16000, 10000, 5, 0),
  (30, "Panel de Alarma Inteligente WiFi / GSM con Sirena", "Central de alarma híbrida inalámbrica con llamada automática por SIM celular y notificaciones por aplicación.", 10, 58000, 28000, 6, 10),
  (31, "Sensor de Movimiento PIR Inalámbrico Antimascotas", "Detector de presencia infrarrojo pasivo que ignora mascotas de hasta 20kg para evitar falsas alarmas.", 35, 9500, 6500, 6, 0),
  (32, "Sensor Magnético Inalámbrico para Puertas y Ventanas", "Contacto magnético compacto con batería de larga duración para alertar aperturas no autorizadas.", 50, 5500, 4500, 6, 0),
  (33, "Botón de Pánico Inalámbrico SOS para Emergencias", "Pulsador de auxilio para adultos mayores o cajas de cobro que dispara la alarma silenciosa al instante.", 25, 4000, 3500, 6, 0),
  (34, "Sensor de Humo Fotoeléctrico Inalámbrico Autónomo", "Detector de humo con alarma acústica incorporada de 85dB y enlace al sistema de seguridad central.", 20, 11000, 7000, 6, 0),
  (35, "Teclado Táctil Inalámbrico con Lector de Tarjetas RFID", "Teclado de acceso para armar y desarmar el sistema de alarma mediante clave numérica o llavero de proximidad.", 12, 18000, 11000, 6, 0),
  (36, "Fuente de Poder 12V 10A Tipo Malla para 8 Cámaras", "Fuente conmutada centralizada regulada de alta estabilidad con potenciómetro de ajuste de voltaje.", 25, 12500, 8500, 7, 0),
  (37, "Fuente de Poder Regulada 12V 2A para Cámara Individual", "Adaptador de pared estándar 12V 2000mA con conector macho 5.5x2.1mm para cámaras y routers.", 60, 3500, 3500, 7, 0),
  (38, "Kit Par de Video Baluns Pasivos HD 4K con Conector BNC", "Transceptores pasivos para transmitir video de alta definición a través de cable UTP hasta 300 metros.", 70, 2500, 2500, 7, 0),
  (39, "Paquete de 10 Conectores Macho DC 12V con Tornillo", "Conectores rápidos sin soldadura para energizar cámaras de seguridad de forma prolija.", 80, 2000, 2000, 7, 0),
  (40, "Paquete de 10 Conectores Hembra DC 12V con Tornillo", "Conectores hembra de bornera rápida para empalmes y extensiones de alimentación.", 80, 2000, 2000, 7, 0),
  (41, "Rollo de Cable UTP Cat6 100% Cobre para CCTV (305m)", "Bobina de cable de red categoría 6 con conductores de cobre puro para máxima velocidad y distancia en video HD.", 15, 48000, 22000, 7, 5),
  (42, "Caja de Registro Plástica 10x10cm Estanca para Cámaras", "Caja de montaje impermeable IP65 para proteger baluns, cables y conectores a la intemperie.", 100, 1800, 1700, 7, 0),
  (43, "Batería de Respaldo Recargable 12V 7Ah para Alarma y Cerco", "Batería sellada libre de mantenimiento para mantener el cerco y la alarma encendidos ante cortes de luz.", 30, 12000, 7500, 7, 0)
ON DUPLICATE KEY UPDATE 
  nombre = VALUES(nombre),
  descripcion = VALUES(descripcion),
  stock = VALUES(stock),
  precio_costo = VALUES(precio_costo),
  margen_ganancia = VALUES(margen_ganancia),
  categorias_id = VALUES(categorias_id),
  descuento_porcentaje = VALUES(descuento_porcentaje);

-- 6. Tabla: ventas
CREATE TABLE IF NOT EXISTS ventas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  condicion_venta VARCHAR(50) DEFAULT "Contado",
  estado VARCHAR(50) DEFAULT "Completado",
  tipo_orden VARCHAR(50) DEFAULT "Mostrador",
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 7. Tabla: detalle_venta
CREATE TABLE IF NOT EXISTS detalle_venta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NULL,
  ventas_id INT NOT NULL,
  productos_id INT NOT NULL,
  cantidad INT NOT NULL,
  precio DECIMAL(12,2) NOT NULL,
  INDEX idx_det_venta (ventas_id),
  INDEX idx_det_prod (productos_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 8. Tabla: push_tokens
CREATE TABLE IF NOT EXISTS push_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  usuario_id INT NULL,
  plataforma VARCHAR(50) DEFAULT "android",
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;
