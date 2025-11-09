import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { adminApi } from "../../api/admin.api.js";
import { Button, Alert, Loading, Card } from "../../components/ui/index.js";
import AdminSubNav from "../../components/admin/AdminSubNav.jsx";
import { FaSearch, FaDownload, FaFilter } from "react-icons/fa";

const AdminLogsPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filtros, setFiltros] = useState({
    tipo: "",
    usuario: "",
    fecha_desde: "",
    fecha_hasta: "",
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [limite, setLimite] = useState(100);

  const esSuperAdmin = user?.rol === "super_admin" || user?.es_super_admin;

  useEffect(() => {
    cargarLogs();
  }, [filtros, limite]);

  const cargarLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        limite,
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, value]) => value !== "")
        ),
      };

      const res = esSuperAdmin
        ? await adminApi.listarLogs(params)
        : await adminApi.misAccionesLogs(params);
      
      setLogs(res.data || []);
    } catch (err) {
      console.error("Error cargando logs:", err);
      setError("Error al cargar los logs");
    } finally {
      setLoading(false);
    }
  };

  const handleExportar = async () => {
    try {
      const params = {
        ...Object.fromEntries(
          Object.entries(filtros).filter(([_, value]) => value !== "")
        ),
      };

      const res = await adminApi.exportarLogs(params);
      
      // Crear blob y descargar
      const blob = new Blob([res.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `logs_auditoria_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Error exportando logs:", err);
      setError("Error al exportar los logs");
    }
  };

  const handleLimpiarFiltros = () => {
    setFiltros({
      tipo: "",
      usuario: "",
      fecha_desde: "",
      fecha_hasta: "",
    });
  };

  const formatFecha = (fechaString) => {
    if (!fechaString) return "N/A";
    const options = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    return new Date(fechaString).toLocaleDateString("es-AR", options);
  };

  const logsFiltrados = logs.filter((log) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.tipo?.toLowerCase().includes(query) ||
      log.usuario?.toLowerCase().includes(query) ||
      log.id_evento?.toString().includes(query)
    );
  });

  if (loading && logs.length === 0) {
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
      <div className="flex justify-between items-center mb-6 mt-6">
        <h1 className="text-3xl font-bold text-oscuro-azulMarino">
          📋 Logs de Auditoría
        </h1>
        <div className="flex gap-2">
          {esSuperAdmin && (
            <Button variant="outline" onClick={handleExportar}>
              <FaDownload className="mr-2" size={14} />
              Exportar CSV
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <FaFilter className="mr-2" size={14} />
            Filtros
          </Button>
        </div>
      </div>

      {!esSuperAdmin && (
        <Alert type="info" className="mb-4">
          Solo puedes ver tus propias acciones. Para ver todos los logs, necesitas ser Super Administrador.
        </Alert>
      )}

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      {mostrarFiltros && (
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <input
                type="text"
                value={filtros.tipo}
                onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
                placeholder="Ej: usuario_registrado"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Usuario
              </label>
              <input
                type="text"
                value={filtros.usuario}
                onChange={(e) => setFiltros({ ...filtros, usuario: e.target.value })}
                placeholder="Ej: usuario_123"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha Desde
              </label>
              <input
                type="date"
                value={filtros.fecha_desde}
                onChange={(e) => setFiltros({ ...filtros, fecha_desde: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Fecha Hasta
              </label>
              <input
                type="date"
                value={filtros.fecha_hasta}
                onChange={(e) => setFiltros({ ...filtros, fecha_hasta: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex justify-between items-center mt-4">
            <Button variant="outline" size="sm" onClick={handleLimpiarFiltros}>
              Limpiar Filtros
            </Button>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Límite:</label>
              <select
                value={limite}
                onChange={(e) => setLimite(parseInt(e.target.value))}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga"
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
                <option value={500}>500</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por tipo, usuario o ID..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla de logs */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Tipo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Usuario
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Fecha
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {logsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? "No se encontraron logs" : "No hay logs registrados"}
                  </td>
                </tr>
              ) : (
                logsFiltrados.map((log) => (
                  <tr key={log.id_evento} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">#{log.id_evento}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {log.tipo || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{log.usuario || "N/A"}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatFecha(log.fecha)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-4 text-sm text-gray-600">
        Mostrando {logsFiltrados.length} de {logs.length} logs
      </div>
    </div>
  );
};

export default AdminLogsPage;
