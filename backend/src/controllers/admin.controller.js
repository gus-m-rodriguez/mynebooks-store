import { pool } from "../db.js";
// PDF generation será implementado después
// import { generarPDF } from "../utils/pdf.js";

// Listar todos los productos (admin)
export const listarProductosAdmin = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT id_producto, titulo, autor, categoria, precio, precio_promocional,
       stock, stock_reserved, (stock - stock_reserved) as stock_disponible,
       imagen_url, descripcion, fecha_creacion
       FROM productos
       ORDER BY titulo ASC`
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};

// Crear producto
export const crearProducto = async (req, res) => {
  try {
    const { titulo, autor, categoria, precio, precio_promocional, stock, imagen_url, descripcion } = req.body;

    const resultado = await pool.query(
      `INSERT INTO productos (titulo, autor, categoria, precio, precio_promocional, stock, stock_reserved, imagen_url, descripcion, fecha_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, CURRENT_TIMESTAMP)
       RETURNING id_producto, titulo, autor, categoria, precio, precio_promocional, stock, stock_reserved, imagen_url, descripcion, fecha_creacion`,
      [titulo, autor, categoria || null, precio, precio_promocional || null, stock || 0, imagen_url || null, descripcion || null]
    );

    // Registrar en auditoría
    if (req.usuarioId) {
      await pool.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["producto_creado", `admin_${req.usuarioId}`]
      );
    }

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al crear el producto" });
  }
};

// Actualizar producto
export const actualizarProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const { titulo, autor, categoria, precio, precio_promocional, stock, imagen_url, descripcion } = req.body;

    const resultado = await pool.query(
      `UPDATE productos 
       SET titulo = $1, autor = $2, categoria = $3, precio = $4, precio_promocional = $5,
           stock = $6, imagen_url = $7, descripcion = $8
       WHERE id_producto = $9
       RETURNING id_producto, titulo, autor, categoria, precio, precio_promocional, stock, stock_reserved, imagen_url, descripcion, fecha_creacion`,
      [titulo, autor, categoria || null, precio, precio_promocional || null, stock, imagen_url || null, descripcion || null, id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Registrar en auditoría
    if (req.usuarioId) {
      await pool.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["producto_actualizado", `admin_${req.usuarioId}`]
      );
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar el producto" });
  }
};

// Eliminar producto (hard delete - según diccionario no hay campo activo)
export const eliminarProducto = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que no tenga órdenes asociadas
    const tieneOrdenes = await pool.query(
      "SELECT COUNT(*) as count FROM orden_items WHERE id_producto = $1",
      [id]
    );

    if (parseInt(tieneOrdenes.rows[0].count) > 0) {
      return res.status(400).json({
        message:
          "No se puede eliminar el producto porque tiene órdenes asociadas",
      });
    }

    const resultado = await pool.query(
      "DELETE FROM productos WHERE id_producto = $1 RETURNING id_producto",
      [id]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    // Registrar en auditoría
    if (req.usuarioId) {
      await pool.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["producto_eliminado", `admin_${req.usuarioId}`]
      );
    }

    res.json({ message: "Producto eliminado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar el producto" });
  }
};

// Listar todas las órdenes (admin)
// Excluye órdenes canceladas por usuarios (estado 'cancelada_usuario')
// NO excluye órdenes canceladas por administrador
export const listarOrdenesAdmin = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT o.id_orden, o.id_usuario, o.fecha_creacion, o.fecha_expiracion, o.direccion_envio, o.estado,
       u.nombre, u.apellido, u.email as usuario_email,
       COUNT(oi.id_item) as total_items,
       SUM(oi.cantidad * oi.precio_unitario) as total
       FROM ordenes o
       LEFT JOIN usuarios u ON o.id_usuario = u.id_usuario
       LEFT JOIN orden_items oi ON o.id_orden = oi.id_orden
       WHERE o.estado != 'pendiente'
       GROUP BY o.id_orden, u.nombre, u.apellido, u.email
       ORDER BY o.fecha_creacion DESC`
    );

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener las órdenes" });
  }
};

