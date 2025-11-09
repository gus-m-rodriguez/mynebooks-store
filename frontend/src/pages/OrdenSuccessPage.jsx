import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ordenesApi } from "../api/ordenes.api.js";
import { Button, Alert, Loading, Card } from "../components/ui/index.js";
import { FaCheckCircle, FaShoppingBag } from "react-icons/fa";

const OrdenSuccessPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState(null);

  useEffect(() => {
    const verificarOrden = async () => {
      try {
        setLoading(true);
        // Primero intentar verificar el pago con Mercado Pago (esto actualiza el estado si el pago fue aprobado)
        try {
          console.log("[OrdenSuccessPage] Verificando pago con Mercado Pago para orden:", id);
          const verificarRes = await ordenesApi.verificarPago(id);
          console.log("[OrdenSuccessPage] Resultado de verificación:", verificarRes.data);
        } catch (err) {
          console.error("[OrdenSuccessPage] Error verificando pago:", err);
          // Continuar aunque falle la verificación
        }
        
        // Verificar el estado actualizado de la orden
        const res = await ordenesApi.obtener(id);
        setOrden(res.data);
        
        console.log("[OrdenSuccessPage] Estado de la orden:", res.data.estado);
        
        // Si la orden está pagada, redirigir al catálogo después de 5 segundos
        if (res.data.estado === "pagado") {
          setTimeout(() => {
            navigate("/catalogo");
          }, 5000);
        }
      } catch (err) {
        console.error("Error obteniendo orden:", err);
        setError(err.response?.data?.message || "Error al obtener la orden");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      verificarOrden();
    }
  }, [id, navigate]);

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
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
        <Button variant="primary" onClick={() => navigate("/ordenes")}>
          Ver mis órdenes
        </Button>
      </div>
    );
  }

  const estadoPagado = orden?.estado === "pagado";

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="p-8 text-center">
        {estadoPagado ? (
          <>
            <div className="mb-6">
              <FaCheckCircle className="text-green-500 text-6xl mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-green-600 mb-2">
                ¡Pago Exitoso!
              </h1>
              <p className="text-gray-600">
                Tu orden #{id} ha sido procesada correctamente.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-green-800 mb-2">
                Recibirás un email de confirmación con los detalles de tu compra.
              </p>
              <p className="text-xs text-green-700 italic">
                Serás redirigido al catálogo en unos segundos...
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                onClick={() => navigate(`/ordenes/${id}`)}
                className="flex items-center justify-center gap-2"
              >
                <FaShoppingBag />
                Ver detalles de la orden
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/catalogo")}
              >
                Continuar comprando
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-6">
              <div className="text-yellow-500 text-6xl mx-auto mb-4">⏳</div>
              <h1 className="text-3xl font-bold text-yellow-600 mb-2">
                Pago Pendiente
              </h1>
              <p className="text-gray-600">
                Tu orden #{id} está siendo procesada.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-yellow-800">
                El pago puede tardar unos minutos en procesarse. Te notificaremos por email cuando se complete.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="primary"
                onClick={() => navigate(`/ordenes/${id}`)}
                className="flex items-center justify-center gap-2"
              >
                <FaShoppingBag />
                Ver detalles de la orden
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/ordenes")}
              >
                Ver mis órdenes
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default OrdenSuccessPage;

