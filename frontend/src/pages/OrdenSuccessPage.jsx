import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ordenesApi } from "../api/ordenes.api.js";
import { Button, Alert, Loading, Card } from "../components/ui/index.js";
import { FaCheckCircle, FaShoppingBag } from "react-icons/fa";

const OrdenSuccessPage = () => {
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
        // Extraer payment_id, collection_id y merchant_order_id de los query params
        // En Checkout Pro, Mercado Pago puede enviar collection_id (preferencia), payment_id (pago) o merchant_order_id (orden comercial)
        const paymentId = searchParams.get("payment_id");
        const collectionId = searchParams.get("collection_id");
        const merchantOrderId = searchParams.get("merchant_order_id");
        
        // Log de todos los query params para debugging
        console.log("[OrdenSuccessPage] Query params completos:", Object.fromEntries(searchParams.entries()));
        console.log("[OrdenSuccessPage] Payment ID extraído:", paymentId);
        console.log("[OrdenSuccessPage] Collection ID extraído:", collectionId);
        console.log("[OrdenSuccessPage] Merchant Order ID extraído:", merchantOrderId);
        
        // Primero intentar verificar el pago con Mercado Pago (esto actualiza el estado si el pago fue aprobado)
        // Usar endpoint público que no requiere autenticación
        let pagoVerificado = false;
        let estadoVerificado = null;
        
        // Enviar payment_id, collection_id, merchant_order_id y status al backend
        if (paymentId || collectionId || merchantOrderId) {
          try {
            console.log("[OrdenSuccessPage] Verificando pago público con Mercado Pago para orden:", id);
            
            // Preparar body con los IDs disponibles y el status
            const body = {};
            if (paymentId) body.payment_id = paymentId;
            if (collectionId) body.collection_id = collectionId;
            if (merchantOrderId) body.merchant_order_id = merchantOrderId;
            
            // IMPORTANTE: Enviar también el status de la URL
            // Mercado Pago ya nos está diciendo el estado del pago en los parámetros
            const status = searchParams.get("status");
            const collectionStatus = searchParams.get("collection_status");
            if (status) body.status = status;
            if (collectionStatus) body.collection_status = collectionStatus;
            
            console.log("[OrdenSuccessPage] Status recibido en URL:", { status, collectionStatus });
            
            // Usar endpoint público que no requiere autenticación
            const verificarRes = await ordenesApi.verificarPagoPublico(id, body);
            console.log("[OrdenSuccessPage] Resultado de verificación:", verificarRes.data);
            
            // Guardar el estado verificado
            estadoVerificado = verificarRes.data?.orden_estado;
            pagoVerificado = true;
            
            // Si la verificación fue exitosa y el estado es "pagado", usar ese estado
            if (estadoVerificado === "pagado") {
              setOrden({ estado: "pagado" });
              setTimeout(() => {
                navigate("/catalogo");
              }, 5000);
              setLoading(false);
              return; // Salir temprano si el pago fue exitoso
            }
          } catch (err) {
            console.error("[OrdenSuccessPage] Error verificando pago público:", err);
            console.error("[OrdenSuccessPage] Detalles del error:", {
              message: err.message,
              response: err.response?.data,
              status: err.response?.status
            });
            // Continuar aunque falle la verificación
          }
        } else {
          console.warn("[OrdenSuccessPage] No se encontró payment_id ni collection_id en la URL");
        }
        
        // Intentar obtener el estado de la orden (puede fallar si no hay sesión, pero no es crítico)
        // IMPORTANTE: No limpiar la sesión si falla, solo usar el estado verificado del pago
        try {
          const res = await ordenesApi.obtener(id);
          const ordenData = res.data;
          setOrden(ordenData);
          console.log("[OrdenSuccessPage] Estado de la orden obtenido:", ordenData.estado);
          
          // Si la orden está pagada, redirigir al catálogo después de 5 segundos
          if (ordenData.estado === "pagado") {
            setTimeout(() => {
              navigate("/catalogo");
            }, 5000);
          }
        } catch (err) {
          // Si es un error 401, no es crítico - el usuario puede no tener sesión activa
          // pero el pago ya fue procesado por verificarPagoPublico
          if (err.response?.status === 401) {
            console.warn("[OrdenSuccessPage] No hay sesión activa (401), pero el pago ya fue procesado");
          } else {
            console.warn("[OrdenSuccessPage] Error obteniendo orden:", err);
          }
          
          // Si no hay sesión pero se verificó el pago exitosamente, usar ese estado
          if (pagoVerificado && estadoVerificado) {
            setOrden({ estado: estadoVerificado });
            if (estadoVerificado === "pagado") {
              setTimeout(() => {
                navigate("/catalogo");
              }, 5000);
            }
          } else if (paymentId || collectionId || merchantOrderId) {
            // Si hay payment_id pero no se pudo verificar, asumir que está pendiente
            // (el webhook lo procesará más tarde)
            setOrden({ estado: "en_pago" });
          } else {
            // Si no hay payment_id ni sesión, mostrar pendiente
            setOrden({ estado: "en_pago" });
          }
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

