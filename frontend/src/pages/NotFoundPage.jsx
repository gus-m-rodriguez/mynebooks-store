import { Link } from "react-router-dom";

const NotFoundPage = () => {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <p className="text-xl text-gray-600 mb-8">Página no encontrada</p>
      <Link
        to="/"
        className="bg-acento-violetaManga text-white px-6 py-3 rounded hover:bg-primary-600"
      >
        Volver al inicio
      </Link>
    </div>
  );
};

export default NotFoundPage;

