import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import { FaFilter } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import { adminApi } from "../api/admin.api.js";
import { productosApi } from "../api/productos.api.js";
import { ProductGrid, ProductFilters } from "../components/productos/index.js";
import { Alert, Loading, Card } from "../components/ui/index.js";
import { Button } from "../components/ui/index.js";

const ProductosPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [permisos, setPermisos] = useState([]);
  const [loadingPermisos, setLoadingPermisos] = useState(true);
  
  // Detectar tipo de filtro desde la ruta
  const getFilterType = () => {
    const path = location.pathname;
    if (path === "/novedades") return "novedades";
    if (path === "/promociones") return "promociones";
    if (path === "/destacados") return "destacados";
    // /catalogo y /productos son catálogo general
    if (path === "/catalogo" || path === "/productos") return "general";
    return "general";
  };

  const filterType = getFilterType();
  
  const [filters, setFilters] = useState({
    categoria: searchParams.get("categoria") || "",
    autor: searchParams.get("autor") || "",
    precio_min: searchParams.get("precio_min") || "",
    precio_max: searchParams.get("precio_max") || "",
    ordenar: searchParams.get("ordenar") || "titulo_asc",
  });
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get("page")) || 1);
  const [totalProductos, setTotalProductos] = useState(0);
  const productosPorPagina = 12;
  
  // Estado para mostrar/ocultar filtros en mobile
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);

  // Verificar si es super admin (tiene todos los permisos)
  const esSuperAdmin = user?.rol === "super_admin" || user?.es_super_admin;

  // Cargar permisos si es admin
  useEffect(() => {
    if (user?.rol === "admin" || user?.rol === "super_admin") {
      cargarPermisos();
    } else {
      setLoadingPermisos(false);
    }
  }, [user]);

  const cargarPermisos = async () => {
    try {
      if (esSuperAdmin) {
        // Super admin tiene todos los permisos
        setPermisos(["Dashboard", "Productos", "Ordenes", "Usuarios", "Ingresos", "Auditoria"]);
      } else if (user?.rol === "admin") {
        // Obtener permisos del usuario
        if (user.permisos && Array.isArray(user.permisos)) {
          const nombresPermisos = user.permisos.map(p => 
            typeof p === 'string' ? p : p.nombre_permiso
          );
          setPermisos(nombresPermisos);
        } else {
          // Si no vienen en el usuario, obtener desde la API
          try {
            const res = await adminApi.obtenerUsuario(user.id_usuario);
            if (res.data?.permisos) {
              const nombresPermisos = res.data.permisos.map(p => 
                typeof p === 'string' ? p : p.nombre_permiso
              );
              setPermisos(nombresPermisos);
            }
          } catch (err) {
            console.error("Error obteniendo permisos:", err);
            setPermisos([]);
          }
        }
      }
    } catch (error) {
      console.error("Error cargando permisos:", error);
      setPermisos([]);
    } finally {
      setLoadingPermisos(false);
    }
  };

  const tienePermiso = (permiso) => {
    return esSuperAdmin || permisos.includes(permiso);
  };

  // Verificar si el admin tiene permiso para ver productos
  const puedeVerProductos = () => {
    // Si no es admin, puede ver productos
    if (user?.rol !== "admin" && user?.rol !== "super_admin") {
      return true;
    }
    // Si es admin, necesita permiso "Productos"
    return tienePermiso("Productos");
  };

  // Sincronizar searchQuery con la URL cuando cambia (solo lectura desde URL)
  useEffect(() => {
    const urlQuery = searchParams.get("q") || "";
    // Solo actualizar si es diferente
    if (urlQuery !== searchQuery) {
      setSearchQuery(urlQuery);
      setCurrentPage(1); // Resetear página cuando cambia la búsqueda desde URL
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Depender de searchParams completo para detectar cambios

  // Cargar productos solo si tiene permisos
  useEffect(() => {
    if (!loadingPermisos && puedeVerProductos()) {
      cargarProductos();
    } else if (!loadingPermisos && !puedeVerProductos()) {
      setLoading(false);
    }
  }, [filters, searchQuery, currentPage, filterType, loadingPermisos]);

  const cargarProductos = async () => {
    setLoading(true);
    setError(null);

    try {
      let response;
      
      // Si hay búsqueda, usar endpoint de búsqueda
      if (searchQuery) {
        // Verificar si la búsqueda viene del Navbar (no de los filtros)
        const fromNavbar = searchParams.get("from") === "navbar";
        
        // Si viene del Navbar, verificar si hay un solo resultado
        if (fromNavbar && currentPage === 1) {
          // Primero buscar sin límite para ver cuántos resultados hay
          const searchResponse = await productosApi.buscar(searchQuery, {});
          const allResults = searchResponse.data || [];
          
          // Si hay exactamente un resultado y no hay filtros aplicados, redirigir al detalle
          if (allResults.length === 1 && 
              !filters.categoria && 
              !filters.autor && 
              !filters.precio_min && 
              !filters.precio_max) {
            navigate(`/productos/${allResults[0].id_producto}`);
            return; // Salir temprano, no necesitamos cargar más
          }
          
          // Si hay más de un resultado, establecer el total y continuar
          setTotalProductos(allResults.length);
        }
        
        // Aplicar paginación y filtros (limpiar valores vacíos)
        const params = {
          limite: productosPorPagina,
          offset: (currentPage - 1) * productosPorPagina,
        };
        // Solo agregar filtros que tengan valor
        if (filters.categoria && filters.categoria.trim()) {
          params.categoria = filters.categoria.trim();
        }
        if (filters.autor && filters.autor.trim()) {
          params.autor = filters.autor.trim();
        }
        if (filters.precio_min && filters.precio_min.trim()) {
          params.precio_min = filters.precio_min.trim();
        }
        if (filters.precio_max && filters.precio_max.trim()) {
          params.precio_max = filters.precio_max.trim();
        }
        if (filters.ordenar) {
          params.ordenar = filters.ordenar;
        }
        response = await productosApi.buscar(searchQuery, params);
        
        // Si no viene del Navbar o ya establecimos el total, no hacer nada más
        if (!fromNavbar || currentPage !== 1) {
          // Estimar total si no se estableció antes
          if (filterType === "general" && response.data.length < productosPorPagina) {
            setTotalProductos((currentPage - 1) * productosPorPagina + response.data.length);
          } else if (filterType === "general" && !fromNavbar) {
            setTotalProductos(currentPage * productosPorPagina + 1);
          }
        }
      } 
      // Si hay filtro especial (novedades, promociones, destacados)
      else if (filterType === "novedades") {
        // Novedades: usar endpoint específico
        // Obtener más productos para poder paginar
        const limiteTotal = currentPage * productosPorPagina;
        const novedadesRes = await productosApi.novedades(limiteTotal);
        const allNovedades = novedadesRes.data || [];
        // Paginación manual
        const startIndex = (currentPage - 1) * productosPorPagina;
        const endIndex = startIndex + productosPorPagina;
        response = { data: allNovedades.slice(startIndex, endIndex) };
        setTotalProductos(allNovedades.length);
      } 
      else if (filterType === "promociones") {
        // Promociones: usar endpoint específico
        // Obtener más productos para poder paginar
        const limiteTotal = currentPage * productosPorPagina;
        const promocionesRes = await productosApi.promociones(limiteTotal);
        const allPromociones = promocionesRes.data || [];
        // Paginación manual
        const startIndex = (currentPage - 1) * productosPorPagina;
        const endIndex = startIndex + productosPorPagina;
        response = { data: allPromociones.slice(startIndex, endIndex) };
        setTotalProductos(allPromociones.length);
      } 
      else if (filterType === "destacados") {
        // Destacados: combinar promociones + novedades + aleatorios (similar a HomePage)
        const [promocionesRes, novedadesRes, generalRes] = await Promise.all([
          productosApi.promociones(20),
          productosApi.novedades(20),
          productosApi.listar({ limite: 20 }),
        ]);
        
        const promociones = promocionesRes.data || [];
        const novedades = novedadesRes.data || [];
        const aleatorios = generalRes.data || [];
        
        // Combinar y eliminar duplicados
        const destacadosMap = new Map();
        [...promociones, ...novedades, ...aleatorios].forEach((producto) => {
          if (!destacadosMap.has(producto.id)) {
            destacadosMap.set(producto.id, producto);
          }
        });
        
        const destacados = Array.from(destacadosMap.values());
        // Mezclar aleatoriamente
        const shuffled = destacados.sort(() => Math.random() - 0.5);
        
        // Paginación manual
        const startIndex = (currentPage - 1) * productosPorPagina;
        const endIndex = startIndex + productosPorPagina;
        response = { data: shuffled.slice(startIndex, endIndex) };
        setTotalProductos(shuffled.length);
      } 
      else {
        // Catálogo general: usar endpoint de listado (limpiar valores vacíos)
        const params = {
          limite: productosPorPagina,
          offset: (currentPage - 1) * productosPorPagina,
        };
        // Solo agregar filtros que tengan valor
        if (filters.categoria && filters.categoria.trim()) {
          params.categoria = filters.categoria.trim();
        }
        if (filters.autor && filters.autor.trim()) {
          params.autor = filters.autor.trim();
        }
        if (filters.precio_min && filters.precio_min.trim()) {
          params.precio_min = filters.precio_min.trim();
        }
        if (filters.precio_max && filters.precio_max.trim()) {
          params.precio_max = filters.precio_max.trim();
        }
        if (filters.ordenar) {
          params.ordenar = filters.ordenar;
        }
        response = await productosApi.listar(params);
      }

      setProductos(response.data);
      
      // Estimar total (en producción, el backend debería devolver esto)
      // Para destacados, novedades y promociones ya se estableció arriba
      if (filterType === "general" && response.data.length < productosPorPagina) {
        setTotalProductos((currentPage - 1) * productosPorPagina + response.data.length);
      } else if (filterType === "general") {
        // Estimación: asumimos que hay más páginas
        setTotalProductos(currentPage * productosPorPagina + 1);
      }

      // Actualizar URL sin recargar
      const newParams = new URLSearchParams();
      if (searchQuery) {
        newParams.set("q", searchQuery);
        // Mantener el parámetro "from=navbar" solo si viene del Navbar y no hay filtros
        const fromNavbar = searchParams.get("from") === "navbar";
        if (fromNavbar && !filters.categoria && !filters.autor && !filters.precio_min && !filters.precio_max) {
          newParams.set("from", "navbar");
        }
      }
      Object.entries(filters).forEach(([key, value]) => {
        if (value) newParams.set(key, value);
      });
      if (currentPage > 1) newParams.set("page", currentPage.toString());
      setSearchParams(newParams);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError(
        err.response?.data?.message || "Error al cargar los productos. Por favor, intenta nuevamente."
      );
      setProductos([]);
    } finally {
      setLoading(false);
    }
  };

  // Obtener título según el tipo de filtro
  const getTitle = () => {
    switch (filterType) {
      case "novedades":
        return "📚 Novedades";
      case "promociones":
        return "🔥 Promociones";
      case "destacados":
        return "⭐ Destacados";
      default:
        return "📚 Catálogo de Productos";
    }
  };

  const handleFilterChange = useCallback((newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Resetear a primera página
    // Ocultar filtros en mobile después de aplicar
    setShowFiltersMobile(false);
  }, []);

  const handleSearch = useCallback((query) => {
    setSearchQuery(query);
    setCurrentPage(1); // Resetear a primera página
    // Ocultar filtros en mobile después de aplicar
    setShowFiltersMobile(false);
  }, []);

  const totalPages = Math.ceil(totalProductos / productosPorPagina);

  // Memoizar initialFilters antes de cualquier return condicional
  const initialFilters = useMemo(() => ({ ...filters, search: searchQuery }), [
    // Solo incluir valores que vienen de la URL o cambios externos, no del estado interno
    searchParams.get("categoria"),
    searchParams.get("autor"),
    searchParams.get("precio_min"),
    searchParams.get("precio_max"),
    searchParams.get("ordenar"),
    searchParams.get("q"),
  ]);

  // Si está cargando permisos, mostrar loading
  if (loadingPermisos) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  // Si es admin y no tiene permiso para ver productos, mostrar mensaje
  if (user?.rol === "admin" && !puedeVerProductos()) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          <Card className="p-8 max-w-md text-center">
            <div className="text-6xl mb-4">🔒</div>
            <h2 className="text-2xl font-bold text-oscuro-azulMarino mb-4">
              Sin Permisos Asignados
            </h2>
            <p className="text-gray-600 mb-6">
              No tienes permisos asignados para acceder al catálogo de productos.
              Por favor, contacta al Super Administrador para que te asigne los permisos necesarios.
            </p>
            <Alert type="info">
              Solo puedes ver el dashboard, pero no tienes acceso a ninguna funcionalidad administrativa.
            </Alert>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Título y breadcrumb */}
      <div className="mb-6">
        <nav className="text-sm text-gray-600 mb-2">
          <span>Inicio</span>
          <span className="mx-2">/</span>
          <span className="text-oscuro-azulMarino font-medium">{getTitle().replace(/[📚🔥⭐]/g, "").trim()}</span>
        </nav>
        <h1 className="text-3xl font-bold text-oscuro-azulMarino">
          {getTitle()}
        </h1>
      </div>

      {/* Botón de Filtros Mobile - Debajo del título */}
      <div className="md:hidden mb-4">
        <button
          onClick={() => setShowFiltersMobile(!showFiltersMobile)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        >
          <FaFilter className="text-acento-violetaManga" size={18} />
          <span className="text-oscuro-azulMarino font-medium">Filtros</span>
        </button>
      </div>

      {/* Layout de dos columnas */}
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar de Filtros - Izquierda (Desktop) / Desplegable (Mobile) */}
        <aside className={`w-full md:w-64 flex-shrink-0 ${showFiltersMobile ? 'block' : 'hidden md:block'}`}>
          <ProductFilters
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
            initialFilters={initialFilters}
          />
        </aside>

        {/* Contenido Principal - Derecha */}
        <div className="flex-1 min-w-0">
          {/* Ordenar - Arriba del grid */}
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-gray-600">
              {!loading && productos.length > 0 && (
                <span>
                  Mostrando {productos.length} producto{productos.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Ordenar por:</span>
              <select
                value={filters.ordenar}
                onChange={(e) => {
                  handleFilterChange({ ...filters, ordenar: e.target.value });
                }}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
              >
                <option value="titulo_asc">Más relevantes</option>
                <option value="titulo_asc">Título (A-Z)</option>
                <option value="titulo_desc">Título (Z-A)</option>
                <option value="precio_asc">Precio (Menor a Mayor)</option>
                <option value="precio_desc">Precio (Mayor a Menor)</option>
              </select>
            </div>
          </div>

          {/* Error */}
          {error && (
            <Alert type="error" className="mb-6" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Grid de productos */}
          <ProductGrid productos={productos} loading={loading} showStock={true} />

          {/* Paginación */}
          {!loading && productos.length > 0 && totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                ← Anterior
              </Button>
              
              <span className="text-oscuro-azulMarino">
                Página {currentPage} de {totalPages}
              </span>
              
              <Button
                variant="outline"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente →
              </Button>
            </div>
          )}

          {/* Sin resultados */}
          {!loading && productos.length === 0 && !error && (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg mb-4">
                No se encontraron productos con los filtros seleccionados
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  handleFilterChange({
                    categoria: "",
                    autor: "",
                    precio_min: "",
                    precio_max: "",
                    ordenar: "titulo_asc",
                  });
                  handleSearch("");
                }}
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductosPage;
