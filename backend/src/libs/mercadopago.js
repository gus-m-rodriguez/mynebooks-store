// TODO: Implementar integración con Mercado Pago
import { MercadoPagoConfig, Preference, Payment } from "mercadopago";
import crypto from "crypto";
import { MP_ACCESS_TOKEN, MP_WEBHOOK_SECRET, MP_TEST_PAYER_EMAIL, MP_SANDBOX } from "../config.js";

// Validar que el token esté configurado
if (!MP_ACCESS_TOKEN || MP_ACCESS_TOKEN.trim() === "") {
  console.error("❌ [MP] MP_ACCESS_TOKEN no está configurado en las variables de entorno");
  console.error("❌ [MP] Por favor, configura MP_ACCESS_TOKEN en el archivo .env");
  console.error("❌ [MP] Para sandbox, puedes usar: un token de una cuenta tester de MP developer");
}

// Inicializar cliente de Mercado Pago
const client = new MercadoPagoConfig({
  accessToken: MP_ACCESS_TOKEN,
});

export const preference = new Preference(client);
export const payment = new Payment(client);

export const crearPreferenciaPago = async (items, ordenId, backUrls) => {
  try {
    // Validar token antes de continuar
    if (!MP_ACCESS_TOKEN || MP_ACCESS_TOKEN.trim() === "") {
      throw new Error("MP_ACCESS_TOKEN no está configurado. Por favor, configura MP_ACCESS_TOKEN en el archivo .env");
    }

    console.log("[MP] Token configurado:", MP_ACCESS_TOKEN.substring(0, 20) + "...");
    console.log("[MP] Items recibidos:", JSON.stringify(items, null, 2));

    // Validar y preparar items para Mercado Pago
    const itemsMP = items.map((item, index) => {
      const title = String(item.titulo || `Item ${index + 1}`).trim();
      const unit_price = Number(item.precio);
      const quantity = Number(item.cantidad);
      
      // Validaciones estrictas para Mercado Pago
      if (!title || title.length === 0) {
        throw new Error(`Item ${index + 1}: El título no puede estar vacío`);
      }
      if (title.length > 256) {
        throw new Error(`Item ${index + 1}: El título no puede exceder 256 caracteres`);
      }
      if (isNaN(unit_price) || unit_price <= 0) {
        throw new Error(`Item ${index + 1} (${title}): El precio debe ser un número mayor a 0. Valor recibido: ${item.precio}`);
      }
      if (isNaN(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        throw new Error(`Item ${index + 1} (${title}): La cantidad debe ser un entero mayor a 0. Valor recibido: ${item.cantidad}`);
      }
      
      // Mercado Pago requiere que unit_price sea un número positivo
      // y quantity sea un entero positivo
      return {
        title: title,
        unit_price: unit_price,
        quantity: quantity,
        currency_id: "ARS",
      };
    });
    
    console.log("[MP] Items validados y preparados:", JSON.stringify(itemsMP, null, 2));

    // Preparar el body de la preferencia
    const preferenceBody = {
      items: itemsMP,
      external_reference: ordenId.toString(),
    };

    // Configurar back_urls y payer
    const isDevelopment = process.env.NODE_ENV !== "production";
    const origin = process.env.ORIGIN || "http://localhost:5173";
    const isLocalhost = origin.includes("localhost") || origin.includes("127.0.0.1");
    
    // En modo desarrollo/sandbox, usar comprador de prueba si está configurado
    if (isDevelopment && MP_TEST_PAYER_EMAIL && MP_TEST_PAYER_EMAIL.trim() !== "") {
      preferenceBody.payer = {
        email: MP_TEST_PAYER_EMAIL.trim(),
      };
      console.log("[MP] Usando comprador de prueba:", MP_TEST_PAYER_EMAIL);
    }

    // Configurar back_urls siempre que estén definidas
    // IMPORTANTE: back_urls debe estar definido ANTES de auto_return
    if (backUrls && backUrls.success) {
      preferenceBody.back_urls = {
        success: backUrls.success,
        failure: backUrls.failure || backUrls.success,
        pending: backUrls.pending || backUrls.success,
      };
      console.log("[MP] back_urls configuradas:", preferenceBody.back_urls);
      
      // Solo agregar auto_return si NO es localhost
      // Mercado Pago rechaza auto_return con URLs localhost
      if (!isLocalhost) {
        preferenceBody.auto_return = "approved";
        console.log("[MP] auto_return configurado: approved (no es localhost)");
      } else {
        console.warn("⚠️ [MP] Modo desarrollo con localhost. auto_return omitido (Mercado Pago lo rechaza).");
        console.warn("⚠️ [MP] El usuario deberá hacer clic en 'Volver al sitio' después del pago.");
      }
    } else {
      console.warn("⚠️ [MP] back_urls no proporcionadas. No se configurarán URLs de retorno.");
    }

    // Configurar notification_url para recibir webhooks de Mercado Pago
    // IMPORTANTE: notification_url debe apuntar al BACKEND, no al frontend
    // En Railway, usar BACKEND_URL si está configurado y es una URL válida, sino construir desde variables de entorno
    let backendUrl;
    
    // Validar que BACKEND_URL sea una URL válida (debe empezar con http:// o https://)
    if (process.env.BACKEND_URL && (process.env.BACKEND_URL.startsWith("http://") || process.env.BACKEND_URL.startsWith("https://"))) {
      backendUrl = process.env.BACKEND_URL;
      console.log("[MP] ✅ Usando BACKEND_URL de variables de entorno:", backendUrl);
    } else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
      // Railway proporciona RAILWAY_PUBLIC_DOMAIN para el servicio actual
      backendUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
      console.log("[MP] ✅ Usando RAILWAY_PUBLIC_DOMAIN:", backendUrl);
    } else {
      // Fallback: intentar construir desde ORIGIN (pero esto puede ser el frontend)
      console.warn("⚠️ [MP] BACKEND_URL no configurado o no es una URL válida.");
      if (process.env.BACKEND_URL) {
        console.warn(`⚠️ [MP] BACKEND_URL tiene un valor inválido: "${process.env.BACKEND_URL}"`);
        console.warn("⚠️ [MP] BACKEND_URL debe ser una URL completa (ej: https://back-mynebooks-store-production.up.railway.app)");
      }
      backendUrl = process.env.ORIGIN?.replace(/:\d+$/, ":3000") || "http://localhost:3000";
      console.warn("⚠️ [MP] Usando fallback que puede ser incorrecto:", backendUrl);
    }
    
    const notificationUrl = `${backendUrl}/api/pagos/webhook/mercadopago`;
    preferenceBody.notification_url = notificationUrl;
    console.log("[MP] notification_url configurada:", notificationUrl);
    console.log("[MP] BACKEND_URL usado:", backendUrl);

    console.log("[MP] Creando preferencia con body:", JSON.stringify(preferenceBody, null, 2));

    const result = await preference.create({
      body: preferenceBody,
    });

    console.log("[MP] Preferencia creada exitosamente:", {
      id: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });

    return result;
  } catch (error) {
    console.error("❌ Error creando preferencia de Mercado Pago:");
    console.error("   Tipo:", error.constructor.name);
    console.error("   Mensaje:", error.message);
    console.error("   Código:", error.code || error.status);
    console.error("   Status:", error.status);
    console.error("   Detalles completos:", JSON.stringify(error, null, 2));
    
    // Si el error es 403 relacionado con políticas, proporcionar información útil
    if (error.status === 403 || error.code === "PA_UNAUTHORIZED_RESULT_FROM_POLICIES") {
      console.error("\n💡 SOLUCIÓN SUGERIDA:");
      console.error("   Mercado Pago está rechazando las URLs de redirección.");
      console.error("   Opciones:");
      console.error("   1. Usar un servicio como ngrok para crear una URL pública temporal");
      console.error("   2. Configurar las URLs en el panel de Mercado Pago");
      console.error("   3. En desarrollo, las back_urls se omiten automáticamente si usas localhost");
      console.error("   4. Verificar que ORIGIN esté configurado correctamente");
    }
    
    throw error;
  }
};

