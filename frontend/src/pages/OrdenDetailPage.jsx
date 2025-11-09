import { useState, useEffect } from "react";
import { useParams, Link, useNavigate, useLocation } from "react-router-dom";
import { ordenesApi } from "../api/ordenes.api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { Button, Alert, Loading, Card } from "../components/ui/index.js";
import OrdenesSubNav from "../components/ordenes/OrdenesSubNav.jsx";
import AdminSubNav from "../components/admin/AdminSubNav.jsx";
import {
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaCreditCard,
  FaBox,
  FaArrowLeft,
  FaUser,
  FaRedo,
} from "react-icons/fa";

const OrdenDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { agregarProducto } = useCart();
  const [orden, setOrden] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [procesando, setProcesando] = useState(null); // itemId que se está procesando
  const [filtroGrupo, setFiltroGrupo] = useState("mas_tarde");
  
  // Determinar si estamos en contexto de admin
  const esAdmin = user?.rol === "admin" || user?.rol === "super_admin";
  const desdeAdmin = location.pathname.includes("/admin") || esAdmin;

  // Determinar el grupo al que pertenece la orden actual
  const determinarGrupoOrden = (estado) => {
    if (estado === "pendiente") return "mas_tarde";
    if (estado === "pagado" || estado === "en_envio") return "en_camino";
    return "historial";
  };

  // Sincronizar filtro con el estado de la orden
  useEffect(() => {
    if (orden?.estado) {
      const grupo = determinarGrupoOrden(orden.estado);
      setFiltroGrupo(grupo);
    }
  }, [orden]);

  useEffect(() => {
    cargarOrden();
  }, [id]);

  const cargarOrden = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ordenesApi.obtener(id);
      setOrden(res.data);
    } catch (err) {
      console.error("Error cargando orden:", err);
      setError(
        err.response?.data?.message ||
          "Error al cargar la orden. Por favor, intenta nuevamente."
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
      enviado: "bg-purple-100 text-purple-800",
      entregado: "bg-gray-100 text-gray-800",
      cancelado: "bg-red-100 text-red-800",
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
      expirada: "Expirada",
    };
    return textos[estado] || estado;
  };

  const handleReintentarItem = async (itemId, item) => {
    try {
      setProcesando(itemId);
      setError(null);
      setSuccess(null);

      console.log("[ReintentarItem] Iniciando proceso para item:", itemId, "de orden:", id);

      // Verificar disponibilidad del producto
      const stockDisponible = parseInt(item.stock_disponible) || 0;
      const cantidadSolicitada = parseInt(item.cantidad) || 0;

      if (stockDisponible < cantidadSolicitada) {
        setError(`No hay stock disponible para "${item.titulo}". Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`);
        setTimeout(() => setError(null), 5000);
        setProcesando(null);
        return;
      }

      // Agregar producto al carrito con la cantidad de la orden
      console.log("[ReintentarItem] Agregando producto al carrito...");
      const result = await agregarProducto(item.id_producto, item.cantidad);
      
      if (!result.success) {
        console.error("[ReintentarItem] Error agregando producto:", result.error);
        setError(`Error al agregar producto al carrito: ${result.error}`);
        setTimeout(() => setError(null), 5000);
        setProcesando(null);
        return;
      }

      console.log("[ReintentarItem] Producto agregado al carrito exitosamente");

      // Eliminar el item de la orden
      console.log("[ReintentarItem] Eliminando item de la orden...");
      const deleteRes = await ordenesApi.eliminarItem(id, itemId);
      
      console.log("[ReintentarItem] Item eliminado:", deleteRes.data);

      // Verificar si la orden fue cancelada (no quedan productos)
      const ordenCancelada = deleteRes.data.orden_cancelada;

      // Si la orden fue cancelada, redirigir inmediatamente a la lista de órdenes
      // La cancelación ya ocurrió en el backend, no necesitamos recargar la orden
      if (ordenCancelada) {
        setProcesando(null);
        // Redirigir inmediatamente a la lista de órdenes
        // La orden ya está cancelada en el backend
        navigate("/ordenes");
        return;
      }

      // Si la orden no fue cancelada, recargar la orden y mostrar mensaje de éxito
      await cargarOrden();

      // Mostrar mensaje de éxito
      setSuccess(`Producto "${item.titulo}" agregado al carrito exitosamente.`);
      setTimeout(() => {
        setSuccess(null);
        // NO redirigir al carrito, solo agregar el producto
      }, 3000);

      setProcesando(null);
    } catch (err) {
      console.error("[ReintentarItem] Error completo:", err);
      console.error("[ReintentarItem] Error response:", err.response);
      setError(err.response?.data?.message || "Error al reintentar el producto. Por favor, intenta nuevamente.");
      setTimeout(() => setError(null), 5000);
      setProcesando(null);
    }
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

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
        <div className="flex gap-2">
          <Button variant="outline" onClick={cargarOrden}>
            Reintentar
          </Button>
          <Button variant="outline" onClick={() => navigate("/ordenes")}>
            Volver a Mis Órdenes
          </Button>
        </div>
      </div>
    );
  }

  if (!orden) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="error" className="mb-4">
          Orden no encontrada
        </Alert>
        <Button variant="outline" onClick={() => navigate("/ordenes")}>
          Volver a Mis Órdenes
        </Button>
      </div>
    );
  }

  const total = orden.items?.reduce(
    (sum, item) => sum + parseFloat(item.precio_unitario) * item.cantidad,
    0
  ) || 0;

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Sub navegación de órdenes */}
      {desdeAdmin ? (
        <AdminSubNav />
      ) : (
        <OrdenesSubNav 
          filtroActivo={filtroGrupo} 
          onFiltroChange={(grupo) => {
            // Si se cambia el filtro, navegar a la lista de órdenes con el filtro aplicado
            navigate(`/ordenes?grupo=${grupo}`);
          }}
        />
      )}

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

      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(desdeAdmin ? "/admin/ordenes" : "/ordenes")}
          className="mb-4"
        >
          <FaArrowLeft className="mr-2" size={14} />
          {desdeAdmin ? "Volver a Gestión de Órdenes" : "Volver a Mis Órdenes"}
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-oscuro-azulMarino mb-2">
              Orden #{orden.id_orden}
            </h1>
            <p className="text-gray-600">
              Creada el {formatearFecha(orden.fecha_creacion)}
            </p>
          </div>
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoColor(
              orden.estado
            )}`}
          >
            {getEstadoTexto(orden.estado)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Información principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items de la orden */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-oscuro-azulMarino mb-4">
              Productos
            </h2>
            <div className="space-y-4">
              {orden.items?.map((item) => {
                const stockDisponible = parseInt(item.stock_disponible) || 0;
                const cantidadSolicitada = parseInt(item.cantidad) || 0;
                const itemSinStock = stockDisponible < cantidadSolicitada;
                const estaProcesando = procesando === item.id_item;
                const puedeReintentar = orden.estado === "pendiente" && !desdeAdmin;
                
                return (
                  <div
                    key={item.id_item}
                    className={`flex gap-4 pb-4 border-b border-gray-100 last:border-0 ${
                      itemSinStock ? "opacity-60" : ""
                    }`}
                  >
                    <img
                      src={item.imagen_url || "/placeholder.jpg"}
                      alt={item.titulo}
                      className={`w-20 h-20 object-cover rounded-lg border border-gray-200 ${
                        itemSinStock ? "grayscale" : ""
                      }`}
                      onError={(e) => {
                        e.target.src = "/placeholder.jpg";
                      }}
                    />
                    <div className="flex-1">
                      <h3 className={`font-semibold ${itemSinStock ? "text-gray-500" : "text-oscuro-azulMarino"}`}>
                        {item.titulo}
                      </h3>
                      <p className={`text-sm ${itemSinStock ? "text-gray-400" : "text-gray-600"}`}>
                        por {item.autor}
                      </p>
                      <p className={`text-sm mt-1 ${itemSinStock ? "text-gray-400" : "text-gray-600"}`}>
                        Cantidad: {item.cantidad} | Precio: ${parseFloat(item.precio_unitario).toFixed(2)} c/u
                      </p>
                      {itemSinStock && (
                        <p className="text-xs text-red-600 mt-1">
                          Sin stock disponible (Disponible: {stockDisponible}, Solicitado: {cantidadSolicitada})
                        </p>
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-2">
                      <p className={`font-bold ${itemSinStock ? "text-gray-400" : "text-acento-violetaManga"}`}>
                        ${(parseFloat(item.precio_unitario) * item.cantidad).toFixed(2)}
                      </p>
                      {puedeReintentar && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleReintentarItem(item.id_item, item)}
                          disabled={estaProcesando || itemSinStock}
                          title={
                            itemSinStock
                              ? `No hay stock disponible. Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`
                              : `Reintentar "${item.titulo}" (agregar al carrito)`
                          }
                        >
                          {estaProcesando ? (
                            <Loading size="sm" />
                          ) : (
                            <>
                              <FaRedo size={12} className="mr-1" />
                              Reintentar
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Información del usuario (solo para admin) */}
          {desdeAdmin && orden.usuario && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <FaUser className="text-acento-violetaManga" size={20} />
                <h2 className="text-xl font-bold text-oscuro-azulMarino">
                  Información del Usuario
                </h2>
              </div>
              <div className="space-y-2">
                <p className="text-gray-700">
                  <strong>Nombre:</strong> {orden.usuario.nombre} {orden.usuario.apellido}
                </p>
                <p className="text-gray-700">
                  <strong>Email:</strong> {orden.usuario.email}
                </p>
                <p className="text-gray-700">
                  <strong>Rol:</strong> {orden.usuario.rol}
                </p>
              </div>
            </Card>
          )}

          {/* Información de envío */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaMapMarkerAlt className="text-acento-violetaManga" size={20} />
              <h2 className="text-xl font-bold text-oscuro-azulMarino">
                Dirección de Envío
              </h2>
            </div>
            <p className="text-gray-700">{orden.direccion_envio || "Sin dirección"}</p>
          </Card>
        </div>

        {/* Resumen lateral */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="text-xl font-bold text-oscuro-azulMarino mb-4">
              Resumen
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium">
                  ${total.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span className="font-medium">Incluido</span>
              </div>
              <div className="border-t border-gray-200 pt-3">
                <div className="flex justify-between text-lg font-bold text-oscuro-azulMarino">
                  <span>Total</span>
                  <span className="text-acento-violetaManga">
                    ${total.toLocaleString("es-AR", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Información de pago */}
            {orden.pago && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-3">
                  <FaCreditCard className="text-gray-600" size={16} />
                  <h3 className="font-semibold text-oscuro-azulMarino">
                    Información de Pago
                  </h3>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estado:</span>
                    <span className="font-medium">{orden.pago.estado || "N/A"}</span>
                  </div>
                  {orden.pago.monto && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monto:</span>
                      <span className="font-medium">
                        ${parseFloat(orden.pago.monto).toLocaleString("es-AR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  )}
                  {orden.pago.fecha_pago && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Fecha de pago:</span>
                      <span className="font-medium">
                        {formatearFecha(orden.pago.fecha_pago)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fecha de expiración si está pendiente */}
            {orden.estado === "pendiente" && orden.fecha_expiracion && (
              <div className="border-t border-gray-200 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <FaCalendarAlt className="text-orange-600" size={16} />
                  <p className="text-sm font-medium text-orange-600">
                    Expira el {formatearFecha(orden.fecha_expiracion)}
                  </p>
                </div>
                <p className="text-xs text-gray-600">
                  Completa el pago antes de esta fecha para asegurar tu pedido
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrdenDetailPage;
