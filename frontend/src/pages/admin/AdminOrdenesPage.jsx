import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin.api.js";
import { ordenesApi } from "../../api/ordenes.api.js";
import { Button, Alert, Loading, Card } from "../../components/ui/index.js";
import AdminSubNav from "../../components/admin/AdminSubNav.jsx";
import { FaSearch, FaEye, FaCheckCircle, FaTimesCircle, FaTruck, FaBoxOpen } from "react-icons/fa";

const AdminOrdenesPage = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [actualizandoEstado, setActualizandoEstado] = useState(null);

  useEffect(() => {
    cargarOrdenes();
  }, []);

  const cargarOrdenes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listarOrdenes();
      setOrdenes(res.data || []);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      setError("Error al cargar las órdenes");
    } finally {
      setLoading(false);
    }
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case "pendiente":
        return "bg-yellow-100 text-yellow-800";
      case "pagado":
      case "pagada": // Compatibilidad con datos antiguos
        return "bg-green-100 text-green-800";
      case "en_pago":
        return "bg-blue-100 text-blue-800";
      case "en_envio":
        return "bg-blue-100 text-blue-800";
      case "entregada":
        return "bg-purple-100 text-purple-800";
      case "cancelado":
      case "cancelada": // Compatibilidad con datos antiguos
      case "cancelada_usuario":
      case "cancelada_administrador":
      case "cancelada_mp":
        return "bg-red-100 text-red-800";
      case "rechazado":
        return "bg-red-100 text-red-800";
      case "error":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleActualizarEstado = async (ordenId, nuevoEstado) => {
    try {
      setActualizandoEstado(ordenId);
      setError(null);
      setSuccess(null);
      
      await ordenesApi.actualizarEstado(ordenId, { estado: nuevoEstado });
      
      const estadoTexto = 
        nuevoEstado === "pagado" ? "Pagada" : 
        nuevoEstado === "cancelado" || nuevoEstado === "cancelada_administrador" ? "Cancelada" : 
        nuevoEstado === "en_envio" ? "En Envío" :
        nuevoEstado === "entregada" ? "Entregada" :
        nuevoEstado;
      setSuccess(`Orden #${ordenId} marcada como "${estadoTexto}" exitosamente`);
      
      // Recargar órdenes
      await cargarOrdenes();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error actualizando estado:", err);
      setError(err.response?.data?.message || "Error al actualizar el estado de la orden");
      setTimeout(() => setError(null), 5000);
    } finally {
      setActualizandoEstado(null);
    }
  };

  const formatFecha = (fechaString) => {
    if (!fechaString) return "N/A";
    const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return new Date(fechaString).toLocaleDateString("es-AR", options);
  };

  const getEstadoTexto = (estado) => {
    const estados = {
      pendiente: "Pendiente",
      en_pago: "En Pago",
      pagado: "Pagado",
      en_envio: "En Envío",
      entregada: "Entregada",
      cancelado: "Cancelado",
      cancelada_usuario: "Cancelada por Usuario",
      cancelada_administrador: "Cancelada por Administrador",
      cancelada_mp: "Cancelada MP",
      rechazado: "Rechazado",
      error: "Error",
      expirada: "Expirada",
    };
    return estados[estado] || estado?.replace("_", " ") || "N/A";
  };

  const ordenesFiltradas = ordenes.filter((orden) => {
    const matchSearch =
      orden.id_orden?.toString().includes(searchQuery) ||
      orden.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orden.apellido?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      orden.usuario_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Lógica de filtrado de estado
    let matchEstado = false;
    if (filtroEstado === "todos") {
      matchEstado = true;
    } else if (filtroEstado === "canceladas") {
      // Para "Canceladas", mostrar solo las canceladas por administrador
      matchEstado = orden.estado === "cancelada_administrador" || orden.estado === "cancelado";
    } else {
      matchEstado = orden.estado === filtroEstado;
    }
    
    return matchSearch && matchEstado;
  });

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminSubNav />
      <h1 className="text-3xl font-bold text-oscuro-azulMarino mb-6 mt-6">
        📋 Gestión de Órdenes
      </h1>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert type="success" className="mb-4" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Filtros */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, nombre, apellido o email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: "Todas", value: "todos" },
            { label: "En Pago", value: "en_pago" },
            { label: "Pagadas", value: "pagado" },
            { label: "En Envío", value: "en_envio" },
            { label: "Entregadas", value: "entregada" },
            { label: "Canceladas", value: "canceladas" },
            { label: "Rechazadas", value: "rechazado" },
            { label: "Error", value: "error" },
          ].map((filtro) => (
            <Button
              key={filtro.value}
              variant={filtroEstado === filtro.value ? "primary" : "outline"}
              size="sm"
              onClick={() => setFiltroEstado(filtro.value)}
            >
              {filtro.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Tabla de órdenes */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Items
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ordenesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || filtroEstado !== "todos"
                      ? "No se encontraron órdenes"
                      : "No hay órdenes registradas"}
                  </td>
                </tr>
              ) : (
                ordenesFiltradas.map((orden) => (
                  <tr key={orden.id_orden} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">#{orden.id_orden}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>
                        <div className="font-medium text-oscuro-azulMarino">
                          {orden.nombre} {orden.apellido}
                        </div>
                        <div className="text-gray-500 text-xs">{orden.usuario_email}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {formatFecha(orden.fecha_creacion)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {orden.total_items || 0}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-oscuro-azulMarino">
                      ${parseFloat(orden.total || 0).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getEstadoClass(
                          orden.estado
                        )}`}
                      >
                        {getEstadoTexto(orden.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Link to={`/ordenes/${orden.id_orden}`}>
                          <Button variant="outline" size="sm" title="Ver detalles">
                            <FaEye size={14} />
                          </Button>
                        </Link>
                        {orden.estado === "error" && (
                          <>
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleActualizarEstado(orden.id_orden, "pagado")}
                              disabled={actualizandoEstado === orden.id_orden}
                              title="Marcar como Pagada"
                            >
                              {actualizandoEstado === orden.id_orden ? (
                                <Loading size="sm" />
                              ) : (
                                <FaCheckCircle size={14} />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleActualizarEstado(orden.id_orden, "cancelada_administrador")}
                              disabled={actualizandoEstado === orden.id_orden}
                              title="Marcar como Cancelada"
                            >
                              {actualizandoEstado === orden.id_orden ? (
                                <Loading size="sm" />
                              ) : (
                                <FaTimesCircle size={14} />
                              )}
                            </Button>
                          </>
                        )}
                        {(orden.estado === "pagado" || orden.estado === "pagada") && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleActualizarEstado(orden.id_orden, "en_envio")}
                            disabled={actualizandoEstado === orden.id_orden}
                            title="Marcar como En Envío"
                          >
                            {actualizandoEstado === orden.id_orden ? (
                              <Loading size="sm" />
                            ) : (
                              <FaTruck size={14} />
                            )}
                          </Button>
                        )}
                        {orden.estado === "en_envio" && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleActualizarEstado(orden.id_orden, "entregada")}
                            disabled={actualizandoEstado === orden.id_orden}
                            title="Marcar como Entregada"
                          >
                            {actualizandoEstado === orden.id_orden ? (
                              <Loading size="sm" />
                            ) : (
                              <FaBoxOpen size={14} />
                            )}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 text-sm text-gray-600">
        Mostrando {ordenesFiltradas.length} de {ordenes.length} órdenes
      </div>
    </div>
  );
};

export default AdminOrdenesPage;
