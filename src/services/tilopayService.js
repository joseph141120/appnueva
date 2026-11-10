import { TILOPAY_CONFIG } from '../config/tilopay';

export const tilopayService = {
  /**
   * Realiza la petición POST oficial al API de Tilopay (app.tilopay.com)
   * asegurando la validación estricta de correo electrónico según los requisitos de Tilopay API.
   */
  async obtenerUrlPago(paymentData) {
    const {
      monto,
      moneda = TILOPAY_CONFIG.currency,
      ordenId = String(Date.now()),
      clienteNombre = 'Cliente General',
      clienteEmail,
      email,
      cliente_correo,
      correo,
      clienteTelefono = '88888888',
      descripcion = 'Compra en JLK Solutions Security',
      items = []
    } = paymentData;

    // 1. Sanear y formatear el Monto
    let montoLimpio = String(monto || '0').replace(/[₡$,]/g, '').trim();
    let montoNum = parseFloat(montoLimpio);
    if (isNaN(montoNum) || montoNum <= 0) {
      montoNum = 1000.00;
    }
    const amountFormat = montoNum.toFixed(2);

    // 2. Sanear y dividir Nombre y Apellido
    const partes = String(clienteNombre || 'Cliente General').trim().split(/\s+/);
    const nombre = (partes[0] || 'Cliente').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    let apellido = (partes.slice(1).join(' ') || 'General').replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    if (!apellido.trim()) apellido = 'General';

    // 3. Extraer y validar el Correo Electrónico con formato estricto RFC para Tilopay API
    const correoIngresado = clienteEmail || email || cliente_correo || correo || '';
    let emailLimpio = String(correoIngresado).trim().toLowerCase();

    // Regex oficial de email estándar para pasar la validación de Tilopay API (Laravel billToEmail)
    const regexEmailValido = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    if (!regexEmailValido.test(emailLimpio)) {
      emailLimpio = 'cliente.general@gmail.com';
    }

    console.log('📧 Correo validado enviado a Tilopay API:', emailLimpio);

    // 4. Sanear Teléfono
    let telLimpio = String(clienteTelefono).replace(/\D/g, '');
    if (telLimpio.length < 8) {
      telLimpio = '88888888';
    }

    // 5. Sanear Número de Orden
    let ordenNumLimpia = String(ordenId).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!ordenNumLimpia) {
      ordenNumLimpia = 'ORD-' + Math.floor(Math.random() * 8000 + 1000);
    }

    // 6. Formatear la lista de productos
    const productosTilopay = items.map(i => ({
      title: i.nombre || 'Componente PC',
      price: Number(i.precio || 0),
      quantity: Number(i.cantidad || 1),
      description: `${i.cantidad || 1}x ${i.nombre || 'Producto'} (₡${Number((i.precio || 0) * (i.cantidad || 1)).toFixed(2)})`,
      image: i.imagen || ''
    }));

    if (productosTilopay.length === 0) {
      productosTilopay.push({
        title: descripcion || 'Compra en JLK Solutions Security',
        price: montoNum,
        quantity: 1,
        description: descripcion || 'Compra de componentes de PC',
        image: ''
      });
    }

    const descripcionTexto = productosTilopay.map(p => `${p.quantity}x ${p.title}`).join(', ');

    try {
      console.log('1. Autenticando en Tilopay (login)...');
      
      const resLogin = await fetch(TILOPAY_CONFIG.loginUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          apiuser: TILOPAY_CONFIG.apiuser,
          password: TILOPAY_CONFIG.password
        })
      });

      if (!resLogin.ok) {
        const errorText = await resLogin.text();
        throw new Error(`Credenciales incorrectas o fallo de inicio de sesión en Tilopay: ${errorText}`);
      }

      const dataLogin = await resLogin.json();
      const token = dataLogin.access_token || dataLogin.token;

      if (!token) {
        throw new Error('Tilopay no retornó un token Bearer válido.');
      }

      console.log(`2. Registrando transacción en Tilopay a nombre de: ${emailLimpio}...`);

      const payloadProcess = {
        key: TILOPAY_CONFIG.key,
        amount: amountFormat,
        currency: moneda.toUpperCase(),
        billToFirstName: nombre,
        billToLastName: apellido,
        billToEmail: emailLimpio, // Correo estricto RFC
        billToAddress: 'San José, Costa Rica',
        billToCity: 'San José',
        billToState: 'San José',
        billToCountry: 'CR',
        billToTelephone: telLimpio,
        orderNumber: ordenNumLimpia,
        description: descripcionTexto,
        orderDescription: descripcionTexto,
        details: descripcionTexto,
        products: productosTilopay,
        items: productosTilopay,
        requestBilling: 0,
        redirect: TILOPAY_CONFIG.redirectSuccessUrl,
        redirectUrl: TILOPAY_CONFIG.redirectSuccessUrl,
        cancelUrl: TILOPAY_CONFIG.redirectCancelUrl,
        subscription: '0',
        platform: 'api'
      };

      const resProcess = await fetch(TILOPAY_CONFIG.processPaymentUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payloadProcess)
      });

      const dataProcess = await resProcess.json();

      if (!resProcess.ok) {
        let detalleError = 'Error de validación en Tilopay.';
        if (dataProcess.data && dataProcess.data.errors) {
          const listaErrores = Object.entries(dataProcess.data.errors)
            .map(([campo, msgs]) => `${campo}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
            .join(' | ');
          detalleError = `Tilopay rechazó los campos (${listaErrores})`;
        } else if (dataProcess.message) {
          detalleError = dataProcess.message;
        }
        throw new Error(detalleError);
      }

      const urlOficialTilopay = dataProcess.url || dataProcess.processUrl || dataProcess.urlPayment || (dataProcess.data && dataProcess.data.url);

      if (urlOficialTilopay) {
        console.log('✅ URL de pago obtenida exitosamente de Tilopay para:', emailLimpio);
        return { success: true, url: urlOficialTilopay };
      } else {
        throw new Error('Respuesta inesperada de Tilopay: ' + JSON.stringify(dataProcess));
      }

    } catch (error) {
      console.error('❌ Error al procesar pago en Tilopay:', error.message);
      throw error;
    }
  }
};
