import cliente from "./axios.js";

export const productosApi = {
  // Listar productos con filtros
  listar: (params = {}) => cliente.get("/productos", { params }),
  
  // Obtener producto por ID
  obtener: (id) => cliente.get(`/productos/${id}`),
  
  // Buscar productos
  buscar: (query, params = {}) => 
    cliente.get("/productos/buscar", { params: { q: query, ...params } }),
  
  // Novedades
  novedades: (limite = 10) => 
    cliente.get("/productos/novedades", { params: { limite } }),
  
  // Productos relacionados
  relacionados: (id, limite = 4) => 
    cliente.get(`/productos/${id}/relacionados`, { params: { limite } }),
  
  // Promociones
  promociones: (limite = 10) => 
    cliente.get("/productos/promociones", { params: { limite } }),
};


