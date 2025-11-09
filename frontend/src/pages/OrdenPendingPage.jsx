import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ordenesApi } from "../api/ordenes.api.js";
import { Button, Alert, Loading, Card } from "../components/ui/index.js";
import { FaClock, FaShoppingBag } from "react-icons/fa";

const OrdenPendingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState(null);

  useEffect(() => {
    // Marcar que venimos de una ruta pública de pago
    // Esto permite que AuthContext use reintentos más agresivos
    sessionStorage.setItem('cameFromPaymentRoute', 'true');
    
    const verificarOrden = async () => {
      try {
        setLoading(true);
        
        // Extraer parámetros de la URL de Mercado Pago
        const paymentId = searchParams.get("payment_id");
        const collectionId = searchParams.get("collection_id");
        const merchantOrderId = searchParams.get("merchant_order_id");
        const status = searchParams.get("status");
        const collectionStatus = searchParams.get("collection_status");
        
        // Si hay parámetros de MP, usar endpoint público (no requiere autenticación)
        if (paymentId || collectionId || merchantOrderId) {
          try {
            console.log("[OrdenPendingPage] Verificando pago público con Mercado Pago para orden:", id);
            
            const body = {};
            if (paymentId) body.payment_id = paymentId;
            if (collectionId) body.collection_id = collectionId;
            if (merchantOrderId) body.merchant_order_id = merchantOrderId;
            if (status) body.status = status;
            if (collectionStatus) body.collection_status = collectionStatus;
            
            await ordenesApi.verificarPagoPublico(id, body);
          } catch (err) {
            console.error("[OrdenPendingPage] Error verificando pago público:", err);
          }
        }
        
        // Intentar obtener el estado de la orden
        try {
          const res = await ordenesApi.obtener(id);
          setOrden(res.data);
        } catch (err) {
          console.warn("[OrdenPendingPage] No se pudo obtener la orden (puede ser por falta de sesión):", err);
          // Si no hay sesión, mostrar estado genérico
          setOrden({ estado: "en_pago" });
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
  }, [id, navigate, searchParams]);

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card className="p-8 text-center">
        <div className="mb-6">
          <FaClock className="text-yellow-500 text-6xl mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-yellow-600 mb-2">
            Pago Pendiente
          </h1>
          <p className="text-gray-600">
            Tu orden #{id} está siendo procesada.
          </p>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-yellow-800 mb-2">
            <strong>¿Qué significa esto?</strong>
          </p>
          <p className="text-sm text-yellow-700">
            Algunos métodos de pago (como transferencias bancarias) pueden tardar unos minutos en procesarse. 
            Te notificaremos por email cuando se complete el pago.
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
      </Card>
    </div>
  );
};

export default OrdenPendingPage;

