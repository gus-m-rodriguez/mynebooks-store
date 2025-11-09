import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { Card, Button, Alert } from "../ui/index.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";
import QuantitySelector from "./QuantitySelector.jsx";
import { FaShoppingCart, FaEdit } from "react-icons/fa";

const ProductCard = ({ producto, showStock = false }) => {
  const { isAuth, user } = useAuth();
  const { agregarProducto, loading: cartLoading } = useCart();
  const navigate = useNavigate();
  const isAdmin = user?.rol === "admin" || user?.rol === "super_admin";
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Calcular precio final (usar precio promocional si existe y es menor)
  const precioRegular = parseFloat(producto.precio) || 0;
  const precioPromocional = producto.precio_promocional ? parseFloat(producto.precio_promocional) : null;
  const tienePromocion = precioPromocional !== null && precioPromocional < precioRegular;
  const precioFinal = tienePromocion ? precioPromocional : precioRegular;
  const stockDisponible = producto.stock_disponible ?? (producto.stock - (producto.stock_reserved || 0));
  const sinStock = stockDisponible <= 0;
  const esUltimoDisponible = stockDisponible === 1;

  const handleAgregarAlCarrito = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuth) {
      setError("Debes iniciar sesión para agregar productos al carrito");
      return;
    }

    if (stockDisponible <= 0) {
      setError("No hay stock disponible");
      return;
    }

    if (cantidad < 1) {
      setError("La cantidad debe ser al menos 1");
      return;
    }

    if (cantidad > stockDisponible) {
      setError(`Solo hay ${stockDisponible} disponible${stockDisponible !== 1 ? "s" : ""}`);
      return;
    }

    setError(null);
    setSuccess(false);

    const result = await agregarProducto(producto.id_producto, cantidad);
    
    if (result.success) {
      setSuccess(true);
      setCantidad(1); // Resetear cantidad
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } else {
      setError(result.error || "Error al agregar producto al carrito");
    }
  };

  return (
    <Card className={`h-full transition-shadow duration-300 flex flex-col ${sinStock ? 'opacity-60 grayscale' : 'hover:shadow-lg'}`}>
      {/* Imagen - Link al detalle */}
      <Link to={`/productos/${producto.id_producto}`} className="block">
        <div className="relative w-full h-64 bg-base-crema rounded-t-lg overflow-hidden">
          {producto.imagen_url ? (
            <img
              src={producto.imagen_url}
              alt={producto.titulo}
              className={`w-full h-full object-cover ${sinStock ? 'grayscale' : ''}`}
              onError={(e) => {
                e.target.src = "/placeholder.jpg";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-oscuro-azulMarino">
              <span className="text-4xl">📚</span>
            </div>
          )}
          {/* Badges de estado del producto */}
          {sinStock && (
            <div className="absolute top-2 right-2 bg-gray-500 text-white px-2 py-1 rounded text-xs font-bold shadow-md z-10">
              Sin Stock Disponible
            </div>
          )}
          {!sinStock && tienePromocion && (
            <div className="absolute top-2 right-2 bg-acento-rojo text-white px-2 py-1 rounded text-xs font-bold shadow-md z-10">
              🔥 OFERTA
            </div>
          )}
          {!sinStock && esUltimoDisponible && (
            <div 
              className={`absolute bg-orange-500 text-white px-2 py-1 rounded text-xs font-bold shadow-md z-10 ${
                tienePromocion ? 'top-10 right-2' : 'top-2 right-2'
              }`}
            >
              ⚠️ ÚLTIMO DISPONIBLE
            </div>
          )}
        </div>
      </Link>

      {/* Contenido */}
      <div className={`p-4 flex flex-col flex-grow ${sinStock ? 'pointer-events-none' : ''}`}>
        {/* Título - Link al detalle */}
        <Link to={`/productos/${producto.id_producto}`}>
          <h3 className={`font-bold text-lg mb-1 line-clamp-2 transition-colors ${
            sinStock 
              ? 'text-gray-400' 
              : 'text-oscuro-azulMarino hover:text-acento-violetaManga'
          }`}>
            {producto.titulo}
          </h3>
        </Link>
        <p className={`text-sm mb-2 ${sinStock ? 'text-gray-400' : 'text-gray-600'}`}>
          {producto.autor}
        </p>
        {producto.categoria && (
          <p className={`text-xs mb-2 ${sinStock ? 'text-gray-400' : 'text-gray-500'}`}>
            {producto.categoria}
          </p>
        )}

        {/* Precio */}
        <div className="mt-auto mb-3">
          {tienePromocion ? (
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-sm line-through ${sinStock ? 'text-gray-400' : 'text-gray-400'}`}>
                ${precioRegular.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-lg font-bold ${sinStock ? 'text-gray-400' : 'text-acento-rojo'}`}>
                ${precioFinal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              {!sinStock && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                  ¡Oferta!
              </span>
              )}
            </div>
          ) : (
            <span className={`text-lg font-bold ${sinStock ? 'text-gray-400' : 'text-acento-violetaManga'}`}>
              ${precioFinal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          )}
        </div>

        {/* Stock - Mostrar para todos los usuarios */}
          <div className="mb-3">
            {stockDisponible > 0 ? (
              <p className="text-xs text-green-600">
                ✓ {stockDisponible} disponible{stockDisponible !== 1 ? "s" : ""}
              </p>
            ) : (
            <p className="text-xs text-gray-500 italic">
              Habrá más próximamente
            </p>
            )}
          </div>

        {/* Acciones según tipo de usuario */}
        {isAuth && (
          <div className="mt-auto space-y-2">
            {isAdmin ? (
              /* Botón Editar para administradores */
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/admin/productos?editar=${producto.id_producto}`);
                }}
                className="w-full flex items-center justify-center gap-2"
              >
                <FaEdit size={14} />
                Editar Producto
              </Button>
            ) : (
              /* Agregar al carrito solo para usuarios no admin y con stock */
              stockDisponible > 0 && (
                <>
            <div className="flex items-center gap-2">
              <QuantitySelector
                value={cantidad}
                onChange={setCantidad}
                max={Math.min(5, stockDisponible)}
                min={1}
                disabled={cartLoading}
              />
              <Button
                variant="primary"
                size="sm"
                onClick={handleAgregarAlCarrito}
                disabled={cartLoading || cantidad < 1 || cantidad > stockDisponible}
                className="flex-1 flex items-center justify-center gap-2"
              >
                <FaShoppingCart size={14} />
                {cartLoading ? "Agregando..." : "Agregar"}
              </Button>
            </div>

            {/* Mensajes de error/éxito */}
            {error && (
              <Alert type="error" className="text-xs py-1">
                {error}
              </Alert>
            )}
            {success && (
              <Alert type="success" className="text-xs py-1">
                ✓ Producto agregado al carrito
              </Alert>
            )}
                </>
              )
            )}
          </div>
        )}

        {/* Mensaje para productos sin stock disponible */}
        {sinStock && (
          <div className="mt-auto text-xs text-gray-500 text-center py-2 italic">
            No disponible por el momento
          </div>
        )}

        {/* Mensaje para usuarios no logueados con stock disponible */}
        {!isAuth && stockDisponible > 0 && (
          <div className="mt-auto text-xs text-gray-500 text-center py-2">
            Inicia sesión para agregar al carrito
          </div>
        )}
      </div>
    </Card>
  );
};

export default ProductCard;
