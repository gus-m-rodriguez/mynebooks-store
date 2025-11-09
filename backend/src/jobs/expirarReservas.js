import { pool } from "../db.js";
import { reactivarCarritoDesdeOrden } from "../utils/carrito.js";
import { obtenerPago } from "../libs/mercadopago.js";

/**
 * Job para expirar órdenes 'en_pago' que superaron el TTL
 * Este job debe ejecutarse periódicamente (ej: cada 1-5 minutos)
 * 
 * Regla de negocio: Las órdenes 'en_pago' que superan fecha_expiracion (15 minutos):
 * 1. Si no hay pago registrado o el pago está pendiente/en proceso: pasar a estado 'error' (requiere intervención de admin, NO libera stock)
 * 2. Si el pago fue rechazado: pasar a estado 'rechazado' (libera stock, reactiva carrito)
 * 3. Si el pago fue cancelado: pasar a estado 'cancelado' (libera stock, reactiva carrito)
 * 4. Si el pago fue aprobado: pasar a estado 'pagado' (descuenta stock definitivo)
 * 5. Se limpia fecha_expiracion
 */
export const expirarReservas = async () => {
  try {
    const ahora = new Date();

    // Buscar órdenes 'en_pago' que expiraron (solo estas tienen stock reservado)
    const ordenesExpiradas = await pool.query(
      `SELECT id_orden, id_usuario 
       FROM ordenes 
       WHERE estado = 'en_pago' 
       AND fecha_expiracion IS NOT NULL 
       AND fecha_expiracion < $1`,
      [ahora]
    );

    if (ordenesExpiradas.rowCount === 0) {
      console.log("✅ No hay órdenes expiradas para procesar");
      return { procesadas: 0 };
    }

    console.log(`🕐 Procesando ${ordenesExpiradas.rowCount} orden(es) expirada(s)...`);

    let procesadas = 0;

    for (const orden of ordenesExpiradas.rows) {
      // Verificar si hay un pago registrado para esta orden
      const pago = await pool.query(
        "SELECT id_pago, mp_id, estado FROM pagos WHERE id_orden = $1 ORDER BY id_pago DESC LIMIT 1",
        [orden.id_orden]
      );

      let nuevoEstado = "error"; // Por defecto, pasar a error (requiere intervención de admin)
      let tienePagoEnMP = false;
      let liberarStock = false;
      let reactivarCarrito = false;
      let descontarStock = false;

      // Si hay un pago con mp_id, verificar su estado en Mercado Pago
      if (pago.rowCount > 0 && pago.rows[0].mp_id) {
        try {
          const pagoInfo = await obtenerPago(pago.rows[0].mp_id);
          tienePagoEnMP = true;
          
          // Si el pago fue rechazado o cancelado, usar ese estado
          if (pagoInfo.status === "rejected") {
            nuevoEstado = "rechazado";
            liberarStock = true;
            reactivarCarrito = true;
          } else if (pagoInfo.status === "cancelled") {
            nuevoEstado = "cancelado";
            liberarStock = true;
            reactivarCarrito = true;
          } else if (pagoInfo.status === "approved") {
            // Si el pago fue aprobado pero la orden no se actualizó, actualizarla
            nuevoEstado = "pagado";
            liberarStock = true;
            descontarStock = true;
            console.log(`⚠️ Orden ${orden.id_orden} tiene pago aprobado pero estaba en 'en_pago'. Actualizando a 'pagado'.`);
          } else {
            // Pago pendiente o en proceso después de 15 minutos: pasar a error
            nuevoEstado = "error";
            // NO liberar stock, queda reservado para intervención de admin
            console.log(`⚠️ Orden ${orden.id_orden} en 'en_pago' por más de 15 minutos con pago pendiente. Pasando a 'error'.`);
          }
        } catch (error) {
          console.error(`Error verificando pago MP para orden ${orden.id_orden}:`, error);
          // Si falla la verificación, pasar a error (requiere intervención de admin)
          nuevoEstado = "error";
        }
      } else {
        // No hay pago registrado después de 15 minutos: pasar a error
        console.log(`⚠️ Orden ${orden.id_orden} en 'en_pago' por más de 15 minutos sin pago registrado. Pasando a 'error'.`);
      }

      // Obtener items de la orden para liberar stock y reactivar carrito
      const items = await pool.query(
        "SELECT id_producto, cantidad FROM orden_items WHERE id_orden = $1",
        [orden.id_orden]
      );

      // Usar transacción para garantizar atomicidad
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Manejar stock según el nuevo estado
        if (descontarStock && liberarStock) {
          // Pago aprobado: descontar stock definitivo y liberar reserva
          for (const item of items.rows) {
            const resultado = await client.query(
              `UPDATE productos 
               SET stock = stock - $1, stock_reserved = stock_reserved - $1
               WHERE id_producto = $2 AND stock_reserved >= $1
               RETURNING id_producto`,
              [item.cantidad, item.id_producto]
            );
            
            if (resultado.rowCount === 0) {
              console.warn(`⚠️ No se pudo descontar stock para producto ${item.id_producto} en orden ${orden.id_orden}. Puede que ya se haya procesado.`);
            }
          }
        } else if (liberarStock) {
          // Rechazado/Cancelado: solo liberar reserva
        for (const item of items.rows) {
          const resultado = await client.query(
            `UPDATE productos 
             SET stock_reserved = stock_reserved - $1 
             WHERE id_producto = $2 
               AND stock_reserved >= $1
             RETURNING id_producto`,
            [item.cantidad, item.id_producto]
          );
          
          // Si no se pudo liberar, loguear pero continuar (puede ser que ya se liberó)
          if (resultado.rowCount === 0) {
            console.warn(`⚠️ No se pudo liberar stock_reserved para producto ${item.id_producto} en orden ${orden.id_orden}. Puede que ya se haya liberado.`);
          }
        }

          // Reactivar carrito solo si se libera stock (rechazado/cancelado)
          if (reactivarCarrito) {
        await reactivarCarritoDesdeOrden(orden.id_usuario, items.rows, client);
          }
        }
        // Estado 'error': NO libera stock, queda reservado para intervención de admin

        // Actualizar estado de la orden y limpiar fecha_expiracion
        await client.query(
          `UPDATE ordenes 
           SET estado = $1, fecha_expiracion = NULL 
           WHERE id_orden = $2`,
          [nuevoEstado, orden.id_orden]
        );

        // Registrar en auditoría según el nuevo estado
        let tipoAuditoria;
        if (nuevoEstado === "error") {
          tipoAuditoria = "orden_expirada_pasada_a_error";
        } else if (nuevoEstado === "pagado") {
          tipoAuditoria = "orden_expirada_pago_aprobado";
        } else if (nuevoEstado === "rechazado" || nuevoEstado === "cancelado") {
          tipoAuditoria = "orden_expirada_carrito_reactivado";
        } else {
          tipoAuditoria = "orden_expirada";
        }

        await client.query(
          `INSERT INTO auditoria (tipo, usuario, fecha) 
           VALUES ($1, $2, CURRENT_TIMESTAMP)`,
          [
            tipoAuditoria,
            `usuario_${orden.id_usuario}`,
          ]
        );

        await client.query("COMMIT");

        // Enviar email de confirmación si la orden cambió a "pagado"
        if (nuevoEstado === "pagado") {
          try {
            const { enviarEmailConfirmacionOrdenPagada } = await import("../utils/email.js");
            await enviarEmailConfirmacionOrdenPagada(pool, orden.id_orden, orden.id_usuario);
          } catch (emailError) {
            console.error(`[ExpirarReservas] Error enviando email de confirmación para orden ${orden.id_orden}:`, emailError);
            // No fallar el job si el email falla
          }
        }

        procesadas++;
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`Error procesando orden expirada ${orden.id_orden}:`, error);
        // Continuar con la siguiente orden aunque esta falle
      } finally {
        client.release();
      }
    }

    console.log(`✅ ${procesadas} orden(es) expirada(s) procesada(s)`);
    return { procesadas };
  } catch (error) {
    console.error("❌ Error al expirar reservas:", error);
    throw error;
  }
};

