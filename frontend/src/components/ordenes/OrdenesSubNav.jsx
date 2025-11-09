import { useLocation } from "react-router-dom";
import { FaClock, FaTruck, FaHistory } from "react-icons/fa";

const OrdenesSubNav = ({ filtroActivo, onFiltroChange }) => {
  const location = useLocation();
  
  // Solo mostrar en páginas de órdenes (no en admin)
  const esPaginaOrdenes = location.pathname.startsWith("/ordenes") && !location.pathname.startsWith("/admin");
  
  if (!esPaginaOrdenes) {
    return null;
  }

  const grupos = [
    {
      id: "mas_tarde",
      titulo: "Más tarde",
      icono: FaClock,
      estados: ["pendiente"],
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      borderColor: "border-yellow-600",
    },
    {
      id: "en_camino",
      titulo: "En Camino",
      icono: FaTruck,
      estados: ["pagado", "en_envio"],
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-600",
    },
    {
      id: "historial",
      titulo: "Historial",
      icono: FaHistory,
      estados: ["entregada", "cancelada_administrador", "cancelada_mp", "rechazado", "error", "expirada"],
      color: "text-gray-600",
      bgColor: "bg-gray-50",
      borderColor: "border-gray-600",
    },
  ];

  const handleFiltroClick = (grupoId) => {
    if (onFiltroChange) {
      onFiltroChange(grupoId);
    }
  };

  return (
    <div className="hidden md:block w-full bg-white border-b border-gray-200 sticky top-16 z-40">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap gap-2 py-3">
          {grupos.map((grupo) => {
            const Icono = grupo.icono;
            const estaActivo = filtroActivo === grupo.id;
            
            return (
              <button
                key={grupo.id}
                onClick={() => handleFiltroClick(grupo.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                  estaActivo
                    ? `${grupo.bgColor} ${grupo.color} border-2 ${grupo.borderColor}`
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Icono size={14} />
                <span>{grupo.titulo}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OrdenesSubNav;

