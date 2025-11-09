import cliente from "./axios.js";

export const ordenesApi = {
  // Listar órdenes del usuario
  listar: () => cliente.get("/ordenes"),
  
  // Obtener orden por ID
  obtener: (id) => cliente.get(`/ordenes/${id}`),
  
  // Crear orden
  crear: (data) => cliente.post("/ordenes", data),
  
  // Iniciar pago
  iniciarPago: (id) => cliente.post(`/ordenes/${id}/iniciar-pago`),
  
  // Verificar estado del pago (puede recibir payment_id en el body)
  verificarPago: (id, body) => cliente.post(`/ordenes/${id}/verificar-pago`, body),
  
  // Verificar pago desde redirect de Mercado Pago (endpoint público, no requiere autenticación)
  verificarPagoPublico: (id, body) => cliente.post(`/ordenes/${id}/verificar-pago-publico`, body),
  
  // Actualizar estado de orden
  actualizarEstado: (id, data) => cliente.patch(`/ordenes/${id}/estado`, data),
  
  // Eliminar item individual de una orden
  eliminarItem: (ordenId, itemId) => cliente.delete(`/ordenes/${ordenId}/items/${itemId}`),
};


