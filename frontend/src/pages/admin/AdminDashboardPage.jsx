import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.jsx";
import { adminApi } from "../../api/admin.api.js";
import { Loading, Alert, Card } from "../../components/ui/index.js";
import AdminSubNav from "../../components/admin/AdminSubNav.jsx";
import { FaBox, FaShoppingCart, FaUsers, FaDollarSign, FaChartLine } from "react-icons/fa";

const AdminDashboardPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [stats, setStats] = useState({
    productos: { total: 0, sinStock: 0, conStock: 0 },
    ordenes: { total: 0, pendientes: 0, pagadas: 0, enEnvio: 0, entregadas: 0, canceladas: 0 },
    usuarios: { total: 0, admins: 0, clientes: 0 },
    pagos: { total: 0, aprobados: 0, pendientes: 0, rechazados: 0 },
    ingresos: { total: 0, hoy: 0, mes: 0 },
  });

  // Verificar si es super admin (tiene todos los permisos)
  const esSuperAdmin = user?.rol === "super_admin" || user?.es_super_admin;

  useEffect(() => {
    cargarPermisos();
  }, [user]);

  useEffect(() => {
    if (permisos.length > 0 || esSuperAdmin) {
      cargarEstadisticas();
    } else {
      setLoading(false);
    }
  }, [permisos, esSuperAdmin]);

  const cargarPermisos = async () => {
    try {
      if (esSuperAdmin) {
        // Super admin tiene todos los permisos
        setPermisos(["Dashboard", "Productos", "Ordenes", "Usuarios", "Ingresos", "Auditoria"]);
      } else if (user?.rol === "admin") {
        // Obtener permisos del usuario
        if (user.permisos && Array.isArray(user.permisos)) {
          const nombresPermisos = user.permisos.map(p => 
            typeof p === 'string' ? p : p.nombre_permiso
          );
          setPermisos(nombresPermisos);
        } else {
          // Si no vienen en el usuario, obtener desde la API
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
            setPermisos([]);
          }
        }
      }
    } catch (error) {
      console.error("Error cargando permisos:", error);
      setPermisos([]);
    }
  };

  const tienePermiso = (permiso) => {
    return esSuperAdmin || permisos.includes(permiso);
  };

  const cargarEstadisticas = async () => {
    setLoading(true);
    setError(null);

    try {
      // Preparar las llamadas según los permisos
      const llamadas = [];
      const indices = {};

      if (tienePermiso("Productos")) {
        indices.productos = llamadas.length;
        llamadas.push(adminApi.listarProductos());
      } else {
        indices.productos = -1;
        llamadas.push(Promise.resolve({ data: [] }));
      }

      if (tienePermiso("Ordenes")) {
        indices.ordenes = llamadas.length;
        llamadas.push(adminApi.listarOrdenes());
      } else {
        indices.ordenes = -1;
        llamadas.push(Promise.resolve({ data: [] }));
      }

      if (tienePermiso("Usuarios")) {
        indices.usuarios = llamadas.length;
        llamadas.push(adminApi.listarUsuarios());
      } else {
        indices.usuarios = -1;
        llamadas.push(Promise.resolve({ data: [] }));
      }

      if (tienePermiso("Ingresos")) {
        indices.pagos = llamadas.length;
        llamadas.push(adminApi.listarPagos());
      } else {
        indices.pagos = -1;
        llamadas.push(Promise.resolve({ data: [] }));
      }

      // Cargar datos en paralelo
      const resultados = await Promise.all(llamadas);

      const productos = indices.productos >= 0 ? (resultados[indices.productos].data || []) : [];
      const ordenes = indices.ordenes >= 0 ? (resultados[indices.ordenes].data || []) : [];
      const usuarios = indices.usuarios >= 0 ? (resultados[indices.usuarios].data || []) : [];
      const pagos = indices.pagos >= 0 ? (resultados[indices.pagos].data || []) : [];

      // Calcular estadísticas de productos
      const productosStats = {
        total: productos.length,
        sinStock: productos.filter((p) => (p.stock - (p.stock_reserved || 0)) <= 0).length,
        conStock: productos.filter((p) => (p.stock - (p.stock_reserved || 0)) > 0).length,
      };

      // Calcular estadísticas de órdenes
      const ordenesStats = {
        total: ordenes.length,
        pendientes: ordenes.filter((o) => o.estado === "pendiente").length,
        pagadas: ordenes.filter((o) => o.estado === "pagado").length,
        enEnvio: ordenes.filter((o) => o.estado === "en_envio").length,
        entregadas: ordenes.filter((o) => o.estado === "entregada").length,
        canceladas: ordenes.filter((o) => o.estado === "cancelada_administrador" || o.estado === "cancelado").length,
      };

      // Calcular estadísticas de usuarios
      const usuariosStats = {
        total: usuarios.length,
        admins: usuarios.filter((u) => u.rol === "admin" || u.rol === "super_admin").length,
        clientes: usuarios.filter((u) => u.rol === "cliente").length,
      };

      // Calcular estadísticas de pagos
      const pagosStats = {
        total: pagos.length,
        aprobados: pagos.filter((p) => p.estado === "approved").length,
        pendientes: pagos.filter((p) => p.estado === "pending" || p.estado === "in_process").length,
        rechazados: pagos.filter((p) => p.estado === "rejected" || p.estado === "cancelled").length,
      };

      // Calcular ingresos
      // Los ingresos se calculan desde:
      // 1. Pagos aprobados de Mercado Pago (estado "approved")
      // 2. Órdenes con estado "pagado" (incluye las habilitadas por administradores)
      // Se prioriza el monto del pago si existe, sino se usa el total de la orden
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);

      // Crear un mapa de pagos aprobados por id_orden para evitar duplicados
      const pagosAprobadosMap = new Map();
      pagos
        .filter((p) => p.estado === "approved" && p.monto)
        .forEach((pago) => {
          // Si ya existe un pago para esta orden, usar el más reciente (mayor id_pago)
          const pagoExistente = pagosAprobadosMap.get(pago.id_orden);
          if (!pagoExistente || pago.id_pago > pagoExistente.id_pago) {
            pagosAprobadosMap.set(pago.id_orden, pago);
          }
        });

      // Ingresos desde pagos aprobados de Mercado Pago
      const ingresosPagosTotal = Array.from(pagosAprobadosMap.values()).reduce(
        (sum, p) => sum + parseFloat(p.monto || 0),
        0
      );
      const ingresosPagosHoy = Array.from(pagosAprobadosMap.values())
        .filter((p) => p.fecha_pago && new Date(p.fecha_pago) >= hoy)
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);
      const ingresosPagosMes = Array.from(pagosAprobadosMap.values())
        .filter((p) => p.fecha_pago && new Date(p.fecha_pago) >= inicioMes)
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

      // Ingresos desde órdenes pagadas que NO tienen pago aprobado asociado
      // (casos habilitados por administradores o pagos directos)
      const ordenesPagadasSinPago = ordenes.filter(
        (o) => o.estado === "pagado" && o.total && !pagosAprobadosMap.has(o.id_orden)
      );
      const ingresosOrdenesSinPagoTotal = ordenesPagadasSinPago.reduce(
        (sum, o) => sum + parseFloat(o.total || 0),
        0
      );
      const ingresosOrdenesSinPagoHoy = ordenesPagadasSinPago
        .filter((o) => o.fecha_creacion && new Date(o.fecha_creacion) >= hoy)
        .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);
      const ingresosOrdenesSinPagoMes = ordenesPagadasSinPago
        .filter((o) => o.fecha_creacion && new Date(o.fecha_creacion) >= inicioMes)
        .reduce((sum, o) => sum + parseFloat(o.total || 0), 0);

      // Sumar ambos tipos de ingresos
      const ingresosTotal = ingresosPagosTotal + ingresosOrdenesSinPagoTotal;
      const ingresosHoy = ingresosPagosHoy + ingresosOrdenesSinPagoHoy;
      const ingresosMes = ingresosPagosMes + ingresosOrdenesSinPagoMes;

      setStats({
        productos: productosStats,
        ordenes: ordenesStats,
        usuarios: usuariosStats,
        pagos: pagosStats,
        ingresos: {
          total: ingresosTotal,
          hoy: ingresosHoy,
          mes: ingresosMes,
        },
      });
    } catch (err) {
      console.error("Error cargando estadísticas:", err);
      setError("Error al cargar las estadísticas del dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AdminSubNav />
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  // Si no tiene permisos asignados, mostrar mensaje
  if (!esSuperAdmin && permisos.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <AdminSubNav />
        <div className="flex flex-col items-center justify-center min-h-[400px] mt-6">
          <Card className="p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-oscuro-azulMarino mb-4">
              Sin Permisos Asignados
            </h2>
            <p className="text-gray-600 mb-6">
              No tienes permisos asignados para acceder a las funcionalidades del panel de administración.
              Por favor, contacta al Super Administrador para que te asigne los permisos necesarios.
            </p>
            <Alert type="info">
              Solo puedes ver el dashboard, pero no tienes acceso a ninguna funcionalidad administrativa.
            </Alert>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <AdminSubNav />
        <Alert type="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
        <button
          onClick={cargarEstadisticas}
          className="px-4 py-2 bg-acento-violetaManga text-white rounded-lg hover:bg-primary-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminSubNav />
      <div className="flex justify-between items-center mb-6 mt-6">
        <h1 className="text-3xl font-bold text-oscuro-azulMarino">
          📊 Panel de Administración
        </h1>
        <div className="flex gap-2">
          {tienePermiso("Productos") && (
            <Link
              to="/admin/productos"
              className="px-4 py-2 bg-acento-violetaManga text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Productos
            </Link>
          )}
          {tienePermiso("Ordenes") && (
            <Link
              to="/admin/ordenes"
              className="px-4 py-2 bg-acento-violetaManga text-white rounded-lg hover:bg-primary-600 transition-colors"
            >
              Órdenes
            </Link>
          )}
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Productos */}
        {tienePermiso("Productos") && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FaBox className="text-blue-600" size={24} />
              </div>
              <Link
                to="/admin/productos"
                className="text-sm text-acento-violetaManga hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-oscuro-azulMarino mb-1">
              {stats.productos.total}
            </h3>
            <p className="text-gray-600 text-sm mb-2">Productos Totales</p>
            <div className="flex gap-4 text-xs">
              <span className="text-green-600">
                {stats.productos.conStock} con stock
              </span>
              <span className="text-red-600">
                {stats.productos.sinStock} sin stock
              </span>
            </div>
          </Card>
        )}

        {/* Órdenes */}
        {tienePermiso("Ordenes") && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <FaShoppingCart className="text-green-600" size={24} />
              </div>
              <Link
                to="/admin/ordenes"
                className="text-sm text-acento-violetaManga hover:underline"
              >
                Ver todas
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-oscuro-azulMarino mb-1">
              {stats.ordenes.total}
            </h3>
            <p className="text-gray-600 text-sm mb-2">Órdenes Totales</p>
            <div className="flex gap-4 text-xs">
              <span className="text-yellow-600">
                {stats.ordenes.pendientes} pendientes
              </span>
              <span className="text-green-600">
                {stats.ordenes.pagadas} pagadas
              </span>
            </div>
          </Card>
        )}

        {/* Usuarios */}
        {tienePermiso("Usuarios") && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-100 rounded-lg">
                <FaUsers className="text-purple-600" size={24} />
              </div>
              <Link
                to="/admin/usuarios"
                className="text-sm text-acento-violetaManga hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-oscuro-azulMarino mb-1">
              {stats.usuarios.total}
            </h3>
            <p className="text-gray-600 text-sm mb-2">Usuarios Totales</p>
            <div className="flex gap-4 text-xs">
              <span className="text-blue-600">
                {stats.usuarios.clientes} clientes
              </span>
              <span className="text-purple-600">
                {stats.usuarios.admins} admins
              </span>
            </div>
          </Card>
        )}

        {/* Ingresos */}
        {tienePermiso("Ingresos") && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <FaDollarSign className="text-yellow-600" size={24} />
              </div>
              <Link
                to="/admin/pagos"
                className="text-sm text-acento-violetaManga hover:underline"
              >
                Ver todos
              </Link>
            </div>
            <h3 className="text-2xl font-bold text-oscuro-azulMarino mb-1">
              ${stats.ingresos.total.toLocaleString("es-AR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </h3>
            <p className="text-gray-600 text-sm mb-2">Ingresos Totales</p>
            <div className="flex gap-4 text-xs">
              <span className="text-green-600">
                Hoy: ${stats.ingresos.hoy.toFixed(2)}
              </span>
              <span className="text-blue-600">
                Mes: ${stats.ingresos.mes.toFixed(2)}
              </span>
            </div>
          </Card>
        )}
      </div>

      {/* Detalles adicionales */}
      {(tienePermiso("Ordenes") || tienePermiso("Ingresos")) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Estado de Órdenes */}
          {tienePermiso("Ordenes") && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaChartLine className="text-acento-violetaManga" size={20} />
                <h2 className="text-xl font-bold text-oscuro-azulMarino">
                  Estado de Órdenes
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pendientes</span>
                  <span className="font-semibold text-yellow-600">
                    {stats.ordenes.pendientes}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pagadas</span>
                  <span className="font-semibold text-green-600">
                    {stats.ordenes.pagadas}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">En Envío</span>
                  <span className="font-semibold text-blue-600">
                    {stats.ordenes.enEnvio}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Entregadas</span>
                  <span className="font-semibold text-purple-600">
                    {stats.ordenes.entregadas}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Canceladas</span>
                  <span className="font-semibold text-red-600">
                    {stats.ordenes.canceladas}
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Estado de Pagos */}
          {tienePermiso("Ingresos") && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaDollarSign className="text-acento-violetaManga" size={20} />
                <h2 className="text-xl font-bold text-oscuro-azulMarino">
                  Estado de Pagos
                </h2>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Aprobados</span>
                  <span className="font-semibold text-green-600">
                    {stats.pagos.aprobados}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pendientes</span>
                  <span className="font-semibold text-yellow-600">
                    {stats.pagos.pendientes}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Rechazados</span>
                  <span className="font-semibold text-red-600">
                    {stats.pagos.rechazados}
                  </span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Enlaces rápidos */}
      {(tienePermiso("Productos") || tienePermiso("Ordenes") || tienePermiso("Usuarios") || tienePermiso("Ingresos") || tienePermiso("Auditoria")) && (
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {tienePermiso("Productos") && (
            <Link
              to="/admin/productos"
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-acento-violetaManga hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-oscuro-azulMarino mb-1">
                Gestionar Productos
              </h3>
              <p className="text-sm text-gray-600">
                Crear, editar y eliminar productos del catálogo
              </p>
            </Link>
          )}
          {tienePermiso("Ordenes") && (
            <Link
              to="/admin/ordenes"
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-acento-violetaManga hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-oscuro-azulMarino mb-1">
                Gestionar Órdenes
              </h3>
              <p className="text-sm text-gray-600">
                Ver y actualizar el estado de las órdenes
              </p>
            </Link>
          )}
          {tienePermiso("Ingresos") && (
            <Link
              to="/admin/pagos"
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-acento-violetaManga hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-oscuro-azulMarino mb-1">
                Gestionar Pagos
              </h3>
              <p className="text-sm text-gray-600">
                Ver y gestionar pagos de Mercado Pago
              </p>
            </Link>
          )}
          {tienePermiso("Usuarios") && (
            <Link
              to="/admin/usuarios"
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-acento-violetaManga hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-oscuro-azulMarino mb-1">
                Gestionar Usuarios
              </h3>
              <p className="text-sm text-gray-600">
                Ver usuarios y gestionar roles y permisos
              </p>
            </Link>
          )}
          {tienePermiso("Auditoria") && (
            <Link
              to="/admin/logs"
              className="p-4 bg-white border border-gray-200 rounded-lg hover:border-acento-violetaManga hover:shadow-md transition-all"
            >
              <h3 className="font-semibold text-oscuro-azulMarino mb-1">
                Logs de Auditoría
              </h3>
              <p className="text-sm text-gray-600">
                Ver registros de acciones del sistema
              </p>
            </Link>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboardPage;
