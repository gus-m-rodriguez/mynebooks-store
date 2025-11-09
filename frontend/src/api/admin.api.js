import cliente from "./axios.js";

export const adminApi = {
  // Productos
  listarProductos: () => cliente.get("/admin/productos"),
  crearProducto: (data) => cliente.post("/admin/productos", data),
  actualizarProducto: (id, data) => cliente.put(`/admin/productos/${id}`, data),
  eliminarProducto: (id) => cliente.delete(`/admin/productos/${id}`),
  
  // Subida de imágenes
  subirImagen: (file) => {
    const formData = new FormData();
    formData.append("image", file);
    return cliente.post("/admin/upload/image", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
  },
  
  // Órdenes
  listarOrdenes: () => cliente.get("/admin/ordenes"),
  actualizarEstadoOrden: (id, estado) => 
    cliente.patch(`/admin/ordenes/${id}/estado`, { estado }),
  
  // Pagos
  listarPagos: () => cliente.get("/admin/pagos"),
  obtenerPago: (id) => cliente.get(`/admin/pagos/${id}`),
  actualizarOrdenDesdePago: (id, data) => 
    cliente.patch(`/admin/pagos/${id}/actualizar-orden`, data),
  
  // Logs de auditoría (solo super admin)
  listarLogs: (params = {}) => cliente.get("/admin/logs", { params }),
  misAccionesLogs: (params = {}) => cliente.get("/admin/logs/mis-acciones", { params }),
  exportarLogs: (params = {}) => cliente.get("/admin/logs/export", { params }),
  
  // PDF (pendiente)
  generarCatalogoPDF: (params = {}) => 
    cliente.get("/admin/catalogo/pdf", { params, responseType: "blob" }),
  
  // Usuarios
  listarUsuarios: () => cliente.get("/usuarios"),
  obtenerUsuario: (id) => cliente.get(`/usuarios/${id}`),
  crearUsuario: (data) => cliente.post("/usuarios", data),
  actualizarRolPermisos: (id, data) => cliente.put(`/usuarios/${id}/rol-permisos`, data),
  listarPermisos: () => cliente.get("/usuarios/permisos"),
};


