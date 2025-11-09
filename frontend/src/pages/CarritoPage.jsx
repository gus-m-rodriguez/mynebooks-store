import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { ordenesApi } from "../api/ordenes.api.js";
import { productosApi } from "../api/productos.api.js";
import { Button, Alert, Loading } from "../components/ui/index.js";
import CartItem from "../components/carrito/CartItem.jsx";
import { FaShoppingCart, FaTrash, FaClock } from "react-icons/fa";

const CarritoPage = () => {
  const navigate = useNavigate();
  const {
    items,
    loading,
    error,
    hayProductosSinStock,
    mensajeEstado,
    vaciarCarrito,
    calcularTotal,
    calcularCantidadTotal,
    eliminarProducto,
    cargarCarrito,
  } = useCart();

  const [isVaciar, setIsVaciar] = useState(false);
  const [isGuardando, setIsGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [verificandoStock, setVerificandoStock] = useState(false);
  const [itemsDisponibles, setItemsDisponibles] = useState([]);
  const [itemsSinStock, setItemsSinStock] = useState([]);

  // Verificar disponibilidad de productos al cargar el carrito
  useEffect(() => {
    const verificarDisponibilidad = async () => {
      if (items.length === 0) {
        setItemsDisponibles([]);
        setItemsSinStock([]);
        return;
      }

      setVerificandoStock(true);
      const disponibles = [];
      const sinStock = [];

      for (const item of items) {
        try {
          const productoRes = await productosApi.obtener(item.producto_id);
          const producto = productoRes.data;
          const stockDisponible = (producto.stock || 0) - (producto.stock_reserved || 0);
          const cantidadEnCarrito = parseInt(item.cantidad) || 0;

          // Si no tiene stock disponible, va a sin stock
          if (stockDisponible <= 0) {
            sinStock.push({ ...item, stock_disponible: stockDisponible });
          } else {
            // Si tiene stock pero la cantidad excede, agregar flag para indicarlo
            const cantidadExcedeStock = cantidadEnCarrito > stockDisponible;
            disponibles.push({ 
              ...item, 
              stock_disponible: stockDisponible,
              cantidad_excede_stock: cantidadExcedeStock
            });
          }
        } catch (err) {
          console.error(`Error verificando stock del producto ${item.producto_id}:`, err);
          // En caso de error, asumir que no está disponible
          sinStock.push({ ...item, stock_disponible: 0 });
        }
      }

      setItemsDisponibles(disponibles);
      setItemsSinStock(sinStock);
      setVerificandoStock(false);
    };

    verificarDisponibilidad();
  }, [items]);

  // No eliminamos automáticamente, solo mostramos y eliminamos al hacer acciones

  const handleVaciarCarrito = async () => {
    if (window.confirm("¿Estás seguro de que deseas vaciar el carrito?")) {
      setIsVaciar(true);
      // Eliminar productos sin stock antes de vaciar
      if (itemsSinStock.length > 0) {
        for (const item of itemsSinStock) {
          try {
            await eliminarProducto(item.producto_id);
          } catch (err) {
            console.error(`Error eliminando producto sin stock ${item.producto_id}:`, err);
          }
        }
      }
      await vaciarCarrito();
      setIsVaciar(false);
    }
  };

  const handleDejarParaMasTarde = async () => {
    // Eliminar productos sin stock antes de guardar
    if (itemsSinStock.length > 0) {
      for (const item of itemsSinStock) {
        try {
          await eliminarProducto(item.producto_id);
        } catch (err) {
          console.error(`Error eliminando producto sin stock ${item.producto_id}:`, err);
        }
      }
      await cargarCarrito();
    }

    if (itemsDisponibles.length === 0) {
      setMensaje({ type: "error", text: "No hay productos disponibles para guardar" });
      setTimeout(() => setMensaje(null), 5000);
      return;
    }

    setIsGuardando(true);
    setMensaje(null);

    try {
      // Crear orden en estado "pendiente" (el backend usará la dirección del perfil si no se proporciona)
      await ordenesApi.crear({});
      
      // Vaciar carrito después de crear orden exitosamente
      await vaciarCarrito();
      
      setMensaje({ 
        type: "success", 
        text: "Carrito guardado para más tarde. Puedes encontrarlo en 'Mis Órdenes' como orden pendiente." 
      });
      
      setTimeout(() => {
        setMensaje(null);
        navigate("/ordenes");
      }, 3000);
    } catch (err) {
      console.error("Error guardando carrito para más tarde:", err);
      const errorMessage = err.response?.data?.message || "Error al guardar el carrito. Por favor, intenta nuevamente.";
      setMensaje({ type: "error", text: errorMessage });
      setTimeout(() => setMensaje(null), 5000);
    } finally {
      setIsGuardando(false);
    }
  };

  const handleCheckout = async () => {
    // Eliminar productos sin stock antes de checkout
    if (itemsSinStock.length > 0) {
      for (const item of itemsSinStock) {
        try {
          await eliminarProducto(item.producto_id);
        } catch (err) {
          console.error(`Error eliminando producto sin stock ${item.producto_id}:`, err);
        }
      }
      await cargarCarrito();
    }

    if (itemsDisponibles.length === 0) {
      setMensaje({ type: "error", text: "No hay productos disponibles para comprar" });
      setTimeout(() => setMensaje(null), 5000);
      return;
    }

    navigate("/checkout");
  };

  // Calcular totales solo con productos disponibles
  // Si la cantidad excede el stock disponible, usar el stock disponible para el cálculo
  const total = itemsDisponibles.reduce((sum, item) => {
    const precioRegular = parseFloat(item.precio) || 0;
    const precioPromocional = item.precio_promocional ? parseFloat(item.precio_promocional) : null;
    const precioFinal = precioPromocional && precioPromocional < precioRegular 
      ? precioPromocional 
      : precioRegular;
    const cantidad = parseInt(item.cantidad) || 0;
    const stockDisponible = item.stock_disponible || 0;
    // Si la cantidad excede el stock, usar el stock disponible para el cálculo
    const cantidadParaCalcular = cantidad > stockDisponible ? stockDisponible : cantidad;
    return sum + precioFinal * cantidadParaCalcular;
  }, 0);

  const cantidadTotal = itemsDisponibles.reduce((sum, item) => {
    const cantidad = parseInt(item.cantidad) || 0;
    const stockDisponible = item.stock_disponible || 0;
    // Si la cantidad excede el stock, usar el stock disponible para el cálculo
    const cantidadParaCalcular = cantidad > stockDisponible ? stockDisponible : cantidad;
    return sum + cantidadParaCalcular;
  }, 0);

  if (loading && items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Título */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-oscuro-azulMarino mb-2">
          🛒 Carrito de Compras
        </h1>
        {cantidadTotal > 0 && (
          <p className="text-gray-600">
            {cantidadTotal} producto{cantidadTotal !== 1 ? "s" : ""} en tu carrito
          </p>
        )}
      </div>

      {items.length === 0 ? (
        /* Carrito vacío */
        <div className="text-center py-12">
          <FaShoppingCart className="mx-auto text-gray-300 mb-4" size={64} />
          <h2 className="text-2xl font-bold text-oscuro-azulMarino mb-2">
            Tu carrito está vacío
          </h2>
          <p className="text-gray-600 mb-6">
            Agrega productos desde el catálogo para comenzar a comprar
          </p>
          <Button
            variant="primary"
            onClick={() => navigate("/catalogo")}
          >
            Ver Catálogo
          </Button>
        </div>
      ) : (
        /* Carrito con productos */
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Lista de productos - Izquierda */}
          <div className="flex-1 space-y-4">
            {/* Items disponibles primero */}
            {itemsDisponibles.map((item) => (
              <CartItem key={`${item.producto_id}-${item.id}`} item={item} disponible={true} />
            ))}
            
            {/* Items sin stock al final (grisados y deshabilitados) */}
            {itemsSinStock.map((item) => (
              <CartItem key={`${item.producto_id}-${item.id}`} item={item} disponible={false} />
            ))}
          </div>

          {/* Resumen - Derecha */}
          <aside className="w-full lg:w-80 flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-24">
              <h2 className="text-xl font-bold text-oscuro-azulMarino mb-4">
                Resumen del Pedido
              </h2>

              {/* Detalles */}
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal ({cantidadTotal} producto{cantidadTotal !== 1 ? "s" : ""})</span>
                  <span className="font-medium">
                    ${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Envío</span>
                  <span className="font-medium">Se calcula en checkout</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between text-lg font-bold text-oscuro-azulMarino">
                    <span>Total</span>
                    <span className="text-acento-violetaManga">
                      ${total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botón checkout */}
              <Button
                variant="primary"
                className="w-full mb-3"
                onClick={handleCheckout}
                disabled={itemsDisponibles.length === 0 || loading || isGuardando || verificandoStock}
              >
                Proceder al Checkout
              </Button>

              {/* Botón dejar para más tarde */}
              <Button
                variant="outline"
                className="w-full mb-3 flex items-center justify-center gap-2"
                onClick={handleDejarParaMasTarde}
                disabled={itemsDisponibles.length === 0 || loading || isGuardando || verificandoStock}
                title="Guardar carrito como orden pendiente para más tarde"
              >
                {isGuardando ? (
                  <>
                    <Loading size="sm" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <FaClock size={14} />
                    Dejar para más tarde
                  </>
                )}
              </Button>

              {/* Continuar comprando */}
              <Button
                variant="outline"
                className="w-full mb-3"
                onClick={() => navigate("/catalogo")}
                disabled={isGuardando}
              >
                Continuar Comprando
              </Button>

              {/* Vaciar carrito */}
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2"
                onClick={handleVaciarCarrito}
                disabled={isVaciar || loading || isGuardando || items.length === 0}
              >
                <FaTrash size={14} />
                Vaciar Carrito
              </Button>
            </div>

            {/* Alertas unificadas debajo del resumen */}
            <div className="space-y-3 mt-4">
              {/* Error */}
              {error && (
                <Alert type="error" onClose={() => {}}>
                  {error}
                </Alert>
              )}

              {/* Mensaje de éxito/error para guardar para más tarde */}
              {mensaje && (
                <Alert 
                  type={mensaje.type} 
                  onClose={() => setMensaje(null)}
                >
                  {mensaje.text}
                </Alert>
              )}

              {/* Mensaje de productos sin stock */}
              {itemsSinStock.length > 0 && (
                <Alert type="warning">
                  {itemsSinStock.length} producto{itemsSinStock.length !== 1 ? "s" : ""} sin stock disponible. Serán eliminados automáticamente al proceder con la compra.
                </Alert>
              )}
              {hayProductosSinStock && itemsSinStock.length === 0 && mensajeEstado && (
                <Alert type="warning">
                  {mensajeEstado}
                </Alert>
              )}

              {/* Indicador de verificación de stock */}
              {verificandoStock && (
                <Alert type="info">
                  Verificando disponibilidad de productos...
                </Alert>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default CarritoPage;
