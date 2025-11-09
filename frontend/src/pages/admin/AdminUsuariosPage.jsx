import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { adminApi } from "../../api/admin.api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { Button, Alert, Loading, Card, Input, Modal } from "../../components/ui/index.js";
import AdminSubNav from "../../components/admin/AdminSubNav.jsx";
import { FaPlus, FaEdit, FaSearch, FaUserShield } from "react-icons/fa";

const AdminUsuariosPage = () => {
  const { user } = useAuth();
  const esSuperAdmin = user?.rol === "super_admin" || user?.es_super_admin;
  const [usuarios, setUsuarios] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showPermisosModal, setShowPermisosModal] = useState(null);
  const [editingUsuario, setEditingUsuario] = useState(null);
  const [cambiandoRol, setCambiandoRol] = useState(null);

  const {
    register: registerUsuario,
    handleSubmit: handleSubmitUsuario,
    formState: { errors: errorsUsuario },
    reset: resetUsuario,
    setValue: setValueUsuario,
  } = useForm();

  const {
    register: registerPermisos,
    handleSubmit: handleSubmitPermisos,
    formState: { errors: errorsPermisos },
    reset: resetPermisos,
    watch: watchPermisos,
    getValues: getValuesPermisos,
    setValue: setValuePermisos,
  } = useForm();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usuariosRes, permisosRes] = await Promise.all([
        adminApi.listarUsuarios(),
        adminApi.listarPermisos(),
      ]);
      setUsuarios(usuariosRes.data || []);
      setPermisos(permisosRes.data || []);
    } catch (err) {
      console.error("Error cargando datos:", err);
      setError("Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleCrear = () => {
    setEditingUsuario(null);
    resetUsuario({
      nombre: "",
      apellido: "",
      email: "",
      password: "",
      rol: "cliente",
    });
    setShowModal(true);
  };

  const handleEditarPermisos = async (usuario) => {
    try {
      const res = await adminApi.obtenerUsuario(usuario.id_usuario);
      const usuarioCompleto = res.data;
      setEditingUsuario(usuarioCompleto);
      
      // Cargar permisos actuales del usuario
      const permisosActuales = usuarioCompleto.permisos || [];
      const permisosObj = {};
      
      // Mapear permisos del usuario a los IDs de permisos disponibles
      permisosActuales.forEach((p) => {
        // El permiso puede venir como objeto con id_permiso o nombre_permiso, o como string
        let permisoId = null;
        
        if (typeof p === 'string') {
          // Si es string, buscar por nombre_permiso
          const permisoEncontrado = permisos.find(perm => perm.nombre_permiso === p);
          permisoId = permisoEncontrado?.id_permiso;
        } else if (p.id_permiso) {
          // Si tiene id_permiso, usarlo directamente
          permisoId = p.id_permiso;
        } else if (p.nombre_permiso) {
          // Si tiene nombre_permiso, buscar el ID
          const permisoEncontrado = permisos.find(perm => perm.nombre_permiso === p.nombre_permiso);
          permisoId = permisoEncontrado?.id_permiso;
        }
        
        if (permisoId) {
          permisosObj[`permiso_${permisoId}`] = true;
        }
      });
      
      // Si es admin, asegurar que Dashboard esté siempre marcado
      if (usuarioCompleto.rol === "admin" || usuarioCompleto.rol === "super_admin") {
        const dashboardPermiso = permisos.find(p => p.nombre_permiso === "Dashboard");
        if (dashboardPermiso) {
          permisosObj[`permiso_${dashboardPermiso.id_permiso}`] = true;
        }
      }
      
      console.log("Permisos actuales del usuario:", permisosActuales);
      console.log("Objeto de permisos para el formulario:", permisosObj);
      
      // Resetear el formulario con los valores iniciales
      resetPermisos(permisosObj);
      
      // Asegurar que Dashboard esté marcado después del reset (por si acaso)
      if (usuarioCompleto.rol === "admin" || usuarioCompleto.rol === "super_admin") {
        const dashboardPermiso = permisos.find(p => p.nombre_permiso === "Dashboard");
        if (dashboardPermiso) {
          setValuePermisos(`permiso_${dashboardPermiso.id_permiso}`, true);
        }
      }
      
      setShowPermisosModal(usuario.id_usuario);
    } catch (err) {
      console.error("Error cargando usuario:", err);
      setError("Error al cargar los datos del usuario");
    }
  };

  const onSubmitUsuario = async (data) => {
    setLoading(true);
    setError(null);

    try {
      if (editingUsuario) {
        // Actualizar rol y permisos
        const permisosSeleccionados = Object.keys(watchPermisos())
          .filter((key) => key.startsWith("permiso_") && watchPermisos()[key])
          .map((key) => parseInt(key.replace("permiso_", "")));

        await adminApi.actualizarRolPermisos(editingUsuario.id_usuario, {
          rol: data.rol,
          permisos: permisosSeleccionados,
        });
      } else {
        // Crear nuevo usuario
        await adminApi.crearUsuario({
          nombre: data.nombre.trim(),
          apellido: data.apellido.trim(),
          email: data.email.trim(),
          password: data.password,
          rol: data.rol || "cliente",
        });
      }

      await cargarDatos();
      setShowModal(false);
      setShowPermisosModal(null);
      resetUsuario();
      resetPermisos();
    } catch (err) {
      console.error("Error guardando usuario:", err);
      setError(
        err.response?.data?.message || "Error al guardar el usuario. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const onSubmitPermisos = async (data) => {
    if (!editingUsuario) return;

    // Prevenir que el super admin modifique sus propios permisos
    if (editingUsuario.es_super_admin && user?.id_usuario === editingUsuario.id_usuario) {
      setError("El Super Administrador siempre tiene todos los permisos habilitados y no pueden ser modificados");
      setTimeout(() => setError(null), 5000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Obtener todos los valores del formulario usando getValues para asegurar que tenemos todos los checkboxes
      const valoresFormulario = getValuesPermisos();
      
      // Mapeo de nombres antiguos a nuevos (por si la migración no se ejecutó completamente)
      const mapeoPermisos = {
        'acceso_logs': 'Auditoria',
        'admin_ordenes': 'Ordenes',
        'carga_catalogo': 'Productos',
        'manejo_stock': 'Productos',
        'listas_precios': 'Productos',
        'impresion_pdf': 'Productos',
      };

      // Convertir IDs de permisos a nombres de permisos
      const permisosSeleccionados = Object.keys(valoresFormulario)
        .filter((key) => key.startsWith("permiso_") && valoresFormulario[key] === true)
        .map((key) => {
          const permisoId = parseInt(key.replace("permiso_", ""));
          const permiso = permisos.find((p) => p.id_permiso === permisoId);
          if (!permiso) {
            console.warn(`Permiso con ID ${permisoId} no encontrado en la lista de permisos disponibles`);
            return null;
          }
          // Si el permiso tiene un nombre antiguo, mapearlo al nuevo
          const nombrePermiso = mapeoPermisos[permiso.nombre_permiso] || permiso.nombre_permiso;
          return nombrePermiso;
        })
        .filter(Boolean); // Filtrar null/undefined
      
      // Si es admin, asegurar que Dashboard esté siempre incluido
      if (editingUsuario.rol === "admin" || editingUsuario.rol === "super_admin") {
        if (!permisosSeleccionados.includes("Dashboard")) {
          permisosSeleccionados.push("Dashboard");
        }
      }

      console.log("Datos del formulario (data):", data);
      console.log("Valores del formulario (getValues):", valoresFormulario);
      console.log("Permisos seleccionados a enviar:", permisosSeleccionados);

      if (permisosSeleccionados.length === 0) {
        setError("Debes seleccionar al menos un permiso");
        setLoading(false);
        return;
      }

      await adminApi.actualizarRolPermisos(editingUsuario.id_usuario, {
        rol: editingUsuario.rol,
        permisos: permisosSeleccionados,
      });

      await cargarDatos();
      setShowPermisosModal(null);
      resetPermisos();
    } catch (err) {
      console.error("Error actualizando permisos:", err);
      setError(
        err.response?.data?.message || "Error al actualizar los permisos. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarRol = async (usuarioId, nuevoRol) => {
    if (!window.confirm(`¿Estás seguro de cambiar el rol a "${nuevoRol === "admin" ? "Admin" : "Cliente"}"?`)) {
      return;
    }

    setCambiandoRol(usuarioId);
    setError(null);

    try {
      await adminApi.actualizarRolPermisos(usuarioId, {
        rol: nuevoRol,
        permisos: nuevoRol === "admin" ? [] : undefined, // Si cambia a admin, se pueden asignar permisos después
      });

      await cargarDatos();
    } catch (err) {
      console.error("Error cambiando rol:", err);
      setError(
        err.response?.data?.message || "Error al cambiar el rol. Por favor, intenta nuevamente."
      );
      setTimeout(() => setError(null), 5000);
    } finally {
      setCambiandoRol(null);
    }
  };

  const usuariosFiltrados = usuarios.filter((usuario) => {
    const query = searchQuery.toLowerCase();
    return (
      usuario.nombre?.toLowerCase().includes(query) ||
      usuario.apellido?.toLowerCase().includes(query) ||
      usuario.email?.toLowerCase().includes(query) ||
      usuario.rol?.toLowerCase().includes(query)
    );
  });

  if (loading && usuarios.length === 0) {
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
          👥 Gestión de Usuarios
        </h1>
        {/* Solo super admin puede crear usuarios */}
        {esSuperAdmin && (
          <Button variant="primary" onClick={handleCrear}>
            <FaPlus className="mr-2" size={14} />
            Nuevo Usuario
          </Button>
        )}
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
            placeholder="Buscar por nombre, apellido, email o rol..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-acento-violetaManga focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla de usuarios */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Nombre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Rol
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                    {searchQuery ? "No se encontraron usuarios" : "No hay usuarios registrados"}
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((usuario) => (
                  <tr key={usuario.id_usuario} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-600">{usuario.id_usuario}</td>
                    <td className="px-4 py-3 text-sm font-medium text-oscuro-azulMarino">
                      {usuario.nombre} {usuario.apellido}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{usuario.email}</td>
                    <td className="px-4 py-3 text-sm">
                      {usuario.es_super_admin ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Super Admin
                        </span>
                      ) : (
                        // Solo super admin puede cambiar roles
                        esSuperAdmin ? (
                          <select
                            value={usuario.rol || "cliente"}
                            onChange={(e) => handleCambiarRol(usuario.id_usuario, e.target.value)}
                            disabled={cambiandoRol === usuario.id_usuario}
                            className={`px-2 py-1 rounded text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-acento-violetaManga ${
                              usuario.rol === "admin"
                                ? "bg-blue-100 text-blue-800 border-blue-300"
                                : "bg-gray-100 text-gray-800 border-gray-300"
                            } ${cambiandoRol === usuario.id_usuario ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                          >
                            <option value="cliente">Cliente</option>
                            <option value="admin">Admin</option>
                          </select>
                        ) : (
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${
                              usuario.rol === "admin"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {usuario.rol === "admin" ? "Admin" : "Cliente"}
                          </span>
                        )
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {/* Solo super admin puede ver/editar permisos de otros usuarios */}
                      {/* Los admins normales solo pueden ver sus propios permisos (solo lectura) */}
                      {esSuperAdmin && (usuario.rol === "admin" || usuario.es_super_admin) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarPermisos(usuario)}
                        >
                          <FaUserShield className="mr-1" size={12} />
                          Permisos
                        </Button>
                      )}
                      {/* Admin normal puede ver sus propios permisos (solo lectura) */}
                      {!esSuperAdmin && user?.id_usuario === usuario.id_usuario && (usuario.rol === "admin" || usuario.es_super_admin) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarPermisos(usuario)}
                        >
                          <FaUserShield className="mr-1" size={12} />
                          Ver Permisos
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal de crear usuario */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          resetUsuario();
        }}
        title="Nuevo Usuario"
      >
        <form onSubmit={handleSubmitUsuario(onSubmitUsuario)} className="space-y-4">
          <Input
            label="Nombre"
            name="nombre"
            type="text"
            error={errorsUsuario.nombre?.message}
            required
            {...registerUsuario("nombre", {
              required: "El nombre es requerido",
              minLength: { value: 3, message: "El nombre debe tener al menos 3 caracteres" },
            })}
          />

          <Input
            label="Apellido"
            name="apellido"
            type="text"
            error={errorsUsuario.apellido?.message}
            required
            {...registerUsuario("apellido", {
              required: "El apellido es requerido",
              minLength: { value: 2, message: "El apellido debe tener al menos 2 caracteres" },
            })}
          />

          <Input
            label="Email"
            name="email"
            type="email"
            error={errorsUsuario.email?.message}
            required
            {...registerUsuario("email", {
              required: "El email es requerido",
              pattern: {
                value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                message: "Debe ser un email válido",
              },
            })}
          />

          <Input
            label="Contraseña"
            name="password"
            type="password"
            error={errorsUsuario.password?.message}
            required
            {...registerUsuario("password", {
              required: "La contraseña es requerida",
              minLength: { value: 6, message: "La contraseña debe tener al menos 6 caracteres" },
            })}
          />

          <div>
            <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
              Rol
            </label>
            <select
              {...registerUsuario("rol", { required: "El rol es requerido" })}
              className="w-full px-3 py-1.5 sm:px-4 sm:py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="cliente">Cliente</option>
              <option value="admin">Admin</option>
            </select>
            {errorsUsuario.rol && (
              <p className="mt-0.5 text-xs text-red-600">{errorsUsuario.rol.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowModal(false);
                resetUsuario();
              }}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="primary" loading={loading} disabled={loading}>
              Crear
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de permisos */}
      {editingUsuario && (
        <Modal
          isOpen={!!showPermisosModal}
          onClose={() => {
            setShowPermisosModal(null);
            resetPermisos();
          }}
          title={`Permisos de ${editingUsuario.nombre} ${editingUsuario.apellido}`}
        >
          {esSuperAdmin ? (
            <form onSubmit={handleSubmitPermisos(onSubmitPermisos)} className="space-y-4">
              <div className="space-y-2">
                {permisos.map((permiso) => {
                  const tienePermiso = editingUsuario.permisos?.some(
                    (p) => {
                      if (typeof p === 'string') {
                        return p === permiso.nombre_permiso;
                      }
                      return p.id_permiso === permiso.id_permiso || p.nombre_permiso === permiso.nombre_permiso;
                    }
                  );
                  // Si es super admin viendo sus propios permisos, mostrar como deshabilitado
                  const esSuperAdminViendoSusPermisos = editingUsuario.es_super_admin && user?.id_usuario === editingUsuario.id_usuario;
                  // Dashboard siempre debe estar marcado para admins (pero no deshabilitado para que se pueda ver)
                  const esDashboard = permiso.nombre_permiso === "Dashboard";
                  const esAdmin = editingUsuario.rol === "admin" || editingUsuario.rol === "super_admin";
                  const checkboxValue = watchPermisos(`permiso_${permiso.id_permiso}`);
                  const debeEstarMarcado = esDashboard && esAdmin ? true : checkboxValue || false;
                  
                  return (
                    <label
                      key={permiso.id_permiso}
                      className={`flex items-center space-x-2 p-2 rounded ${
                        esSuperAdminViendoSusPermisos || (esDashboard && esAdmin) ? "opacity-75" : "hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        {...registerPermisos(`permiso_${permiso.id_permiso}`)}
                        checked={debeEstarMarcado}
                        disabled={esSuperAdminViendoSusPermisos || (esDashboard && esAdmin)}
                        className="rounded border-gray-300 text-acento-violetaManga focus:ring-acento-violetaManga"
                      />
                      <div>
                        <div className="font-medium text-sm text-oscuro-azulMarino">
                          {permiso.nombre_permiso}
                        </div>
                        {permiso.descripcion && (
                          <div className="text-xs text-gray-600">{permiso.descripcion}</div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
              
              {editingUsuario.es_super_admin && user?.id_usuario === editingUsuario.id_usuario && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    El Super Administrador siempre tiene todos los permisos habilitados y no pueden ser modificados.
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPermisosModal(null);
                    resetPermisos();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="primary" 
                  loading={loading} 
                  disabled={loading || (editingUsuario.es_super_admin && user?.id_usuario === editingUsuario.id_usuario)}
                >
                  Guardar Permisos
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                {permisos.map((permiso) => {
                  const tienePermiso = editingUsuario.permisos?.some(
                    (p) => p.id_permiso === permiso.id_permiso || p.nombre_permiso === permiso.nombre_permiso
                  );
                  return (
                    <div
                      key={permiso.id_permiso}
                      className="flex items-center space-x-2 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={tienePermiso}
                        disabled
                        className="rounded border-gray-300 text-acento-violetaManga opacity-50 cursor-not-allowed"
                      />
                      <div>
                        <div className="font-medium text-sm text-oscuro-azulMarino">
                          {permiso.nombre_permiso}
                        </div>
                        {permiso.descripcion && (
                          <div className="text-xs text-gray-600">{permiso.descripcion}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  Solo el Super Administrador puede modificar permisos.
                </p>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowPermisosModal(null);
                    resetPermisos();
                  }}
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default AdminUsuariosPage;
