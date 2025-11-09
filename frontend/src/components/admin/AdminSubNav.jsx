import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { FaBox, FaShoppingCart, FaUsers, FaDollarSign, FaChartLine, FaFileAlt } from "react-icons/fa";
import { useAuth } from "../../context/AuthContext.jsx";
import { adminApi } from "../../api/admin.api.js";

const AdminSubNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Solo mostrar en páginas de admin
  const esPaginaAdmin = location.pathname.startsWith("/admin");
  
  // Verificar si es super admin (tiene todos los permisos)
  const esSuperAdmin = user?.rol === "super_admin" || user?.es_super_admin;
  
  useEffect(() => {
    if (esPaginaAdmin && user) {
      cargarPermisos();
    }
  }, [esPaginaAdmin, user]);
  
  const cargarPermisos = async () => {
    try {
      if (esSuperAdmin) {
        // Super admin tiene todos los permisos
        setPermisos(["Dashboard", "Productos", "Ordenes", "Usuarios", "Ingresos", "Auditoria"]);
      } else if (user?.rol === "admin") {
        // Obtener permisos del usuario desde el perfil o desde la API
        // Primero intentar desde el usuario actual
        if (user.permisos && Array.isArray(user.permisos)) {
          // Si los permisos vienen como objetos con nombre_permiso
          const nombresPermisos = user.permisos.map(p => 
            typeof p === 'string' ? p : p.nombre_permiso
          );
          setPermisos(nombresPermisos);
        } else {
          // Si no, obtener el usuario completo desde la API
          try {
            const res = await adminApi.obtenerUsuario(user.id_usuario);
            if (res.data?.permisos) {
              const nombresPermisos = res.data.permisos.map(p => 
                typeof p === 'string' ? p : p.nombre_permiso
              );
              setPermisos(nombresPermisos);
            }
          } catch (err) {
            console.error("Error obteniendo permisos:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error cargando permisos:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!esPaginaAdmin) {
    return null;
  }

  const secciones = [
    {
      id: "dashboard",
      titulo: "Dashboard",
      icono: FaChartLine,
      ruta: "/admin",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      borderColor: "border-indigo-600",
      permiso: "Dashboard",
    },
    {
      id: "productos",
      titulo: "Productos",
      icono: FaBox,
      ruta: "/admin/productos",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-600",
      permiso: "Productos",
    },
    {
      id: "ordenes",
      titulo: "Órdenes",
      icono: FaShoppingCart,
      ruta: "/admin/ordenes",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-600",
      permiso: "Ordenes",
    },
    {
      id: "usuarios",
      titulo: "Usuarios",
      icono: FaUsers,
      ruta: "/admin/usuarios",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-600",
      permiso: "Usuarios",
    },
    {
      id: "ingresos",
      titulo: "Ingresos",
      icono: FaDollarSign,
      ruta: "/admin/pagos",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-600",
      permiso: "Ingresos",
    },
    {
      id: "auditoria",
      titulo: "Auditoría",
      icono: FaFileAlt,
      ruta: "/admin/logs",
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-600",
      permiso: "Auditoria",
    },
  ];
  
  // Filtrar secciones según permisos del usuario
  const seccionesPermitidas = loading 
    ? [] 
    : secciones.filter(seccion => 
        esSuperAdmin || permisos.includes(seccion.permiso)
      );

  const handleSeccionClick = (ruta) => {
    navigate(ruta);
  };

  // Determinar qué sección está activa basándose en la ruta
  const getSeccionActiva = () => {
    const path = location.pathname;
    if (path === "/admin" || path === "/admin/") return "dashboard";
    if (path.startsWith("/admin/productos")) return "productos";
    if (path.startsWith("/admin/ordenes")) return "ordenes";
    if (path.startsWith("/admin/usuarios")) return "usuarios";
    if (path.startsWith("/admin/pagos")) return "ingresos";
    if (path.startsWith("/admin/logs")) return "auditoria";
    return null;
  };

  const seccionActiva = getSeccionActiva();

  // Si está cargando, no mostrar nada
  if (loading) {
    return null;
  }
  
  // Si no hay secciones permitidas, no mostrar nada
  if (seccionesPermitidas.length === 0) {
    return null;
  }

  return (
    <div className="hidden md:block w-full bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap gap-2 py-3">
          {seccionesPermitidas.map((seccion) => {
            const Icono = seccion.icono;
            const estaActivo = seccionActiva === seccion.id;
            
            return (
              <button
                key={seccion.id}
                onClick={() => handleSeccionClick(seccion.ruta)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  estaActivo
                    ? `${seccion.bgColor} ${seccion.color} border-2 ${seccion.borderColor}`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icono size={14} />
                <span>{seccion.titulo}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AdminSubNav;

