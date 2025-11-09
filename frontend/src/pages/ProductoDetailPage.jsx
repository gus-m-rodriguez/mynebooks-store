import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { productosApi } from "../api/productos.api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";
import { ProductGrid } from "../components/productos/index.js";
import QuantitySelector from "../components/productos/QuantitySelector.jsx";
import { Card, Button, Alert, Loading } from "../components/ui/index.js";
import { FaShoppingCart, FaEdit } from "react-icons/fa";

const ProductoDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuth, user } = useAuth();
  const { agregarProducto, loading: cartLoading } = useCart();
  const isAdmin = user?.rol === "admin" || user?.rol === "super_admin";
  const [producto, setProducto] = useState(null);
  const [relacionados, setRelacionados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingRelacionados, setLoadingRelacionados] = useState(true);
  const [error, setError] = useState(null);
  const [agregando, setAgregando] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    cargarProducto();
    cargarRelacionados();
  }, [id]);

  const cargarProducto = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await productosApi.obtener(id);
      setProducto(response.data);
    } catch (err) {
      console.error("Error cargando producto:", err);
      setError(
        err.response?.data?.message || "Error al cargar el producto. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const cargarRelacionados = async () => {
    setLoadingRelacionados(true);
    try {
      const response = await productosApi.relacionados(id, 4);
      setRelacionados(response.data);
    } catch (err) {
      console.error("Error cargando productos relacionados:", err);
      // No es crítico, solo no mostramos relacionados
    } finally {
      setLoadingRelacionados(false);
    }
  };

  const handleAgregarAlCarrito = async () => {
    if (!isAuth) {
      navigate("/login", { state: { from: `/productos/${id}` } });
      return;
    }

    if (!producto) return;

    const stockDisponible = producto.stock_disponible ?? (producto.stock - (producto.stock_reserved || 0));
    
    if (cantidad < 1) {
      setMensaje({ type: "error", text: "La cantidad debe ser al menos 1" });
      return;
    }

    if (cantidad > stockDisponible) {
      setMensaje({ type: "error", text: `Solo hay ${stockDisponible} disponible${stockDisponible !== 1 ? "s" : ""}` });
      return;
    }

    setAgregando(true);
    setMensaje(null);

    const result = await agregarProducto(producto.id_producto, cantidad);
    
    if (result.success) {
      setMensaje({ type: "success", text: "Producto agregado al carrito" });
      setCantidad(1); // Resetear cantidad
      setTimeout(() => setMensaje(null), 3000);
    } else {
      setMensaje({
        type: "error",
        text: result.error || "Error al agregar al carrito. Por favor, intenta nuevamente.",
      });
    }
    
    setAgregando(false);
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="xl" />
        </div>
      </div>
    );
  }

  if (error || !producto) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert type="error" className="mb-4">
          {error || "Producto no encontrado"}
        </Alert>
        <Link to="/productos">
          <Button variant="outline">Volver al catálogo</Button>
        </Link>
      </div>
    );
  }

  const tienePromocion = producto.precio_promocional && producto.precio_promocional < producto.precio;
  const precioFinal = tienePromocion ? producto.precio_promocional : producto.precio;
  const stockDisponible = producto.stock_disponible ?? (producto.stock - (producto.stock_reserved || 0));
  const sinStock = stockDisponible <= 0;

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Mensaje de éxito/error */}
      {mensaje && (
        <Alert type={mensaje.type} className="mb-4" onClose={() => setMensaje(null)}>
          {mensaje.text}
        </Alert>
      )}

      {/* Botón volver */}
      <Link to="/productos" className="inline-block mb-4">
        <Button variant="ghost" size="sm">← Volver al catálogo</Button>
      </Link>

      {/* Detalle del producto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Imagen */}
        <div className="bg-base-crema rounded-lg overflow-hidden">
          {producto.imagen_url ? (
            <img
              src={producto.imagen_url}
              alt={producto.titulo}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = "/placeholder.jpg";
              }}
            />
          ) : (
            <div className="w-full h-96 flex items-center justify-center text-oscuro-azulMarino">
              <span className="text-8xl">📚</span>
            </div>
          )}
        </div>

        {/* Información */}
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold text-oscuro-azulMarino mb-2">
            {producto.titulo}
          </h1>
          <p className="text-xl text-gray-600 mb-4">por {producto.autor}</p>

          {producto.categoria && (
            <p className="text-sm text-gray-500 mb-4">
              Categoría: <span className="font-medium">{producto.categoria}</span>
            </p>
          )}

          {/* Precio */}
          <div className="mb-6">
            {tienePromocion ? (
              <div className="flex items-center gap-4">
                <span className="text-2xl text-gray-400 line-through">
                  ${producto.precio}
                </span>
                <span className="text-4xl font-bold text-acento-rojo">
                  ${precioFinal}
                </span>
                <span className="bg-acento-rojo text-white px-3 py-1 rounded text-sm font-bold">
                  🔥 OFERTA
                </span>
              </div>
            ) : (
              <span className="text-4xl font-bold text-acento-violetaManga">
                ${precioFinal}
              </span>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6">
            {sinStock ? (
              <p className="text-lg text-acento-rojo font-medium">✗ Sin stock disponible</p>
            ) : (
              <p className="text-lg text-green-600 font-medium">
                ✓ {stockDisponible} disponible{stockDisponible !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {/* Acciones según tipo de usuario */}
          {isAuth ? (
            isAdmin ? (
              /* Botón Editar para administradores */
              <div className="mb-6">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => navigate(`/admin/productos?editar=${id}`)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <FaEdit size={18} />
                  Editar Producto
                </Button>
              </div>
            ) : (
              /* Agregar al carrito solo para usuarios no admin */
              !sinStock && (
                <div className="mb-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-medium text-gray-700">Cantidad:</label>
                    <QuantitySelector
                      value={cantidad}
                      onChange={setCantidad}
                      max={Math.min(5, stockDisponible)}
                      min={1}
                      disabled={agregando || cartLoading}
                    />
                  </div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={handleAgregarAlCarrito}
                    disabled={sinStock || agregando || cartLoading || cantidad < 1 || cantidad > stockDisponible}
                    className="w-full flex items-center justify-center gap-2"
                  >
                    {agregando ? (
                      <>
                        <Loading size="sm" />
                        Agregando...
                      </>
                    ) : (
                      <>
                        <FaShoppingCart size={18} />
                        Agregar al carrito
                      </>
                    )}
                  </Button>
                </div>
              )
            )
          ) : (
            /* Mensaje para usuarios no logueados */
            !sinStock && (
              <div className="mb-6">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => navigate("/login", { state: { from: `/productos/${id}` } })}
                  className="w-full"
                >
                  Inicia sesión para agregar al carrito
                </Button>
              </div>
            )
          )}

          {/* Botón deshabilitado si no hay stock (solo para usuarios no admin) */}
          {sinStock && !isAdmin && (
            <Button
              variant="primary"
              size="lg"
              disabled
              className="w-full mb-4"
            >
              Sin stock
            </Button>
          )}

          {/* Descripción */}
          {producto.descripcion && (
            <Card className="mt-6">
              <h2 className="text-xl font-bold text-oscuro-azulMarino mb-3">
                Descripción
              </h2>
              <p className="text-gray-700 whitespace-pre-wrap">{producto.descripcion}</p>
            </Card>
          )}
        </div>
      </div>

      {/* Productos relacionados */}
      {relacionados.length > 0 && (
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-oscuro-azulMarino mb-6">
            📚 Productos Relacionados
          </h2>
          {loadingRelacionados ? (
            <div className="flex justify-center py-8">
              <Loading size="lg" />
            </div>
          ) : (
            <ProductGrid productos={relacionados} showStock={false} />
          )}
        </section>
      )}
    </div>
  );
};

export default ProductoDetailPage;