/**
 * Obtener información de un pago de Mercado Pago
 */
export const obtenerPago = async (paymentId) => {
  try {
    console.log(`[obtenerPago] Consultando pago con ID: ${paymentId}`);
    const result = await payment.get({ id: paymentId });
    console.log(`[obtenerPago] ✅ Pago obtenido exitosamente: ID=${result.id}, Estado=${result.status}`);
    return result;
  } catch (error) {
    console.error("[obtenerPago] ❌ Error obteniendo pago de Mercado Pago:", {
      paymentId,
      message: error.message,
      status: error.status,
      code: error.code,
      cause: error.cause,
    });
    throw error;
  }
};

/**
 * Buscar pagos por external_reference (ID de orden)
 * Útil cuando solo tenemos el collection_id (preferencia) y necesitamos encontrar el pago real
 */
export const buscarPagosPorOrden = async (ordenId) => {
  try {
    // Buscar pagos usando la API de search de Mercado Pago
    // Nota: La API de Mercado Pago permite buscar pagos por external_reference
    const searchParams = {
      external_reference: ordenId.toString(),
      limit: 10,
    };
    
    console.log(`[buscarPagosPorOrden] Buscando pagos para orden ${ordenId} con parámetros:`, searchParams);
    
    // Usar la API REST directamente ya que el SDK puede no tener este método
    const axios = (await import("axios")).default;
    const response = await axios.get("https://api.mercadopago.com/v1/payments/search", {
      params: searchParams,
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });
    
    console.log(`[buscarPagosPorOrden] Respuesta de Mercado Pago:`, {
      total: response.data?.paging?.total || 0,
      results_count: response.data?.results?.length || 0,
    });
    
    if (response.data && response.data.results && response.data.results.length > 0) {
      // Retornar el pago más reciente (el primero de la lista)
      const pagoMasReciente = response.data.results[0];
      console.log(`[buscarPagosPorOrden] ✅ Pago encontrado: ID=${pagoMasReciente.id}, Estado=${pagoMasReciente.status}`);
      return pagoMasReciente;
    }
    
    console.log(`[buscarPagosPorOrden] ⚠️ No se encontraron pagos para la orden ${ordenId}`);
    return null;
  } catch (error) {
    console.error("[buscarPagosPorOrden] ❌ Error buscando pagos por orden:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Obtener información de una preferencia de Mercado Pago
 */
export const obtenerPreferencia = async (preferenceId) => {
  try {
    const result = await preference.get({ id: preferenceId });
    return result;
  } catch (error) {
    console.error("Error obteniendo preferencia de Mercado Pago:", error);
    throw error;
  }
};

/**
 * Buscar pagos por merchant_order_id
 * El merchant_order_id identifica la orden comercial que puede tener múltiples pagos asociados
 */
export const buscarPagosPorMerchantOrder = async (merchantOrderId) => {
  try {
    console.log(`[buscarPagosPorMerchantOrder] Buscando pagos para merchant_order_id ${merchantOrderId}`);
    
    const axios = (await import("axios")).default;
    const response = await axios.get(`https://api.mercadopago.com/merchant_orders/${merchantOrderId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });
    
    console.log(`[buscarPagosPorMerchantOrder] Respuesta completa de Mercado Pago:`, JSON.stringify(response.data, null, 2));
    console.log(`[buscarPagosPorMerchantOrder] Respuesta de Mercado Pago:`, {
      merchant_order_id: response.data?.id,
      payments_count: response.data?.payments?.length || 0,
      status: response.data?.status,
      payments: response.data?.payments,
    });
    
    if (response.data && response.data.payments && response.data.payments.length > 0) {
      // Obtener el pago más reciente (último en el array)
      const ultimoPagoId = response.data.payments[response.data.payments.length - 1];
      console.log(`[buscarPagosPorMerchantOrder] Obteniendo detalles del pago ${ultimoPagoId}`);
      
      // Obtener detalles del pago
      const pagoInfo = await obtenerPago(ultimoPagoId);
      console.log(`[buscarPagosPorMerchantOrder] ✅ Pago encontrado: ID=${pagoInfo.id}, Estado=${pagoInfo.status}`);
      return pagoInfo;
    }
    
    console.log(`[buscarPagosPorMerchantOrder] ⚠️ No se encontraron pagos para merchant_order_id ${merchantOrderId}`);
    return null;
  } catch (error) {
    console.error("[buscarPagosPorMerchantOrder] ❌ Error buscando pagos por merchant_order_id:", {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data,
    });
    throw error;
  }
};

/**
 * Procesar notificación de webhook de Mercado Pago
 * @param {Object} data - Datos del webhook
 * @returns {Object} - Información del pago procesado
 */
export const procesarWebhook = async (data) => {
  try {
    // Mercado Pago envía diferentes tipos de notificaciones
    // Tipo "payment" contiene el ID del pago
    if (data.type === "payment") {
      const paymentId = data.data?.id;
      if (!paymentId) {
        throw new Error("Payment ID no encontrado en webhook");
      }

      // Obtener información completa del pago
      const pagoInfo = await obtenerPago(paymentId);

      return {
        processed: true,
        payment_id: paymentId,
        status: pagoInfo.status, // approved, rejected, pending, etc.
        status_detail: pagoInfo.status_detail,
        external_reference: pagoInfo.external_reference, // ID de la orden
        transaction_amount: pagoInfo.transaction_amount,
      };
    }

    return { processed: false, reason: "Tipo de notificación no soportado" };
  } catch (error) {
    console.error("Error procesando webhook de Mercado Pago:", error);
    throw error;
  }
};

/**
 * Validar la firma del webhook de Mercado Pago
 * @param {string} xSignature - Header x-signature de Mercado Pago (formato: "ts=<timestamp>,v1=<hash>")
 * @param {string} requestBody - Cuerpo de la petición (JSON stringificado)
 * @returns {boolean} - true si la firma es válida, false en caso contrario
 */
export const validarFirmaWebhook = (xSignature, requestBody) => {
  // Detectar si estamos en sandbox
  // IMPORTANTE: NODE_ENV puede ser "production" en Railway pero aún usar sandbox de MP
  // Por eso usamos una variable de entorno específica MP_SANDBOX o verificamos el token
  const isSandbox = MP_SANDBOX || (MP_ACCESS_TOKEN && (
    MP_ACCESS_TOKEN.includes("TEST-") || 
    // Los tokens de sandbox de MP pueden ser APP_USR- pero en modo test
    // Si no hay variable MP_SANDBOX, asumimos sandbox si el token no es de producción
    // (Los tokens de producción suelen tener un formato diferente)
    MP_ACCESS_TOKEN.startsWith("APP_USR-") && !MP_ACCESS_TOKEN.includes("prod")
  ));
  
  if (isSandbox) {
    console.log("🔍 [validarFirmaWebhook] Modo sandbox detectado (MP_SANDBOX o token de test)");
  }
  
  // Si no hay secret configurado, no validar (modo desarrollo sin secret)
  if (!MP_WEBHOOK_SECRET || MP_WEBHOOK_SECRET.trim() === "") {
    console.warn("⚠️ MP_WEBHOOK_SECRET no configurado. Validación de webhook deshabilitada.");
    // En sandbox, permitir webhooks sin validación (común en entornos de prueba)
    if (isSandbox) {
      console.warn("⚠️ Modo sandbox detectado. Permitiendo webhook sin validación de firma.");
      return true;
    }
    return true; // Permitir en desarrollo si no está configurado
  }

  // Si no hay header x-signature, rechazar (excepto en sandbox donde puede no estar presente)
  if (!xSignature || xSignature.trim() === "") {
    if (isSandbox) {
      console.warn("⚠️ Header x-signature no presente en webhook (sandbox). Permitiendo webhook.");
      return true; // En sandbox, permitir webhooks sin firma
    }
    console.error("❌ Header x-signature no presente en webhook");
    return false;
  }

  try {
    // Extraer timestamp (ts) y firma (v1) del header x-signature
    // Formato: "ts=<timestamp>,v1=<hash>"
    const signatureParts = xSignature.split(",");
    let timestamp = null;
    let receivedHash = null;

    for (const part of signatureParts) {
      const [key, value] = part.split("=");
      if (key.trim() === "ts") {
        timestamp = value.trim();
      } else if (key.trim() === "v1") {
        receivedHash = value.trim();
      }
    }

    if (!timestamp || !receivedHash) {
      console.error("❌ Formato de x-signature inválido:", xSignature);
      return false;
    }

    // Concatenar timestamp + body
    const dataToHash = `${timestamp}.${requestBody}`;

    // Calcular HMAC-SHA256 usando MP_WEBHOOK_SECRET
    const calculatedHash = crypto
      .createHmac("sha256", MP_WEBHOOK_SECRET)
      .update(dataToHash)
      .digest("hex");

    // Comparar hash calculado con el recibido (comparación segura contra timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(calculatedHash, "hex"),
      Buffer.from(receivedHash, "hex")
    );

    if (!isValid) {
      console.error("❌ Firma de webhook inválida. Posible webhook falso o secret incorrecto.");
      console.error("   Calculado:", calculatedHash);
      console.error("   Recibido:", receivedHash);
      
      // En sandbox, permitir webhooks con firma inválida (común en entornos de prueba)
      if (isSandbox) {
        console.warn("⚠️ Modo sandbox detectado. Permitiendo webhook a pesar de firma inválida.");
        console.warn("⚠️ NOTA: En producción, esto sería rechazado. Verifica MP_WEBHOOK_SECRET.");
        return true; // En sandbox, permitir webhooks con firma inválida
      }
    }

    return isValid;
  } catch (error) {
    console.error("❌ Error validando firma de webhook:", error);
    return false;
  }
};

