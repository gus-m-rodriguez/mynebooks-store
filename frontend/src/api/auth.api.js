import cliente from "./axios.js";

export const authApi = {
  // Registro
  signup: (data) => cliente.post("/auth/signup", data),
  
  // Login
  signin: (data) => cliente.post("/auth/signin", data),
  
  // Logout
  signout: () => cliente.post("/auth/signout"),
  
  // Perfil
  getProfile: () => cliente.get("/auth/profile"),
  
  // Actualizar perfil
  updateProfile: (data) => cliente.put("/auth/profile", data),
  
  // Cambiar contraseña
  changePassword: (data) => cliente.put("/auth/profile/password", data),
  
  // Eliminar cuenta
  deleteAccount: () => cliente.delete("/auth/profile"),
  
  // Restablecer contraseña
  forgotPassword: (email) => cliente.post("/auth/forgot-password", { email }),
  
  resetPassword: (data) => cliente.post("/auth/reset-password", data),
};


