import axios from "axios";

const baseURL =
  import.meta.env.MODE === "production"
    ? import.meta.env.VITE_BACKEND_PROD
    : import.meta.env.VITE_BACKEND;

const cliente = axios.create({
  baseURL: baseURL,
  withCredentials: true,
});

// Interceptor para manejar errores 401 sin limpiar la sesión en rutas públicas
// Las rutas públicas (como /ordenes/:id/success) pueden recibir 401 sin que sea un problema
cliente.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si es un error 401 y estamos en una ruta pública de resultado de pago,
    // no hacer nada especial (dejar que el componente maneje el error)
    // Esto evita que se limpie la sesión incorrectamente
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const isPublicPaymentRoute = 
        currentPath.includes('/ordenes/') && 
        (currentPath.includes('/success') || 
         currentPath.includes('/failure') || 
         currentPath.includes('/pending'));
      
      if (isPublicPaymentRoute) {
        console.log("[axios] Error 401 en ruta pública de pago, no limpiando sesión");
        // No hacer nada, dejar que el componente maneje el error
        return Promise.reject(error);
      }
    }
    
    // Para otros errores, rechazar normalmente
    return Promise.reject(error);
  }
);

export default cliente;


