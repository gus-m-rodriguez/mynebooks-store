import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ordenesApi } from "../api/ordenes.api.js";
import { useCart } from "../context/CartContext.jsx";
import { Button, Alert, Loading, Card } from "../components/ui/index.js";
import OrdenesSubNav from "../components/ordenes/OrdenesSubNav.jsx";
import { FaShoppingBag, FaCalendarAlt, FaMapMarkerAlt, FaCreditCard, FaTimesCircle, FaRedo, FaEye } from "react-icons/fa";

const OrdenesPage = () => {
  const [ordenes, setOrdenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroGrupo, setFiltroGrupo] = useState("mas_tarde"); // "mas_tarde", "en_camino", "historial" (por defecto "mas_tarde")
  const [procesando, setProcesando] = useState(null);
  const [success, setSuccess] = useState(null);
  const [ordenesSinStock, setOrdenesSinStock] = useState(new Set()); // IDs de órdenes con productos sin stock
  const { agregarProducto } = useCart();
  const navigate = useNavigate();

  // Mapeo de grupos a estados
  const gruposEstados = {
    mas_tarde: ["pendiente"],
    en_camino: ["pagado", "en_envio"],
    historial: ["entregada", "cancelada_administrador", "cancelada_mp", "rechazado", "error", "expirada"],
  };

  // Mapeo de grupos a nombres
  const nombresGrupos = {
    mas_tarde: "Más tarde",
    en_camino: "En Camino",
    historial: "Historial",
  };

  useEffect(() => {
    // Leer parámetro de grupo desde la URL
    const params = new URLSearchParams(window.location.search);
    const grupo = params.get("grupo");
    if (grupo && ["mas_tarde", "en_camino", "historial"].includes(grupo)) {
      setFiltroGrupo(grupo);
    } else if (!grupo) {
      // Si no hay parámetro, usar "mas_tarde" por defecto y actualizar la URL sin recargar
      setFiltroGrupo("mas_tarde");
      window.history.replaceState({}, "", "/ordenes?grupo=mas_tarde");
    }
    
    cargarOrdenes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarOrdenes = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordenesApi.listar();
      const ordenesLista = res.data || [];
      setOrdenes(ordenesLista);

      // Verificar disponibilidad de productos para órdenes pendientes
      const ordenesSinStockSet = new Set();
      
      // Filtrar solo órdenes pendientes para verificar disponibilidad
      const ordenesPendientes = ordenesLista.filter(orden => orden.estado === "pendiente");
      
      // Verificar disponibilidad de cada orden pendiente
      for (const orden of ordenesPendientes) {
        try {
          const ordenDetalle = await ordenesApi.obtener(orden.id_orden);
          const items = ordenDetalle.data.items || [];
          
          // Verificar stock disponible de cada producto
          // Los items ahora incluyen stock_disponible directamente desde el backend
          for (const item of items) {
            // El stock_disponible viene directamente del backend en los items de la orden
            const stockDisponible = parseInt(item.stock_disponible) || 0;
            const cantidadSolicitada = parseInt(item.cantidad) || 0;
            
            // Si el stock disponible es menor que la cantidad solicitada, la orden no se puede reintentar
            if (stockDisponible < cantidadSolicitada) {
              ordenesSinStockSet.add(orden.id_orden);
              break; // Ya encontramos un producto sin stock suficiente, no necesitamos seguir
            }
          }
        } catch (err) {
          console.error(`Error obteniendo detalles de orden ${orden.id_orden}:`, err);
          // Si hay error, asumimos que no hay stock disponible
          ordenesSinStockSet.add(orden.id_orden);
        }
      }
      
      setOrdenesSinStock(ordenesSinStockSet);
    } catch (err) {
      console.error("Error cargando órdenes:", err);
      setError(
        err.response?.data?.message || "Error al cargar tus órdenes. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return "N/A";
    const date = new Date(fecha);
    return date.toLocaleDateString("es-AR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEstadoColor = (estado) => {
    const estados = {
      pendiente: "bg-yellow-100 text-yellow-800",
      en_pago: "bg-blue-100 text-blue-800",
      pagado: "bg-green-100 text-green-800",
      en_envio: "bg-purple-100 text-purple-800",
      entregada: "bg-gray-100 text-gray-800",
      cancelado: "bg-red-100 text-red-800",
      cancelada_usuario: "bg-red-100 text-red-800",
      cancelada_administrador: "bg-red-100 text-red-800",
      cancelada_mp: "bg-red-100 text-red-800",
      rechazado: "bg-red-100 text-red-800",
      error: "bg-orange-100 text-orange-800",
      expirado: "bg-gray-100 text-gray-800",
    };
    return estados[estado] || "bg-gray-100 text-gray-800";
  };

  const getEstadoTexto = (estado) => {
    const textos = {
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
      expirado: "Expirado",
    };
    return textos[estado] || estado;
  };

  const handleReintentarCompra = async (ordenId) => {
    try {
      setProcesando(ordenId);
      setError(null);
      setSuccess(null);

      console.log("[ReintentarCompra] Iniciando proceso para orden:", ordenId);

      // Obtener los items de la orden
      const ordenRes = await ordenesApi.obtener(ordenId);
      const items = ordenRes.data.items || [];

      console.log("[ReintentarCompra] Items obtenidos:", items.length);

      if (items.length === 0) {
        setError("La orden no tiene productos para reintentar");
        setTimeout(() => setError(null), 5000);
        setProcesando(null);
        return;
      }

      // Agregar productos al carrito
      console.log("[ReintentarCompra] Agregando productos al carrito...");
      for (const item of items) {
        const result = await agregarProducto(item.id_producto, item.cantidad);
        if (!result.success) {
          console.error("[ReintentarCompra] Error agregando producto:", result.error);
          setError(`Error al agregar producto al carrito: ${result.error}`);
          setTimeout(() => setError(null), 5000);
          setProcesando(null);
          return;
        }
      }
      console.log("[ReintentarCompra] Productos agregados al carrito exitosamente");

      // Cancelar la orden anterior (marcada como cancelada por usuario)
      console.log("[ReintentarCompra] Cancelando orden anterior...");
      await ordenesApi.actualizarEstado(ordenId, { estado: "cancelada_usuario" });
      console.log("[ReintentarCompra] Orden anterior cancelada");

      // Recargar la lista de órdenes para que la orden cancelada desaparezca
      await cargarOrdenes();

      // Mostrar mensaje de éxito
      setSuccess(`Productos agregados al carrito. La orden #${ordenId} ha sido cancelada.`);
      setTimeout(() => {
        setSuccess(null);
        // NO redirigir al carrito, solo agregar los productos
      }, 3000);

      setProcesando(null);
    } catch (err) {
      console.error("[ReintentarCompra] Error completo:", err);
      console.error("[ReintentarCompra] Error response:", err.response);
      setError(err.response?.data?.message || "Error al reintentar la compra. Por favor, intenta nuevamente.");
      setTimeout(() => setError(null), 5000);
      setProcesando(null);
    }
  };

  const handleCancelarOrden = async (ordenId) => {
    if (!window.confirm("¿Estás seguro de que deseas cancelar esta orden?")) {
      return;
    }

    try {
      setProcesando(ordenId);
      setError(null);
      setSuccess(null);

      await ordenesApi.actualizarEstado(ordenId, { estado: "cancelada_usuario" });
      
      setSuccess("Orden cancelada exitosamente");
      await cargarOrdenes();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error cancelando orden:", err);
      setError(err.response?.data?.message || "Error al cancelar la orden. Por favor, intenta nuevamente.");
      setTimeout(() => setError(null), 5000);
    } finally {
      setProcesando(null);
    }
  };

  // Filtrar órdenes según el grupo seleccionado
  const ordenesFiltradas = (() => {
    const estadosDelGrupo = gruposEstados[filtroGrupo] || [];
    return ordenes.filter((orden) => estadosDelGrupo.includes(orden.estado));
  })();

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
        <Button variant="outline" onClick={cargarOrdenes}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
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

      {/* Sub navegación de órdenes */}
      <OrdenesSubNav 
        filtroActivo={filtroGrupo} 
        onFiltroChange={setFiltroGrupo}
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 mt-6">
        <div>
          <h1 className="text-3xl font-bold text-oscuro-azulMarino mb-2">
            📦 Mis Órdenes
          </h1>
          {/* Leyenda solo visible en mobile con el nombre de la sección */}
          <p className="md:hidden text-gray-600">
            {ordenes.length === 0
              ? "Aún no has realizado ninguna orden"
              : nombresGrupos[filtroGrupo] || "Órdenes"}
          </p>
        </div>
      </div>

      {ordenes.length === 0 ? (
        <Card className="p-12 text-center">
          <FaShoppingBag className="mx-auto text-gray-300 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-oscuro-azulMarino mb-2">
            No tienes órdenes aún
          </h2>
          <p className="text-gray-600 mb-6">
            Cuando realices una compra, aparecerá aquí
          </p>
          <Link to="/catalogo">
            <Button variant="primary">Ver Catálogo</Button>
          </Link>
        </Card>
      ) : ordenesFiltradas.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-gray-600">
            No hay órdenes con el estado seleccionado
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {ordenesFiltradas.map((orden) => (
            <Card key={orden.id_orden} className="p-6 hover:shadow-md transition-shadow">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-bold text-oscuro-azulMarino">
                      Orden #{orden.id_orden}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getEstadoColor(
                        orden.estado
                      )}`}
                    >
                      {getEstadoTexto(orden.estado)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <FaCalendarAlt size={14} />
                      <span>{formatearFecha(orden.fecha_creacion)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FaMapMarkerAlt size={14} />
                      <span className="truncate">{orden.direccion_envio || "Sin dirección"}</span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="text-sm text-gray-600">
                      {orden.total_items || 0} producto{(orden.total_items || 0) !== 1 ? "s" : ""}
                    </p>
                    <p className="text-lg font-bold text-acento-violetaManga mt-1">
                      ${parseFloat(orden.total || 0).toLocaleString("es-AR", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Link to={`/ordenes/${orden.id_orden}`}>
                    <Button variant="outline" size="sm" title="Ver detalles">
                      <FaEye size={14} />
                    </Button>
                  </Link>
                  {orden.estado === "pendiente" && (
                    <>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleReintentarCompra(orden.id_orden)}
                        disabled={procesando === orden.id_orden || ordenesSinStock.has(orden.id_orden)}
                        className={ordenesSinStock.has(orden.id_orden) ? "opacity-50 cursor-not-allowed" : ""}
                        title={
                          ordenesSinStock.has(orden.id_orden)
                            ? "No se puede reintentar: uno o más productos no tienen stock disponible"
                            : "Reintentar compra / Pagar"
                        }
                      >
                        {procesando === orden.id_orden ? (
                          <Loading size="sm" />
                        ) : (
                          <FaRedo size={14} />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCancelarOrden(orden.id_orden)}
                        disabled={procesando === orden.id_orden}
                        title="Cancelar orden"
                      >
                        {procesando === orden.id_orden ? (
                          <Loading size="sm" />
                        ) : (
                          <FaTimesCircle size={14} />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OrdenesPage;
