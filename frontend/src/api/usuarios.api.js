import cliente from "./axios.js";

export const usuariosApi = {
  // Listar usuarios (admin)
  listar: () => cliente.get("/usuarios"),
  
  // Obtener usuario (admin)
  obtener: (id) => cliente.get(`/usuarios/${id}`),
  
  // Crear usuario (admin)
  crear: (data) => cliente.post("/usuarios", data),
  
  // Actualizar rol y permisos (admin/super admin)
  actualizarRolPermisos: (id, data) => 
    cliente.put(`/usuarios/${id}/rol-permisos`, data),
  
  // Listar permisos disponibles
  listarPermisos: () => cliente.get("/usuarios/permisos"),
};


