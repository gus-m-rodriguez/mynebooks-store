import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { productosApi } from "../api/productos.api.js";
import { ProductGrid } from "../components/productos/index.js";
import { Loading, Alert } from "../components/ui/index.js";
import { Button } from "../components/ui/index.js";

// Función helper para mezclar array aleatoriamente (Fisher-Yates shuffle)
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const HomePage = () => {
  const navigate = useNavigate();
  const { isAuth, loading: authLoading } = useAuth();
  const [novedades, setNovedades] = useState([]);
  const [promociones, setPromociones] = useState([]);
  const [destacados, setDestacados] = useState([]);
  const [loadingNovedades, setLoadingNovedades] = useState(true);
  const [loadingPromociones, setLoadingPromociones] = useState(true);
  const [loadingDestacados, setLoadingDestacados] = useState(true);
  const [errorNovedades, setErrorNovedades] = useState(null);
  const [errorPromociones, setErrorPromociones] = useState(null);
  const [errorDestacados, setErrorDestacados] = useState(null);

  // Redirigir usuarios autenticados al catálogo
  useEffect(() => {
    if (isAuth && !authLoading) {
      navigate("/catalogo");
    }
  }, [isAuth, authLoading, navigate]);

  useEffect(() => {
    // Solo cargar datos si el usuario no está autenticado
    if (!isAuth && !authLoading) {
    cargarDatos();
    }
  }, [isAuth, authLoading]);

  const cargarDatos = async () => {
    // Cargar promociones primero (para destacados)
    let promocionesData = [];
    try {
      const promocionesRes = await productosApi.promociones(8);
      promocionesData = promocionesRes.data;
      setPromociones(promocionesData);
    } catch (error) {
      console.error("Error cargando promociones:", error);
      setErrorPromociones("Error al cargar las promociones");
    } finally {
      setLoadingPromociones(false);
    }

    // Cargar novedades
    let novedadesData = [];
    try {
      const novedadesRes = await productosApi.novedades(8);
      novedadesData = novedadesRes.data;
      setNovedades(novedadesData);
    } catch (error) {
      console.error("Error cargando novedades:", error);
      setErrorNovedades("Error al cargar las novedades");
    } finally {
      setLoadingNovedades(false);
    }

    // Cargar destacados (combinación de promociones + novedades + aleatorios)
    await cargarDestacados(promocionesData, novedadesData);
  };

  const cargarDestacados = async (promocionesData, novedadesData) => {
    setLoadingDestacados(true);
    setErrorDestacados(null);

    try {
      const destacados = [];
      const productosIds = new Set();

      // Prioridad 1: Promociones (hasta 8) - Solo productos con stock disponible
      promocionesData.forEach((producto) => {
        const stockDisponible = producto.stock_disponible ?? (producto.stock - (producto.stock_reserved || 0));
        if (
          destacados.length < 8 &&
          !productosIds.has(producto.id_producto) &&
          stockDisponible > 0
        ) {
          destacados.push(producto);
          productosIds.add(producto.id_producto);
        }
      });

      // Prioridad 2: Novedades (completar hasta 8) - Solo productos con stock disponible
      if (destacados.length < 8) {
        novedadesData.forEach((producto) => {
          const stockDisponible = producto.stock_disponible ?? (producto.stock - (producto.stock_reserved || 0));
          if (
            destacados.length < 8 &&
            !productosIds.has(producto.id_producto) &&
            stockDisponible > 0
          ) {
            destacados.push(producto);
            productosIds.add(producto.id_producto);
          }
        });
      }

      // Prioridad 3: Productos aleatorios del catálogo (si aún faltan) - Solo productos con stock disponible
      if (destacados.length < 8) {
        try {
          const aleatoriosRes = await productosApi.listar({ limite: 20 });
          const aleatorios = aleatoriosRes.data.filter(
            (p) => {
              const stockDisponible = p.stock_disponible ?? (p.stock - (p.stock_reserved || 0));
              return !productosIds.has(p.id_producto) && stockDisponible > 0;
            }
          );

          const faltantes = 8 - destacados.length;
          destacados.push(...aleatorios.slice(0, faltantes));
        } catch (error) {
          console.error("Error cargando productos aleatorios:", error);
          // No es crítico, continuamos con lo que tenemos
        }
      }

      // Mezclar aleatoriamente para mejor UX
      const destacadosMezclados = shuffleArray(destacados);
      setDestacados(destacadosMezclados);
    } catch (error) {
      console.error("Error cargando destacados:", error);
      setErrorDestacados("Error al cargar los productos destacados");
    } finally {
      setLoadingDestacados(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Hero Section */}
      <div className="text-center mb-12 py-8">
        <h1 className="text-4xl md:text-5xl font-bold text-oscuro-azulMarino mb-4">
          📚 Bienvenido a MyneBooks Store
        </h1>
        <p className="text-lg text-gray-600 mb-6">
          Descubre los mejores libros y las mejores ofertas
        </p>
      </div>

      {/* Destacados */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-oscuro-azulMarino">⭐ Destacados</h2>
          <Link to="/destacados">
            <Button variant="ghost" size="sm">
              Ver todas →
            </Button>
          </Link>
        </div>

        {loadingDestacados ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : errorDestacados ? (
          <Alert type="error" onClose={() => setErrorDestacados(null)}>
            {errorDestacados}
          </Alert>
        ) : destacados.length > 0 ? (
          <ProductGrid productos={destacados} showStock={false} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay productos destacados disponibles en este momento</p>
          </div>
        )}
      </section>

      {/* Novedades */}
      <section className="mb-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-oscuro-azulMarino">📚 Novedades</h2>
          <Link to="/novedades">
            <Button variant="ghost" size="sm">
              Ver todas →
            </Button>
          </Link>
        </div>

        {loadingNovedades ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : errorNovedades ? (
          <Alert type="error" onClose={() => setErrorNovedades(null)}>
            {errorNovedades}
          </Alert>
        ) : novedades.length > 0 ? (
          <ProductGrid productos={novedades} showStock={false} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay novedades disponibles en este momento</p>
          </div>
        )}
      </section>

      {/* Promociones */}
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-oscuro-azulMarino">🔥 Promociones</h2>
          <Link to="/promociones">
            <Button variant="ghost" size="sm">
              Ver todas →
            </Button>
          </Link>
        </div>

        {loadingPromociones ? (
          <div className="flex justify-center py-12">
            <Loading size="lg" />
          </div>
        ) : errorPromociones ? (
          <Alert type="error" onClose={() => setErrorPromociones(null)}>
            {errorPromociones}
          </Alert>
        ) : promociones.length > 0 ? (
          <ProductGrid productos={promociones} showStock={false} />
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay promociones disponibles en este momento</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default HomePage;

