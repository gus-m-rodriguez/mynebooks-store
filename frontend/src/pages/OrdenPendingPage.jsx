import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ordenesApi } from "../api/ordenes.api.js";
import { Button, Alert, Loading, Card } from "../components/ui/index.js";
import { FaClock, FaShoppingBag } from "react-icons/fa";

const OrdenPendingPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orden, setOrden] = useState(null);

  useEffect(() => {
    const verificarOrden = async () => {
      try {
        setLoading(true);
        const res = await ordenesApi.obtener(id);
        setOrden(res.data);
        
        // Si la orden aún está en "en_pago", intentar verificar el pago
        if (res.data.estado === "en_pago") {
          try {
            await ordenesApi.verificarPago(id);
            const resActualizado = await ordenesApi.obtener(id);
            setOrden(resActualizado.data);
          } catch (err) {
            console.error("Error verificando pago:", err);
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
  }, [id]);

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

