import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import {
  EMAIL_FROM,
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_ACCESS_TOKEN,
} from "../config.js";
import { pool } from "../db.js";

// Cache del cliente Gmail para reutilizar conexiones
let gmailClient = null;

/**
 * Obtiene un cliente de Gmail configurado con OAuth2
 * Si el access token expiró, lo renueva automáticamente
 */
const getGmailClient = async () => {
  if (gmailClient) {
    return gmailClient;
  }

  // Validar que tenemos las credenciales necesarias
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error(
      "Configuración de Gmail OAuth2 incompleta. Verifica GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET y GMAIL_REFRESH_TOKEN en .env"
    );
  }

  // Crear cliente OAuth2
  const oauth2Client = new OAuth2Client(
    GMAIL_CLIENT_ID,
    GMAIL_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground"
  );

  // Configurar refresh token y access token
  oauth2Client.setCredentials({
    refresh_token: GMAIL_REFRESH_TOKEN,
    access_token: GMAIL_ACCESS_TOKEN,
  });

  // Obtener access token (renueva si es necesario)
  try {
    console.log("🔄 Obteniendo access token de Gmail...");
    await oauth2Client.getAccessToken();
    console.log("✅ Access token obtenido correctamente");
  } catch (error) {
    console.error("❌ Error obteniendo access token de Gmail:", error);
    console.error("📋 Detalles del error:", error.message);
    if (error.message.includes("invalid_grant")) {
      throw new Error("Refresh token inválido o expirado. Necesitas generar un nuevo refresh token desde OAuth 2.0 Playground.");
    }
    throw new Error(`No se pudo obtener el token de acceso de Gmail: ${error.message}`);
  }

  // Crear cliente Gmail
  gmailClient = google.gmail({ version: "v1", auth: oauth2Client });
  console.log("✅ Cliente Gmail configurado correctamente");

  return gmailClient;
};

/**
 * Valida el formato de un email
 */
