import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

const ProtectedRoute = ({ isAllowed, redirectTo = "/", requireAdmin = false }) => {
  const { isAuth, user, loading } = useAuth();

  if (loading) {
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

