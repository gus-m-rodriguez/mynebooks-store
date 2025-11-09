import { useState, useEffect } from "react";
import { adminApi } from "../../api/admin.api.js";
import { Button, Alert, Loading, Card, Modal } from "../../components/ui/index.js";
import AdminSubNav from "../../components/admin/AdminSubNav.jsx";
import { FaSearch, FaEye } from "react-icons/fa";

const AdminPagosPage = () => {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [showDetalleModal, setShowDetalleModal] = useState(false);

  useEffect(() => {
    cargarPagos();
  }, []);

  const cargarPagos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listarPagos();
      setPagos(res.data || []);
    } catch (err) {
      console.error("Error cargando pagos:", err);
      setError("Error al cargar los pagos");
    } finally {
      setLoading(false);
    }
  };

  const verDetalle = async (idPago) => {
    try {
      const res = await adminApi.obtenerPago(idPago);
      setPagoSeleccionado(res.data);
      setShowDetalleModal(true);
    } catch (err) {
      console.error("Error cargando detalle de pago:", err);
      setError("Error al cargar el detalle del pago");
    }
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "pending":
      case "in_process":
        return "bg-yellow-100 text-yellow-800";
      case "rejected":
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatFecha = (fechaString) => {
    if (!fechaString) return "N/A";
    const options = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
    return new Date(fechaString).toLocaleDateString("es-AR", options);
  };

  const pagosFiltrados = pagos.filter((pago) => {
    const matchSearch =
      pago.id_pago?.toString().includes(searchQuery) ||
      pago.id_orden?.toString().includes(searchQuery) ||
      pago.mp_id?.toString().includes(searchQuery) ||
      pago.nombre?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pago.apellido?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pago.usuario_email?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchEstado = filtroEstado === "todos" || pago.estado === filtroEstado;
    
    return matchSearch && matchEstado;
  });

  // Calcular estadísticas
  const estadisticas = {
    total: pagos.length,
    aprobados: pagos.filter((p) => p.estado === "approved").length,
    pendientes: pagos.filter((p) => p.estado === "pending" || p.estado === "in_process").length,
    rechazados: pagos.filter((p) => p.estado === "rejected" || p.estado === "cancelled").length,
    montoTotal: pagos.reduce((sum, p) => sum + parseFloat(p.monto || 0), 0),
    montoAprobado: pagos.filter((p) => p.estado === "approved").reduce((sum, p) => sum + parseFloat(p.monto || 0), 0),
  };

  const getEstadoOrdenClass = (estado) => {
    switch (estado) {
      case "pagado":
        return "bg-green-100 text-green-800";
      case "en_pago":
        return "bg-yellow-100 text-yellow-800";
      case "en_envio":
        return "bg-blue-100 text-blue-800";
      case "entregada":
        return "bg-purple-100 text-purple-800";
      case "cancelado":
      case "rechazado":
        return "bg-red-100 text-red-800";
      case "error":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const traducirEstado = (estado) => {
    const estados = {
      approved: "Aprobado",
      pending: "Pendiente",
      in_process: "En Proceso",
      rejected: "Rechazado",
      cancelled: "Cancelado",
    };
    return estados[estado] || estado;
  };

  const traducirEstadoOrden = (estado) => {
    const estados = {
      pendiente: "Pendiente",
      en_pago: "En Pago",
      pagado: "Pagado",
      en_envio: "En Envío",
      entregada: "Entregada",
      cancelado: "Cancelado",
      rechazado: "Rechazado",
      error: "Error",
      expirada: "Expirada",
    };
    return estados[estado] || estado;
  };

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
        💳 Gestión de Pagos
      </h1>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Total de Pagos</div>
          <div className="text-2xl font-bold text-oscuro-azulMarino">{estadisticas.total}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Aprobados</div>
          <div className="text-2xl font-bold text-green-600">{estadisticas.aprobados}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Monto Total</div>
          <div className="text-2xl font-bold text-oscuro-azulMarino">
            ${estadisticas.montoTotal.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-gray-600 mb-1">Monto Aprobado</div>
          <div className="text-2xl font-bold text-green-600">
            ${estadisticas.montoAprobado.toLocaleString("es-AR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por ID, orden, MP ID, nombre o email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {[
            { label: "Todos", value: "todos" },
            { label: "Aprobados", value: "approved" },
            { label: "Pendientes", value: "pending" },
            { label: "En Proceso", value: "in_process" },
            { label: "Rechazados", value: "rejected" },
            { label: "Cancelados", value: "cancelled" },
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

      {/* Tabla de pagos */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  ID Pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Orden
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Estado Orden
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Monto Pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Total Orden
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Estado Pago
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  MP ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Fecha
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pagosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-gray-500">
                    {searchQuery || filtroEstado !== "todos"
                      ? "No se encontraron pagos"
                      : "No hay pagos registrados"}
                  </td>
                </tr>
              ) : (
                pagosFiltrados.map((pago) => {
                  const ordenTotal = parseFloat(pago.orden_total || 0);
                  const montoPago = parseFloat(pago.monto || 0);
                  const hayDiferencia = Math.abs(ordenTotal - montoPago) > 0.01;
                  
                  return (
                    <tr key={pago.id_pago} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600 font-medium">
                        #{pago.id_pago}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-medium text-oscuro-azulMarino">#{pago.id_orden}</span>
                        {pago.total_items && (
                          <div className="text-xs text-gray-500">{pago.total_items} items</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <div className="font-medium text-oscuro-azulMarino">
                            {pago.nombre || "-"} {pago.apellido || ""}
                          </div>
                          <div className="text-gray-500 text-xs">{pago.usuario_email || "-"}</div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoOrdenClass(
                            pago.orden_estado
                          )}`}
                        >
                          {traducirEstadoOrden(pago.orden_estado) || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-oscuro-azulMarino">
                        ${montoPago.toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium text-gray-700">
                          ${ordenTotal.toLocaleString("es-AR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        {hayDiferencia && (
                          <div className="text-xs text-orange-600 font-medium">
                            ⚠ Diferencia
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoClass(
                            pago.estado
                          )}`}
                        >
                          {traducirEstado(pago.estado) || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono text-xs">
                        {pago.mp_id || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatFecha(pago.fecha_pago)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => verDetalle(pago.id_pago)}
                        >
                          <FaEye className="mr-1" size={12} />
                          Ver
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 text-sm text-gray-600">
        Mostrando {pagosFiltrados.length} de {pagos.length} pagos
      </div>

      {/* Modal de detalle */}
      {pagoSeleccionado && (
        <Modal
          isOpen={showDetalleModal}
          onClose={() => {
            setShowDetalleModal(false);
            setPagoSeleccionado(null);
          }}
          title={`Detalle de Pago #${pagoSeleccionado.id_pago}`}
        >
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-oscuro-azulMarino mb-2">Información del Pago</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Pago:</span>
                  <span className="font-medium">#{pagoSeleccionado.id_pago}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ID Orden:</span>
                  <span className="font-medium">#{pagoSeleccionado.id_orden}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MP ID:</span>
                  <span className="font-medium">{pagoSeleccionado.mp_id || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Estado:</span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getEstadoClass(
                      pagoSeleccionado.estado
                    )}`}
                  >
                    {pagoSeleccionado.estado || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Monto:</span>
                  <span className="font-medium">
                    ${parseFloat(pagoSeleccionado.monto || 0).toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha de Pago:</span>
                  <span className="font-medium">{formatFecha(pagoSeleccionado.fecha_pago)}</span>
                </div>
              </div>
            </div>

            {pagoSeleccionado.orden && (
              <div>
                <h3 className="font-semibold text-oscuro-azulMarino mb-2">Información de la Orden</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado Orden:</span>
                    <span className="font-medium">{pagoSeleccionado.orden.estado || "N/A"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fecha Creación:</span>
                    <span className="font-medium">
                      {formatFecha(pagoSeleccionado.orden.fecha_creacion)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminPagosPage;
