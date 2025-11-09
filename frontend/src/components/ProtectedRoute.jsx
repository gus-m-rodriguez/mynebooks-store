import { Navigate, Outlet } from "react-router-dom";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectedRoute = ({ isAllowed, redirectTo = "/", requireAdmin = false }) => {
  const { isAuth, user, loading, verifyAuth } = useAuth();
  const [verifying, setVerifying] = useState(false);

  // Verificación diferida: cuando se intenta acceder a una ruta protegida,
  // verificar la sesión si no se ha verificado antes
  useEffect(() => {
    const performVerification = async () => {
      // Si ya estamos cargando o verificando, no hacer nada
      if (loading || verifying) {
        return;
      }

      // Si isAllowed es false, significa que se requiere autenticación pero el usuario no está autenticado
      // Verificar la sesión antes de redirigir al login
      // Esto permite que la sesión se restaure si las cookies no se enviaron en la primera petición
      if (!isAllowed && !user && isAuth) {
        // isAuth es true pero no hay user, significa que hay token pero no se ha verificado
        setVerifying(true);
        try {
          const isValid = await verifyAuth();
          if (!isValid) {
            console.log("[ProtectedRoute] ❌ Sesión inválida después de verificación diferida");
          } else {
            console.log("[ProtectedRoute] ✅ Sesión restaurada exitosamente");
          }
        } catch (error) {
          console.error("[ProtectedRoute] Error verificando sesión:", error);
        } finally {
          setVerifying(false);
        }
      }
    };

    performVerification();
  }, [isAllowed, user, isAuth, loading, verifying, verifyAuth]);

  if (loading || verifying) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-acento-violetaManga"></div>
      </div>
    );
  }

  // Si requiere admin, verificar que sea admin o super_admin
  if (requireAdmin && isAuth) {
    const isAdmin = user?.rol === "admin" || user?.rol === "super_admin";
    if (!isAdmin) {
      return <Navigate to={redirectTo} replace />;
    }
  }

  if (!isAllowed) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