// Generar catálogo PDF
export const generarCatalogoPDF = async (req, res) => {
  try {
    // TODO: Implementar generación de PDF
    // Por ahora retornamos un mensaje
    res.json({
      message: "Generación de catálogo PDF - Pendiente de implementar",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al generar el catálogo PDF" });
  }
};

// Listar logs de auditoría (solo super admin)
export const listarLogsAuditoria = async (req, res) => {
  try {
    const { limite = 100, offset = 0, tipo, fecha_desde, fecha_hasta, usuario } = req.query;

    let query = `SELECT id_evento, tipo, usuario, fecha 
                 FROM auditoria`;
    const params = [];
    let paramCount = 0;
    const whereConditions = [];

    // Filtros opcionales
    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo ILIKE $${paramCount}`);
      params.push(`%${tipo}%`);
    }

    if (usuario) {
      paramCount++;
      whereConditions.push(`usuario ILIKE $${paramCount}`);
      params.push(`%${usuario}%`);
    }

    if (fecha_desde) {
      paramCount++;
      whereConditions.push(`fecha >= $${paramCount}`);
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      whereConditions.push(`fecha <= $${paramCount}`);
      params.push(fecha_hasta);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY fecha DESC";

    // Paginación
    if (limite) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limite));
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const resultado = await pool.query(query, params);

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener logs de auditoría" });
  }
};

// Listar logs de acciones propias (para admins)
export const misAccionesLogs = async (req, res) => {
  try {
    const { limite = 100, offset = 0, tipo, fecha_desde, fecha_hasta } = req.query;
    const usuarioId = req.usuarioId;

    // Formato del usuario en auditoría: "usuario_X", "admin_X", "email_X"
    const patronesUsuario = [
      `usuario_${usuarioId}`,
      `admin_${usuarioId}`,
    ];

    // También buscar por email si está disponible
    const usuario = await pool.query(
      "SELECT email FROM usuarios WHERE id_usuario = $1",
      [usuarioId]
    );
    if (usuario.rowCount > 0) {
      patronesUsuario.push(`email_${usuario.rows[0].email}`);
    }

    let query = `SELECT id_evento, tipo, usuario, fecha 
                 FROM auditoria
                 WHERE usuario = ANY($1)`;
    const params = [patronesUsuario];
    let paramCount = 1;
    const whereConditions = [];

    // Filtros opcionales adicionales
    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo ILIKE $${paramCount}`);
      params.push(`%${tipo}%`);
    }

    if (fecha_desde) {
      paramCount++;
      whereConditions.push(`fecha >= $${paramCount}`);
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      whereConditions.push(`fecha <= $${paramCount}`);
      params.push(fecha_hasta);
    }

    if (whereConditions.length > 0) {
      query += " AND " + whereConditions.join(" AND ");
    }

    query += " ORDER BY fecha DESC";

    // Paginación
    if (limite) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limite));
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const resultado = await pool.query(query, params);

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener mis acciones" });
  }
};