const validarEmail = (email) => {
  if (!email || typeof email !== "string") {
    return false;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

/**
 * Valida el dominio del email (opcional - puede bloquear dominios específicos)
 */
const validarDominio = (email) => {
  // Por ahora, permitimos todos los dominios
  // En el futuro se puede agregar lógica para bloquear dominios específicos
  return true;
};

/**
 * Verifica límites de envío por usuario (placeholder - implementar si es necesario)
 */
const verificarLimiteUsuario = async (usuarioId) => {
  // TODO: Implementar verificación de límites por usuario
  return true;
};

/**
 * Verifica límites de envío por IP (placeholder - implementar si es necesario)
 */
const verificarLimiteIP = async (ip) => {
  // TODO: Implementar verificación de límites por IP
  return true;
};

/**
 * Registra el envío de email en la base de datos para auditoría
 */
const registrarEnvioEmail = async (tipo, usuario, destinatario, asunto, exito, error = null) => {
  try {
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      [`${tipo}_${exito ? "exitoso" : "fallido"}`, usuario || "sistema"]
    );
  } catch (err) {
    console.error("Error registrando envío de email en auditoría:", err);
    // No fallar si no se puede registrar en auditoría
  }
};

/**
 * Renderiza una plantilla HTML
 */
const renderizarTemplate = async (templateName, datos) => {
  // Por ahora, renderizamos directamente
  // En el futuro se puede usar un motor de templates como Handlebars o EJS
  // Convertimos los templates en funciones para que solo se evalúen cuando se necesiten
  const templates = {
    bienvenida: (d) => `
      ${plantillaBase(`
        <h1 style="color: #2c3e50; margin-bottom: 20px;">¡Bienvenido a MyneBooks Store!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Hola <strong>${d.nombre}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Gracias por registrarte en nuestra tienda de libros. Estamos emocionados de tenerte como parte de nuestra comunidad.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Ahora puedes explorar nuestro catálogo, agregar productos a tu carrito y realizar compras de forma segura.
        </p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.ORIGIN || "http://localhost:5173"}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Explorar Catálogo
          </a>
        </div>
      `)}
    `,
    "reset-password": (d) => `
      ${plantillaBase(`
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Restablecer Contraseña</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Hola <strong>${d.nombre}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Recibimos una solicitud para restablecer tu contraseña. Si no fuiste tú, puedes ignorar este email.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Para restablecer tu contraseña, haz clic en el siguiente botón:
        </p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${d.resetUrl}" 
             style="background-color: #e74c3c; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Restablecer Contraseña
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #7f8c8d; margin-top: 30px;">
          O copia y pega este enlace en tu navegador:<br>
          <a href="${d.resetUrl}" style="color: #3498db;">${d.resetUrl}</a>
        </p>
        <p style="font-size: 14px; line-height: 1.6; color: #7f8c8d; margin-top: 20px;">
          <strong>Nota:</strong> Este enlace expirará en 1 hora por seguridad.
        </p>
      `)}
    `,
    "orden-confirmacion": (d) => `
      ${plantillaBase(`
        <h1 style="color: #2c3e50; margin-bottom: 20px;">¡Orden Confirmada!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Hola <strong>${d.nombre}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Hemos recibido tu orden <strong>#${d.ordenId}</strong> y está siendo procesada.
        </p>
        <div style="background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h2 style="color: #2c3e50; margin-top: 0;">Detalles de la Orden</h2>
          <p><strong>Orden #:</strong> ${d.ordenId}</p>
          <p><strong>Fecha:</strong> ${d.fecha}</p>
          <p><strong>Dirección de envío:</strong> ${d.direccionEnvio}</p>
        </div>
        <div style="margin: 20px 0;">
          <h3 style="color: #2c3e50;">Productos:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #34495e; color: white;">
                <th style="padding: 10px; text-align: left;">Producto</th>
                <th style="padding: 10px; text-align: right;">Cantidad</th>
                <th style="padding: 10px; text-align: right;">Precio</th>
                <th style="padding: 10px; text-align: right;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${(d.items || []).map(item => {
                const precio = parseFloat(item.precio_unitario) || 0;
                const cantidad = parseInt(item.cantidad) || 0;
                return `
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #ecf0f1;">${item.titulo}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ecf0f1;">${cantidad}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ecf0f1;">$${precio.toFixed(2)}</td>
                  <td style="padding: 10px; text-align: right; border-bottom: 1px solid #ecf0f1;">$${(cantidad * precio).toFixed(2)}</td>
                </tr>
              `;
              }).join("")}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
                <td style="padding: 10px; text-align: right; font-weight: bold; font-size: 18px; color: #27ae60;">$${d.total.toFixed(2)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Te notificaremos cuando tu orden sea enviada.
        </p>
      `)}
    `,
    "orden-estado": (d) => `
      ${plantillaBase(`
        <h1 style="color: #2c3e50; margin-bottom: 20px;">Actualización de Orden</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Hola <strong>${d.nombre}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          El estado de tu orden <strong>#${d.ordenId}</strong> ha cambiado.
        </p>
        <div style="background-color: #ecf0f1; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Estado anterior:</strong> ${d.estadoAnterior}</p>
          <p><strong>Estado actual:</strong> <span style="color: #27ae60; font-weight: bold;">${d.estadoNuevo}</span></p>
          <p><strong>Fecha:</strong> ${d.fecha}</p>
        </div>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.ORIGIN || "http://localhost:5173"}/ordenes/${d.ordenId}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Ver Detalles de la Orden
          </a>
        </div>
      `)}
    `,
    "orden-envio": (d) => `
      ${plantillaBase(`
        <h1 style="color: #2c3e50; margin-bottom: 20px;">🚚 ¡Tu Orden ha sido Enviada!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Hola <strong>${d.nombre}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          ¡Excelentes noticias! Tu orden <strong>#${d.ordenId}</strong> ha sido enviada y está en camino.
        </p>
        <div style="background-color: #e8f5e9; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #27ae60;">
          <p style="margin: 0; font-size: 16px; color: #2c3e50;">
            <strong>📦 Estado:</strong> <span style="color: #27ae60; font-weight: bold;">En Envío</span>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #34495e;">
            <strong>📍 Dirección de envío:</strong> ${d.direccionEnvio}
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #34495e;">
            <strong>📅 Fecha de envío:</strong> ${d.fecha}
          </p>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Recibirás una notificación cuando tu pedido sea entregado. Si tienes alguna pregunta sobre tu orden, no dudes en contactarnos.
        </p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.ORIGIN || "http://localhost:5173"}/ordenes/${d.ordenId}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Ver Detalles de la Orden
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #7f8c8d; margin-top: 30px;">
          Gracias por tu compra en MyneBooks Store.
        </p>
      `)}
    `,
    "orden-entregada": (d) => `
      ${plantillaBase(`
        <h1 style="color: #2c3e50; margin-bottom: 20px;">🎉 ¡Tu Orden ha sido Entregada!</h1>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Hola <strong>${d.nombre}</strong>,
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          ¡Excelentes noticias! Tu orden <strong>#${d.ordenId}</strong> ha sido entregada exitosamente.
        </p>
        <div style="background-color: #fff3cd; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #f39c12;">
          <p style="margin: 0; font-size: 16px; color: #2c3e50;">
            <strong>📦 Estado:</strong> <span style="color: #f39c12; font-weight: bold;">Entregada</span>
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #34495e;">
            <strong>📍 Dirección de entrega:</strong> ${d.direccionEnvio}
          </p>
          <p style="margin: 10px 0 0 0; font-size: 14px; color: #34495e;">
            <strong>📅 Fecha de entrega:</strong> ${d.fecha}
          </p>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e;">
          Esperamos que disfrutes de tus libros. Si tienes alguna pregunta o necesitas asistencia, no dudes en contactarnos.
        </p>
        <p style="font-size: 16px; line-height: 1.6; color: #34495e; font-style: italic; margin-top: 20px;">
          ¡Gracias por elegir MyneBooks Store! Esperamos verte pronto nuevamente.
        </p>
        <div style="margin-top: 30px; text-align: center;">
          <a href="${process.env.ORIGIN || "http://localhost:5173"}/ordenes/${d.ordenId}" 
             style="background-color: #3498db; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Ver Detalles de la Orden
          </a>
        </div>
        <p style="font-size: 14px; line-height: 1.6; color: #7f8c8d; margin-top: 30px;">
          Gracias por confiar en nosotros.
        </p>
      `)}
    `,
  };

  const template = templates[templateName];
  if (!template) {
    throw new Error(`Plantilla "${templateName}" no encontrada`);
  }

  return template(datos);
};

