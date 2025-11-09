import { pool } from "../db.js";
import { RESERVA_TTL_MINUTOS, ORIGIN } from "../config.js";
import { crearPreferenciaPago, obtenerPago } from "../libs/mercadopago.js";
import { reactivarCarritoDesdeOrden } from "../utils/carrito.js";
import { verificarPermiso } from "../middlewares/permissions.middleware.js";

// Listar órdenes del usuario
// Excluye órdenes canceladas por el usuario (estado 'cancelada_usuario')
// NO excluye órdenes canceladas por administrador
export const listarOrdenes = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT o.id_orden, o.id_usuario, o.fecha_creacion, o.fecha_expiracion, o.direccion_envio, o.estado,
       COUNT(oi.id_item) as total_items,
       SUM(oi.cantidad * oi.precio_unitario) as total
       FROM ordenes o
       LEFT JOIN orden_items oi ON o.id_orden = oi.id_orden
       WHERE o.id_usuario = $1
       GROUP BY o.id_orden
       ORDER BY o.fecha_creacion DESC`,
      [req.usuarioId]
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener las órdenes" });
  }
};

// Obtener una orden específica
// Los admins pueden ver cualquier orden, los usuarios solo las suyas
// Nota: Las órdenes canceladas por usuario se eliminan físicamente, por lo que no aparecerán aquí
export const obtenerOrden = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar si el usuario es admin
    const esAdmin = req.usuarioRol === "admin" || req.usuarioRol === "super_admin";
    
    // Si es admin, puede ver cualquier orden; si no, solo las suyas
    // Nota: Las órdenes canceladas por usuario se eliminan físicamente, por lo que no aparecerán aquí
    let orden;
    if (esAdmin) {
      orden = await pool.query(
        `SELECT o.id_orden, o.id_usuario, o.fecha_creacion, o.fecha_expiracion, o.direccion_envio, o.estado 
         FROM ordenes o
         WHERE o.id_orden = $1`,
        [id]
      );
    } else {
      orden = await pool.query(
        `SELECT o.id_orden, o.id_usuario, o.fecha_creacion, o.fecha_expiracion, o.direccion_envio, o.estado 
         FROM ordenes o
         WHERE o.id_orden = $1 AND o.id_usuario = $2`,
      [id, req.usuarioId]
    );
    }

    if (orden.rowCount === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    // Obtener items de la orden con información de stock disponible
    const items = await pool.query(
      `SELECT oi.id_item, oi.id_orden, oi.id_producto, oi.cantidad, oi.precio_unitario,
       p.titulo, p.autor, p.imagen_url, p.stock, p.stock_reserved,
       (p.stock - p.stock_reserved) as stock_disponible
       FROM orden_items oi
       INNER JOIN productos p ON oi.id_producto = p.id_producto
       WHERE oi.id_orden = $1`,
      [id]
    );

    // Obtener pago asociado si existe
    const pago = await pool.query(
      "SELECT id_pago, mp_id, estado, monto, fecha_pago FROM pagos WHERE id_orden = $1",
      [id]
    );

    // Si es admin, incluir información del usuario
    let usuarioInfo = null;
    if (esAdmin) {
      const usuario = await pool.query(
        `SELECT id_usuario, nombre, apellido, email, rol 
         FROM usuarios 
         WHERE id_usuario = $1`,
        [orden.rows[0].id_usuario]
      );
      if (usuario.rowCount > 0) {
        usuarioInfo = usuario.rows[0];
      }
    }

    res.json({
      ...orden.rows[0],
      items: items.rows,
      pago: pago.rows[0] || null,
      usuario: usuarioInfo, // Solo para admins
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener la orden" });
  }
};

// Crear nueva orden desde el carrito
// Regla de negocio: NO se reserva stock aquí, solo se crea la orden
// La reserva se hace cuando se INICIA el proceso de pago
// Usa direccion_envio del perfil del usuario si no se proporciona una diferente
export const crearOrden = async (req, res) => {
  try {
    console.log("[CrearOrden] Iniciando creación de orden...");
    console.log("[CrearOrden] Usuario ID:", req.usuarioId);
    console.log("[CrearOrden] Body recibido:", JSON.stringify(req.body, null, 2));

    const { direccion_envio } = req.body;

    // Obtener dirección de envío del perfil del usuario
    const usuario = await pool.query(
      "SELECT direccion_envio FROM usuarios WHERE id_usuario = $1",
      [req.usuarioId]
    );

    if (usuario.rowCount === 0) {
      console.error("[CrearOrden] Usuario no encontrado:", req.usuarioId);
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    console.log("[CrearOrden] Dirección del perfil:", usuario.rows[0].direccion_envio);

    // Usar dirección proporcionada o la del perfil del usuario
    let direccionFinal = direccion_envio ? direccion_envio.trim() : (usuario.rows[0].direccion_envio || null);

    console.log("[CrearOrden] Dirección final a usar:", direccionFinal);
    console.log("[CrearOrden] Longitud de dirección:", direccionFinal?.length || 0);

    // Validar que hay una dirección válida (del perfil o proporcionada)
    if (!direccionFinal || direccionFinal.length < 10) {
      console.error("[CrearOrden] Error: Dirección inválida o muy corta");
      return res.status(400).json({
        message: "La dirección de envío es requerida. Por favor, actualiza tu perfil con una dirección válida (mínimo 10 caracteres) o proporciona una dirección en esta orden.",
      });
    }

    // Obtener items del carrito activo
    const carrito = await pool.query(
      `SELECT c.id, c.usuario_id, c.producto_id, c.cantidad, c.activo, c.fecha_agregado,
       p.precio, p.precio_promocional, p.stock, p.stock_reserved, 
       (p.stock - p.stock_reserved) as stock_disponible, p.titulo
       FROM carrito c
       INNER JOIN productos p ON c.producto_id = p.id_producto
       WHERE c.usuario_id = $1 AND c.activo = true
       ORDER BY c.id`,
      [req.usuarioId]
    );

    console.log("[CrearOrden] Items en carrito:", carrito.rowCount);
    carrito.rows.forEach((item, index) => {
      console.log(`[CrearOrden] Item ${index + 1}: ID=${item.id}, Producto=${item.producto_id}, Cantidad=${item.cantidad}, Stock=${item.stock_disponible}`);
    });

    if (carrito.rowCount === 0) {
      console.error("[CrearOrden] Error: Carrito vacío");
      return res.status(400).json({
        message: "El carrito está vacío",
      });
    }

    // Validar stock disponible y calcular total
    // Recolectar productos con problemas de stock para reporte detallado
    const productosSinStock = [];
    let total = 0;
    
    console.log("[CrearOrden] Validando stock y calculando total...");
    
    for (const item of carrito.rows) {
      const stockDisponible = parseInt(item.stock_disponible) || 0;
      const cantidadSolicitada = parseInt(item.cantidad) || 0;
      
      // Usar precio promocional si existe, sino precio regular
      const precioFinal = item.precio_promocional && parseFloat(item.precio_promocional) < parseFloat(item.precio)
        ? parseFloat(item.precio_promocional)
        : parseFloat(item.precio);
      
      console.log(`[CrearOrden] Item: ${item.titulo}, Cantidad: ${cantidadSolicitada}, Stock: ${stockDisponible}, Precio: ${precioFinal}`);
      
      if (stockDisponible <= 0) {
        productosSinStock.push({
          producto_id: item.producto_id,
          titulo: item.titulo,
          cantidad_solicitada: cantidadSolicitada,
          stock_disponible: stockDisponible,
          problema: "sin_stock",
          mensaje: `${item.titulo} ya no tiene stock disponible`,
        });
      } else if (stockDisponible < cantidadSolicitada) {
        productosSinStock.push({
          producto_id: item.producto_id,
          titulo: item.titulo,
          cantidad_solicitada: cantidadSolicitada,
          stock_disponible: stockDisponible,
          problema: "stock_insuficiente",
          mensaje: `${item.titulo}: Stock insuficiente. Disponible: ${stockDisponible}, solicitado: ${cantidadSolicitada}`,
        });
      } else {
        // Producto OK, calcular total usando precio final (promocional o regular)
        const subtotalItem = precioFinal * cantidadSolicitada;
        total += subtotalItem;
        console.log(`[CrearOrden] Item OK: ${item.titulo}, Subtotal: ${subtotalItem}, Total acumulado: ${total}`);
      }
    }

    console.log("[CrearOrden] Total calculado:", total);
    console.log("[CrearOrden] Productos sin stock:", productosSinStock.length);

    // Si hay productos sin stock, eliminarlos del carrito automáticamente
    if (productosSinStock.length > 0) {
      console.log("[CrearOrden] Eliminando productos sin stock del carrito...");
      for (const producto of productosSinStock) {
        await pool.query(
          "UPDATE carrito SET activo = false WHERE usuario_id = $1 AND producto_id = $2 AND activo = true",
          [req.usuarioId, producto.producto_id]
        );
        console.log(`[CrearOrden] Producto ${producto.producto_id} (${producto.titulo}) eliminado del carrito`);
      }
    }

    // Verificar que aún hay productos disponibles después de eliminar los sin stock
    // Usar la cantidad original del carrito, solo incluir productos con stock suficiente
    const carritoDisponible = await pool.query(
      `SELECT c.id, c.usuario_id, c.producto_id, c.cantidad,
       p.precio, p.precio_promocional, p.stock, p.stock_reserved, 
       (p.stock - p.stock_reserved) as stock_disponible, p.titulo
       FROM carrito c
       INNER JOIN productos p ON c.producto_id = p.id_producto
       WHERE c.usuario_id = $1 AND c.activo = true
       AND (p.stock - p.stock_reserved) > 0
       AND c.cantidad <= (p.stock - p.stock_reserved)
       ORDER BY c.id`,
      [req.usuarioId]
    );

    console.log("[CrearOrden] Items disponibles después de filtrar:", carritoDisponible.rowCount);
    carritoDisponible.rows.forEach((item, index) => {
      console.log(`[CrearOrden] Item disponible ${index + 1}: ID=${item.id}, Producto=${item.producto_id}, Cantidad=${item.cantidad}, Stock=${item.stock_disponible}`);
    });

    if (carritoDisponible.rowCount === 0) {
      console.error("[CrearOrden] Error: No hay productos disponibles después de eliminar sin stock");
      return res.status(400).json({
        message: "No hay productos disponibles en tu carrito. Algunos productos fueron eliminados por falta de stock.",
        productos_sin_stock: productosSinStock,
        total_productos_afectados: productosSinStock.length,
      });
    }

    // Usar transacción para garantizar atomicidad
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Crear orden en estado 'pendiente' (SIN reservar stock aún)
      const orden = await client.query(
        `INSERT INTO ordenes (id_usuario, direccion_envio, estado)
         VALUES ($1, $2, 'pendiente')
         RETURNING id_orden, id_usuario, fecha_creacion, fecha_expiracion, direccion_envio, estado`,
        [req.usuarioId, direccionFinal]
      );

      const ordenId = orden.rows[0].id_orden;

      // Crear items de la orden solo con productos disponibles (SIN reservar stock todavía)
      // Usar precio promocional si existe, sino precio regular
      // IMPORTANTE: Usar la cantidad original del carrito, no ajustarla
      // Verificar cantidad directamente desde la BD antes de guardar
      for (const item of carritoDisponible.rows) {
        // Verificar cantidad directamente desde la base de datos para asegurar que es correcta
        const verificacionCarrito = await client.query(
          "SELECT cantidad FROM carrito WHERE id = $1 AND usuario_id = $2 AND activo = true",
          [item.id, req.usuarioId]
        );
        
        if (verificacionCarrito.rowCount === 0) {
          console.error(`[CrearOrden] Error: Item de carrito ${item.id} no encontrado o inactivo`);
          continue;
        }
        
        const cantidadEnBD = parseInt(verificacionCarrito.rows[0].cantidad, 10);
        const precioFinal = item.precio_promocional && parseFloat(item.precio_promocional) < parseFloat(item.precio)
          ? parseFloat(item.precio_promocional)
          : parseFloat(item.precio);
        
        // Usar la cantidad verificada desde la BD, no la de la consulta anterior
        const cantidadAGuardar = cantidadEnBD;
        
        console.log(`[CrearOrden] Procesando item: ${item.titulo}`);
        console.log(`[CrearOrden] - ID carrito: ${item.id}`);
        console.log(`[CrearOrden] - Producto ID: ${item.producto_id}`);
        console.log(`[CrearOrden] - Cantidad de consulta JOIN: ${item.cantidad} (tipo: ${typeof item.cantidad})`);
        console.log(`[CrearOrden] - Cantidad verificada desde BD: ${cantidadEnBD}`);
        console.log(`[CrearOrden] - Cantidad a guardar: ${cantidadAGuardar}`);
        console.log(`[CrearOrden] - Stock disponible: ${item.stock_disponible}`);
        console.log(`[CrearOrden] - Precio: ${precioFinal}`);
        
        if (!cantidadAGuardar || cantidadAGuardar <= 0 || isNaN(cantidadAGuardar)) {
          console.error(`[CrearOrden] Error: Cantidad inválida para producto ${item.producto_id}: ${cantidadAGuardar}`);
          continue;
        }
        
        // Verificar que la cantidad no exceda el stock disponible (doble verificación)
        if (cantidadAGuardar > item.stock_disponible) {
          console.error(`[CrearOrden] Error: Cantidad ${cantidadAGuardar} excede stock disponible ${item.stock_disponible} para producto ${item.producto_id}`);
          continue;
        }
        
        const resultadoInsert = await client.query(
          `INSERT INTO orden_items (id_orden, id_producto, cantidad, precio_unitario)
           VALUES ($1, $2, $3, $4)
           RETURNING id_item, cantidad`,
          [ordenId, item.producto_id, cantidadAGuardar, precioFinal]
        );
        
        console.log(`[CrearOrden] Item insertado exitosamente: ${item.titulo}`);
        console.log(`[CrearOrden] - ID item creado: ${resultadoInsert.rows[0].id_item}`);
        console.log(`[CrearOrden] - Cantidad guardada en BD: ${resultadoInsert.rows[0].cantidad}`);
        
        // Verificación final: leer el item recién creado para confirmar
        const verificacionItem = await client.query(
          "SELECT cantidad FROM orden_items WHERE id_item = $1",
          [resultadoInsert.rows[0].id_item]
        );
        console.log(`[CrearOrden] - Verificación final: cantidad en orden_items: ${verificacionItem.rows[0].cantidad}`);
      }

      // Desactivar carrito
      await client.query(
        "UPDATE carrito SET activo = false WHERE usuario_id = $1",
        [req.usuarioId]
      );

      // Registrar en auditoría
      await client.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["orden_creada", `usuario_${req.usuarioId}`]
      );

      await client.query("COMMIT");

      console.log("[CrearOrden] Orden creada exitosamente:", orden.rows[0].id_orden);
      res.status(201).json(orden.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error("[CrearOrden] Error en transacción:", error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[CrearOrden] Error general:", error);
    console.error("[CrearOrden] Stack:", error.stack);
    res.status(500).json({ 
      message: "Error al crear la orden",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Iniciar proceso de pago
// Regla de negocio: AQUÍ se reserva el stock y se crea la preferencia de Mercado Pago
export const iniciarPago = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que la orden existe y pertenece al usuario
    const orden = await pool.query(
      "SELECT id_orden, id_usuario, estado, direccion_envio FROM ordenes WHERE id_orden = $1",
      [id]
    );

    if (orden.rowCount === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const ordenActual = orden.rows[0];

    // Verificar que la orden pertenece al usuario
    if (ordenActual.id_usuario !== req.usuarioId) {
      return res.status(403).json({
        message: "No puedes iniciar el pago de esta orden",
      });
    }

    // Verificar que la orden está en estado 'pendiente'
    if (ordenActual.estado !== "pendiente") {
      return res.status(400).json({
        message: `No se puede iniciar el pago. La orden está en estado: ${ordenActual.estado}`,
      });
    }

    // Verificar que la orden tiene dirección de envío
    if (!ordenActual.direccion_envio || ordenActual.direccion_envio.trim().length < 10) {
      return res.status(400).json({
        message: "No se puede iniciar el pago. La orden debe tener una dirección de envío válida (mínimo 10 caracteres)",
      });
    }

    // Obtener items de la orden
    const items = await pool.query(
      `SELECT oi.id_producto, oi.cantidad, oi.precio_unitario,
       p.titulo, p.stock, p.stock_reserved,
       (p.stock - p.stock_reserved) as stock_disponible
       FROM orden_items oi
       INNER JOIN productos p ON oi.id_producto = p.id_producto
       WHERE oi.id_orden = $1`,
      [id]
    );

    if (items.rowCount === 0) {
      return res.status(400).json({
        message: "La orden no tiene items",
      });
    }

    // Validar stock disponible ANTES de reservar
    for (const item of items.rows) {
      if (item.stock_disponible < item.cantidad) {
        return res.status(400).json({
          message: `Stock insuficiente para: ${item.titulo}. Disponible: ${item.stock_disponible}`,
        });
      }
    }

    // Calcular fecha_expiracion: ahora + TTL (15 minutos por defecto)
    const fechaExpiracion = new Date();
    fechaExpiracion.setMinutes(fechaExpiracion.getMinutes() + RESERVA_TTL_MINUTOS);

    // Usar transacción para garantizar atomicidad de reserva de stock y actualización de orden
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Reservar stock (aumentar stock_reserved) con check condicional
      for (const item of items.rows) {
        const resultado = await client.query(
          `UPDATE productos 
           SET stock_reserved = stock_reserved + $1 
           WHERE id_producto = $2 
             AND (stock - stock_reserved) >= $1
           RETURNING id_producto`,
          [item.cantidad, item.id_producto]
        );

        // Si no se actualizó ninguna fila, significa que no hay stock suficiente
        if (resultado.rowCount === 0) {
          await client.query("ROLLBACK");
          return res.status(400).json({
            message: `Stock insuficiente para: ${item.titulo}. No se pudo reservar.`,
          });
        }
      }

      // Actualizar orden a estado 'en_pago' y establecer fecha_expiracion
      await client.query(
        `UPDATE ordenes 
         SET estado = 'en_pago', fecha_expiracion = $1 
         WHERE id_orden = $2`,
        [fechaExpiracion, id]
      );

      // Registrar en auditoría
      await client.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["pago_iniciado", `usuario_${req.usuarioId}`]
      );

      await client.query("COMMIT");
      client.release();

      // Preparar items para Mercado Pago (fuera de la transacción)
      console.log("[IniciarPago] Preparando items para Mercado Pago...");
      console.log("[IniciarPago] Items de la orden:", JSON.stringify(items.rows, null, 2));
      
      const itemsMP = items.rows.map((item) => {
        const precio = Number(item.precio_unitario);
        const cantidad = Number(item.cantidad);
        const titulo = String(item.titulo || "Producto sin nombre").trim();
        
        // Validar que los valores sean válidos
        if (isNaN(precio) || precio <= 0) {
          throw new Error(`Precio inválido para item: ${titulo}. Precio: ${item.precio_unitario}`);
        }
        if (isNaN(cantidad) || cantidad <= 0) {
          throw new Error(`Cantidad inválida para item: ${titulo}. Cantidad: ${item.cantidad}`);
        }
        if (!titulo || titulo.length === 0) {
          throw new Error(`Título inválido para item. ID: ${item.id_producto}`);
        }
        
        console.log(`[IniciarPago] Item preparado: ${titulo}, Precio: ${precio}, Cantidad: ${cantidad}`);
        
        return {
          titulo: titulo,
          precio: precio,
          cantidad: cantidad,
        };
      });
      
      console.log("[IniciarPago] Items preparados para MP:", JSON.stringify(itemsMP, null, 2));

      // Crear preferencia de Mercado Pago
      const backUrls = {
        success: `${ORIGIN}/ordenes/${id}/success`,
        failure: `${ORIGIN}/ordenes/${id}/failure`,
        pending: `${ORIGIN}/ordenes/${id}/pending`,
      };

      let preferenciaMP;
      try {
        preferenciaMP = await crearPreferenciaPago(itemsMP, id, backUrls);
      } catch (error) {
        // Si falla la creación de preferencia, cambiar estado a 'error' pero MANTENER stock_reserved
        // Regla de negocio: órdenes en 'error' mantienen stock_reserved para intervención de admin
        console.error("❌ Error creando preferencia MP, cambiando orden a estado 'error':", error);
        
        // Determinar el mensaje de error más específico
        let errorMessage = "Error al crear la preferencia de pago. La orden quedó en estado 'error' para revisión.";
        
        if (error.status === 403 || error.code === "PA_UNAUTHORIZED_RESULT_FROM_POLICIES") {
          errorMessage = "Error de configuración con Mercado Pago: Las URLs de redirección no están permitidas. En desarrollo con localhost, esto es normal. Verifica la configuración de ORIGIN o usa un servicio como ngrok para desarrollo.";
        } else if (error.status === 401) {
          errorMessage = "Error de autenticación con Mercado Pago. Verifica que MP_ACCESS_TOKEN esté configurado correctamente.";
        } else if (error.message) {
          errorMessage = `Error al crear la preferencia de pago: ${error.message}`;
        }
        
        // Cambiar estado a 'error' pero MANTENER stock_reserved (NO liberar)
        // El stock_reserved se mantiene para que el admin pueda intervenir
        const errorClient = await pool.connect();
        try {
          await errorClient.query("BEGIN");
          
          // Solo cambiar el estado a 'error', NO tocar stock_reserved
          await errorClient.query(
            "UPDATE ordenes SET estado = 'error' WHERE id_orden = $1",
            [id]
          );
          
          // Registrar en auditoría que el pago terminó en error
          await errorClient.query(
            `INSERT INTO auditoria (tipo, usuario, fecha) 
             VALUES ($1, $2, CURRENT_TIMESTAMP)`,
            ["pago_error", `usuario_${req.usuarioId}`]
          );
          
          await errorClient.query("COMMIT");
          console.log(`[IniciarPago] Orden ${id} cambiada a estado 'error'. Stock reservado mantenido para intervención de admin.`);
        } catch (errorUpdateError) {
          await errorClient.query("ROLLBACK");
          console.error("❌ Error actualizando orden a estado 'error':", errorUpdateError);
        } finally {
          errorClient.release();
        }
        
        return res.status(500).json({
          message: errorMessage,
          error: process.env.NODE_ENV === "development" ? {
            code: error.code,
            status: error.status,
            message: error.message,
          } : undefined,
        });
      }

      res.json({
        orden_id: id,
        estado: "en_pago",
        fecha_expiracion: fechaExpiracion,
        preferencia_id: preferenciaMP.id,
        init_point: preferenciaMP.init_point,
        sandbox_init_point: preferenciaMP.sandbox_init_point,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al iniciar el proceso de pago" });
  }
};

// Actualizar estado de orden (usuario o admin)
// Regla de negocio: 
// - Si estado = 'pagado': descuenta stock definitivo y libera stock_reserved
// - Si estado = 'cancelado': libera stock_reserved (solo si había reserva)
export const actualizarEstadoOrden = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    console.log(`[ActualizarEstadoOrden] Iniciando actualización de orden ${id} a estado: ${estado}`);
    console.log(`[ActualizarEstadoOrden] Usuario ID: ${req.usuarioId}, Rol: ${req.usuarioRol}`);

    // Estados válidos según reglas de negocio
    const estadosValidos = [
      "pendiente",
      "en_pago",
      "pagado",
      "en_envio",
      "entregada",
      "cancelado",
      "cancelada_usuario",
      "cancelada_administrador",
      "cancelada_mp",
      "rechazado",
      "error",
      "expirada",
    ];

    if (!estadosValidos.includes(estado)) {
      console.error(`[ActualizarEstadoOrden] Estado inválido: ${estado}`);
      return res.status(400).json({
        message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(", ")}`,
      });
    }

    // Verificar que la orden pertenece al usuario o es admin
    const orden = await pool.query(
      "SELECT id_orden, id_usuario, estado, direccion_envio FROM ordenes WHERE id_orden = $1",
      [id]
    );

    if (orden.rowCount === 0) {
      console.error(`[ActualizarEstadoOrden] Orden no encontrada: ${id}`);
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const ordenActual = orden.rows[0];
    console.log(`[ActualizarEstadoOrden] Orden encontrada - Estado actual: ${ordenActual.estado}, Usuario: ${ordenActual.id_usuario}`);

    // Solo admin puede cambiar estados, usuarios solo pueden cancelar (eliminar) sus propias órdenes
    if (req.usuarioRol !== "admin" && req.usuarioRol !== "super_admin") {
      console.log(`[ActualizarEstadoOrden] Usuario no es admin, validando cancelación...`);
      // Usuarios solo pueden establecer "cancelada_usuario" (que eliminará la orden)
      if (estado !== "cancelada_usuario") {
        console.error(`[ActualizarEstadoOrden] Usuario intenta cambiar a estado no permitido: ${estado}`);
        return res.status(403).json({
          message: "Solo puedes cancelar tus propias órdenes",
        });
      }
      if (ordenActual.id_usuario !== req.usuarioId) {
        console.error(`[ActualizarEstadoOrden] Usuario intenta cancelar orden de otro usuario`);
        return res.status(403).json({
          message: "No puedes modificar esta orden",
        });
      }
      // Usuarios solo pueden cancelar si la orden está en 'pendiente' o 'en_pago'
      if (ordenActual.estado !== "pendiente" && ordenActual.estado !== "en_pago") {
        console.error(`[ActualizarEstadoOrden] No se puede cancelar orden en estado: ${ordenActual.estado}`);
        return res.status(400).json({
          message: `No se puede cancelar una orden en estado: ${ordenActual.estado}`,
        });
      }
      console.log(`[ActualizarEstadoOrden] Validación de cancelación por usuario OK - se eliminará la orden`);
    } else {
      // Si es admin, verificar que tenga permiso Ordenes
      // Super admin tiene todos los permisos automáticamente
      // Verificar si es super admin (puede no estar definido si no pasó por isAdmin)
      let esSuperAdmin = req.esSuperAdmin;
      if (esSuperAdmin === undefined && req.usuarioRol === "super_admin") {
        // Obtener información del usuario para verificar
        const usuario = await pool.query(
          "SELECT es_super_admin, rol FROM usuarios WHERE id_usuario = $1",
          [req.usuarioId]
        );
        if (usuario.rowCount > 0) {
          esSuperAdmin = usuario.rows[0].es_super_admin === true && usuario.rows[0].rol === "super_admin";
        }
      }

      if (!esSuperAdmin) {
        const tienePermiso = await verificarPermiso(req.usuarioId, "Ordenes");
        if (!tienePermiso) {
          return res.status(403).json({
            message: "Se requiere el permiso 'Ordenes' para actualizar estados de órdenes",
          });
        }
      }
    }

    // Obtener items de la orden para manejar stock
    const items = await pool.query(
      "SELECT id_producto, cantidad FROM orden_items WHERE id_orden = $1",
      [id]
    );

    // Usar transacción para garantizar atomicidad
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Si un usuario cancela, eliminar la orden físicamente en lugar de cambiar estado
      if (estado === "cancelada_usuario" && (req.usuarioRol !== "admin" && req.usuarioRol !== "super_admin")) {
        // Liberar stock reservado si existe
        const estadosConReserva = ["en_pago", "error"];
        const tieneReserva = estadosConReserva.includes(ordenActual.estado);
        
        if (tieneReserva) {
          // Liberar stock_reserved
          for (const item of items.rows) {
            await client.query(
              `UPDATE productos 
               SET stock_reserved = stock_reserved - $1 
               WHERE id_producto = $2 
                 AND stock_reserved >= $1
               RETURNING id_producto`,
              [item.cantidad, item.id_producto]
            );
          }
          
          // Si estaba 'en_pago', reactivar el carrito
          if (ordenActual.estado === "en_pago") {
            await reactivarCarritoDesdeOrden(ordenActual.id_usuario, items.rows, client);
          }
        }

        // Eliminar la orden físicamente (CASCADE eliminará items y pagos asociados)
        await client.query("DELETE FROM ordenes WHERE id_orden = $1", [id]);
        
        await client.query("COMMIT");
        client.release();
        
        console.log(`[ActualizarEstadoOrden] Orden ${id} eliminada por cancelación de usuario`);
        
        return res.json({
          message: "Orden cancelada y eliminada exitosamente",
          eliminada: true,
        });
      }

      // Para otros casos (admin o estados diferentes), actualizar estado normalmente
      const resultado = await client.query(
        "UPDATE ordenes SET estado = $1 WHERE id_orden = $2 RETURNING id_orden, id_usuario, fecha_creacion, fecha_expiracion, direccion_envio, estado",
        [estado, id]
      );

      // Manejar stock según el nuevo estado
      // Solo procesar si hay cambio de estado y la orden tenía stock reservado
      // Estados con reserva: "en_pago" (reserva activa) y "error" (reserva mantenida para intervención)
      const estadosConReserva = ["en_pago", "error"]; // Estados que tienen stock reservado
      const tieneReserva = estadosConReserva.includes(ordenActual.estado);
      
      console.log(`[ActualizarEstadoOrden] Estado actual: ${ordenActual.estado}, Nuevo estado: ${estado}, Tiene reserva: ${tieneReserva}`);

      if (estado === "pagado" && ordenActual.estado !== "pagado") {
        // Pago exitoso: descontar stock definitivo y liberar reserva
        // Aplica tanto para "en_pago" → "pagado" como "error" → "pagado"
        // El stock_reserved ya existe (reservado desde "en_pago"), ahora se descuenta stock físico
        // Check condicional: verificar que hay stock_reserved suficiente
        for (const item of items.rows) {
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
            return res.status(400).json({
              message: `Error: No se pudo procesar el pago. Stock reservado insuficiente para producto ID ${item.id_producto}`,
            });
          }
        }
      } else if (
        (estado === "cancelado" || estado === "cancelada_usuario" || estado === "cancelada_administrador" || estado === "rechazado" || estado === "expirada") &&
        tieneReserva
      ) {
        // Cancelado/Rechazado/Expirada: liberar stock_reserved (NO descontar stock)
        // Aplica tanto para "en_pago" → "cancelado" como "error" → "cancelado"
        // El stock_reserved se libera, aumentando el stock disponible
        // Check condicional: verificar que hay stock_reserved para liberar
        for (const item of items.rows) {
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
            return res.status(400).json({
              message: `Error: No se pudo liberar stock reservado. Stock reservado insuficiente para producto ID ${item.id_producto}`,
            });
          }
        }
        
        // Si la orden estaba 'en_pago' y se cancela/rechaza, reactivar el carrito
        // (Si estaba 'error', no reactivar porque requiere intervención de admin)
        const estadosCancelacion = ["cancelado", "cancelada_usuario", "cancelada_administrador", "rechazado"];
        if (ordenActual.estado === "en_pago" && estadosCancelacion.includes(estado)) {
          await reactivarCarritoDesdeOrden(ordenActual.id_usuario, items.rows, client);
        }
      }
      // Estado 'error': NO libera stock automáticamente, queda reservado hasta intervención de admin
      // Cuando admin cambia "error" → "pagado": se descuenta stock y libera reserva
      // Cuando admin cambia "error" → "cancelado": se libera reserva y aumenta disponible

      // Si un administrador cambia la orden a "pagado", crear registro de pago si no existe
      if (estado === "pagado" && (req.usuarioRol === "admin" || req.usuarioRol === "super_admin")) {
        // Verificar si ya existe un pago para esta orden
        const pagoExistente = await client.query(
          "SELECT id_pago, estado FROM pagos WHERE id_orden = $1 ORDER BY id_pago DESC LIMIT 1",
          [id]
        );

        if (pagoExistente.rowCount === 0) {
          // No existe pago, crear uno nuevo con estado "approved"
          // Calcular el total de la orden
          const totalOrden = await client.query(
            `SELECT SUM(cantidad * precio_unitario) as total 
             FROM orden_items 
             WHERE id_orden = $1`,
            [id]
          );

          const monto = parseFloat(totalOrden.rows[0]?.total || 0);

          if (monto > 0) {
            // Crear registro de pago con estado "approved" (pago aprobado por administrador)
        await client.query(
              `INSERT INTO pagos (id_orden, mp_id, estado, monto, fecha_pago) 
               VALUES ($1, NULL, 'approved', $2, CURRENT_TIMESTAMP)`,
              [id, monto]
            );
            console.log(`[ActualizarEstadoOrden] Creado registro de pago para orden ${id} con monto ${monto}`);
          }
      } else {
          // Existe un pago, actualizar su estado a "approved" si no lo está
          const pagoActual = pagoExistente.rows[0];
          if (pagoActual.estado !== "approved") {
            await client.query(
              `UPDATE pagos 
               SET estado = 'approved', fecha_pago = CURRENT_TIMESTAMP 
               WHERE id_pago = $1`,
              [pagoActual.id_pago]
            );
            console.log(`[ActualizarEstadoOrden] Actualizado pago ${pagoActual.id_pago} a estado 'approved'`);
          }
        }
      }

      // Si el admin cancela, usar estado específico antes del COMMIT
      let estadoFinal = estado;
      if ((req.usuarioRol === "admin" || req.usuarioRol === "super_admin") && estado === "cancelado") {
        estadoFinal = "cancelada_administrador";
        // Actualizar el estado en la base de datos
        await client.query(
          "UPDATE ordenes SET estado = $1 WHERE id_orden = $2",
          [estadoFinal, id]
        );
      }

      // Registrar en auditoría solo para cambios de admin
      if (req.usuarioRol === "admin" || req.usuarioRol === "super_admin") {
        // Admin cambió el estado
        console.log(`[ActualizarEstadoOrden] Registrando en auditoría: admin cambió estado`);
        await client.query(
          `INSERT INTO auditoria (tipo, usuario, fecha) 
           VALUES ($1, $2, CURRENT_TIMESTAMP)`,
          [`orden_estado_cambiado_${estadoFinal}`, `admin_${req.usuarioId}`]
        );
      }
      // Nota: Las cancelaciones de usuario ya no se registran en auditoría porque se eliminan físicamente

      await client.query("COMMIT");
      console.log(`[ActualizarEstadoOrden] Orden ${id} actualizada exitosamente a estado: ${estado}`);

      // Enviar email de confirmación si la orden cambió a "pagado"
      if (estado === "pagado" && ordenActual.estado !== "pagado") {
        try {
          const { enviarEmailConfirmacionOrdenPagada } = await import("../utils/email.js");
          await enviarEmailConfirmacionOrdenPagada(pool, id, ordenActual.id_usuario);
        } catch (emailError) {
          console.error("Error enviando email de confirmación de orden:", emailError);
          // No fallar la actualización si el email falla
        }
      }

      // Enviar email de envío si la orden cambió a "en_envio"
      if (estado === "en_envio" && ordenActual.estado !== "en_envio") {
        try {
          const { enviarEmailOrdenEnvio } = await import("../utils/email.js");
          await enviarEmailOrdenEnvio(pool, id, ordenActual.id_usuario);
        } catch (emailError) {
          console.error("Error enviando email de envío de orden:", emailError);
          // No fallar la actualización si el email falla
        }
      }

      // Enviar email de entrega si la orden cambió a "entregada"
      if (estado === "entregada" && ordenActual.estado !== "entregada") {
        try {
          const { enviarEmailOrdenEntregada } = await import("../utils/email.js");
          await enviarEmailOrdenEntregada(pool, id, ordenActual.id_usuario);
        } catch (emailError) {
          console.error("Error enviando email de entrega de orden:", emailError);
          // No fallar la actualización si el email falla
        }
      }

      // Enviar email de actualización de estado para otros cambios (no bloquea si falla)
      // NO enviar email si el usuario canceló su propia orden (ya fue eliminada)
      if (ordenActual.estado !== estado && 
          estado !== "pagado" && 
          estado !== "en_envio" && 
          estado !== "entregada") {
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
              ordenActual.id_orden,
              ordenActual.estado,
              estado,
              ordenActual.id_usuario
            );
          }
        } catch (emailError) {
          console.error("Error enviando email de actualización de estado:", emailError);
          // No fallar la actualización si el email falla
        }
      }

      res.json(resultado.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(`[ActualizarEstadoOrden] Error en transacción:`, error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[ActualizarEstadoOrden] Error general:`, error);
    console.error(`[ActualizarEstadoOrden] Stack:`, error.stack);
    res.status(500).json({ 
      message: "Error al actualizar el estado",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Verificar estado del pago con Mercado Pago
// Útil cuando el usuario vuelve de Mercado Pago y el webhook aún no llegó
// Puede recibir payment_id en el body para verificar pagos que aún no tienen registro en BD
export const verificarPago = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_id } = req.body; // payment_id opcional desde query params de la URL

    // Verificar que la orden existe y pertenece al usuario
    const orden = await pool.query(
      "SELECT id_orden, id_usuario, estado FROM ordenes WHERE id_orden = $1",
      [id]
    );

    if (orden.rowCount === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const ordenActual = orden.rows[0];

    // Verificar que la orden pertenece al usuario
    if (ordenActual.id_usuario !== req.usuarioId) {
      return res.status(403).json({
        message: "No puedes verificar el pago de esta orden",
      });
    }

    // Buscar pago asociado a la orden
    let pago = await pool.query(
      "SELECT id_pago, mp_id, estado FROM pagos WHERE id_orden = $1 ORDER BY fecha_creacion DESC LIMIT 1",
      [id]
    );

    let pagoActual = null;
    let mpId = null;

    // Si hay payment_id en el body pero no hay registro de pago, crear uno temporal
    if (payment_id && (pago.rowCount === 0 || !pago.rows[0].mp_id)) {
      console.log(`[VerificarPago] No hay registro de pago, pero se recibió payment_id=${payment_id}, creando registro temporal...`);
      
      // Verificar que el payment_id corresponde a esta orden consultando Mercado Pago
      let pagoInfo;
      try {
        pagoInfo = await obtenerPago(payment_id);
      } catch (error) {
        console.error(`[VerificarPago] Error consultando Mercado Pago con payment_id:`, error);
        return res.status(400).json({
          message: "El payment_id proporcionado no es válido o no existe en Mercado Pago",
          orden_estado: ordenActual.estado,
        });
      }

      // Verificar que el external_reference del pago corresponde a esta orden
      if (pagoInfo.external_reference !== id.toString()) {
        return res.status(400).json({
          message: "El payment_id no corresponde a esta orden",
          orden_estado: ordenActual.estado,
        });
      }

      // Crear registro de pago temporal
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        
        // Verificar si ya existe un pago con este mp_id (idempotencia)
        const pagoExistente = await client.query(
          "SELECT id_pago, id_orden, estado FROM pagos WHERE mp_id = $1",
          [payment_id]
        );

        if (pagoExistente.rowCount > 0) {
          // Ya existe, usar ese
          pagoActual = pagoExistente.rows[0];
          mpId = payment_id;
          await client.query("COMMIT");
        } else {
          // Crear nuevo registro de pago
          const totalOrden = await client.query(
            `SELECT SUM(cantidad * precio_unitario) as total 
             FROM orden_items 
             WHERE id_orden = $1`,
            [id]
          );
          const monto = parseFloat(totalOrden.rows[0]?.total || pagoInfo.transaction_amount || 0);

          const nuevoPago = await client.query(
            `INSERT INTO pagos (id_orden, mp_id, estado, monto, fecha_pago) 
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id_pago, mp_id, estado`,
            [
              id,
              payment_id,
              pagoInfo.status,
              monto,
              pagoInfo.status === "approved" ? new Date() : null,
            ]
          );

          pagoActual = nuevoPago.rows[0];
          mpId = payment_id;
          await client.query("COMMIT");
          console.log(`[VerificarPago] Registro de pago creado: id_pago=${pagoActual.id_pago}, mp_id=${mpId}`);
        }
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } else if (pago.rowCount > 0 && pago.rows[0].mp_id) {
      // Hay registro de pago existente
      pagoActual = pago.rows[0];
      mpId = pagoActual.mp_id;
    } else {
      // No hay pago registrado y no se proporcionó payment_id
      return res.json({
        message: "No hay pago registrado para esta orden aún. Espera a que el webhook procese el pago o proporciona el payment_id.",
        orden_estado: ordenActual.estado,
        actualizado: false,
      });
    }

    console.log(`[VerificarPago] Verificando pago mp_id=${mpId} para orden ${id}`);

    // Consultar estado actual en Mercado Pago
    let pagoInfo;
    try {
      pagoInfo = await obtenerPago(mpId);
    } catch (error) {
      console.error(`[VerificarPago] Error consultando Mercado Pago:`, error);
      return res.status(500).json({
        message: "Error al consultar el estado del pago en Mercado Pago",
        orden_estado: ordenActual.estado,
      });
    }

    const status = pagoInfo.status;
    const statusDetail = pagoInfo.status_detail;
    const transactionAmount = pagoInfo.transaction_amount;

    console.log(`[VerificarPago] Estado en MP: ${status}, Estado actual en BD: ${ordenActual.estado}`);

    // Si el estado ya está actualizado, no hacer nada
    if (
      (status === "approved" && ordenActual.estado === "pagado") ||
      (status === "rejected" && ordenActual.estado === "rechazado") ||
      (status === "cancelled" && (ordenActual.estado === "cancelada_mp" || ordenActual.estado === "cancelado")) ||
      ((status === "pending" || status === "in_process") && ordenActual.estado === "en_pago")
    ) {
      return res.json({
        message: "El estado de la orden ya está actualizado",
        orden_estado: ordenActual.estado,
        pago_estado: status,
        actualizado: false,
      });
    }

    // Actualizar estado según el resultado de Mercado Pago
    // Usar la misma lógica que el webhook
    let nuevoEstado = ordenActual.estado;
    let actualizarStock = false;
    let liberarReserva = false;
    let descontarStock = false;

    switch (status) {
      case "approved":
        nuevoEstado = "pagado";
        actualizarStock = true;
        descontarStock = true;
        liberarReserva = true;
        break;
      case "rejected":
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
      case "in_process":
        nuevoEstado = "en_pago";
        break;
      default:
        nuevoEstado = "error";
    }

    // Obtener items para manejar stock
    const items = await pool.query(
      "SELECT id_producto, cantidad FROM orden_items WHERE id_orden = $1",
      [id]
    );

    // Usar transacción para actualizar
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Para todos los estados, actualizar normalmente (incluyendo cancelada_mp)
      await client.query(
        "UPDATE ordenes SET estado = $1 WHERE id_orden = $2",
        [nuevoEstado, id]
      );

      // Actualizar estado del pago
      await client.query(
        "UPDATE pagos SET estado = $1, monto = $2, fecha_pago = $3 WHERE id_pago = $4",
        [
          status,
          transactionAmount,
          status === "approved" ? new Date() : null,
          pagoActual.id_pago,
        ]
      );

      // Manejar stock
      if (actualizarStock && items.rowCount > 0) {
        for (const item of items.rows) {
          if (descontarStock && liberarReserva) {
            // Pago exitoso: descontar stock y liberar reserva
            await client.query(
              `UPDATE productos 
               SET stock = stock - $1, stock_reserved = stock_reserved - $1
               WHERE id_producto = $2 AND stock_reserved >= $1`,
              [item.cantidad, item.id_producto]
            );
          } else if (liberarReserva) {
            // Pago rechazado/cancelado: solo liberar reserva
            await client.query(
              `UPDATE productos 
               SET stock_reserved = stock_reserved - $1
               WHERE id_producto = $2 AND stock_reserved >= $1`,
              [item.cantidad, item.id_producto]
            );
          }
        }
      }

      // Registrar en auditoría
      await client.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [
          `pago_verificado_${status}`,
          `usuario_${ordenActual.id_usuario}`,
        ]
      );

      await client.query("COMMIT");

      // Enviar email de confirmación si la orden cambió a "pagado"
      if (nuevoEstado === "pagado" && ordenActual.estado !== "pagado") {
        try {
          const { enviarEmailConfirmacionOrdenPagada } = await import("../utils/email.js");
          await enviarEmailConfirmacionOrdenPagada(pool, id, ordenActual.id_usuario);
        } catch (emailError) {
          console.error("[VerificarPago] Error enviando email de confirmación de orden:", emailError);
          // No fallar la verificación si el email falla
        }
      }

      console.log(`[VerificarPago] Orden ${id} actualizada: ${ordenActual.estado} -> ${nuevoEstado}`);

      res.json({
        message: "Estado del pago verificado y actualizado",
        orden_estado: nuevoEstado,
        pago_estado: status,
        actualizado: true,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[VerificarPago] Error:", error);
    res.status(500).json({
      message: "Error al verificar el estado del pago",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Verificar pago desde redirect de Mercado Pago (ENDPOINT PÚBLICO)
// Este endpoint NO requiere autenticación porque se llama desde el redirect de MP
// La seguridad se basa en validar el payment_id con Mercado Pago
export const verificarPagoPublico = async (req, res) => {
  try {
    const { id } = req.params;
    const { payment_id, collection_id, merchant_order_id, status } = req.body;

    // Validar que se proporcionó al menos uno de los IDs
    if (!payment_id && !collection_id && !merchant_order_id) {
      return res.status(400).json({
        message: "payment_id, collection_id o merchant_order_id es requerido",
      });
    }

    console.log(`[VerificarPagoPublico] Verificando pago público para orden ${id}`);
    console.log(`[VerificarPagoPublico] payment_id=${payment_id}, collection_id=${collection_id}, merchant_order_id=${merchant_order_id}`);

    // Verificar que la orden existe
    const orden = await pool.query(
      "SELECT id_orden, id_usuario, estado FROM ordenes WHERE id_orden = $1",
      [id]
    );

    if (orden.rowCount === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const ordenActual = orden.rows[0];

    // Intentar obtener información del pago
    let pagoInfo = null;
    
    // IMPORTANTE: Si payment_id y collection_id son iguales, probablemente es el ID de la preferencia
    // En este caso, debemos buscar el pago por external_reference directamente
    const esPreferencia = payment_id && collection_id && payment_id === collection_id;
    
    if (esPreferencia) {
      console.log(`[VerificarPagoPublico] ⚠️ payment_id y collection_id son iguales (${payment_id}). Probablemente es el ID de la preferencia, no del pago.`);
      console.log(`[VerificarPagoPublico] Buscando pago directamente por external_reference...`);
    }
    
    // Estrategia 1: Si tenemos payment_id y NO es una preferencia, intentar obtenerlo directamente
    if (payment_id && !esPreferencia) {
      try {
        console.log(`[VerificarPagoPublico] Intentando obtener pago con payment_id=${payment_id}`);
        pagoInfo = await obtenerPago(payment_id);
        console.log(`[VerificarPagoPublico] ✅ Pago obtenido exitosamente con payment_id=${payment_id}`);
        console.log(`[VerificarPagoPublico] Estado del pago: ${pagoInfo.status}, External reference: ${pagoInfo.external_reference}`);
      } catch (error) {
        console.warn(`[VerificarPagoPublico] ⚠️ No se pudo obtener pago con payment_id=${payment_id}`);
        console.warn(`[VerificarPagoPublico] Error detallado:`, {
          message: error.message,
          status: error.status,
          code: error.code,
          cause: error.cause,
        });
        // Si el error es 404 (Payment not found), el payment_id puede ser inválido o ser un collection_id
        if (error.status === 404 || error.cause?.code === 2000) {
          console.log(`[VerificarPagoPublico] El payment_id ${payment_id} no existe en Mercado Pago. Puede ser un collection_id (preferencia).`);
        }
        // Continuar con otras estrategias
      }
    }
    
    // Estrategia 2: Si tenemos merchant_order_id, buscar pagos por merchant_order_id (más confiable)
    if (!pagoInfo && merchant_order_id) {
      try {
        console.log(`[VerificarPagoPublico] 🔍 Buscando pagos por merchant_order_id ${merchant_order_id}`);
        const { buscarPagosPorMerchantOrder } = await import("../libs/mercadopago.js");
        pagoInfo = await buscarPagosPorMerchantOrder(merchant_order_id);
        if (pagoInfo) {
          console.log(`[VerificarPagoPublico] ✅ Pago encontrado por merchant_order_id: ${pagoInfo.id}`);
          console.log(`[VerificarPagoPublico] Estado del pago encontrado: ${pagoInfo.status}`);
        } else {
          console.log(`[VerificarPagoPublico] ⚠️ No se encontraron pagos para merchant_order_id ${merchant_order_id}`);
        }
      } catch (error) {
        console.warn(`[VerificarPagoPublico] ⚠️ Error buscando pagos por merchant_order_id:`, {
          message: error.message,
          status: error.status,
          code: error.code,
        });
      }
    }
    
    // Estrategia 3: Si no funcionó, buscar pagos por external_reference (ID de orden)
    if (!pagoInfo) {
      try {
        console.log(`[VerificarPagoPublico] 🔍 Buscando pagos por external_reference (orden ${id})`);
        const { buscarPagosPorOrden } = await import("../libs/mercadopago.js");
        pagoInfo = await buscarPagosPorOrden(id);
        if (pagoInfo) {
          console.log(`[VerificarPagoPublico] ✅ Pago encontrado por external_reference: ${pagoInfo.id}`);
          console.log(`[VerificarPagoPublico] Estado del pago encontrado: ${pagoInfo.status}`);
        } else {
          console.log(`[VerificarPagoPublico] ⚠️ No se encontraron pagos para la orden ${id} por external_reference`);
        }
      } catch (error) {
        console.warn(`[VerificarPagoPublico] ⚠️ Error buscando pagos por orden:`, {
          message: error.message,
          status: error.status,
          code: error.code,
        });
      }
    }
    
    // Si aún no tenemos pagoInfo, retornar error con información detallada
    if (!pagoInfo) {
      console.error(`[VerificarPagoPublico] ❌ No se pudo encontrar el pago para la orden ${id}`);
      console.error(`[VerificarPagoPublico] Payment ID recibido: ${payment_id || 'N/A'}`);
      console.error(`[VerificarPagoPublico] Collection ID recibido: ${collection_id || 'N/A'}`);
      console.error(`[VerificarPagoPublico] Estado actual de la orden: ${ordenActual.estado}`);
      
      return res.status(400).json({
        message: "No se pudo encontrar el pago en Mercado Pago. El pago puede estar pendiente o el ID proporcionado no es válido.",
        orden_estado: ordenActual.estado,
        payment_id_recibido: payment_id || null,
        collection_id_recibido: collection_id || null,
        merchant_order_id_recibido: merchant_order_id || null,
        sugerencia: "El pago puede estar aún procesándose. Espera unos minutos y verifica nuevamente, o espera a que el webhook procese el pago.",
      });
    }

    // Validar que el external_reference corresponde a esta orden
    if (pagoInfo.external_reference !== id.toString()) {
      console.error(`[VerificarPagoPublico] external_reference no coincide: ${pagoInfo.external_reference} !== ${id}`);
      return res.status(400).json({
        message: "El pago no corresponde a esta orden",
        orden_estado: ordenActual.estado,
      });
    }

    const mpStatus = pagoInfo.status;
    const transactionAmount = pagoInfo.transaction_amount;

    console.log(`[VerificarPagoPublico] Estado en MP: ${mpStatus}, Estado actual en BD: ${ordenActual.estado}`);
    console.log(`[VerificarPagoPublico] Payment ID: ${payment_id}, Orden ID: ${id}`);
    console.log(`[VerificarPagoPublico] External reference del pago: ${pagoInfo.external_reference}`);

    // Verificar si ya existe un pago con este mp_id (idempotencia)
    let pago = await pool.query(
      "SELECT id_pago, mp_id, estado FROM pagos WHERE mp_id = $1",
      [payment_id]
    );

    let pagoActual = null;

    // Si no existe, crear registro de pago
    if (pago.rowCount === 0) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        const totalOrden = await client.query(
          `SELECT SUM(cantidad * precio_unitario) as total 
           FROM orden_items 
           WHERE id_orden = $1`,
          [id]
        );
        const monto = parseFloat(totalOrden.rows[0]?.total || transactionAmount || 0);

        const nuevoPago = await client.query(
          `INSERT INTO pagos (id_orden, mp_id, estado, monto, fecha_pago) 
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id_pago, mp_id, estado`,
          [
            id,
            payment_id,
            mpStatus,
            monto,
            mpStatus === "approved" ? new Date() : null,
          ]
        );

        pagoActual = nuevoPago.rows[0];
        await client.query("COMMIT");
        console.log(`[VerificarPagoPublico] Registro de pago creado: id_pago=${pagoActual.id_pago}, mp_id=${payment_id}`);
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    } else {
      pagoActual = pago.rows[0];
    }

    // Si el estado ya está actualizado, retornar sin hacer nada
    if (
      (mpStatus === "approved" && ordenActual.estado === "pagado") ||
      (mpStatus === "rejected" && ordenActual.estado === "rechazado") ||
      (mpStatus === "cancelled" && (ordenActual.estado === "cancelada_mp" || ordenActual.estado === "cancelado")) ||
      ((mpStatus === "pending" || mpStatus === "in_process") && ordenActual.estado === "en_pago")
    ) {
      return res.json({
        message: "El estado de la orden ya está actualizado",
        orden_estado: ordenActual.estado,
        pago_estado: mpStatus,
        actualizado: false,
      });
    }

    // Determinar nuevo estado según el resultado de Mercado Pago
    let nuevoEstado = ordenActual.estado;
    let actualizarStock = false;
    let liberarReserva = false;
    let descontarStock = false;

    switch (mpStatus) {
      case "approved":
        nuevoEstado = "pagado";
        actualizarStock = true;
        descontarStock = true;
        liberarReserva = true;
        break;
      case "rejected":
        nuevoEstado = "rechazado";
        actualizarStock = true;
        liberarReserva = true;
        break;
      case "cancelled":
        nuevoEstado = "cancelada_mp";
        actualizarStock = true;
        liberarReserva = true;
        break;
      case "pending":
      case "in_process":
        nuevoEstado = "en_pago";
        break;
      default:
        nuevoEstado = "error";
    }

    // Obtener items para manejar stock
    const items = await pool.query(
      "SELECT id_producto, cantidad FROM orden_items WHERE id_orden = $1",
      [id]
    );

    // Usar transacción para actualizar
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Actualizar estado de la orden
      await client.query(
        "UPDATE ordenes SET estado = $1 WHERE id_orden = $2",
        [nuevoEstado, id]
      );

      // Actualizar estado del pago
      await client.query(
        "UPDATE pagos SET estado = $1, monto = $2, fecha_pago = $3 WHERE id_pago = $4",
        [
          mpStatus,
          transactionAmount,
          mpStatus === "approved" ? new Date() : null,
          pagoActual.id_pago,
        ]
      );

      // Manejar stock
      if (actualizarStock && items.rowCount > 0) {
        for (const item of items.rows) {
          if (descontarStock && liberarReserva) {
            // Pago exitoso: descontar stock y liberar reserva
            await client.query(
              `UPDATE productos 
               SET stock = stock - $1, stock_reserved = stock_reserved - $1
               WHERE id_producto = $2 AND stock_reserved >= $1`,
              [item.cantidad, item.id_producto]
            );
          } else if (liberarReserva) {
            // Pago rechazado/cancelado: solo liberar reserva
            await client.query(
              `UPDATE productos 
               SET stock_reserved = stock_reserved - $1
               WHERE id_producto = $2 AND stock_reserved >= $1`,
              [item.cantidad, item.id_producto]
            );
          }
        }
      }

      // Registrar en auditoría
      await client.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        [
          `pago_verificado_publico_${mpStatus}`,
          `usuario_${ordenActual.id_usuario}`,
        ]
      );

      await client.query("COMMIT");

      // Enviar email de confirmación si la orden cambió a "pagado"
      if (nuevoEstado === "pagado" && ordenActual.estado !== "pagado") {
        try {
          const { enviarEmailConfirmacionOrdenPagada } = await import("../utils/email.js");
          await enviarEmailConfirmacionOrdenPagada(pool, id, ordenActual.id_usuario);
        } catch (emailError) {
          console.error("[VerificarPagoPublico] Error enviando email de confirmación:", emailError);
        }
      }

      console.log(`[VerificarPagoPublico] ✅ Orden ${id} actualizada: ${ordenActual.estado} -> ${nuevoEstado}`);

      res.json({
        message: "Estado del pago verificado y actualizado",
        orden_estado: nuevoEstado,
        pago_estado: mpStatus,
        actualizado: true,
        payment_id: payment_id,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[VerificarPagoPublico] Error:", error);
    res.status(500).json({
      message: "Error al verificar el estado del pago",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// Eliminar un item individual de una orden
// Si se eliminan todos los items, la orden se cancela automáticamente
export const eliminarItemOrden = async (req, res) => {
  try {
    const { id, itemId } = req.params;

    console.log(`[EliminarItemOrden] Eliminando item ${itemId} de orden ${id}`);

    // Verificar que la orden existe y pertenece al usuario
    const orden = await pool.query(
      "SELECT id_orden, id_usuario, estado FROM ordenes WHERE id_orden = $1",
      [id]
    );

    if (orden.rowCount === 0) {
      return res.status(404).json({ message: "Orden no encontrada" });
    }

    const ordenActual = orden.rows[0];

    // Verificar que la orden pertenece al usuario
    if (ordenActual.id_usuario !== req.usuarioId) {
      return res.status(403).json({
        message: "No puedes eliminar items de esta orden",
      });
    }

    // Solo se pueden eliminar items de órdenes pendientes
    if (ordenActual.estado !== "pendiente") {
      return res.status(400).json({
        message: `No se pueden eliminar items de una orden en estado: ${ordenActual.estado}`,
      });
    }

    // Verificar que el item existe y pertenece a la orden
    const item = await pool.query(
      `SELECT oi.id_item, oi.id_producto, oi.cantidad, oi.precio_unitario,
       p.titulo, p.stock, p.stock_reserved,
       (p.stock - p.stock_reserved) as stock_disponible
       FROM orden_items oi
       INNER JOIN productos p ON oi.id_producto = p.id_producto
       WHERE oi.id_item = $1 AND oi.id_orden = $2`,
      [itemId, id]
    );

    if (item.rowCount === 0) {
      return res.status(404).json({ message: "Item no encontrado en esta orden" });
    }

    const itemData = item.rows[0];

    // Contar cuántos items tiene la orden
    const itemsRestantes = await pool.query(
      "SELECT COUNT(*) as total FROM orden_items WHERE id_orden = $1 AND id_item != $2",
      [id, itemId]
    );

    const totalItemsRestantes = parseInt(itemsRestantes.rows[0].total);

    // Usar transacción para garantizar atomicidad
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Eliminar el item
      await client.query(
        "DELETE FROM orden_items WHERE id_item = $1 AND id_orden = $2",
        [itemId, id]
      );

      // Si no quedan items, eliminar la orden físicamente
      if (totalItemsRestantes === 0) {
        console.log(`[EliminarItemOrden] No quedan items, eliminando orden ${id}`);
        
        // Obtener estado actual de la orden para manejar stock
        const ordenInfo = await client.query(
          "SELECT estado FROM ordenes WHERE id_orden = $1",
          [id]
        );
        
        if (ordenInfo.rowCount > 0) {
          const estadoOrden = ordenInfo.rows[0].estado;
          const estadosConReserva = ["en_pago", "error"];
          
          // Liberar stock reservado si existe
          if (estadosConReserva.includes(estadoOrden)) {
            const itemsOrden = await client.query(
              "SELECT id_producto, cantidad FROM orden_items WHERE id_orden = $1",
              [id]
            );
            
            for (const item of itemsOrden.rows) {
              await client.query(
                `UPDATE productos 
                 SET stock_reserved = stock_reserved - $1 
                 WHERE id_producto = $2 
                   AND stock_reserved >= $1
                 RETURNING id_producto`,
                [item.cantidad, item.id_producto]
              );
            }
            
            // Si estaba 'en_pago', reactivar el carrito
            if (estadoOrden === "en_pago") {
              const usuarioInfo = await client.query(
                "SELECT id_usuario FROM ordenes WHERE id_orden = $1",
                [id]
              );
              if (usuarioInfo.rowCount > 0) {
                await reactivarCarritoDesdeOrden(usuarioInfo.rows[0].id_usuario, itemsOrden.rows, client);
              }
            }
          }
        }
        
        // Eliminar la orden físicamente (CASCADE eliminará items y pagos asociados)
        await client.query("DELETE FROM ordenes WHERE id_orden = $1", [id]);
        console.log(`[EliminarItemOrden] Orden ${id} eliminada físicamente`);
      }

      await client.query("COMMIT");
      client.release();

      res.json({
        message: totalItemsRestantes === 0 
          ? "Item eliminado. La orden ha sido cancelada porque no quedan productos."
          : "Item eliminado exitosamente",
        orden_cancelada: totalItemsRestantes === 0,
        items_restantes: totalItemsRestantes,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      client.release();
      throw error;
    }
  } catch (error) {
    console.error(`[EliminarItemOrden] Error:`, error);
    res.status(500).json({
      message: "Error al eliminar el item de la orden",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