// Exportar logs de auditoría (solo super admin)
export const exportarLogs = async (req, res) => {
  try {
    const { formato = "json", tipo, fecha_desde, fecha_hasta, usuario } = req.query;

    if (formato !== "json" && formato !== "csv") {
      return res.status(400).json({
        message: "Formato no válido. Use 'json' o 'csv'",
      });
    }

    // Construir query (sin paginación para exportación completa)
    let query = `SELECT id_evento, tipo, usuario, fecha 
                 FROM auditoria`;
    const params = [];
    let paramCount = 0;
    const whereConditions = [];

    // Filtros opcionales
    if (tipo) {
      paramCount++;
      whereConditions.push(`tipo ILIKE $${paramCount}`);
      params.push(`%${tipo}%`);
    }

    if (usuario) {
      paramCount++;
      whereConditions.push(`usuario ILIKE $${paramCount}`);
      params.push(`%${usuario}%`);
    }

    if (fecha_desde) {
      paramCount++;
      whereConditions.push(`fecha >= $${paramCount}`);
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      whereConditions.push(`fecha <= $${paramCount}`);
      params.push(fecha_hasta);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " ORDER BY fecha DESC";

    const resultado = await pool.query(query, params);

    if (formato === "csv") {
      // Generar CSV
      const headers = ["id_evento", "tipo", "usuario", "fecha"];
      const csvRows = [
        headers.join(","),
        ...resultado.rows.map((row) =>
          [
            row.id_evento,
            `"${row.tipo.replace(/"/g, '""')}"`,
            `"${(row.usuario || "").replace(/"/g, '""')}"`,
            row.fecha ? new Date(row.fecha).toISOString() : "",
          ].join(",")
        ),
      ];

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="logs_auditoria_${new Date().toISOString().split("T")[0]}.csv"`
      );
      res.send(csvRows.join("\n"));
    } else {
      // JSON
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="logs_auditoria_${new Date().toISOString().split("T")[0]}.json"`
      );
      res.json(resultado.rows);
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al exportar logs de auditoría" });
  }
};

// Listar pagos (admin)
// Permite visualizar todos los pagos, especialmente útiles para casos de error
export const listarPagos = async (req, res) => {
  try {
    const { limite = 100, offset = 0, estado, id_orden, mp_id, fecha_desde, fecha_hasta } = req.query;

    let query = `SELECT p.id_pago, p.id_orden, p.mp_id, p.estado, p.monto, p.fecha_pago,
                 o.id_usuario, o.estado as orden_estado, o.fecha_creacion,
                 u.nombre, u.apellido, u.email as usuario_email,
                 COUNT(oi.id_item) as total_items,
                 SUM(oi.cantidad * oi.precio_unitario) as orden_total
                 FROM pagos p
                 INNER JOIN ordenes o ON p.id_orden = o.id_orden
                 LEFT JOIN usuarios u ON o.id_usuario = u.id_usuario
                 LEFT JOIN orden_items oi ON o.id_orden = oi.id_orden`;
    const params = [];
    let paramCount = 0;
    const whereConditions = [];

    // Filtros opcionales
    if (estado) {
      paramCount++;
      whereConditions.push(`p.estado = $${paramCount}`);
      params.push(estado);
    }

    if (id_orden) {
      paramCount++;
      whereConditions.push(`p.id_orden = $${paramCount}`);
      params.push(parseInt(id_orden));
    }

    if (mp_id) {
      paramCount++;
      whereConditions.push(`p.mp_id = $${paramCount}`);
      params.push(mp_id);
    }

    if (fecha_desde) {
      paramCount++;
      whereConditions.push(`p.fecha_pago >= $${paramCount}`);
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      paramCount++;
      whereConditions.push(`p.fecha_pago <= $${paramCount}`);
      params.push(fecha_hasta);
    }

    if (whereConditions.length > 0) {
      query += " WHERE " + whereConditions.join(" AND ");
    }

    query += " GROUP BY p.id_pago, p.id_orden, p.mp_id, p.estado, p.monto, p.fecha_pago, o.id_usuario, o.estado, o.fecha_creacion, u.nombre, u.apellido, u.email";
    query += " ORDER BY p.fecha_pago DESC NULLS LAST, p.id_pago DESC";

    // Paginación
    if (limite) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(parseInt(limite));
    }

    if (offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(parseInt(offset));
    }

    const resultado = await pool.query(query, params);

    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener pagos" });
  }
};

// Obtener un pago específico con detalles completos
export const obtenerPago = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener pago con información de orden y usuario
    const pago = await pool.query(
      `SELECT p.id_pago, p.id_orden, p.mp_id, p.estado, p.monto, p.fecha_pago,
       o.id_usuario, o.estado as orden_estado, o.fecha_creacion, o.fecha_expiracion,
       u.nombre, u.apellido, u.email as usuario_email
       FROM pagos p
       INNER JOIN ordenes o ON p.id_orden = o.id_orden
       LEFT JOIN usuarios u ON o.id_usuario = u.id_usuario
       WHERE p.id_pago = $1`,
      [id]
    );

    if (pago.rowCount === 0) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }

    // Obtener items de la orden
    const items = await pool.query(
      `SELECT oi.id_item, oi.id_producto, oi.cantidad, oi.precio_unitario,
       p.titulo, p.autor, p.categoria
       FROM orden_items oi
       INNER JOIN productos p ON oi.id_producto = p.id_producto
       WHERE oi.id_orden = $1`,
      [pago.rows[0].id_orden]
    );

    res.json({
      ...pago.rows[0],
      items: items.rows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el pago" });
  }
};

