import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Alert
} from 'react-native';
import { WebView } from 'react-native-webview';
import { TILOPAY_CONFIG } from '../config/tilopay';
import { tilopayService } from '../services/tilopayService';

/**
 * Componente / Pantalla Independiente de Pago Tilopay (Modo Sandbox via WebView)
 * 
 * Props:
 * - visible (boolean): Muestra u oculta el modal de pago.
 * - paymentData (object): { monto, ordenId, clienteNombre, clienteEmail, clienteTelefono, descripcion }
 * - onSuccess (function): Callback al confirmarse el pago exitosamente en Tilopay.
 * - onCancel (function): Callback al cancelar el pago por el usuario.
 * - onError (function): Callback si ocurre un error en la pasarela.
 */
export default function TilopayPaymentScreen({
  visible = false,
  paymentData,
  onSuccess,
  onCancel,
  onError
}) {
  const [loading, setLoading] = useState(true);

  if (!visible || !paymentData) {
    return null;
  }

  const htmlContent = tilopayService.generarHtmlPago(paymentData);

  // Maneja el cambio de navegación dentro del WebView para detectar el éxito o cancelación
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;

    if (!url) return;

    // Detecta URL de Redirección Exitosa
    if (
      url.includes(TILOPAY_CONFIG.redirectSuccessUrl) ||
      url.includes('result=APPROVED') ||
      url.includes('code=1')
    ) {
      const authCodeMatch = url.match(/authCode=([^&]+)/);
      const authCode = authCodeMatch ? authCodeMatch[1] : 'TILOPAY_APPROVED_SBX';

      if (onSuccess) {
        onSuccess({
          success: true,
          estado: 'Aprobado',
          codigoAutorizacion: authCode,
          ordenId: paymentData.ordenId,
          monto: paymentData.monto,
          transaccionId: 'TLP-' + Math.floor(Math.random() * 899999 + 100000)
        });
      }
    }

    // Detecta URL de Cancelación por parte del usuario
    else if (
      url.includes(TILOPAY_CONFIG.redirectCancelUrl) ||
      url.includes('result=CANCELLED') ||
      url.includes('code=0')
    ) {
      if (onCancel) {
        onCancel();
      }
    }

    // Detecta URL de Error de Pasarela
    else if (
      url.includes(TILOPAY_CONFIG.redirectErrorUrl) ||
      url.includes('result=ERROR')
    ) {
      if (onError) {
        onError({
          success: false,
          error: 'Transacción rechazada por el emisor o la pasarela Tilopay.'
        });
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (onCancel) onCancel();
      }}
    >
      <SafeAreaView style={styles.container}>
        {/* Encabezado Superior de la Pantalla de Pago */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={() => {
              Alert.alert(
                'Cancelar Pago',
                '¿Desea salir de la pasarela Tilopay? El pedido no se completará.',
                [
                  { text: 'Continuar Pago', style: 'cancel' },
                  { text: 'Sí, Salir', style: 'destructive', onPress: () => onCancel && onCancel() }
                ]
              );
            }}
          >
            <Text style={styles.textoBotonCerrar}>✕ Cancelar</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.tituloHeader}>TILOPAY SANDBOX</Text>
            <Text style={styles.subtituloHeader}>Pago seguro con Tarjeta</Text>
          </View>

          <View style={styles.badgeSandbox}>
            <Text style={styles.textoBadge}>SANDBOX</Text>
          </View>
        </View>

        {/* Indicador de Carga */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.textoCargando}>Cargando pasarela Tilopay...</Text>
          </View>
        )}

        {/* Renderizado Condicional: WebView en Nativo / iframe Fallback en Web */}
        <View style={styles.webViewContainer}>
          {Platform.OS === 'web' ? (
            <iframe
              title="Tilopay Sandbox Web Checkout"
              srcDoc={htmlContent}
              style={styles.webIframe}
              onLoad={() => setLoading(false)}
            />
          ) : (
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              onNavigationStateChange={handleNavigationStateChange}
              onLoadStart={() => setLoading(true)}
              onLoadEnd={() => setLoading(false)}
              javaScriptEnabled={true}
              domStorageEnabled={true}
              style={styles.webView}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155'
  },
  botonCerrar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ef444415',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef444450'
  },
  textoBotonCerrar: {
    color: '#ef4444',
    fontSize: 13,
    fontWeight: '800'
  },
  headerInfo: {
    alignItems: 'center'
  },
  tituloHeader: {
    color: '#38bdf8',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  subtituloHeader: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600'
  },
  badgeSandbox: {
    backgroundColor: '#0284c7',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  textoBadge: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '900'
  },
  loadingContainer: {
    position: 'absolute',
    top: 80,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    padding: 20,
    alignItems: 'center'
  },
  textoCargando: {
    color: '#94a3b8',
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600'
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  webView: {
    flex: 1,
    backgroundColor: '#0f172a'
  },
  webIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    backgroundColor: '#0f172a'
  }
});
