import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../../context/CartContext.jsx";
import { Button, Alert } from "../ui/index.js";
import { FaTrash, FaPlus, FaMinus } from "react-icons/fa";

const CartItem = ({ item, disponible = true }) => {
  const { actualizarCantidad, eliminarProducto, loading } = useCart();
  const stockDisponible = item.cantidad_disponible || item.stock_disponible || 0;
  const cantidad = parseInt(item.cantidad) || 0;
  const cantidadExcedeStock = disponible && cantidad > stockDisponible;
  
  // Inicializar localCantidad: si excede stock, usar el disponible; si no, usar la cantidad del item
  const [localCantidad, setLocalCantidad] = useState(
    cantidadExcedeStock ? stockDisponible : cantidad
  );
  const [isUpdating, setIsUpdating] = useState(false);

  // Actualizar localCantidad cuando cambia el item o el stock disponible
  useEffect(() => {
    if (cantidadExcedeStock) {
      setLocalCantidad(stockDisponible);
    } else {
      setLocalCantidad(cantidad);
    }
  }, [item.cantidad, stockDisponible, cantidadExcedeStock]);

  const handleCantidadChange = async (nuevaCantidad) => {
    if (!disponible) return; // No permitir cambios si no está disponible
    
    if (nuevaCantidad < 1) return;
    if (nuevaCantidad > item.cantidad_disponible) {
      setLocalCantidad(item.cantidad_disponible);
      return;
    }

    setLocalCantidad(nuevaCantidad);
    setIsUpdating(true);
    const result = await actualizarCantidad(item.producto_id, nuevaCantidad);
    setIsUpdating(false);
    
    if (result.success) {
      // El carrito se recargará automáticamente desde el context
    } else {
      // Revertir cambio si falla
      setLocalCantidad(item.cantidad);
    }
  };

  const handleEliminar = async () => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este producto del carrito?")) {
      await eliminarProducto(item.producto_id);
    }
  };

  // Calcular precio final (usar precio promocional si existe y es menor)
  const precioRegular = parseFloat(item.precio) || 0;
  const precioPromocional = item.precio_promocional ? parseFloat(item.precio_promocional) : null;
  const precioFinal = precioPromocional && precioPromocional < precioRegular 
    ? precioPromocional 
    : precioRegular;
  const tieneDescuento = precioPromocional && precioPromocional < precioRegular;
  
  const subtotal = precioFinal * (cantidadExcedeStock ? stockDisponible : cantidad);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 md:p-6 ${!disponible ? 'opacity-60 grayscale' : ''}`}>
      {/* Alerta si hay problemas de stock */}
      {!disponible && (
        <Alert type="warning" className="mb-4">
          Este producto no tiene stock disponible y será eliminado del carrito
        </Alert>
      )}
      {cantidadExcedeStock && (
        <Alert type="warning" className="mb-4">
          La cantidad solicitada ({cantidad}) excede el stock disponible ({stockDisponible}). Por favor, ten en cuenta que se auto ajustó la cantidad al disponible.
        </Alert>
      )}
      {disponible && !cantidadExcedeStock && item.requiere_atencion && (
        <Alert type="warning" className="mb-4">
          {item.mensaje_estado || "Este producto requiere atención"}
        </Alert>
      )}

      <div className={`flex flex-col md:flex-row gap-4 ${!disponible ? 'pointer-events-none' : ''}`}>
        {/* Imagen */}
        <div className="flex-shrink-0 w-full md:w-32 h-32 bg-gray-100 rounded-lg overflow-hidden">
          {item.imagen_url ? (
            <img
              src={item.imagen_url}
              alt={item.titulo}
              className={`w-full h-full object-cover ${!disponible ? 'grayscale' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              📚
            </div>
          )}
        </div>

        {/* Información del producto */}
        <div className="flex-1 min-w-0">
          <div className="block mb-2">
            <h3 className={`text-lg font-semibold ${disponible ? 'text-oscuro-azulMarino' : 'text-gray-400'}`}>
              {item.titulo}
            </h3>
            <p className={`text-sm ${disponible ? 'text-gray-600' : 'text-gray-400'}`}>{item.autor}</p>
          </div>

          {/* Precio y stock */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              {tieneDescuento && (
                <p className={`text-lg line-through ${disponible ? 'text-gray-400' : 'text-gray-300'}`}>
                  ${precioRegular.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              )}
              <p className={`text-xl font-bold ${disponible ? 'text-acento-violetaManga' : 'text-gray-400'}`}>
                ${precioFinal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
              {tieneDescuento && disponible && (
                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-semibold">
                  ¡Oferta!
                </span>
              )}
            </div>
            {disponible && (
              <p className={`text-sm ${cantidadExcedeStock ? 'text-yellow-600 font-semibold' : 'text-gray-600'}`}>
                Stock disponible: {stockDisponible}
                {cantidadExcedeStock && ` (Solicitado: ${cantidad})`}
              </p>
            )}
            {!disponible && (
              <p className="text-sm text-red-600 font-semibold">
                Sin stock disponible
            </p>
            )}
          </div>
        </div>

        {/* Controles de cantidad y eliminar */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-4">
          {/* Controles de cantidad - Mostrar si está disponible o si excede stock (para permitir ajuste) */}
          {(disponible || cantidadExcedeStock) && (
          <div className="flex items-center gap-2">
              {/* Botón disminuir - Deshabilitado si excede stock */}
            <button
              onClick={() => handleCantidadChange(cantidad - 1)}
                disabled={isUpdating || loading || cantidad <= 1 || cantidadExcedeStock}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Disminuir cantidad"
            >
              <FaMinus size={14} />
            </button>
            
              {/* Input de cantidad - Habilitado si hay stock disponible (incluso si excede) */}
            <input
              type="number"
              min="1"
                max={stockDisponible}
              value={localCantidad}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                  // Limitar al máximo disponible
                  const valLimitado = Math.min(Math.max(1, val), stockDisponible);
                  setLocalCantidad(valLimitado);
              }}
              onBlur={(e) => {
                const val = parseInt(e.target.value) || 1;
                  // Asegurar que no exceda el disponible
                  const valLimitado = Math.min(Math.max(1, val), stockDisponible);
                  handleCantidadChange(valLimitado);
              }}
                disabled={isUpdating || loading || !disponible}
                className={`w-16 px-2 py-1 text-center border rounded-md focus:outline-none focus:ring-2 disabled:opacity-50 ${
                  cantidadExcedeStock 
                    ? 'border-yellow-500 bg-yellow-50 focus:ring-yellow-500' 
                    : 'border-gray-300 focus:ring-acento-violetaManga'
                }`}
              />
              
              {/* Botón aumentar - Deshabilitado si excede stock o alcanza el máximo */}
            <button
              onClick={() => handleCantidadChange(cantidad + 1)}
                disabled={isUpdating || loading || cantidad >= stockDisponible || cantidadExcedeStock}
              className="p-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Aumentar cantidad"
            >
              <FaPlus size={14} />
            </button>
          </div>
          )}

          {/* Subtotal - Solo mostrar si está disponible y NO excede stock */}
          {disponible && !cantidadExcedeStock && (
          <div className="text-right">
            <p className="text-sm text-gray-600">Subtotal</p>
            <p className="text-lg font-bold text-oscuro-azulMarino">
              ${subtotal.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          )}

          {/* Botón eliminar - Siempre habilitado */}
          <button
            onClick={handleEliminar}
            disabled={isUpdating || loading}
            className={`p-2 text-red-500 hover:bg-red-50 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${!disponible ? 'pointer-events-auto' : ''}`}
            aria-label="Eliminar producto"
            style={{ pointerEvents: 'auto' }}
          >
            <FaTrash size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CartItem;

