import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext.jsx";
import { authApi } from "../api/auth.api.js";
import { Button, Alert, Loading, Card, Input, Modal } from "../components/ui/index.js";
import { FaUser, FaLock, FaTrashAlt, FaEdit, FaSave, FaTimes } from "react-icons/fa";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, setUser, signout, updateProfile: updateProfileContext } = useAuth();
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const isUpdatingRef = useRef(false); // Para evitar llamadas duplicadas

  const {
    register: registerProfile,
    handleSubmit: handleSubmitProfile,
    formState: { errors: errorsProfile },
    reset: resetProfile,
  } = useForm();

  const {
    register: registerPassword,
    handleSubmit: handleSubmitPassword,
    watch: watchPassword,
    getValues: getValuesPassword,
    trigger: triggerPassword,
    formState: { errors: errorsPassword },
    reset: resetPassword,
  } = useForm({
    mode: "onSubmit", // Validar solo al enviar el formulario
    reValidateMode: "onChange", // Revalidar mientras el usuario escribe después del primer submit
    shouldFocusError: false, // No hacer focus automático en el primer error
  });

  // Observar ambos campos para revalidar cuando cambien
  const newPassword = watchPassword("newPassword");
  const confirmPassword = watchPassword("confirmNewPassword");

  // Revalidar confirmNewPassword cuando cambie newPassword
  useEffect(() => {
    const confirmValue = getValuesPassword("confirmNewPassword");
    if (confirmValue) {
      triggerPassword("confirmNewPassword");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPassword]);

  // Cargar perfil al montar
  useEffect(() => {
    cargarPerfil();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resetear formulario cuando cambia el usuario (solo si no estamos en modo edición y no estamos actualizando)
  useEffect(() => {
    if (user && !editMode && !isUpdatingRef.current) {
      resetProfile({
        nombre: user.nombre || "",
        apellido: user.apellido || "",
        email: user.email || "",
        direccion_envio: user.direccion_envio || "",
      });
    }
  }, [user, resetProfile, editMode]);

  const cargarPerfil = async () => {
    // No cargar si estamos actualizando
    if (isUpdatingRef.current) {
      return;
    }

    setLoadingProfile(true);
    setError(null);
    try {
      console.log("🔄 [ProfilePage] Cargando perfil...");
      const res = await authApi.getProfile();
      console.log("✅ [ProfilePage] Perfil cargado:", res.data);
      // Solo actualizar si no estamos en modo edición para evitar conflictos
      if (!editMode) {
        setUser(res.data);
      }
    } catch (err) {
      console.error("❌ [ProfilePage] Error cargando perfil:", err);
      // Si es 401, el usuario no está autenticado - el ProtectedRoute debería redirigir
      if (err.response?.status === 401) {
        console.error("❌ [ProfilePage] Token inválido o expirado");
        // Limpiar estado y dejar que el ProtectedRoute maneje la redirección
        setUser(null);
        setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        // No redirigir aquí, dejar que ProtectedRoute lo maneje
      } else {
        setError(
          err.response?.data?.message || 
          "Error al cargar tu perfil. Por favor, intenta nuevamente."
        );
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const onSubmitProfile = async (data) => {
    // Evitar múltiples llamadas simultáneas
    if (isUpdatingRef.current) {
      console.log("⚠️ [ProfilePage] Actualización ya en progreso, ignorando...");
      return;
    }

    isUpdatingRef.current = true;
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log("🔄 [ProfilePage] Actualizando perfil con datos:", { nombre: data.nombre, email: data.email });
      // Usar el método del contexto que maneja el estado correctamente
      const updatedUser = await updateProfileContext({
        nombre: data.nombre,
        apellido: data.apellido,
        email: data.email,
        direccion_envio: data.direccion_envio || null,
      });
      console.log("✅ [ProfilePage] Perfil actualizado exitosamente:", updatedUser);

      setSuccess("Perfil actualizado exitosamente");
      setEditMode(false);
    } catch (err) {
      console.error("❌ [ProfilePage] Error actualizando perfil:", err);
      console.error("❌ [ProfilePage] Status:", err.response?.status);
      console.error("❌ [ProfilePage] Response data:", err.response?.data);
      
      // Manejar error 401 (sesión expirada)
      if (err.response?.status === 401) {
        console.error("❌ [ProfilePage] Token inválido o expirado durante actualización");
        setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        // Limpiar estado y redirigir después de un momento
        setTimeout(() => {
          signout();
          navigate("/login");
        }, 2000);
      } else {
        // Mostrar errores del contexto si existen
        const errorMessage = err.response?.data?.message || 
          (Array.isArray(err.response?.data) ? err.response.data[0] : null) ||
          "Error al actualizar el perfil. Por favor, intenta nuevamente.";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      // Esperar un momento antes de permitir otra actualización
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 500);
    }
  };

  const onSubmitPassword = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      setSuccess("Contraseña actualizada exitosamente");
      setShowChangePassword(false);
      resetPassword();
    } catch (err) {
      console.error("Error cambiando contraseña:", err);
      
      // Manejar error 401 (sesión expirada)
      if (err.response?.status === 401) {
        setError("Tu sesión ha expirado. Por favor, inicia sesión nuevamente.");
        // Limpiar estado y redirigir después de un momento
        setTimeout(() => {
          signout();
          navigate("/login");
        }, 2000);
      } else {
        setError(
          err.response?.data?.message ||
            "Error al cambiar la contraseña. Por favor, intenta nuevamente."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    setLoading(true);
    setError(null);

    try {
      await authApi.deleteAccount();
      await signout();
      navigate("/");
    } catch (err) {
      console.error("Error eliminando cuenta:", err);
      setError(
        err.response?.data?.message ||
          "Error al eliminar la cuenta. Por favor, intenta nuevamente."
      );
      setLoading(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[400px]">
          <Loading size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <h1 className="text-3xl font-bold text-oscuro-azulMarino mb-6">
        👤 Mi Perfil
      </h1>

      {error && (
        <Alert type="error" className="mb-6" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert type="success" className="mb-6" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      <div className="space-y-6">
        {/* Información del Perfil */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FaUser className="text-acento-violetaManga" size={20} />
              <h2 className="text-xl font-bold text-oscuro-azulMarino">
                Información Personal
              </h2>
            </div>
            {!editMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
              >
                <FaEdit className="mr-2" size={14} />
                Editar
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditMode(false);
                    resetProfile({
                      nombre: user?.nombre || "",
                      apellido: user?.apellido || "",
                      email: user?.email || "",
                      direccion_envio: user?.direccion_envio || "",
                    });
                  }}
                >
                  <FaTimes className="mr-2" size={14} />
                  Cancelar
                </Button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmitProfile(onSubmitProfile)}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  id="nombre"
                  name="nombre"
                  type="text"
                  disabled={!editMode}
                  {...registerProfile("nombre", {
                    required: "El nombre es requerido",
                    minLength: {
                      value: 3,
                      message: "El nombre debe tener al menos 3 caracteres",
                    },
                    maxLength: {
                      value: 100,
                      message: "El nombre no puede exceder 100 caracteres",
                    },
                  })}
                />
                {errorsProfile.nombre && (
                  <p className="mt-0.5 text-xs text-red-600">{errorsProfile.nombre.message}</p>
                )}
              </div>

              <div>
                <label htmlFor="apellido" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Apellido <span className="text-red-500">*</span>
                </label>
                <Input
                  id="apellido"
                  name="apellido"
                  type="text"
                  disabled={!editMode}
                  {...registerProfile("apellido", {
                    required: "El apellido es requerido",
                    minLength: {
                      value: 2,
                      message: "El apellido debe tener al menos 2 caracteres",
                    },
                    maxLength: {
                      value: 100,
                      message: "El apellido no puede exceder 100 caracteres",
                    },
                  })}
                />
                {errorsProfile.apellido && (
                  <p className="mt-0.5 text-xs text-red-600">{errorsProfile.apellido.message}</p>
                )}
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico <span className="text-red-500">*</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                disabled={!editMode}
                {...registerProfile("email", {
                  required: "El correo electrónico es requerido",
                  pattern: {
                    value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                    message: "Debe ser un correo electrónico válido",
                  },
                })}
              />
              {errorsProfile.email && (
                <p className="mt-0.5 text-xs text-red-600">{errorsProfile.email.message}</p>
              )}
            </div>

            <div className="mt-4">
              <label htmlFor="direccion_envio" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Dirección de Envío
              </label>
              <Input
                id="direccion_envio"
                name="direccion_envio"
                type="text"
                placeholder="Calle, número, ciudad, código postal"
                disabled={!editMode}
                {...registerProfile("direccion_envio", {
                  maxLength: {
                    value: 500,
                    message: "La dirección no puede exceder 500 caracteres",
                  },
                })}
              />
              {errorsProfile.direccion_envio && (
                <p className="mt-0.5 text-xs text-red-600">{errorsProfile.direccion_envio.message}</p>
              )}
            </div>

            {editMode && (
              <div className="mt-6 flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                >
                  <FaSave className="mr-2" size={14} />
                  Guardar Cambios
                </Button>
              </div>
            )}
          </form>
        </Card>

        {/* Cambiar Contraseña */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <FaLock className="text-acento-violetaManga" size={20} />
              <h2 className="text-xl font-bold text-oscuro-azulMarino">
                Cambiar Contraseña
              </h2>
            </div>
            {!showChangePassword && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowChangePassword(true)}
              >
                Cambiar Contraseña
              </Button>
            )}
          </div>

          {showChangePassword && (
            <form onSubmit={handleSubmitPassword(onSubmitPassword)}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Contraseña Actual <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="currentPassword"
                    name="currentPassword"
                    type="password"
                    placeholder="Ingresa tu contraseña actual"
                    {...registerPassword("currentPassword", {
                      required: "La contraseña actual es requerida",
                    })}
                  />
                  {errorsPassword.currentPassword && (
                    <p className="mt-0.5 text-xs text-red-600">{errorsPassword.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Nueva Contraseña <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="password"
                    placeholder="Mín. 8 caracteres: Mayúscula, minúscula, número y símbolo"
                    {...registerPassword("newPassword", {
                      required: "La nueva contraseña es requerida",
                      validate: (value) => {
                        if (!value || value.trim() === "") {
                          return "La nueva contraseña es requerida";
                        }
                        
                        // Recolectar todos los errores
                        const errors = [];
                        
                        // Mínimo 8 caracteres
                        if (value.length < 8) {
                          errors.push("al menos 8 caracteres");
                        }
                        
                        // Al menos una mayúscula
                        if (!/[A-Z]/.test(value)) {
                          errors.push("una letra mayúscula (A-Z)");
                        }
                        
                        // Al menos una minúscula
                        if (!/[a-z]/.test(value)) {
                          errors.push("una letra minúscula (a-z)");
                        }
                        
                        // Al menos un número
                        if (!/[0-9]/.test(value)) {
                          errors.push("un número (0-9)");
                        }
                        
                        // Al menos un símbolo
                        if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
                          errors.push("un símbolo (!@#$%^&*...)");
                        }
                        
                        // Si hay errores, mostrar mensaje completo
                        if (errors.length > 0) {
                          return `La contraseña debe contener: ${errors.join(", ")}. Ejemplo válido: MiPassword123!`;
                        }
                        
                        return true;
                      },
                    })}
                  />
                  {errorsPassword.newPassword && (
                    <p className="mt-0.5 text-xs text-red-600">{errorsPassword.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmNewPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                    Confirmar Nueva Contraseña <span className="text-red-500">*</span>
                  </label>
                  <Input
                    id="confirmNewPassword"
                    name="confirmNewPassword"
                    type="password"
                    placeholder="Confirma tu nueva contraseña"
                    {...registerPassword("confirmNewPassword", {
                      required: {
                        value: true,
                        message: "Debes confirmar tu nueva contraseña",
                      },
                      validate: (value) => {
                        // Usar getValues para obtener el valor actual de newPassword
                        const currentNewPassword = getValuesPassword("newPassword");
                        if (!value || value.trim() === "") {
                          return "Debes confirmar tu nueva contraseña";
                        }
                        if (value !== currentNewPassword) {
                          return "Las contraseñas no coinciden";
                        }
                        return true;
                      },
                    })}
                  />
                  {errorsPassword.confirmNewPassword && (
                    <p className="mt-0.5 text-xs text-red-600">{errorsPassword.confirmNewPassword.message}</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowChangePassword(false);
                    resetPassword();
                  }}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={loading}
                  disabled={loading}
                >
                  Cambiar Contraseña
                </Button>
              </div>
            </form>
          )}
        </Card>

        {/* Eliminar Cuenta */}
        <Card className="p-6 border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FaTrashAlt className="text-red-600" size={20} />
                <h2 className="text-xl font-bold text-oscuro-azulMarino">
                  Eliminar Cuenta
                </h2>
              </div>
              <p className="text-gray-600 text-sm">
                Una vez eliminada, tu cuenta no podrá ser recuperada. Esta acción es permanente.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
            >
              Eliminar Cuenta
            </Button>
          </div>
        </Card>
      </div>

      {/* Modal de confirmación para eliminar cuenta */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="¿Eliminar tu cuenta?"
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Esta acción no se puede deshacer. Se eliminarán permanentemente:
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li>Tu cuenta y todos tus datos personales</li>
            <li>Tu historial de órdenes</li>
            <li>Todos los datos asociados a tu cuenta</li>
          </ul>
          <p className="text-red-600 font-medium">
            ¿Estás seguro de que deseas eliminar tu cuenta?
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowDeleteModal(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteAccount}
              loading={loading}
              disabled={loading}
            >
              Sí, Eliminar Cuenta
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProfilePage;
