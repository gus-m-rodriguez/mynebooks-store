import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useSearchParams, useNavigate } from "react-router-dom";
import { adminApi } from "../../api/admin.api.js";
import { Button, Alert, Loading, Card, Input, Modal } from "../../components/ui/index.js";
import AdminSubNav from "../../components/admin/AdminSubNav.jsx";
import { FaPlus, FaEdit, FaTrash, FaSearch } from "react-icons/fa";

const AdminProductosPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingProducto, setEditingProducto] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm();

  useEffect(() => {
    cargarProductos();
  }, []);

  // Detectar si hay un ID de producto para editar en la URL
  useEffect(() => {
    const productoIdParam = searchParams.get("editar");
    if (productoIdParam && productos.length > 0 && !showModal) {
      const productoId = parseInt(productoIdParam, 10);
      const producto = productos.find((p) => p.id_producto === productoId);
      if (producto) {
        setEditingProducto(producto);
        setImagePreview(producto.imagen_url || null);
        setValue("titulo", producto.titulo || "");
        setValue("autor", producto.autor || "");
        setValue("categoria", producto.categoria || "");
        setValue("precio", producto.precio || "");
        setValue("precio_promocional", producto.precio_promocional || "");
        setValue("stock", producto.stock || 0);
        setValue("imagen_url", producto.imagen_url || "");
        setValue("descripcion", producto.descripcion || "");
        setShowModal(true);
        // Limpiar el parámetro de la URL después de abrir el modal
        setSearchParams({});
      }
    }
  }, [productos, searchParams, setSearchParams, setValue, showModal]);

  const cargarProductos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listarProductos();
      setProductos(res.data || []);
    } catch (err) {
      console.error("Error cargando productos:", err);
      setError("Error al cargar los productos");
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = () => {
    setEditingProducto(null);
    setImagePreview(null);
    reset({
      titulo: "",
      autor: "",
      categoria: "",
      precio: "",
      precio_promocional: "",
      stock: "",
      imagen_url: "",
      descripcion: "",
    });
    setShowModal(true);
  };

  const handleEditar = (producto) => {
    setEditingProducto(producto);
    setImagePreview(producto.imagen_url || null);
    setValue("titulo", producto.titulo || "");
    setValue("autor", producto.autor || "");
    setValue("categoria", producto.categoria || "");
    setValue("precio", producto.precio || "");
    setValue("precio_promocional", producto.precio_promocional || "");
    setValue("stock", producto.stock || 0);
    setValue("imagen_url", producto.imagen_url || "");
    setValue("descripcion", producto.descripcion || "");
    setShowModal(true);
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      setError("El archivo debe ser una imagen");
      return;
    }

    // Validar tamaño (5MB máximo)
    if (file.size > 5 * 1024 * 1024) {
      setError("La imagen es demasiado grande. El tamaño máximo es 5MB");
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const res = await adminApi.subirImagen(file);
      const imageUrl = res.data.imageUrl;
      setValue("imagen_url", imageUrl);
      setImagePreview(imageUrl);
    } catch (err) {
      console.error("Error subiendo imagen:", err);
      setError(
        err.response?.data?.message || "Error al subir la imagen. Por favor, intenta nuevamente."
      );
    } finally {
      setUploadingImage(false);
    }
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const productoData = {
        titulo: data.titulo.trim(),
        autor: data.autor.trim(),
        categoria: data.categoria?.trim() || null,
        precio: parseFloat(data.precio),
        precio_promocional: data.precio_promocional
          ? parseFloat(data.precio_promocional)
          : null,
        stock: parseInt(data.stock) || 0,
        imagen_url: data.imagen_url?.trim() || null,
        descripcion: data.descripcion?.trim() || null,
      };

      if (editingProducto) {
        await adminApi.actualizarProducto(editingProducto.id_producto, productoData);
      } else {
        await adminApi.crearProducto(productoData);
      }

      await cargarProductos();
      setShowModal(false);
      reset();
    } catch (err) {
      console.error("Error guardando producto:", err);
      setError(
        err.response?.data?.message || "Error al guardar el producto. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async () => {
    if (!showDeleteModal) return;

    setLoading(true);
    setError(null);

    try {
      await adminApi.eliminarProducto(showDeleteModal);
      await cargarProductos();
      setShowDeleteModal(null);
    } catch (err) {
      console.error("Error eliminando producto:", err);
      setError(
        err.response?.data?.message || "Error al eliminar el producto. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const query = searchQuery.toLowerCase();
    return (
      p.titulo?.toLowerCase().includes(query) ||
      p.autor?.toLowerCase().includes(query) ||
      p.categoria?.toLowerCase().includes(query)
    );
  });

  if (loading && productos.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <AdminSubNav />
      <div className="flex justify-between items-center mb-6 mt-6">
        <h1 className="text-3xl font-bold text-oscuro-azulMarino">
          📦 Gestión de Productos
        </h1>
        <Button variant="primary" onClick={handleCrear}>
          <FaPlus className="mr-2" size={14} />
          Nuevo Producto
        </Button>
      </div>

      {error && (
        <Alert type="error" className="mb-4" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Búsqueda */}
      <div className="mb-6">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por título, autor o categoría..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla de productos */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Título
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Autor
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Categoría
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Precio
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? "No se encontraron productos" : "No hay productos registrados"}
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((producto) => {
                  const stockDisponible = producto.stock - (producto.stock_reserved || 0);
                  return (
                    <tr key={producto.id_producto} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {producto.id_producto}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-oscuro-azulMarino">
                        {producto.titulo}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{producto.autor}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {producto.categoria || "-"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        <div>
                          {producto.precio_promocional ? (
                            <>
                              <span className="font-medium text-green-600">
                                ${parseFloat(producto.precio_promocional).toFixed(2)}
                              </span>
                              <span className="ml-2 line-through text-xs text-gray-500">
                                ${parseFloat(producto.precio).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="font-medium">
                              ${parseFloat(producto.precio).toFixed(2)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`font-medium ${
                            stockDisponible > 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {stockDisponible} / {producto.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditar(producto)}
                          >
                            <FaEdit size={12} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setShowDeleteModal(producto.id_producto)}
                          >
                            <FaTrash size={12} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de crear/editar */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingProducto(null);
          // Limpiar parámetro de URL si existe
          if (searchParams.get("editar")) {
            setSearchParams({});
          }
          setImagePreview(null);
          reset();
        }}
        title={editingProducto ? "Editar Producto" : "Nuevo Producto"}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="titulo" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Título *
            </label>
            <Input
              id="titulo"
              name="titulo"
              type="text"
              required
              {...register("titulo", {
                required: "El título es requerido",
                minLength: {
                  value: 1,
                  message: "El título es requerido",
                },
                maxLength: {
                  value: 200,
                  message: "El título no puede exceder 200 caracteres",
                },
              })}
            />
            {errors.titulo && (
              <p className="mt-0.5 text-xs text-red-600">{errors.titulo.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="autor" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Autor *
            </label>
            <Input
              id="autor"
              name="autor"
              type="text"
              required
              {...register("autor", {
                required: "El autor es requerido",
                minLength: {
                  value: 1,
                  message: "El autor es requerido",
                },
                maxLength: {
                  value: 150,
                  message: "El autor no puede exceder 150 caracteres",
                },
              })}
            />
            {errors.autor && (
              <p className="mt-0.5 text-xs text-red-600">{errors.autor.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="categoria" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Categoría
            </label>
            <Input
              id="categoria"
              name="categoria"
              type="text"
              {...register("categoria", {
                maxLength: {
                  value: 100,
                  message: "La categoría no puede exceder 100 caracteres",
                },
              })}
            />
            {errors.categoria && (
              <p className="mt-0.5 text-xs text-red-600">{errors.categoria.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="precio" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Precio *
              </label>
              <Input
                id="precio"
                name="precio"
                type="number"
                step="0.01"
                min="0"
                required
                {...register("precio", {
                  required: "El precio es requerido",
                  min: {
                    value: 0,
                    message: "El precio debe ser positivo",
                  },
                  valueAsNumber: true,
                })}
              />
              {errors.precio && (
                <p className="mt-0.5 text-xs text-red-600">{errors.precio.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="precio_promocional" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Precio Promocional (opcional)
              </label>
              <Input
                id="precio_promocional"
                name="precio_promocional"
                type="number"
                step="0.01"
                min="0"
                {...register("precio_promocional", {
                  min: {
                    value: 0,
                    message: "El precio promocional debe ser positivo",
                  },
                  validate: (value) => {
                    const precio = parseFloat(document.querySelector('input[name="precio"]')?.value);
                    if (value && precio && value >= precio) {
                      return "El precio promocional debe ser menor que el precio regular";
                    }
                    return true;
                  },
                  valueAsNumber: true,
                })}
              />
              {errors.precio_promocional && (
                <p className="mt-0.5 text-xs text-red-600">{errors.precio_promocional.message}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="stock" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Stock *
            </label>
            <Input
              id="stock"
              name="stock"
              type="number"
              min="0"
              required
              {...register("stock", {
                required: "El stock es requerido",
                min: {
                  value: 0,
                  message: "El stock no puede ser negativo",
                },
                valueAsNumber: true,
              })}
            />
            {errors.stock && (
              <p className="mt-0.5 text-xs text-red-600">{errors.stock.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="imagen_url" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Imagen del Producto
            </label>
            
            {/* Vista previa de la imagen */}
            {imagePreview && (
              <div className="mb-3">
                <img
                  src={imagePreview}
                  alt="Vista previa"
                  className="w-full max-w-xs h-48 object-cover rounded-lg border border-gray-300"
                />
              </div>
            )}

            {/* Botón para subir imagen */}
            <div className="mb-2">
              <label
                htmlFor="file-upload"
                className="inline-flex items-center px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploadingImage ? "Subiendo..." : "Seleccionar Imagen"}
                <input
                  id="file-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="hidden"
                />
              </label>
            </div>

            {/* Campo para URL manual (opcional) */}
            <p className="text-xs text-gray-500 mb-2">O ingresa una URL manualmente:</p>
            <Input
              id="imagen_url"
              name="imagen_url"
              type="url"
              placeholder="https://ejemplo.com/imagen.jpg"
              {...register("imagen_url", {
                pattern: {
                  value: /^https?:\/\/.+/,
                  message: "Debe ser una URL válida",
                },
                onChange: (e) => {
                  setImagePreview(e.target.value || null);
                },
              })}
            />
            {errors.imagen_url && (
              <p className="mt-0.5 text-xs text-red-600">{errors.imagen_url.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              {...register("descripcion", {
                maxLength: {
                  value: 5000,
                  message: "La descripción no puede exceder 5000 caracteres",
                },
              })}
              rows="4"
              className={`w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                errors.descripcion ? "border-red-500" : "border-gray-300"
              }`}
            />
            {errors.descripcion && (
              <p className="mt-0.5 text-xs text-red-600">{errors.descripcion.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                reset();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={loading}>
              {editingProducto ? "Actualizar" : "Crear"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de confirmación de eliminación */}
      <Modal
        isOpen={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title="¿Eliminar Producto?"
      >
        <p className="mb-4">
          ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setShowDeleteModal(null)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleEliminar} loading={loading} disabled={loading}>
            Eliminar
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default AdminProductosPage;
