import { useState, useEffect, useRef, memo } from "react";
import { Input, Button } from "../ui/index.js";
import { FaChevronDown, FaChevronUp } from "react-icons/fa";

const ProductFilters = memo(({ onFilterChange, onSearch, initialFilters = {} }) => {
  const [filters, setFilters] = useState({
    categoria: initialFilters.categoria || "",
    autor: initialFilters.autor || "",
    precio_min: initialFilters.precio_min || "",
    precio_max: initialFilters.precio_max || "",
    ordenar: initialFilters.ordenar || "titulo_asc",
    search: initialFilters.search || "",
  });

  // Ref para rastrear si el componente ya se inicializó
  const isInitializedRef = useRef(false);
  
  // Refs para mantener el foco en los inputs
  const categoriaInputRef = useRef(null);
  const autorInputRef = useRef(null);
  const precioMinInputRef = useRef(null);
  const precioMaxInputRef = useRef(null);
  const searchInputRef = useRef(null);
  
  // Ref para rastrear qué input tenía el foco antes de un re-render
  const focusedFieldRef = useRef(null);
  
  // Sincronizar con initialFilters solo en el montaje inicial
  // No sincronizar después para evitar perder el foco mientras el usuario escribe
  useEffect(() => {
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      setFilters({
        categoria: initialFilters.categoria || "",
        autor: initialFilters.autor || "",
        precio_min: initialFilters.precio_min || "",
        precio_max: initialFilters.precio_max || "",
        ordenar: initialFilters.ordenar || "titulo_asc",
        search: initialFilters.search || "",
      });
    }
  }, []); // Solo ejecutar en el montaje inicial
  
  // Restaurar el foco después de un re-render si había un input enfocado
  useEffect(() => {
    if (focusedFieldRef.current) {
      const refs = {
        categoria: categoriaInputRef,
        autor: autorInputRef,
        precio_min: precioMinInputRef,
        precio_max: precioMaxInputRef,
        search: searchInputRef,
      };
      const ref = refs[focusedFieldRef.current];
      if (ref?.current && document.activeElement !== ref.current) {
        // Solo restaurar el foco si realmente se perdió
        const wasFocused = ref.current === document.activeElement;
        if (!wasFocused) {
          // Usar requestAnimationFrame para asegurar que el DOM esté actualizado
          requestAnimationFrame(() => {
            if (ref.current) {
              ref.current.focus();
              // Restaurar la posición del cursor al final del texto
              const length = ref.current.value?.length || 0;
              ref.current.setSelectionRange(length, length);
            }
          });
        }
      }
    }
  });

  // Estado de secciones colapsables
  const [expandedSections, setExpandedSections] = useState({
    precio: true, // Precio expandido por defecto
    categoria: false,
    autor: false,
    ordenar: false,
  });

  const toggleSection = (section) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const handleChange = (field, value) => {
    // Guardar qué campo tenía el foco
    focusedFieldRef.current = field;
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
  };
  
  const handleFocus = (field) => {
    focusedFieldRef.current = field;
  };
  
  const handleBlur = () => {
    // No limpiar inmediatamente, esperar un momento por si hay un re-render
    setTimeout(() => {
      if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        focusedFieldRef.current = null;
      }
    }, 100);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const { search, ...filterParams } = filters;
    onFilterChange(filterParams);
    if (search) {
      onSearch(search);
    }
  };

  const handleReset = () => {
    const resetFilters = {
      categoria: "",
      autor: "",
      precio_min: "",
      precio_max: "",
      ordenar: "titulo_asc",
      search: "",
    };
    setFilters(resetFilters);
    onFilterChange({
      categoria: "",
      autor: "",
      precio_min: "",
      precio_max: "",
      ordenar: "titulo_asc",
    });
    onSearch("");
  };

  const FilterSection = ({ title, isExpanded, onToggle, children }) => (
    <div className="border-b border-gray-200 last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex justify-between items-center py-3 px-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-oscuro-azulMarino">{title}</span>
        {isExpanded ? (
          <FaChevronUp className="text-gray-400" size={14} />
        ) : (
          <FaChevronDown className="text-gray-400" size={14} />
        )}
      </button>
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 bg-gray-50">
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <form onSubmit={handleSubmit}>
        {/* Búsqueda - Siempre visible */}
        <div className="p-4 border-b border-gray-200">
          <div className="w-full">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              ref={searchInputRef}
              type="text"
              value={filters.search}
              onChange={(e) => handleChange("search", e.target.value)}
              onFocus={() => handleFocus("search")}
              onBlur={handleBlur}
              placeholder="¿Qué estás buscando?"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
            />
          </div>
        </div>

        {/* Secciones de filtros colapsables */}
        <div className="divide-y divide-gray-200">
          {/* Precio */}
          <FilterSection
            title="PRECIO"
            isExpanded={expandedSections.precio}
            onToggle={() => toggleSection("precio")}
          >
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Desde</label>
                  <input
                    ref={precioMinInputRef}
                    type="number"
                    value={filters.precio_min}
                    onChange={(e) => handleChange("precio_min", e.target.value)}
                    onFocus={() => handleFocus("precio_min")}
                    onBlur={handleBlur}
                    placeholder="0"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-1">Hasta</label>
                  <input
                    ref={precioMaxInputRef}
                    type="number"
                    value={filters.precio_max}
                    onChange={(e) => handleChange("precio_max", e.target.value)}
                    onFocus={() => handleFocus("precio_max")}
                    onBlur={handleBlur}
                    placeholder="999999"
                    min="0"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </FilterSection>

          {/* Categoría */}
          <FilterSection
            title="CATEGORÍAS"
            isExpanded={expandedSections.categoria}
            onToggle={() => toggleSection("categoria")}
          >
            <div className="space-y-2">
              <input
                ref={categoriaInputRef}
                type="text"
                value={filters.categoria}
                onChange={(e) => handleChange("categoria", e.target.value)}
                onFocus={() => handleFocus("categoria")}
                onBlur={handleBlur}
                placeholder="Ej: Ficción, Ciencia..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
              />
            </div>
          </FilterSection>

          {/* Autor */}
          <FilterSection
            title="AUTOR"
            isExpanded={expandedSections.autor}
            onToggle={() => toggleSection("autor")}
          >
            <div className="space-y-2">
              <input
                ref={autorInputRef}
                type="text"
                value={filters.autor}
                onChange={(e) => handleChange("autor", e.target.value)}
                onFocus={() => handleFocus("autor")}
                onBlur={handleBlur}
                placeholder="Nombre del autor..."
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
              />
            </div>
          </FilterSection>

          {/* Ordenar */}
          <FilterSection
            title="ORDENAR"
            isExpanded={expandedSections.ordenar}
            onToggle={() => toggleSection("ordenar")}
          >
            <div className="space-y-2">
              <select
                value={filters.ordenar}
                onChange={(e) => handleChange("ordenar", e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
              >
                <option value="titulo_asc">Título (A-Z)</option>
                <option value="titulo_desc">Título (Z-A)</option>
                <option value="precio_asc">Precio (Menor a Mayor)</option>
                <option value="precio_desc">Precio (Mayor a Menor)</option>
              </select>
            </div>
          </FilterSection>
        </div>

        {/* Botones de acción */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            size="sm"
          >
            Aplicar Filtros
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="w-full"
            size="sm"
          >
            Limpiar Filtros
          </Button>
        </div>
      </form>
    </div>
  );
});

ProductFilters.displayName = "ProductFilters";

export default ProductFilters;
