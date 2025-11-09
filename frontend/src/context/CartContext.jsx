import { createContext, useState, useContext, useEffect } from "react";
import { useAuth } from "./AuthContext.jsx";
import { carritoApi } from "../api/carrito.api.js";

export const cartContext = createContext();

export const useCart = () => {
  const context = useContext(cartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

export function CartProvider({ children }) {
  const { isAuth } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hayProductosSinStock, setHayProductosSinStock] = useState(false);
  const [mensajeEstado, setMensajeEstado] = useState(null);

  // Cargar carrito al montar el componente solo si está autenticado
  useEffect(() => {
    if (isAuth) {
      cargarCarrito();
    } else {
      // Limpiar carrito si no está autenticado
      setItems([]);
      setHayProductosSinStock(false);
      setMensajeEstado(null);
      setError(null);
    }
  }, [isAuth]);

  const cargarCarrito = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await carritoApi.obtener();
      setItems(res.data.items || []);
      setHayProductosSinStock(res.data.hay_productos_sin_stock || false);
      setMensajeEstado(res.data.mensaje || null);
    } catch (err) {
      console.error("Error cargando carrito:", err);
      // Si es 401, el usuario no está autenticado, no es un error del carrito
      if (err.response?.status !== 401) {
        setError(err.response?.data?.message || "Error al cargar el carrito");
      }
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const agregarProducto = async (productoId, cantidad = 1) => {
    if (!isAuth) {
      return { success: false, error: "Debes iniciar sesión para agregar productos al carrito" };
    }
    
    setLoading(true);
    setError(null);
    try {
      await carritoApi.agregar({ producto_id: productoId, cantidad });
      // Recargar carrito para obtener datos actualizados
      await cargarCarrito();
      return { success: true };
    } catch (err) {
      console.error("Error agregando producto:", err);
      const errorMessage = err.response?.data?.message || "Error al agregar producto al carrito";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const actualizarCantidad = async (productoId, cantidad) => {
    if (!isAuth) {
      return { success: false, error: "Debes iniciar sesión" };
    }
    
    setLoading(true);
    setError(null);
    try {
      await carritoApi.actualizarCantidad(productoId, cantidad);
      // Recargar carrito para obtener datos actualizados
      await cargarCarrito();
      return { success: true };
    } catch (err) {
      console.error("Error actualizando cantidad:", err);
      const errorMessage = err.response?.data?.message || "Error al actualizar la cantidad";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const eliminarProducto = async (productoId) => {
    if (!isAuth) {
      return { success: false, error: "Debes iniciar sesión" };
    }
    
    setLoading(true);
    setError(null);
    try {
      await carritoApi.eliminar(productoId);
      // Recargar carrito para obtener datos actualizados
      await cargarCarrito();
      return { success: true };
    } catch (err) {
      console.error("Error eliminando producto:", err);
      const errorMessage = err.response?.data?.message || "Error al eliminar producto";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const vaciarCarrito = async () => {
    if (!isAuth) {
      return { success: false, error: "Debes iniciar sesión" };
    }
    
    setLoading(true);
    setError(null);
    try {
      await carritoApi.vaciar();
      setItems([]);
      setHayProductosSinStock(false);
      setMensajeEstado(null);
      return { success: true };
    } catch (err) {
      console.error("Error vaciando carrito:", err);
      const errorMessage = err.response?.data?.message || "Error al vaciar el carrito";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales
  const calcularTotal = () => {
    return items.reduce((total, item) => {
      // Usar precio promocional si existe y es menor que el precio regular
      const precioRegular = parseFloat(item.precio) || 0;
      const precioPromocional = item.precio_promocional ? parseFloat(item.precio_promocional) : null;
      const precioFinal = precioPromocional && precioPromocional < precioRegular 
        ? precioPromocional 
        : precioRegular;
      const cantidad = parseInt(item.cantidad) || 0;
      return total + precioFinal * cantidad;
    }, 0);
  };

  const calcularCantidadTotal = () => {
    return items.reduce((total, item) => {
      return total + (parseInt(item.cantidad) || 0);
    }, 0);
  };

  return (
    <cartContext.Provider
      value={{
        items,
        loading,
        error,
        hayProductosSinStock,
        mensajeEstado,
        cargarCarrito,
        agregarProducto,
        actualizarCantidad,
        eliminarProducto,
        vaciarCarrito,
        calcularTotal,
        calcularCantidadTotal,
        setError,
      }}
    >
      {children}
    </cartContext.Provider>
  );
}

