import ProductCard from "./ProductCard.jsx";
import { Loading } from "../ui/index.js";

const ProductGrid = ({ productos, loading = false, showStock = false }) => {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loading size="lg" />
      </div>
    );
  }

  if (!productos || productos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-lg">No se encontraron productos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {productos.map((producto) => (
        <ProductCard key={producto.id_producto} producto={producto} showStock={showStock} />
      ))}
    </div>
  );
};

export default ProductGrid;