/**
 * Plantilla base HTML con identidad visual de MyneBooks
 */
const plantillaBase = (contenido) => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MyneBooks Store</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f4f4f4;">
    <tr>
      <td style="padding: 20px 0;">
        <table role="presentation" style="width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 5px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 5px 5px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 28px;">📚 MyneBooks Store</h1>
              <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 14px;">Tu tienda de libros favorita</p>
            </td>
          </tr>
          <!-- Contenido -->
          <tr>
            <td style="padding: 40px;">
              ${contenido}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #2c3e50; padding: 20px; text-align: center; border-radius: 0 0 5px 5px;">
              <p style="color: #ecf0f1; margin: 0; font-size: 12px;">
                © ${new Date().getFullYear()} MyneBooks Store. Todos los derechos reservados.
              </p>
              <p style="color: #95a5a6; margin: 10px 0 0 0; font-size: 12px;">
                Este es un email automático, por favor no respondas a este mensaje.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
};

/**
 * Convierte un email a formato RFC 2822 para Gmail API
 */
const crearMensajeEmail = (to, subject, html) => {
  const mensaje = [
    `From: ${EMAIL_FROM}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/html; charset=utf-8`,
    ``,
    html,
  ].join("\n");

  // Codificar en base64url (Gmail API requiere base64url, no base64)
  return Buffer.from(mensaje)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

/**
 * Función principal para enviar emails usando Gmail API
 * @param {string} to - Destinatario
 * @param {string} subject - Asunto
 * @param {string} html - Contenido HTML
 * @param {object} options - Opciones adicionales (usuarioId, ip, tipo para auditoría)
 */
export const enviarEmail = async (to, subject, html, options = {}) => {
  const { usuarioId, ip, tipo = "email_generico" } = options;

  try {
    // Validaciones
    if (!validarEmail(to)) {
      throw new Error("Email inválido");
    }
    if (!validarDominio(to)) {
      throw new Error("Dominio de email no permitido");
    }
    if (!(await verificarLimiteUsuario(usuarioId))) {
      throw new Error("Límite de envío por usuario excedido");
    }
    if (!(await verificarLimiteIP(ip))) {
      throw new Error("Límite de envío por IP excedido");
    }

    // Obtener cliente Gmail
    const gmail = await getGmailClient();

    // Crear mensaje en formato RFC 2822
    const mensajeCodificado = crearMensajeEmail(to, subject, html);

    // Enviar email usando Gmail API
    console.log(`📧 Enviando email a ${to}...`);
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: mensajeCodificado,
      },
    });

    // Registrar envío exitoso
    await registrarEnvioEmail(tipo, usuarioId ? `usuario_${usuarioId}` : null, to, subject, true);

    console.log(`✅ Email enviado a ${to}: ${subject} (Message ID: ${response.data.id})`);
    return { success: true, messageId: response.data.id };
  } catch (error) {
    console.error(`❌ Error enviando email a ${to}:`, error.message);
    
    // Si el error es por falta de configuración OAuth2, mostrar mensaje más claro
    if (error.message.includes("Configuración de Gmail OAuth2 incompleta") || 
        error.message.includes("GMAIL_CLIENT_ID") ||
        error.message.includes("GMAIL_CLIENT_SECRET") ||
        error.message.includes("GMAIL_REFRESH_TOKEN")) {
      console.error("⚠️  ADVERTENCIA: Las credenciales OAuth2 de Gmail no están configuradas.");
      console.error("   Configura GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET y GMAIL_REFRESH_TOKEN en .env");
      console.error("   Ver: backend/INSTRUCCIONES_GMAIL_OAUTH2.md");
    }

    // Registrar error
    await registrarEnvioEmail(
      tipo,
      usuarioId ? `usuario_${usuarioId}` : null,
      to,
      subject,
      false,
      error.message
    );

    // No lanzar error en producción para no interrumpir el flujo principal
    // Solo loguear el error
    if (process.env.NODE_ENV === "development") {
      throw error;
    }

    return { success: false, error: error.message };
  }
};

