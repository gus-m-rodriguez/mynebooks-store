import { pool } from "../db.js";

/**
 * Reactiva el carrito del usuario con los items de una orden
 * Esta función se usa cuando una orden 'en_pago' se cancela, rechaza o expira
 * 
 * @param {number} usuarioId - ID del usuario
 * @param {Array} items - Array de items con {id_producto, cantidad}
 * @param {Object} client - Cliente de transacción (opcional). Si se proporciona, usa el client en lugar del pool
 */
export const reactivarCarritoDesdeOrden = async (usuarioId, items, client = null) => {
  const queryClient = client || pool;
  
  for (const item of items) {
    // Verificar si ya existe un item (activo o inactivo) en el carrito
    const itemExistente = await queryClient.query(
      `SELECT id, cantidad, activo 
       FROM carrito 
       WHERE usuario_id = $1 AND producto_id = $2`,
      [usuarioId, item.id_producto]
    );

    if (itemExistente.rowCount > 0) {
      // Si existe, reactivarlo y actualizar cantidad
      const existente = itemExistente.rows[0];
      const nuevaCantidad = parseInt(existente.cantidad) + parseInt(item.cantidad);
      
      await queryClient.query(
        `UPDATE carrito 
         SET activo = true, cantidad = $1, fecha_agregado = CURRENT_TIMESTAMP 
         WHERE id = $2`,
        [nuevaCantidad, existente.id]
      );
    } else {
      // Si no existe, crear nuevo item en el carrito
      await queryClient.query(
        `INSERT INTO carrito (usuario_id, producto_id, cantidad, activo) 
         VALUES ($1, $2, $3, true)`,
        [usuarioId, item.id_producto, item.cantidad]
      );
    }
  }
};

