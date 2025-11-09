import { createContext, useState, useContext, useEffect } from "react";
import Cookie from "js-cookie";
import { authApi } from "../api/auth.api.js";

export const authContext = createContext();

export const useAuth = () => {
  const context = useContext(authContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isAuth, setIsAuth] = useState(false);
  const [errors, setErrors] = useState(null);
  const [loading, setLoading] = useState(true);

  const signin = async (data) => {
    try {
      setErrors(null);
      const res = await authApi.signin(data);
      setUser(res.data);
      setIsAuth(true);
      return res.data;
    } catch (error) {
      console.error("Error en signin:", error);
      if (Array.isArray(error.response?.data)) {
        setErrors(error.response.data);
      } else if (error.response?.data?.message) {
        setErrors([error.response.data.message]);
      } else if (error.response?.data) {
        setErrors([typeof error.response.data === 'string' 
          ? error.response.data 
          : "Error al iniciar sesión"]);
      } else {
        setErrors([error.message || "Error al iniciar sesión"]);
      }
      throw error;
    }
  };

  const signup = async (data) => {
    try {
      setErrors(null);
      const res = await authApi.signup(data);
      setUser(res.data);
      setIsAuth(true);
      return res.data;
    } catch (error) {
      console.error("Error en signup:", error);
      
      // Manejar errores de red
      if (!error.response) {
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('ERR_CONNECTION_RESET')) {
          setErrors(["Error de conexión. Verifica tu conexión a internet e intenta nuevamente."]);
        } else {
          setErrors([error.message || "Error de conexión. Por favor, intenta nuevamente."]);
        }
        throw error;
      }
      
      // Manejar errores HTTP específicos
      const status = error.response?.status;
      const responseData = error.response?.data;
      
      if (status === 409) {
        // Conflicto - email ya registrado
        setErrors(["Este correo electrónico ya está registrado. ¿Ya tienes una cuenta? Intenta iniciar sesión."]);
      } else if (status === 400) {
        // Bad Request - datos inválidos
        if (Array.isArray(responseData)) {
          setErrors(responseData);
        } else if (responseData?.message) {
          setErrors([responseData.message]);
        } else {
          setErrors(["Los datos ingresados no son válidos. Por favor, revisa el formulario."]);
        }
      } else if (status === 500) {
        // Error del servidor
        setErrors(["Error del servidor. Por favor, intenta nuevamente más tarde."]);
      } else if (Array.isArray(responseData)) {
        setErrors(responseData);
      } else if (responseData?.message) {
        setErrors([responseData.message]);
      } else if (responseData) {
        setErrors([typeof responseData === 'string' 
          ? responseData 
          : "Error al registrarse"]);
      } else {
        setErrors([error.message || "Error al registrarse. Por favor, intenta nuevamente."]);
      }
      throw error;
    }
  };

  const signout = async () => {
    try {
      await authApi.signout();
      setUser(null);
      setIsAuth(false);
      Cookie.remove("token");
    } catch (error) {
      console.error("Error en signout:", error);
      // Aún así, limpiar el estado local
      setUser(null);
      setIsAuth(false);
      Cookie.remove("token");
    }
  };

  const updateProfile = async (data) => {
    try {
      setErrors(null);
      const res = await authApi.updateProfile(data);
      setUser(res.data);
      return res.data;
    } catch (error) {
      console.error("Error al actualizar perfil:", error);
      if (Array.isArray(error.response?.data)) {
        setErrors(error.response.data);
      } else {
        setErrors([error.response?.data?.message || "Error al actualizar perfil"]);
      }
      throw error;
    }
  };

  // Función para verificar autenticación de forma diferida
  // Se llama cuando se necesita verificar la sesión (ej: al acceder a rutas protegidas)
  const verifyAuth = async (force = false) => {
    const token = Cookie.get("token");
    
    if (!token) {
      setUser(null);
      setIsAuth(false);
      return false;
    }

    // Si ya tenemos usuario y no es forzado, no verificar de nuevo
    if (user && !force) {
      return true;
    }

    try {
      const res = await authApi.getProfile();
      setUser(res.data);
      setIsAuth(true);
      console.log("[AuthContext] ✅ Sesión verificada exitosamente (diferida)");
      return true;
    } catch (error) {
      console.error("[AuthContext] Error verificando autenticación (diferida):", error);
      console.error("[AuthContext] Detalles del error:", {
        status: error.response?.status,
        message: error.message,
        code: error.code,
      });
      
      // Si es un error 401, el token es inválido - limpiar sesión
      if (error.response?.status === 401) {
        console.log("[AuthContext] ❌ Token inválido (401), limpiando sesión");
        setUser(null);
        setIsAuth(false);
        Cookie.remove("token");
        return false;
      }
      
      // Para otros errores (red, servidor, etc.), mantener el token pero marcar como no autenticado
      // Esto permite que se reintente más tarde
      console.warn("[AuthContext] ⚠️ Error temporal verificando autenticación");
      setIsAuth(false);
      return false;
    }
  };

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      const token = Cookie.get("token");
      
      // Verificar si estamos en una ruta pública de pago
      // En estas rutas, NO verificamos la sesión automáticamente (verificación diferida)
      const currentPath = window.location.pathname;
      const isPublicPaymentRoute = 
        currentPath.includes('/ordenes/') && 
        (currentPath.includes('/success') || 
         currentPath.includes('/failure') || 
         currentPath.includes('/pending'));
      
      if (token) {
        // Si hay token, establecer isAuth como true inicialmente
        // Esto permite que el usuario navegue sin ser redirigido inmediatamente
        setIsAuth(true);
        
        // SOLO verificar la sesión si NO estamos en una ruta pública de pago
        // En rutas públicas de pago, la verificación se hará cuando se intente acceder a contenido protegido
        if (!isPublicPaymentRoute) {
          try {
            const res = await authApi.getProfile();
            setUser(res.data);
            setIsAuth(true);
            console.log("[AuthContext] ✅ Sesión verificada exitosamente");
          } catch (error) {
            console.error("[AuthContext] Error verificando autenticación:", error);
            console.error("[AuthContext] Detalles del error:", {
              status: error.response?.status,
              message: error.message,
              code: error.code,
            });
            
            // Solo limpiar la sesión si es un error 401 (no autorizado)
            // No limpiar por errores de red temporales o otros errores
            if (error.response?.status === 401) {
              console.log("[AuthContext] ❌ Token inválido (401), limpiando sesión");
              setUser(null);
              setIsAuth(false);
              Cookie.remove("token");
            } else {
              // Para otros errores (red, servidor, etc.), mantener el token y el estado
              // Esto evita que el usuario sea redirigido al login por errores temporales
              console.warn("[AuthContext] ⚠️ Error temporal verificando autenticación, manteniendo sesión");
              console.warn("[AuthContext] El token sigue en las cookies, la sesión se mantendrá");
              // Mantener isAuth como true para evitar redirecciones innecesarias
              // El token está en las cookies, así que asumimos que la sesión es válida
              // Intentar verificar nuevamente después de un breve delay
              setTimeout(async () => {
                try {
                  const retryRes = await authApi.getProfile();
                  setUser(retryRes.data);
                  setIsAuth(true);
                  console.log("[AuthContext] ✅ Sesión verificada exitosamente en reintento");
                } catch (retryError) {
                  console.warn("[AuthContext] ⚠️ Reintento falló, pero manteniendo sesión");
                }
              }, 2000);
            }
          }
        } else {
          // En rutas públicas de pago, no verificar automáticamente
          // La verificación se hará cuando se intente acceder a contenido protegido
          console.log("[AuthContext] ⚠️ Ruta pública de pago detectada. Verificación diferida.");
          console.log("[AuthContext] La sesión se verificará cuando se acceda a contenido protegido.");
        }
      } else {
        console.log("[AuthContext] No hay token en las cookies");
        setIsAuth(false);
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Exponer verifyAuth en el contexto
  return (
    <authContext.Provider
      value={{
        user,
        isAuth,
        errors,
        loading,
        signup,
        signin,
        signout,
        updateProfile,
        verifyAuth, // Nueva función para verificación diferida
        setUser,
        setErrors,
      }}
    >
      {children}
    </authContext.Provider>
  );
}

