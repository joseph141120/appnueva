import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configurar el manejador global para que las notificaciones del sistema
// se muestren con sonido, vibración y banner de Android (SDK 54)
try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true, // Expo SDK 54
      shouldShowList: true,   // Expo SDK 54
      shouldPlaySound: true,
      shouldSetBadge: true,
      priority: Notifications.AndroidNotificationPriority.MAX,
    }),
  });
} catch (e) {
  console.warn('Error al configurar notificationHandler:', e.message);
}

// Canal predeterminado para dispositivos Android
const CANAL_MOVIMIENTOS_ID = 'movimientos-sistema';
let inicializado = false;

/**
 * Inicializa permisos y canal de notificación prioritario en Android
 */
export const inicializarNotificaciones = async () => {
  if (inicializado) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(CANAL_MOVIMIENTOS_ID, {
        name: 'JLK Solutions Security',
        description: 'Notificaciones oficiales de JLK Solutions Security',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#22a34a',
        sound: 'default',
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
      });
    }

    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync({
          ios: {
            allowAlert: true,
            allowBadge: true,
            allowSound: true,
          },
        });
        finalStatus = status;
      }
    } else if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          Notification.requestPermission().catch(() => {});
        }
      }
    }

    inicializado = true;
  } catch (err) {
    console.warn('Error al inicializar permisos de notificaciones:', err.message);
  }
};

export const obtenerExpoPushToken = async () => null;

/**
 * Emite una notificación push únicamente para eventos importantes (Ventas, Órdenes, Stock)
 */
export const notificarMovimiento = async (titulo, cuerpo, tipo = 'general', meta = {}) => {
  console.log(`🔔 [EVENTO IMPORTANTE] [${tipo.toUpperCase()}]: ${titulo} - ${cuerpo}`);

  // Notificación en Web Desktop (si está en navegador)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        try {
          new Notification(titulo, {
            body: cuerpo,
            icon: '/favicon.png',
            tag: `movimiento-${Date.now()}`
          });
        } catch (_) {}
      }
    }
    return;
  }

  // Notificación Push Nativa del Sistema (Android / iOS)
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: titulo,
        subtitle: 'JLK Solutions Security',
        body: cuerpo,
        color: '#22a34a',
        data: { tipo, ...meta },
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: [0, 250, 250, 250],
        channelId: CANAL_MOVIMIENTOS_ID,
      },
      trigger: null,
    });
  } catch (err) {
    console.warn('Error al disparar notificación nativa:', err.message);
  }
};

export default {
  inicializarNotificaciones,
  obtenerExpoPushToken,
  notificarMovimiento,
};