/**
 * Envía email de bienvenida al registrarse
 */
export const enviarEmailBienvenida = async (email, nombre, usuarioId = null) => {
  const html = await renderizarTemplate("bienvenida", {
    nombre: nombre,
    email: email,
  });

  return await enviarEmail(
    email,
    "Bienvenido a MyneBooks Store",
    html,
    { usuarioId, tipo: "email_bienvenida" }
  );
};

/**
 * Envía email de restablecimiento de contraseña
 */
export const enviarEmailResetPassword = async (email, nombre, resetToken, usuarioId = null) => {
  // Codificar el token para la URL (importante para caracteres especiales)
  const tokenEncoded = encodeURIComponent(resetToken);
  const resetUrl = `${process.env.ORIGIN || "http://localhost:5173"}/reset-password?token=${tokenEncoded}`;

  const html = await renderizarTemplate("reset-password", {
    nombre: nombre,
    resetUrl: resetUrl,
    token: resetToken, // Por si prefieren copiar/pegar (sin codificar para mostrar)
  });

  return await enviarEmail(
    email,
    "Reset Password - MyneBooks Store",
    html,
    { usuarioId, tipo: "email_reset_password" }
  );
};

/**
 * Envía email de confirmación de orden
 */
export const enviarEmailOrdenConfirmacion = async (email, nombre, ordenId, items, total, direccionEnvio, usuarioId = null) => {
  const html = await renderizarTemplate("orden-confirmacion", {
    nombre: nombre,
    ordenId: ordenId,
    items: items,
    total: total,
    direccionEnvio: direccionEnvio,
    fecha: new Date().toLocaleDateString("es-AR"),
  });

  return await enviarEmail(
    email,
    `Confirmacion de Orden #${ordenId} - MyneBooks Store`,
    html,
    { usuarioId, tipo: "email_orden_confirmacion" }
  );
};

/**
 * Envía email de confirmación de orden cuando cambia a estado "pagado"
 * Obtiene todos los datos necesarios de la base de datos
 */
export const enviarEmailConfirmacionOrdenPagada = async (pool, ordenId, usuarioId) => {
  try {
    // Obtener datos del usuario
    const usuarioData = await pool.query(
      "SELECT nombre, apellido, email FROM usuarios WHERE id_usuario = $1",
      [usuarioId]
    );

    if (usuarioData.rowCount === 0) {
      console.error(`[Email] Usuario no encontrado para orden ${ordenId}`);
      return;
    }

    // Obtener items de la orden
    const itemsData = await pool.query(
      `SELECT oi.cantidad, oi.precio_unitario, p.titulo
       FROM orden_items oi
       INNER JOIN productos p ON oi.id_producto = p.id_producto
       WHERE oi.id_orden = $1`,
      [ordenId]
    );

    // Obtener dirección de envío de la orden
    const ordenData = await pool.query(
      "SELECT direccion_envio FROM ordenes WHERE id_orden = $1",
      [ordenId]
    );

    if (ordenData.rowCount === 0) {
      console.error(`[Email] Orden no encontrada: ${ordenId}`);
      return;
    }

    // Calcular total
    const total = itemsData.rows.reduce((sum, item) => {
      const precio = parseFloat(item.precio_unitario) || 0;
      const cantidad = parseInt(item.cantidad) || 0;
      return sum + precio * cantidad;
    }, 0);

    // Enviar email
    await enviarEmailOrdenConfirmacion(
      usuarioData.rows[0].email,
      usuarioData.rows[0].nombre,
      ordenId,
      itemsData.rows,
      total,
      ordenData.rows[0].direccion_envio,
      usuarioId
    );

    console.log(`[Email] Email de confirmación enviado para orden ${ordenId}`);
  } catch (error) {
    console.error(`[Email] Error enviando email de confirmación para orden ${ordenId}:`, error);
    // No lanzar error, solo loguear
  }
};

