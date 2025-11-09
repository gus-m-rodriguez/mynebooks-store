import { Link, useNavigate } from "react-router-dom";
import { FaSearch, FaShoppingCart, FaChevronDown, FaChevronRight, FaClock, FaTruck, FaHistory } from "react-icons/fa";
import { useState } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { useCart } from "../../context/CartContext.jsx";

export default function Navbar() {
  const { isAuth, user, signout } = useAuth();
  const { calcularCantidadTotal } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOrdenesSubmenuOpen, setIsOrdenesSubmenuOpen] = useState(false);
  const navigate = useNavigate();
  
  const isAdmin = user?.rol === "admin" || user?.rol === "super_admin";
  const cantidadCarrito = calcularCantidadTotal();
  
  const handleSignout = async () => {
    await signout();
    navigate("/");
    setIsMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim() !== "") {
      navigate(`/productos?q=${encodeURIComponent(searchQuery.trim())}&from=navbar`);
      setSearchQuery("");
    }
  };

  return (
    <header className="w-full bg-white shadow-sm sticky top-0 z-50">
      {/* DESKTOP NAVBAR */}
      <nav className="hidden md:grid grid-cols-[auto_1fr_auto] items-center gap-6 px-6 lg:px-8 py-3">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Link
            to="/"
            className="text-xl font-bold text-acento-violetaManga whitespace-nowrap flex items-center gap-1"
          >
            📚 MyneBooks Store
          </Link>
        </div>

        {/* Buscador centrado */}
        <div className="col-start-2 flex justify-center min-w-0">
          <form
            onSubmit={handleSearch}
            style={{ width: "clamp(600px, 60vw, 960px)" }}
            className="w-full"
          >
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="¿Qué estás buscando?"
                className="w-full h-10 pl-4 pr-10 rounded-full bg-slate-50 border border-slate-200 shadow-inner
                focus:outline-none focus:ring-2 focus:ring-acento-violetaManga/40 focus:border-acento-violetaManga
                text-sm text-oscuro-azulMarino placeholder-slate-400"
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-acento-violetaManga focus:outline-none"
                aria-label="Buscar"
              >
                <FaSearch size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Botones derecha */}
        <div className="flex items-center gap-3 text-sm whitespace-nowrap">
          {isAuth ? (
            <>
              {!isAdmin && (
            <>
              <Link
                to="/carrito"
                className="relative text-oscuro-azulMarino hover:text-acento-violetaManga flex items-center gap-1"
              >
                <FaShoppingCart size={18} />
                {cantidadCarrito > 0 && (
                  <span className="absolute -top-2 -right-2 bg-acento-rojo text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cantidadCarrito > 9 ? "9+" : cantidadCarrito}
                  </span>
                )}
              </Link>
              <Link
                to="/ordenes"
                className="text-oscuro-azulMarino hover:text-acento-violetaManga"
              >
                Mis Órdenes
              </Link>
                </>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className="text-oscuro-azulMarino hover:text-acento-violetaManga"
                >
                  Administracion
                </Link>
              )}
              <Link
                to="/perfil"
                className="text-oscuro-azulMarino hover:text-acento-violetaManga"
              >
                {user?.nombre}
              </Link>
              <button
                onClick={handleSignout}
                className="text-oscuro-azulMarino hover:text-acento-violetaManga"
              >
                Salir
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-oscuro-azulMarino hover:text-acento-violetaManga"
              >
                Iniciar Sesión
              </Link>
              <Link
                to="/register"
                className="bg-acento-violetaManga text-white px-2.5 py-1.5 rounded-lg hover:bg-acento-violetaManga/90 transition-colors"
              >
                Registrarse
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* SUB-NAVBAR Desktop */}
      <div className="hidden md:flex justify-center bg-gray-50 border-t border-gray-100 py-2 gap-10 text-sm">
        <Link
          to="/catalogo"
          className="text-oscuro-azulMarino hover:text-acento-violetaManga transition-colors"
        >
          Ver Catálogo Completo
        </Link>
        <Link
          to="/destacados"
          className="text-oscuro-azulMarino hover:text-acento-violetaManga transition-colors"
        >
          Destacados
        </Link>
        <Link
          to="/novedades"
          className="text-oscuro-azulMarino hover:text-acento-violetaManga transition-colors"
        >
          Novedades
        </Link>
        <Link
          to="/promociones"
          className="text-oscuro-azulMarino hover:text-acento-violetaManga transition-colors"
        >
          Promociones
        </Link>
      </div>

      {/* MOBILE NAVBAR */}
      <div className="md:hidden">
        <div className="px-4">
          {/* Top Bar */}
          <div className="flex justify-between items-center h-16">
            <Link
              to="/"
              className="text-lg font-bold text-acento-violetaManga"
              onClick={() => setIsMenuOpen(false)}
            >
              📚 MyneBooks Store
            </Link>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-oscuro-azulMarino hover:text-acento-violetaManga focus:outline-none"
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {isMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Buscador Mobile */}
          <div className="pb-2">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="¿Qué estás buscando?"
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent text-oscuro-azulMarino"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-acento-violetaManga focus:outline-none"
                  aria-label="Buscar"
                >
                  <FaSearch size={18} />
                </button>
              </div>
            </form>
          </div>

          {/* Sub-navbar Mobile */}
          <div className="flex justify-between text-sm border-t border-gray-100 pt-2 pb-1 text-oscuro-azulMarino">
            <Link to="/catalogo" className="hover:text-acento-violetaManga">Catálogo</Link>
            <Link to="/destacados" className="hover:text-acento-violetaManga">Destacados</Link>
            <Link to="/novedades" className="hover:text-acento-violetaManga">Novedades</Link>
            <Link to="/promociones" className="hover:text-acento-violetaManga">Promos</Link>
          </div>
        </div>

        {/* Sidebar Mobile */}
        {isMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMenuOpen(false)}
          >
            <div
              className="fixed right-0 top-0 h-full w-64 bg-white shadow-xl z-50 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 space-y-4">
                <div className="border-b border-gray-200 pb-4">
                  <Link
                    to="/"
                    className="text-xl font-bold text-acento-violetaManga block"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    📚 MyneBooks Store
                  </Link>
                </div>

                <div className="space-y-2">
                  <Link
                    to="/catalogo"
                    className="block px-4 py-2 text-oscuro-azulMarino hover:bg-base-crema rounded"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Ver Catálogo Completo
                  </Link>

                  {isAuth ? (
                    <>
                      {!isAdmin && (
                    <>
                      <Link
                        to="/carrito"
                        className="block px-4 py-2 text-oscuro-azulMarino hover:bg-base-crema rounded relative"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <span className="flex items-center gap-2">
                          🛒 Carrito
                          {cantidadCarrito > 0 && (
                            <span className="bg-acento-rojo text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {cantidadCarrito > 9 ? "9+" : cantidadCarrito}
                            </span>
                          )}
                            </span>
                          </Link>
                          <div>
                            <button
                              onClick={() => setIsOrdenesSubmenuOpen(!isOrdenesSubmenuOpen)}
                              className="w-full flex items-center justify-between px-4 py-2 text-oscuro-azulMarino hover:bg-base-crema rounded"
                            >
                              <span>Mis Órdenes</span>
                              {isOrdenesSubmenuOpen ? (
                                <FaChevronDown size={12} />
                              ) : (
                                <FaChevronRight size={12} />
                              )}
                            </button>
                            {isOrdenesSubmenuOpen && (
                              <div className="ml-4 mt-1 space-y-1">
                                <Link
                                  to="/ordenes?grupo=mas_tarde"
                                  className="block px-4 py-2 text-sm text-oscuro-azulMarino hover:bg-base-crema rounded"
                                  onClick={() => {
                                    setIsMenuOpen(false);
                                    setIsOrdenesSubmenuOpen(false);
                                  }}
                                >
                                  <span className="flex items-center gap-2">
                                    <FaClock size={12} className="text-yellow-600" />
                                    Más tarde
                                  </span>
                                </Link>
                                <Link
                                  to="/ordenes?grupo=en_camino"
                                  className="block px-4 py-2 text-sm text-oscuro-azulMarino hover:bg-base-crema rounded"
                                  onClick={() => {
                                    setIsMenuOpen(false);
                                    setIsOrdenesSubmenuOpen(false);
                                  }}
                                >
                                  <span className="flex items-center gap-2">
                                    <FaTruck size={12} className="text-blue-600" />
                                    En Camino
                        </span>
                      </Link>
                      <Link
                                  to="/ordenes?grupo=historial"
                                  className="block px-4 py-2 text-sm text-oscuro-azulMarino hover:bg-base-crema rounded"
                                  onClick={() => {
                                    setIsMenuOpen(false);
                                    setIsOrdenesSubmenuOpen(false);
                                  }}
                                >
                                  <span className="flex items-center gap-2">
                                    <FaHistory size={12} className="text-gray-600" />
                                    Historial
                                  </span>
                      </Link>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="block px-4 py-2 text-oscuro-azulMarino hover:bg-base-crema rounded"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          Admin
                        </Link>
                      )}
                      <Link
                        to="/perfil"
                        className="block px-4 py-2 text-oscuro-azulMarino hover:bg-base-crema rounded"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        {user?.nombre}
                      </Link>
                      <button
                        onClick={handleSignout}
                        className="w-full text-left px-4 py-2 text-oscuro-azulMarino hover:bg-base-crema rounded"
                      >
                        Salir
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="block px-4 py-2 text-oscuro-azulMarino hover:bg-base-crema rounded"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Iniciar Sesión
                      </Link>
                      <Link
                        to="/register"
                        className="block px-4 py-2 bg-acento-violetaManga text-white rounded text-center hover:bg-primary-600"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Registrarse
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
