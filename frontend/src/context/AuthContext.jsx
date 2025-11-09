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

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      // IMPORTANTE: No usar Cookie.get("token") porque las cookies están en el dominio del backend
      // y js-cookie solo puede leer cookies del dominio actual (frontend).
      // En su lugar, intentar getProfile() directamente - el navegador enviará las cookies
      // automáticamente si están disponibles (con withCredentials: true).
      
      // Verificar si estamos en una ruta pública de pago o si venimos de una
      const currentPath = window.location.pathname;
      const isPublicPaymentRoute = 
        currentPath.includes('/ordenes/') && 
        (currentPath.includes('/success') || 
         currentPath.includes('/failure') || 
         currentPath.includes('/pending'));
      
      // Verificar si venimos de una ruta pública de pago (guardado en sessionStorage)
      const cameFromPaymentRoute = sessionStorage.getItem('cameFromPaymentRoute') === 'true';
      
      // Limpiar el flag de sessionStorage
      if (cameFromPaymentRoute) {
        sessionStorage.removeItem('cameFromPaymentRoute');
      }
      
      // Si venimos de una ruta pública de pago, agregar delay antes de verificar
      // Esto da tiempo a que las cookies se establezcan correctamente después del redirect
      const delay = (isPublicPaymentRoute || cameFromPaymentRoute) ? 1500 : 0;
      
      const verifySession = async () => {
        try {
          // Intentar getProfile() directamente - el navegador enviará las cookies automáticamente
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
            isPublicPaymentRoute,
            cameFromPaymentRoute,
          });
          
          // Si es un error 401, el token es inválido o no hay cookies
          if (error.response?.status === 401) {
            // Si venimos de una ruta pública de pago, NO limpiar inmediatamente
            // Reintentar varias veces antes de limpiar (las cookies pueden tardar en establecerse)
            if (isPublicPaymentRoute || cameFromPaymentRoute) {
              console.log("[AuthContext] ⚠️ Error 401 después de volver de pago. Reintentando...");
              // Reintentar hasta 3 veces con delays crecientes
              const maxRetries = 3;
              const attemptRetry = (attemptNumber) => {
                if (attemptNumber > maxRetries) {
                  console.log("[AuthContext] ❌ No hay sesión válida después de múltiples reintentos");
                  setUser(null);
                  setIsAuth(false);
                  // No intentar remover cookie porque no podemos leerla desde aquí
                  return;
                }
                
                const retryDelay = 1000 * attemptNumber; // 1s, 2s, 3s
                console.log(`[AuthContext] Reintento ${attemptNumber}/${maxRetries} en ${retryDelay}ms...`);
                
                setTimeout(async () => {
                  try {
                    const retryRes = await authApi.getProfile();
                    setUser(retryRes.data);
                    setIsAuth(true);
                    console.log("[AuthContext] ✅ Sesión verificada exitosamente en reintento");
                  } catch (retryError) {
                    if (retryError.response?.status === 401) {
                      // Intentar siguiente reintento
                      attemptRetry(attemptNumber + 1);
                    } else {
                      console.warn("[AuthContext] ⚠️ Error temporal en reintento, manteniendo sesión");
                      // Mantener isAuth como true para evitar redirecciones innecesarias
                      setIsAuth(true);
                    }
                  }
                }, retryDelay);
              };
              
              // Iniciar primer reintento
              attemptRetry(1);
            } else {
              // Si NO venimos de una ruta pública de pago, limpiar inmediatamente
              console.log("[AuthContext] ❌ No hay sesión válida (401)");
              setUser(null);
              setIsAuth(false);
            }
          } else {
            // Para otros errores (red, servidor, etc.), mantener el estado pero no marcar como autenticado
            // Esto evita que el usuario sea redirigido al login por errores temporales
            console.warn("[AuthContext] ⚠️ Error temporal verificando autenticación");
            // No establecer isAuth como true, pero tampoco limpiar
            // Intentar verificar nuevamente después de un breve delay
            setTimeout(async () => {
              try {
                const retryRes = await authApi.getProfile();
                setUser(retryRes.data);
                setIsAuth(true);
                console.log("[AuthContext] ✅ Sesión verificada exitosamente en reintento");
              } catch (retryError) {
                console.warn("[AuthContext] ⚠️ Reintento falló");
                // Si sigue fallando, marcar como no autenticado
                if (retryError.response?.status === 401) {
                  setUser(null);
                  setIsAuth(false);
                }
              }
            }, 2000);
          }
        }
      };
      
      if (delay > 0) {
        setTimeout(verifySession, delay);
      } else {
        verifySession();
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
        setUser,
        setErrors,
      }}
    >
      {children}
    </authContext.Provider>
  );
}

