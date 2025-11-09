import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { ordenesApi } from "../api/ordenes.api.js";
import { Button, Alert, Loading, Card, Input } from "../components/ui/index.js";
import { FaMapMarkerAlt, FaLock, FaCreditCard } from "react-icons/fa";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    items,
    loading: cartLoading,
    hayProductosSinStock,
    calcularTotal,
    calcularCantidadTotal,
    vaciarCarrito,
  } = useCart();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [direccionEnvio, setDireccionEnvio] = useState(user?.direccion_envio || "");
  const [ordenCreada, setOrdenCreada] = useState(null);

  // Cargar dirección del perfil si existe
  useEffect(() => {
    if (user?.direccion_envio) {
      setDireccionEnvio(user.direccion_envio);
    }
  }, [user]);

  // Redirigir si el carrito está vacío
  useEffect(() => {
    if (!cartLoading && items.length === 0) {
      navigate("/carrito");
    }
  }, [items, cartLoading, navigate]);

  const total = calcularTotal();
  const cantidadTotal = calcularCantidadTotal();

  const handleCrearOrden = async () => {
    if (!direccionEnvio || direccionEnvio.trim().length < 10) {
      setError("La dirección de envío debe tener al menos 10 caracteres");
      return;
    }

    if (hayProductosSinStock) {
      setError("No puedes proceder con productos sin stock. Por favor, revisa tu carrito.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Crear orden
      const ordenRes = await ordenesApi.crear({
        direccion_envio: direccionEnvio.trim(),
      });

      setOrdenCreada(ordenRes.data);

      // Iniciar pago (reserva stock y obtiene URL de Mercado Pago)
      const pagoRes = await ordenesApi.iniciarPago(ordenRes.data.id_orden);

      // Vaciar carrito después de crear orden exitosamente
      await vaciarCarrito();

      // Redirigir a Mercado Pago (usar sandbox_init_point en desarrollo, init_point en producción)
      const urlPago = pagoRes.data?.sandbox_init_point || pagoRes.data?.init_point;
      if (urlPago) {
        window.location.href = urlPago;
      } else {
        setError("No se pudo obtener la URL de pago. Por favor, intenta nuevamente.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Error en checkout:", err);
      const errorMessage =
        err.response?.data?.message ||
        "Error al procesar el checkout. Por favor, intenta nuevamente.";
      setError(errorMessage);
      setLoading(false);
    }
  };

  if (cartLoading || items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <h1 className="text-3xl font-bold text-oscuro-azulMarino mb-6">
        💳 Checkout
      </h1>

      {error && (
        <Alert type="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal - Formulario y resumen */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dirección de envío */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FaMapMarkerAlt className="text-acento-violetaManga" size={20} />
              <h2 className="text-xl font-bold text-oscuro-azulMarino">
                Dirección de Envío
              </h2>
            </div>
            <Input
              label="Dirección completa"
              name="direccion_envio"
              type="text"
              placeholder="Calle, número, ciudad, código postal"
              value={direccionEnvio}
              onChange={(e) => setDireccionEnvio(e.target.value)}
              required
              className="mb-4"
            />
            <p className="text-sm text-gray-600">
              Esta dirección se usará para el envío de tu pedido. Asegúrate de que sea correcta.
            </p>
          </Card>

          {/* Resumen de productos */}
          <Card className="p-6">
            <h2 className="text-xl font-bold text-oscuro-azulMarino mb-4">
              Resumen de tu Pedido
            </h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"
                >
                  <div className="flex-1">
                    <p className="font-medium text-oscuro-azulMarino">
                      {item.titulo}
                    </p>
                    <p className="text-sm text-gray-600">
                      Cantidad: {item.cantidad} × ${parseFloat(item.precio).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-bold text-acento-violetaManga">
                    ${(parseFloat(item.precio) * item.cantidad).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Información de pago */}
          <Card className="p-6 bg-gray-50">
            <div className="flex items-center gap-2 mb-2">
              <FaLock className="text-gray-600" size={16} />
              <p className="text-sm text-gray-600">
                El pago se procesará de forma segura a través de Mercado Pago
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FaCreditCard className="text-gray-600" size={16} />
              <p className="text-sm text-gray-600">
                Aceptamos tarjetas de crédito, débito y otros métodos de pago
              </p>
            </div>
          </Card>
        </div>

        {/* Columna lateral - Resumen y botón de pago */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="text-xl font-bold text-oscuro-azulMarino mb-4">
              Resumen del Pedido
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal ({cantidadTotal} producto{cantidadTotal !== 1 ? "s" : ""})</span>
                <span className="font-medium">
                  ${total.toLocaleString("es-AR", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Envío</span>
                <span className="font-medium">Se calcula en el pago</span>
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

            <Button
              variant="primary"
              size="lg"
              className="w-full mb-3"
              onClick={handleCrearOrden}
              disabled={loading || hayProductosSinStock || !direccionEnvio || direccionEnvio.trim().length < 10}
              loading={loading}
            >
              {loading ? "Procesando..." : "Pagar con Mercado Pago"}
            </Button>

            {hayProductosSinStock && (
              <p className="text-xs text-red-600 text-center mb-3">
                Revisa los productos sin stock antes de continuar
              </p>
            )}

            {(!direccionEnvio || direccionEnvio.trim().length < 10) && (
              <p className="text-xs text-orange-600 text-center mb-3">
                La dirección de envío debe tener al menos 10 caracteres
              </p>
            )}

            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate("/carrito")}
              disabled={loading}
            >
              Volver al Carrito
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
