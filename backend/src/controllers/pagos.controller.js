import { pool } from "../db.js";
import { procesarWebhook, validarFirmaWebhook } from "../libs/mercadopago.js";
import { reactivarCarritoDesdeOrden } from "../utils/carrito.js";

/**
 * Webhook de Mercado Pago
 * Procesa las notificaciones de Mercado Pago y actualiza el estado de las órdenes
 * 
 * Reglas de negocio:
 * - approved: Pago exitoso -> estado 'pagado', descuenta stock
 * - rejected: Pago rechazado (sin fondos) -> estado 'rechazado', libera stock_reserved
 * - pending: Pago pendiente -> mantiene estado 'en_pago'
 * - cancelled: Usuario canceló -> estado 'cancelado', libera stock_reserved
 * - error: Error en proceso -> estado 'error', mantiene stock_reserved para admin
 * 
 * Seguridad:
 * - Valida la firma del webhook usando MP_WEBHOOK_SECRET para asegurar que proviene de Mercado Pago
 */
export const webhookMercadoPago = async (req, res) => {
  try {
    // Obtener headers necesarios para validación según spec de Mercado Pago
    const xSignature = req.headers["x-signature"] || req.headers["x-signature"] || "";
    const xRequestId = req.headers["x-request-id"] || req.headers["x-request-id"] || "";
    
    // Logging para debugging de firma
    console.log("[webhookMercadoPago] Headers recibidos:", {
      xSignature: xSignature ? xSignature.substring(0, 50) + "..." : "N/A",
      xRequestId: xRequestId || "N/A",
      query: req.query,
      body: req.body,
    });
    
    // Usar el body parseado para procesarlo
    const data = req.body;

    // Validar firma del webhook antes de procesar (según spec oficial de MP)
    // NO usar rawBody, usar manifest con id, request-id y ts
    const firmaValida = validarFirmaWebhook(xSignature, xRequestId, req.query, req.body);
    
    if (!firmaValida) {
      console.error("❌ Webhook rechazado: Firma inválida");
      // Registrar intento de webhook falso en auditoría
      await pool.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["webhook_rechazado_firma_invalida", "sistema"]
      );
      
      return res.status(401).json({ 
        message: "Firma de webhook inválida. Acceso denegado.",
        error: "unauthorized"
      });
    }

    console.log("📥 Webhook recibido de Mercado Pago (firma válida):", JSON.stringify(data, null, 2));

    // Procesar webhook
    const resultado = await procesarWebhook(data);

    if (!resultado.processed) {
      return res.status(200).json({ message: "Webhook procesado pero no requiere acción" });
    }

    const { payment_id, status, status_detail, external_reference, transaction_amount } = resultado;

    // IDEMPOTENCIA: Verificar si este webhook ya fue procesado por mp_id
    // Esto previene procesamiento duplicado si Mercado Pago envía el mismo webhook múltiples veces
    const pagoExistentePorMpId = await pool.query(
      "SELECT id_pago, id_orden, estado as pago_estado FROM pagos WHERE mp_id = $1",
      [payment_id]
    );

    if (pagoExistentePorMpId.rowCount > 0) {
      const pagoExistente = pagoExistentePorMpId.rows[0];
      console.log(`✅ Webhook ya procesado anteriormente (idempotencia): mp_id=${payment_id}, orden=${pagoExistente.id_orden}, estado=${pagoExistente.pago_estado}`);
      
      // Retornar éxito sin procesar nuevamente (idempotencia)
      return res.status(200).json({
        message: "Webhook ya procesado anteriormente (idempotencia)",
        orden_id: pagoExistente.id_orden,
        payment_id: payment_id,
        estado_actual: pagoExistente.pago_estado,
        idempotente: true,
      });
    }

    // external_reference contiene el id_orden
    const ordenId = parseInt(external_reference);
    if (!ordenId || isNaN(ordenId)) {
      console.error("❌ ID de orden inválido en external_reference:", external_reference);
      return res.status(400).json({ message: "ID de orden inválido" });
    }

    // Verificar que la orden existe
    const orden = await pool.query(
      "SELECT id_orden, id_usuario, estado FROM ordenes WHERE id_orden = $1",
      [ordenId]
    );

    if (orden.rowCount === 0) {
      console.error("❌ Orden no encontrada:", ordenId);
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const ordenActual = orden.rows[0];

    // Obtener items de la orden para manejar stock
    const items = await pool.query(
      "SELECT id_producto, cantidad FROM orden_items WHERE id_orden = $1",
      [ordenId]
    );

    let nuevoEstado = ordenActual.estado;
    let actualizarStock = false;
    let liberarReserva = false;
    let descontarStock = false;

    // Determinar nuevo estado según el status de Mercado Pago
    switch (status) {
      case "approved":
        // Pago exitoso
        nuevoEstado = "pagado";
        actualizarStock = true;
        descontarStock = true;
        liberarReserva = true;
        break;

      case "rejected":
        // Pago rechazado (sin fondos, tarjeta inválida, etc.)
        nuevoEstado = "rechazado";
        actualizarStock = true;
        liberarReserva = true;
        break;

      case "cancelled":
        // Mercado Pago canceló el pago - mantener orden con estado "cancelada_mp"
        nuevoEstado = "cancelada_mp";
        actualizarStock = true;
        liberarReserva = true;
        break;

      case "pending":
        // Pago pendiente (ej: transferencia bancaria)
        // Mantener estado 'en_pago'
        nuevoEstado = "en_pago";
        break;

      case "in_process":
        // Pago en proceso
        nuevoEstado = "en_pago";
        break;

      default:
        // Cualquier otro estado (error, etc.)
        nuevoEstado = "error";
        // NO liberar stock, queda reservado para intervención de admin
        console.warn("⚠️ Estado de pago desconocido:", status, status_detail);
    }

    // Usar transacción para garantizar atomicidad
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Para todos los estados, actualizar normalmente (incluyendo cancelada_mp)
      await client.query(
        "UPDATE ordenes SET estado = $1 WHERE id_orden = $2",
        [nuevoEstado, ordenId]
      );

      // Registrar pago en tabla pagos
      // IDEMPOTENCIA: Verificar nuevamente dentro de la transacción por mp_id
      // (por si acaso otro proceso lo procesó entre la verificación inicial y ahora)
      const pagoExistenteEnTx = await client.query(
        "SELECT id_pago FROM pagos WHERE mp_id = $1",
        [payment_id]
      );

      if (pagoExistenteEnTx.rowCount > 0) {
        // Ya existe un pago con este mp_id (procesado por otro proceso concurrente)
        // Esto no debería pasar, pero por seguridad retornamos sin hacer cambios
        await client.query("ROLLBACK");
        console.log(`⚠️ Webhook procesado concurrentemente por otro proceso: mp_id=${payment_id}`);
        return res.status(200).json({
          message: "Webhook ya procesado por otro proceso (idempotencia)",
          payment_id: payment_id,
          idempotente: true,
        });
      }

      // Verificar si existe un pago para esta orden (puede tener mp_id diferente o NULL)
      const pagoExistentePorOrden = await client.query(
        "SELECT id_pago, mp_id FROM pagos WHERE id_orden = $1",
        [ordenId]
      );

      if (pagoExistentePorOrden.rowCount > 0) {
        const pagoAnterior = pagoExistentePorOrden.rows[0];
        // Si el pago anterior tiene un mp_id diferente, es un caso especial
        if (pagoAnterior.mp_id && pagoAnterior.mp_id !== payment_id) {
          console.warn(`⚠️ Orden ${ordenId} ya tiene un pago con mp_id diferente: ${pagoAnterior.mp_id} vs ${payment_id}`);
        }
        
        // Actualizar pago existente con el nuevo mp_id y estado
        // Manejar posible violación de índice único si el mp_id ya existe en otro registro
        try {
          await client.query(
            `UPDATE pagos 
             SET mp_id = $1, estado = $2, monto = $3, fecha_pago = $4
             WHERE id_orden = $5`,
            [payment_id, status, transaction_amount, status === "approved" ? new Date() : null, ordenId]
          );
        } catch (updateError) {
          // Si el error es por violación de índice único (mp_id duplicado)
          if (updateError.code === "23505" && updateError.constraint === "idx_pagos_mp_id_unique") {
            await client.query("ROLLBACK");
            console.log(`⚠️ Intento de UPDATE con mp_id duplicado (idempotencia): mp_id=${payment_id}`);
            return res.status(200).json({
              message: "Webhook ya procesado (mp_id duplicado detectado por índice único)",
              payment_id: payment_id,
              idempotente: true,
            });
          }
          // Si es otro error, relanzarlo
          throw updateError;
        }
      } else {
        // Crear nuevo registro de pago
        // El índice único idx_pagos_mp_id_unique previene duplicados
        try {
          await client.query(
            `INSERT INTO pagos (id_orden, mp_id, estado, monto, fecha_pago)
             VALUES ($1, $2, $3, $4, $5)`,
            [ordenId, payment_id, status, transaction_amount, status === "approved" ? new Date() : null]
          );
        } catch (insertError) {
          // Si el error es por violación de índice único (mp_id duplicado)
          if (insertError.code === "23505" && insertError.constraint === "idx_pagos_mp_id_unique") {
            await client.query("ROLLBACK");
            console.log(`⚠️ Intento de INSERT con mp_id duplicado (idempotencia): mp_id=${payment_id}`);
            return res.status(200).json({
              message: "Webhook ya procesado (mp_id duplicado detectado por índice único)",
              payment_id: payment_id,
              idempotente: true,
            });
          }
          // Si es otro error, relanzarlo
          throw insertError;
        }
      }

      // Manejar stock según el resultado
      if (actualizarStock && items.rowCount > 0) {
        for (const item of items.rows) {
          if (descontarStock && liberarReserva) {
            // Pago exitoso: descontar stock y liberar reserva
            // Check condicional: verificar que hay stock_reserved suficiente
            const resultado = await client.query(
              `UPDATE productos 
               SET stock = stock - $1, 
                   stock_reserved = stock_reserved - $1 
               WHERE id_producto = $2 
                 AND stock_reserved >= $1
               RETURNING id_producto`,
              [item.cantidad, item.id_producto]
            );
            
            if (resultado.rowCount === 0) {
              await client.query("ROLLBACK");
              console.error(`Error: Stock reservado insuficiente para producto ${item.id_producto} en orden ${ordenId}`);
              return res.status(400).json({
                message: "Error procesando pago: stock reservado insuficiente",
              });
            }
          } else if (liberarReserva) {
            // Rechazado/Cancelado: solo liberar reserva
            // Check condicional: verificar que hay stock_reserved para liberar
            const resultado = await client.query(
              `UPDATE productos 
               SET stock_reserved = stock_reserved - $1 
               WHERE id_producto = $2 
                 AND stock_reserved >= $1
               RETURNING id_producto`,
              [item.cantidad, item.id_producto]
            );
            
            if (resultado.rowCount === 0) {
              await client.query("ROLLBACK");
              console.error(`Error: Stock reservado insuficiente para producto ${item.id_producto} en orden ${ordenId}`);
              return res.status(400).json({
                message: "Error procesando pago: stock reservado insuficiente",
              });
            }
          }
          // Estado 'error': NO tocar stock, queda reservado
        }
        
        // Si la orden estaba 'en_pago' y se cancela/rechaza, reactivar el carrito
        if (ordenActual.estado === "en_pago" && (nuevoEstado === "cancelado" || nuevoEstado === "rechazado" || nuevoEstado === "cancelada_mp")) {
          await reactivarCarritoDesdeOrden(ordenActual.id_usuario, items.rows, client);
        }
      }

      // Registrar en auditoría
      await client.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [
          `pago_${status}`,
          `usuario_${ordenActual.id_usuario}`,
        ]
      );

      await client.query("COMMIT");

      // Enviar email de confirmación si la orden cambió a "pagado"
      if (nuevoEstado === "pagado" && ordenActual.estado !== "pagado") {
        try {
          const { enviarEmailConfirmacionOrdenPagada } = await import("../utils/email.js");
          await enviarEmailConfirmacionOrdenPagada(pool, ordenId, ordenActual.id_usuario);
        } catch (emailError) {
          console.error("Error enviando email de confirmación de orden:", emailError);
          // No fallar el webhook si el email falla
        }
      }

      // Enviar email de actualización de estado para otros cambios (no bloquea si falla)
      if (ordenActual.estado !== nuevoEstado && nuevoEstado !== "pagado") {
        try {
          const usuarioData = await pool.query(
            "SELECT nombre, apellido, email FROM usuarios WHERE id_usuario = $1",
            [ordenActual.id_usuario]
          );

          if (usuarioData.rowCount > 0) {
            const { enviarEmailOrdenEstado } = await import("../utils/email.js");
            await enviarEmailOrdenEstado(
              usuarioData.rows[0].email,
              usuarioData.rows[0].nombre,
              ordenId,
              ordenActual.estado,
              nuevoEstado,
              ordenActual.id_usuario
            );
          }
        } catch (emailError) {
          console.error("Error enviando email de actualización de estado:", emailError);
          // No fallar el webhook si el email falla
        }
      }

      console.log(`✅ Webhook procesado: Orden ${ordenId} -> ${nuevoEstado}`);

      res.status(200).json({
        message: "Webhook procesado correctamente",
        orden_id: ordenId,
        estado_anterior: ordenActual.estado,
        estado_nuevo: nuevoEstado,
        payment_status: status,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("❌ Error procesando webhook:", error);
      // Retornar 200 para que MP no reintente (o 500 si queremos que reintente)
      res.status(500).json({
        message: "Error procesando webhook",
        error: error.message,
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Error crítico procesando webhook:", error);
    res.status(500).json({
      message: "Error procesando webhook",
      error: error.message,
    });
  }
};

