import React, { useState, useEffect, useRef } from 'react';
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
 * Pantalla Independiente de Pago Tilopay Sandbox usando WebView
 * 
 * Nombre del archivo: PantallaPagoTilopay.js
 * 
 * Exige regex estricto (?[&]code=1 / ?[&]result=APPROVED) para autorizar una compra.
 * Deniega automáticamente cualquier autorización rechazada o tarjeta no disponible.
 */
export default function PantallaPagoTilopay({
  visible = false,
  paymentData,
  onSuccess,
  onCancel,
  onError
}) {
  const [cargandoUrl, setCargandoUrl] = useState(true);
  const [fuenteWebView, setFuenteWebView] = useState(null);

  // Ref de bloqueo para garantizar EXACTAMENTE UNA ejecución del callback por sesión de pago
  const pagoProcesadoRef = useRef(false);

  useEffect(() => {
    if (visible) {
      pagoProcesadoRef.current = false;
    }
  }, [visible]);

  // 1. Petición POST inicial al endpoint Sandbox de Tilopay al abrir la pantalla
  useEffect(() => {
    let montado = true;

    async function cargarUrlPago() {
      if (!visible || !paymentData) return;

      setCargandoUrl(true);
      pagoProcesadoRef.current = false;

      try {
        const resultado = await tilopayService.obtenerUrlPago(paymentData);

        if (montado) {
          if (resultado.url) {
            setFuenteWebView({ uri: resultado.url });
          } else if (resultado.html) {
            setFuenteWebView({ html: resultado.html });
          } else {
            throw new Error('No se pudo obtener la URL de pago de Tilopay.');
          }
        }
      } catch (err) {
        if (montado && onError && !pagoProcesadoRef.current) {
          pagoProcesadoRef.current = true;
          onError({ success: false, error: err.message });
        }
      } finally {
        if (montado) setCargandoUrl(false);
      }
    }

    cargarUrlPago();

    return () => {
      montado = false;
    };
  }, [visible, paymentData]);

  if (!visible || !paymentData) {
    return null;
  }

  // Lista de productos para inyectar en la opción VER DETALLE
  const listaItems = (paymentData.items && paymentData.items.length > 0)
    ? paymentData.items
    : (paymentData.descripcion
        ? paymentData.descripcion.split(', ').map(str => ({ nombre: str, cantidad: 1 }))
        : []);

  // Script de inyección: Productos en Ver Detalle + Detección activa de errores en texto del DOM
  const scriptInyectadoTilopay = `
    (function() {
      var items = ${JSON.stringify(listaItems)};
      var monto = "${paymentData.monto || ''}";
      var moneda = "${paymentData.moneda || 'CRC'}";

      function inyectarEnVerDetalleLimpio() {
        if (document.getElementById('custom-tilopay-inside-box')) {
          return;
        }

        var container = document.querySelector('.productsList') || 
                          document.querySelector('.products') || 
                          document.querySelector('.productsDiv');

        if (!container) {
          var allDivs = Array.from(document.querySelectorAll('div'));
          var detailBtn = allDivs.find(function(d) {
            return d.innerText && (d.innerText.includes('Ver detalle') || d.innerText.includes('Ocultar') || d.innerText.includes('collapseDetail'));
          });
          if (detailBtn && detailBtn.nextElementSibling) {
            container = detailBtn.nextElementSibling;
          }
        }

        if (container) {
          try {
            while (container.firstChild) {
              container.removeChild(container.firstChild);
            }
          } catch(e) {}

          container.style.setProperty('background', 'transparent', 'important');
          container.style.setProperty('border', 'none', 'important');
          container.style.setProperty('box-shadow', 'none', 'important');
          container.style.setProperty('padding', '0px', 'important');

          var box = document.createElement('div');
          box.id = 'custom-tilopay-inside-box';
          box.style.cssText = 'padding: 16px 18px; margin: 8px 0; background-color: #ffffff; border-radius: 12px; border: 2.5px solid #0284c7; font-family: system-ui, -apple-system, sans-serif; box-shadow: 0 4px 12px rgba(0,0,0,0.08); box-sizing: border-box; display: block !important; width: 100%;';
          
          var itemsHtml = items.map(function(item) {
            var nombreItem = item.nombre || item.title || String(item);
            var cant = item.cantidad || item.qty || 1;
            var prec = item.precio ? '₡' + Number(item.precio * cant).toLocaleString('es-CR', { minimumFractionDigits: 2 }) : '';
            return '<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #1e293b; font-weight: 600;">' +
                     '<span>• <strong style="color: #0284c7;">' + cant + 'x</strong> ' + nombreItem + '</span>' +
                     '<span style="font-weight: 800; color: #0284c7; font-size: 15px;">' + prec + '</span>' +
                   '</div>';
          }).join('');

          box.innerHTML = '<div style="font-weight: 900; font-size: 14px; color: #0284c7; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 0.5px; border-bottom: 2px solid #0284c7; padding-bottom: 6px;">🛒 PRODUCTOS EN TU ORDEN:</div>' +
                          itemsHtml +
                          '<div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; font-size: 16px; font-weight: 900; color: #0f172a;">' +
                            '<span>Total a Cancelar:</span>' +
                            '<span style="color: #10b981; font-size: 18px;">' + moneda + ' ' + Number(monto).toLocaleString('es-CR', { minimumFractionDigits: 2 }) + '</span>' +
                          '</div>';

          container.appendChild(box);
        }
      }

      // Ocultar formulario redundante de facturación
      function ocultarFacturacionRepetida() {
        var billingNodes = Array.from(document.querySelectorAll('*')).filter(function(el) {
          return el.className && typeof el.className === 'string' && (
            el.className.includes('billingContainer') ||
            el.className.includes('billingAddress') ||
            el.className.includes('requestBilling')
          );
        });

        billingNodes.forEach(function(el) {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('height', '0px', 'important');
          el.style.setProperty('margin', '0px', 'important');
        });
      }

      // MONITOREAR TEXTO COMPLETO DEL BODY PARA CAPTURAR DENEGACIONES BANCARIAS
      function monitorearErroresEnTextoGlobal() {
        var textoCompleto = document.body ? (document.body.innerText || '') : '';
        if (!textoCompleto) return;

        var tieneError = 
          textoCompleto.includes('330-') ||
          textoCompleto.includes('transacción es inválida') ||
          textoCompleto.includes('transaccion es invalida') ||
          textoCompleto.includes('La transaccion es invalida') ||
          textoCompleto.includes('Transaccion denegada') ||
          textoCompleto.includes('Autorización denegada') ||
          textoCompleto.includes('Autorizacion denegada') ||
          textoCompleto.includes('no disponible') ||
          textoCompleto.includes('Tarjeta invalida') ||
          textoCompleto.includes('Tarjeta rechazada') ||
          textoCompleto.includes('Fondos insuficientes') ||
          textoCompleto.includes('DECLINED') ||
          textoCompleto.includes('Rechazada') ||
          textoCompleto.includes('Denegada');

        if (tieneError && !window.__tilopayErrorNotified) {
          window.__tilopayErrorNotified = true;

          var nodoEspecifico = Array.from(document.querySelectorAll('*')).find(function(el) {
            return el.children.length === 0 && el.innerText && (
              el.innerText.includes('330-') ||
              el.innerText.includes('invalida') ||
              el.innerText.includes('inválida') ||
              el.innerText.includes('rechazada') ||
              el.innerText.includes('denegada') ||
              el.innerText.includes('no disponible') ||
              el.innerText.includes('DECLINED')
            );
          });

          var msjErrorText = nodoEspecifico ? nodoEspecifico.innerText.trim() : 'Transacción Denegada: La autorización fue denegada por el banco emisor o la tarjeta no está disponible.';

          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'TILOPAY_ERROR',
              message: msjErrorText
            }));
          }
        }
      }

      // Ocultar banner de ambiente de pruebas / sandbox de Tilopay
      function ocultarAvisoPruebas() {
        try {
          // A. Ocultar por selección de clases estándar de alertas y sandbox de Tilopay
          var banners = Array.from(document.querySelectorAll('.alert, .alert-warning, .alert-info, .sandbox-banner, .test-banner, [class*="sandbox"], [class*="test-banner"], [class*="testMode"]'));
          banners.forEach(function(b) {
            b.style.setProperty('display', 'none', 'important');
            b.style.setProperty('height', '0px', 'important');
            b.style.setProperty('margin', '0px', 'important');
            b.style.setProperty('padding', '0px', 'important');
          });

          // B. Ocultar por búsqueda en el texto del DOM
          var todosLosElementos = Array.from(document.querySelectorAll('*'));
          todosLosElementos.forEach(function(el) {
            if (el.children.length === 0 && el.innerText) {
              var txt = el.innerText.toLowerCase();
              if (txt.includes('ambiente de prueba') || txt.includes('ambiente de pruebas') || txt.includes('modo de prueba') || txt.includes('modo prueba') || txt.includes('modo de test')) {
                var contenedor = el.closest('.alert') || el.closest('.banner') || el.closest('div') || el;
                if (contenedor) {
                  contenedor.style.setProperty('display', 'none', 'important');
                  contenedor.style.setProperty('height', '0px', 'important');
                  contenedor.style.setProperty('margin', '0px', 'important');
                  contenedor.style.setProperty('padding', '0px', 'important');
                  contenedor.style.setProperty('visibility', 'hidden', 'important');
                }
              }
            }
          });
        } catch(e) {}
      }

      setInterval(function() {
        inyectarEnVerDetalleLimpio();
        ocultarFacturacionRepetida();
        ocultarAvisoPruebas();
        monitorearErroresEnTextoGlobal();
      }, 350);
    })();
    true;
  `;

  // 2. Interceptación de navegación con validación de parámetros query RFC estrictos
  const handleNavigationStateChange = (navState) => {
    const { url } = navState;

    if (!url || pagoProcesadoRef.current) return;

    console.log('Navegación WebView URL:', url);

    // A: Evaluar únicamente si el WebView navegó a una URL de retorno de la app
    const esUrlRetorno = url.includes('example.com/success') || url.includes('example.com/failure');

    if (!esUrlRetorno) return;

    // B: Verificar si hay cualquier parámetro o texto explícito de rechazo/denegación
    const esDenegadoOError = 
      url.includes('example.com/failure') ||
      url.includes('result=DECLINED') ||
      url.includes('result=ERROR') ||
      url.includes('result=REJECTED') ||
      url.includes('result=FAILED') ||
      url.includes('result=CANCELLED') ||
      url.includes('code=0') ||
      url.includes('code=2') ||
      url.includes('code=3') ||
      url.includes('code=300') ||
      url.includes('code=330') ||
      url.includes('status=0') ||
      url.includes('status=DECLINED') ||
      url.includes('status=ERROR') ||
      url.includes('declined') ||
      url.includes('invalid') ||
      url.includes('rejected') ||
      url.includes('failed');

    // C: Validar estricta y únicamente los parámetros query oficiales de éxito (?code=1 o ?result=APPROVED)
    const tieneCodeUno = /[?&]code=1(?:&|$)/.test(url) || /[?&]code=100(?:&|$)/.test(url);
    const tieneResultApproved = /[?&]result=APPROVED(?:&|$)/i.test(url) || /[?&]status=APPROVED(?:&|$)/i.test(url);

    const esAprobadoGarantizado = (tieneCodeUno || tieneResultApproved) && !esDenegadoOError;

    if (esAprobadoGarantizado) {
      pagoProcesadoRef.current = true;
      console.log('✅ Transacción APROBADA GARANTIZADA en Tilopay:', url);
      if (onSuccess) {
        onSuccess({
          success: true,
          estado: 'Aprobado',
          ordenId: paymentData.ordenId,
          monto: paymentData.monto,
          moneda: paymentData.moneda || TILOPAY_CONFIG.currency,
          urlRetorno: url
        });
      }
    } else {
      pagoProcesadoRef.current = true;
      console.log('🔴 Transacción DENEGADA / RECHAZADA en Tilopay:', url);
      let msjError = 'Transacción Denegada: La autorización fue denegada por el banco emisor o la tarjeta no está disponible.';
      if (onError) {
        onError({ success: false, error: msjError });
      }
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={() => {
        if (!pagoProcesadoRef.current && onCancel) {
          onCancel();
        }
      }}
    >
      <SafeAreaView style={styles.contenedor}>
        {/* Barra superior de navegación nativa */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.botonCerrar}
            onPress={() => {
              Alert.alert(
                'Cancelar Transacción',
                '¿Desea salir de la pasarela Tilopay?',
                [
                  { text: 'Continuar Pago', style: 'cancel' },
                  {
                    text: 'Sí, Salir',
                    style: 'destructive',
                    onPress: () => {
                      if (!pagoProcesadoRef.current && onCancel) {
                        onCancel();
                      }
                    }
                  }
                ]
              );
            }}
          >
            <Text style={styles.textoBotonCerrar}>✕ Salir</Text>
          </TouchableOpacity>

          <View style={styles.headerInfo}>
            <Text style={styles.tituloHeader}>TILOPAY CHECKOUT</Text>
          </View>

          <View style={styles.badgeSandbox}>
            <Text style={styles.textoBadge}>SANDBOX</Text>
          </View>
        </View>

        {/* Indicador de Carga inicial */}
        {cargandoUrl && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6cc04a" />
            <Text style={styles.textoCargando}>Cargando pasarela Tilopay...</Text>
          </View>
        )}

        {/* Contenedor exclusivo del WebView a pantalla completa */}
        <View style={{ flex: 1 }}>
          {!cargandoUrl && fuenteWebView && (
            Platform.OS === 'web' ? (
              <iframe
                title="Tilopay Sandbox Checkout"
                src={fuenteWebView.uri || undefined}
                srcDoc={fuenteWebView.html || undefined}
                style={styles.webIframe}
              />
            ) : (
              <WebView
                originWhitelist={['*']}
                source={fuenteWebView}
                onNavigationStateChange={handleNavigationStateChange}
                injectedJavaScript={scriptInyectadoTilopay}
                onMessage={(event) => {
                  if (pagoProcesadoRef.current) return;
                  try {
                    const data = JSON.parse(event.nativeEvent.data);
                    if (data.type === 'TILOPAY_ERROR') {
                      pagoProcesadoRef.current = true;
                      console.log('🔴 Error capturado desde la pasarela:', data.message);
                      if (onError) {
                        onError({ success: false, error: data.message });
                      }
                    }
                  } catch (e) {}
                }}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                nestedScrollEnabled={true}
                keyboardDisplayRequiresUserAction={false}
                androidLayerType="hardware"
                androidHardwareAccelerationDisabled={false}
                style={{ flex: 1, backgroundColor: '#ffffff' }}
              />
            )
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#eef7ea',
    borderBottomWidth: 1,
    borderBottomColor: '#cfe3c6'
  },
  botonCerrar: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#ef444420',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef444460'
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
    color: '#6cc04a',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  badgeSandbox: {
    backgroundColor: '#f97316',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6
  },
  textoBadge: {
    color: '#1c2b22',
    fontSize: 10,
    fontWeight: '900'
  },
  loadingContainer: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    zIndex: 10,
    backgroundColor: '#ffffff',
    padding: 30,
    alignItems: 'center'
  },
  textoCargando: {
    color: '#5b6b62',
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600'
  },
  webIframe: {
    width: '100%',
    height: '100%',
    border: 'none',
    backgroundColor: '#ffffff'
  }
});
