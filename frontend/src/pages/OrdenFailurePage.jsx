import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ordenesApi } from "../api/ordenes.api.js";
import { Button, Alert, Loading, Card } from "../components/ui/index.js";
import { FaTimesCircle, FaRedo } from "react-icons/fa";

const OrdenFailurePage = () => {
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
          <FaTimesCircle className="text-red-500 text-6xl mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-red-600 mb-2">
            Pago Rechazado
          </h1>
          <p className="text-gray-600">
            No se pudo procesar el pago de tu orden #{id}.
          </p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800 mb-2">
            <strong>Posibles razones:</strong>
          </p>
          <ul className="text-sm text-red-700 text-left list-disc list-inside space-y-1">
            <li>Fondos insuficientes</li>
            <li>Tarjeta rechazada</li>
            <li>Datos de pago incorrectos</li>
            <li>Problema temporal con el procesador de pagos</li>
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="primary"
            onClick={() => navigate(`/ordenes/${id}`)}
            className="flex items-center justify-center gap-2"
          >
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

export default OrdenFailurePage;