/**
 * Envía email de actualización de estado de orden
 */
export const enviarEmailOrdenEstado = async (email, nombre, ordenId, estadoAnterior, estadoNuevo, usuarioId = null) => {
  const estados = {
    pendiente: "Pendiente",
    en_pago: "En proceso de pago",
    pagado: "Pagado",
    en_envio: "En Envío",
    entregada: "Entregada",
    cancelado: "Cancelado",
    rechazado: "Rechazado",
    error: "Error",
    expirada: "Expirada",
  };

  const html = await renderizarTemplate("orden-estado", {
    nombre: nombre,
    ordenId: ordenId,
    estadoAnterior: estados[estadoAnterior] || estadoAnterior,
    estadoNuevo: estados[estadoNuevo] || estadoNuevo,
    fecha: new Date().toLocaleDateString("es-AR"),
  });

  return await enviarEmail(
    email,
    `Actualizacion de Orden #${ordenId} - MyneBooks Store`,
    html,
    { usuarioId, tipo: "email_orden_estado" }
  );
};

/**
 * Envía email de notificación de envío cuando la orden cambia a estado "en_envio"
 * Obtiene todos los datos necesarios de la base de datos
 */
export const enviarEmailOrdenEnvio = async (pool, ordenId, usuarioId) => {
  try {
    // Obtener datos del usuario
    const usuarioData = await pool.query(
      "SELECT nombre, apellido, email FROM usuarios WHERE id_usuario = $1",
      [usuarioId]
    );

    if (usuarioData.rowCount === 0) {
      console.error(`[Email] Usuario no encontrado para orden ${ordenId}`);
      return;
    }

    // Obtener dirección de envío de la orden
    const ordenData = await pool.query(
      "SELECT direccion_envio FROM ordenes WHERE id_orden = $1",
      [ordenId]
    );

    if (ordenData.rowCount === 0) {
      console.error(`[Email] Orden no encontrada: ${ordenId}`);
      return;
    }

    // Enviar email
    const html = await renderizarTemplate("orden-envio", {
      nombre: usuarioData.rows[0].nombre,
      ordenId: ordenId,
      direccionEnvio: ordenData.rows[0].direccion_envio,
      fecha: new Date().toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });

    await enviarEmail(
      usuarioData.rows[0].email,
      `Tu Orden #${ordenId} ha sido Enviada - MyneBooks Store`,
      html,
      { usuarioId, tipo: "email_orden_envio" }
    );

    console.log(`[Email] Email de envío enviado para orden ${ordenId}`);
  } catch (error) {
    console.error(`[Email] Error enviando email de envío para orden ${ordenId}:`, error);
    // No lanzar error, solo loguear
  }
};

/**
 * Envía email de confirmación de entrega cuando la orden cambia a estado "entregada"
 * Obtiene todos los datos necesarios de la base de datos
 */
export const enviarEmailOrdenEntregada = async (pool, ordenId, usuarioId) => {
  try {
    // Obtener datos del usuario
    const usuarioData = await pool.query(
      "SELECT nombre, apellido, email FROM usuarios WHERE id_usuario = $1",
      [usuarioId]
    );

    if (usuarioData.rowCount === 0) {
      console.error(`[Email] Usuario no encontrado para orden ${ordenId}`);
      return;
    }

    // Obtener dirección de envío de la orden
    const ordenData = await pool.query(
      "SELECT direccion_envio FROM ordenes WHERE id_orden = $1",
      [ordenId]
    );

    if (ordenData.rowCount === 0) {
      console.error(`[Email] Orden no encontrada: ${ordenId}`);
      return;
    }

    // Enviar email
    const html = await renderizarTemplate("orden-entregada", {
      nombre: usuarioData.rows[0].nombre,
      ordenId: ordenId,
      direccionEnvio: ordenData.rows[0].direccion_envio,
      fecha: new Date().toLocaleDateString("es-AR", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    });

    await enviarEmail(
      usuarioData.rows[0].email,
      `Tu Orden #${ordenId} ha sido Entregada - MyneBooks Store`,
      html,
      { usuarioId, tipo: "email_orden_entregada" }
    );

    console.log(`[Email] Email de entrega enviado para orden ${ordenId}`);
  } catch (error) {
    console.error(`[Email] Error enviando email de entrega para orden ${ordenId}:`, error);
    // No lanzar error, solo loguear
  }
};
