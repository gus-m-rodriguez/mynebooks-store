import cliente from "./axios.js";

export const carritoApi = {
  // Obtener carrito
  obtener: () => cliente.get("/carrito"),
  
  // Agregar producto al carrito
  // data: { producto_id, cantidad }
  agregar: (data) => cliente.post("/carrito/agregar", data),
  
  // Actualizar cantidad de un producto
  // productoId: ID del producto (no del item del carrito)
  actualizarCantidad: (productoId, cantidad) => 
    cliente.put(`/carrito/${productoId}`, { cantidad }),
  
  // Eliminar producto del carrito
  // productoId: ID del producto (no del item del carrito)
  eliminar: (productoId) => cliente.delete(`/carrito/${productoId}`),
  
  // Vaciar carrito completo
  vaciar: () => cliente.delete("/carrito"),
};


