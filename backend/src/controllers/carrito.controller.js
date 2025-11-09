import { pool } from "../db.js";

// Obtener carrito del usuario
// Regla de negocio: Debe indicar claramente si un producto ya no tiene stock disponible
// y ajustar la cantidad si el stock disponible es menor que la cantidad en el carrito
export const obtenerCarrito = async (req, res) => {
  try {
    const resultado = await pool.query(
      `SELECT c.*, p.titulo, p.autor, p.precio, p.precio_promocional, p.imagen_url, 
       p.stock, p.stock_reserved, (p.stock - p.stock_reserved) as stock_disponible
       FROM carrito c
       INNER JOIN productos p ON c.producto_id = p.id_producto
       WHERE c.usuario_id = $1 AND c.activo = true
       ORDER BY c.fecha_agregado DESC`,
      [req.usuarioId]
    );

    // Enriquecer cada item con información de disponibilidad
    const itemsConDisponibilidad = resultado.rows.map((item) => {
      const stockDisponible = parseInt(item.stock_disponible) || 0;
      const cantidadEnCarrito = parseInt(item.cantidad) || 0;
      
      // Determinar si el producto está disponible
      const disponible = stockDisponible > 0;
      const cantidadDisponible = stockDisponible;
      
      // Si la cantidad en carrito es mayor al stock disponible, indicar problema
      const cantidadExcedeStock = cantidadEnCarrito > stockDisponible;
      const cantidadAjustada = cantidadExcedeStock ? stockDisponible : cantidadEnCarrito;
      
      // Mensaje de estado
      let mensajeEstado = null;
      if (!disponible) {
        mensajeEstado = "Producto sin stock disponible";
      } else if (cantidadExcedeStock) {
        mensajeEstado = `Stock insuficiente. Disponible: ${stockDisponible}. Se ajustó la cantidad automáticamente.`;
      }

      return {
        ...item,
        disponible,
        cantidad_disponible: cantidadDisponible,
        cantidad_excede_stock: cantidadExcedeStock,
        cantidad_ajustada: cantidadAjustada,
        mensaje_estado: mensajeEstado,
        // Flag para el frontend
        requiere_atencion: !disponible || cantidadExcedeStock,
      };
    });

    // Verificar si hay productos que requieren atención
    const hayProductosSinStock = itemsConDisponibilidad.some(
      (item) => !item.disponible || item.cantidad_excede_stock
    );

    res.json({
      items: itemsConDisponibilidad,
      hay_productos_sin_stock: hayProductosSinStock,
      mensaje: hayProductosSinStock
        ? "Algunos productos en tu carrito ya no tienen stock disponible. Revisa los detalles antes de continuar."
        : null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el carrito" });
  }
};

// Agregar producto al carrito
// Regla de negocio: productos sin stock (stock - stock_reserved = 0) no pueden agregarse
export const agregarProducto = async (req, res) => {
  try {
    const { producto_id, cantidad } = req.body;

    if (!producto_id || !cantidad || cantidad < 1) {
      return res.status(400).json({
        message: "Debe proporcionar producto_id y cantidad válida",
      });
    }

    // Verificar que el producto existe y tiene stock disponible
    const producto = await pool.query(
      `SELECT id_producto, stock, stock_reserved, 
       (stock - stock_reserved) as stock_disponible, precio 
       FROM productos WHERE id_producto = $1`,
      [producto_id]
    );

    if (producto.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const stockDisponible = producto.rows[0].stock_disponible;
    if (stockDisponible <= 0) {
      return res.status(400).json({
        message: "El producto no tiene stock disponible",
      });
    }

    if (stockDisponible < cantidad) {
      return res.status(400).json({
        message: `Stock insuficiente. Disponible: ${stockDisponible}`,
      });
    }

    // Verificar si ya existe en el carrito
    const existe = await pool.query(
      "SELECT id, cantidad FROM carrito WHERE usuario_id = $1 AND producto_id = $2 AND activo = true",
      [req.usuarioId, producto_id]
    );

    if (existe.rowCount > 0) {
      // Actualizar cantidad
      const nuevaCantidad = existe.rows[0].cantidad + cantidad;
      if (nuevaCantidad > stockDisponible) {
        return res.status(400).json({
          message: `Stock insuficiente. Disponible: ${stockDisponible}`,
        });
      }

      const actualizado = await pool.query(
        "UPDATE carrito SET cantidad = $1, fecha_agregado = NOW() WHERE id = $2 RETURNING *",
        [nuevaCantidad, existe.rows[0].id]
      );

      return res.json(actualizado.rows[0]);
    }

    // Crear nuevo item en carrito
    const resultado = await pool.query(
      "INSERT INTO carrito (usuario_id, producto_id, cantidad) VALUES ($1, $2, $3) RETURNING *",
      [req.usuarioId, producto_id, cantidad]
    );

    res.status(201).json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al agregar producto al carrito" });
  }
};

// Actualizar cantidad de un producto en el carrito
// Regla de negocio: 
// - Cantidad puede ser de 1 hasta stock_disponible (para ajustar)
// - Cantidad 0 elimina el producto del carrito (equivalente a eliminarProducto)
export const actualizarCantidad = async (req, res) => {
  try {
    const { productoId } = req.params;
    const { cantidad } = req.body;

    // Validar cantidad
    if (cantidad === undefined || cantidad === null || cantidad < 0) {
      return res.status(400).json({
        message: "La cantidad debe ser un número mayor o igual a 0 (0 elimina el producto)",
      });
    }

    // Si cantidad es 0, eliminar el producto del carrito
    if (cantidad === 0) {
      const eliminado = await pool.query(
        "UPDATE carrito SET activo = false WHERE usuario_id = $1 AND producto_id = $2 AND activo = true RETURNING *",
        [req.usuarioId, productoId]
      );

      if (eliminado.rowCount === 0) {
        return res.status(404).json({
          message: "Producto no encontrado en el carrito",
        });
      }

      return res.json({ 
        message: "Producto eliminado del carrito",
        cantidad: 0 
      });
    }

    // Verificar stock disponible (stock - stock_reserved)
    const producto = await pool.query(
      `SELECT stock, stock_reserved, (stock - stock_reserved) as stock_disponible 
       FROM productos WHERE id_producto = $1`,
      [productoId]
    );

    if (producto.rowCount === 0) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }

    const stockDisponible = producto.rows[0].stock_disponible;
    
    // Validar que la cantidad no exceda el stock disponible
    if (cantidad > stockDisponible) {
      return res.status(400).json({
        message: `Stock insuficiente. Disponible: ${stockDisponible}, solicitado: ${cantidad}`,
        stock_disponible: stockDisponible,
      });
    }

    // Actualizar cantidad en el carrito
    const resultado = await pool.query(
      "UPDATE carrito SET cantidad = $1 WHERE usuario_id = $2 AND producto_id = $3 AND activo = true RETURNING *",
      [cantidad, req.usuarioId, productoId]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        message: "Producto no encontrado en el carrito",
      });
    }

    res.json(resultado.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al actualizar la cantidad del producto",
    });
  }
};

// Eliminar producto del carrito
export const eliminarProducto = async (req, res) => {
  try {
    const { productoId } = req.params;

    const resultado = await pool.query(
      "UPDATE carrito SET activo = false WHERE usuario_id = $1 AND producto_id = $2 RETURNING *",
      [req.usuarioId, productoId]
    );

    if (resultado.rowCount === 0) {
      return res.status(404).json({
        message: "Producto no encontrado en el carrito",
      });
    }

    res.json({ message: "Producto eliminado del carrito" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Error al eliminar el producto del carrito",
    });
  }
};

// Vaciar carrito
export const vaciarCarrito = async (req, res) => {
  try {
    await pool.query(
      "UPDATE carrito SET activo = false WHERE usuario_id = $1",
      [req.usuarioId]
    );

    res.json({ message: "Carrito vaciado" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al vaciar el carrito" });
  }
};