// Actualizar estado de orden desde un pago (para casos de error)
// Útil cuando el pago está 'approved' en MP pero la orden está en 'error'
export const actualizarOrdenDesdePago = async (req, res) => {
  try {
    const { id } = req.params; // id_pago
    const { nuevo_estado } = req.body;

    // Validar nuevo estado
    const estadosValidos = ["pagado", "cancelado", "rechazado"];
    if (!nuevo_estado || !estadosValidos.includes(nuevo_estado)) {
      return res.status(400).json({
        message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(", ")}`,
      });
    }

    // Obtener pago y orden
    const pago = await pool.query(
      `SELECT p.id_pago, p.id_orden, p.estado as pago_estado, p.monto,
       o.estado as orden_estado, o.id_usuario
       FROM pagos p
       INNER JOIN ordenes o ON p.id_orden = o.id_orden
       WHERE p.id_pago = $1`,
      [id]
    );

    if (pago.rowCount === 0) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }

    const pagoData = pago.rows[0];

    // Validar que el pago esté en estado 'approved' si se quiere marcar como 'pagado'
    if (nuevo_estado === "pagado" && pagoData.pago_estado !== "approved") {
      return res.status(400).json({
        message: `No se puede marcar la orden como 'pagado' porque el pago está en estado '${pagoData.pago_estado}'`,
      });
    }

    // Validar que la orden esté en un estado que permita cambio
    if (pagoData.orden_estado === "pagado" && nuevo_estado !== "pagado") {
      return res.status(400).json({
        message: "No se puede cambiar el estado de una orden ya pagada",
      });
    }

    // Si el admin cancela, usar estado específico
    if (nuevo_estado === "cancelado") {
      nuevo_estado = "cancelada_administrador";
    }

    // Obtener items de la orden para manejar stock
    const items = await pool.query(
      "SELECT id_producto, cantidad FROM orden_items WHERE id_orden = $1",
      [pagoData.id_orden]
    );

    // Usar transacción para garantizar atomicidad
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Actualizar estado de la orden
      await client.query(
        "UPDATE ordenes SET estado = $1 WHERE id_orden = $2",
        [nuevo_estado, pagoData.id_orden]
      );

      // Manejar stock según el nuevo estado
      const estadosConReserva = ["en_pago", "error"];
      const tieneReserva = estadosConReserva.includes(pagoData.orden_estado);

      if (nuevo_estado === "pagado") {
        // Pago exitoso: descontar stock definitivo y liberar reserva
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
      } else if ((nuevo_estado === "cancelado" || nuevo_estado === "cancelada_administrador" || nuevo_estado === "rechazado") && tieneReserva) {
        // Cancelado/Rechazado: liberar stock_reserved
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

        // Si la orden estaba 'en_pago' o 'error', reactivar el carrito
        if (pagoData.orden_estado === "en_pago" || pagoData.orden_estado === "error") {
          const { reactivarCarritoDesdeOrden } = await import("../utils/carrito.js");
          await reactivarCarritoDesdeOrden(pagoData.id_usuario, items.rows, client);
        }
      }

      // Registrar en auditoría
      if (req.usuarioId) {
        await client.query(
          `INSERT INTO auditoria (tipo, usuario, fecha) 
           VALUES ($1, $2, CURRENT_TIMESTAMP)`,
          [`orden_actualizada_desde_pago_${nuevo_estado}`, `admin_${req.usuarioId}`]
        );
      }

      await client.query("COMMIT");

      // Enviar email de actualización de estado (no bloquea si falla)
      if (pagoData.orden_estado !== nuevo_estado) {
        try {
          const usuarioData = await pool.query(
            "SELECT nombre, apellido, email FROM usuarios WHERE id_usuario = $1",
            [pagoData.id_usuario]
          );

          if (usuarioData.rowCount > 0) {
            const { enviarEmailOrdenEstado } = await import("../utils/email.js");
            await enviarEmailOrdenEstado(
              usuarioData.rows[0].email,
              usuarioData.rows[0].nombre,
              pagoData.id_orden,
              pagoData.orden_estado,
              nuevo_estado,
              pagoData.id_usuario
            );
          }
        } catch (emailError) {
          console.error("Error enviando email de actualización de estado:", emailError);
          // No fallar la actualización si el email falla
        }
      }

      // Obtener orden actualizada
      const ordenActualizada = await pool.query(
        "SELECT id_orden, id_usuario, fecha_creacion, fecha_expiracion, direccion_envio, estado FROM ordenes WHERE id_orden = $1",
        [pagoData.id_orden]
      );

      res.json({
        message: `Orden actualizada a estado '${nuevo_estado}' desde el pago`,
        pago_id: id,
        orden: ordenActualizada.rows[0],
        pago_estado: pagoData.pago_estado,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar orden desde pago" });
  }
};

