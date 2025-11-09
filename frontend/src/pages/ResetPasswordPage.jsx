import { useState, useEffect } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../api/auth.api.js";
import { Button, Alert, Card, Input } from "../components/ui/index.js";
import { FaLock, FaCheckCircle, FaArrowLeft } from "react-icons/fa";

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Decodificar el token de la URL (por si viene codificado)
  const tokenRaw = searchParams.get("token");
  const token = tokenRaw ? decodeURIComponent(tokenRaw) : null;

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    trigger,
    formState: { errors },
  } = useForm({
    mode: "onChange", // Validar mientras el usuario escribe
    reValidateMode: "onChange", // Revalidar cuando cambien los valores
  });

  // Observar ambos campos para revalidar cuando cambien
  const newPassword = watch("newPassword");
  const confirmPassword = watch("confirmNewPassword");

  useEffect(() => {
    if (!token) {
      setError("Token de restablecimiento no válido. Por favor, solicita un nuevo enlace.");
    }
  }, [token]);

  // Revalidar confirmNewPassword cuando cambie newPassword
  useEffect(() => {
    const confirmValue = getValues("confirmNewPassword");
    if (confirmValue) {
      trigger("confirmNewPassword");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newPassword]);

  const onSubmit = async (data) => {
    if (!token) {
      setError("Token de restablecimiento no válido. Por favor, solicita un nuevo enlace.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await authApi.resetPassword({
        token: token,
        newPassword: data.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      console.error("Error reseteando contraseña:", err);
      
      // Si el error es de validación de contraseña (400), el token sigue siendo válido
      // Solo mostrar error de token inválido si es específicamente ese error
      const errorMessage = err.response?.data?.message || "Error al restablecer la contraseña";
      
      // Si el error menciona "Token inválido" o "expirado", es un error de token
      // De lo contrario, es un error de validación y el token sigue válido
      if (errorMessage.includes("Token inválido") || errorMessage.includes("expirado")) {
        setError(errorMessage + " Por favor, solicita un nuevo enlace.");
      } else {
        // Error de validación de contraseña - el token sigue válido, puede reintentar
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 bg-base-crema flex items-center justify-center px-4 py-4 min-h-0 overflow-y-auto">
        <div className="max-w-md w-full space-y-3">
          <Card className="p-5 sm:p-6 text-center">
            <FaCheckCircle className="mx-auto text-green-500 mb-4" size={64} />
            <h2 className="text-2xl font-bold text-oscuro-negro mb-2">
              ¡Contraseña Restablecida!
            </h2>
            <p className="text-gray-600 mb-6">
              Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
            </p>
            <Link to="/login">
              <Button variant="primary" className="w-full">
                Ir a Iniciar Sesión
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-base-crema flex items-center justify-center px-4 py-4 min-h-0 overflow-y-auto">
      <div className="max-w-md w-full space-y-3">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-oscuro-negro">
            Restablecer Contraseña
          </h2>
          <p className="mt-2 text-sm text-oscuro-azulMarino">
            Ingresa tu nueva contraseña. Asegúrate de que cumpla con los requisitos de seguridad.
          </p>
        </div>

        <Card className="p-5 sm:p-6">
          {error && (
            <Alert
              type="error"
              message={error}
              onClose={() => setError(null)}
              className="mb-4"
            />
          )}

          {!token ? (
            <div className="text-center py-4">
              <p className="text-red-600 mb-4">
                Token de restablecimiento no válido o faltante.
              </p>
              <Link to="/forgot-password">
                <Button variant="primary" className="w-full">
                  Solicitar Nuevo Enlace
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Nueva Contraseña"
                name="newPassword"
                type="password"
                placeholder="Mín. 8 caracteres: Mayúscula, minúscula, número y símbolo"
                error={errors.newPassword?.message}
                required
                {...register("newPassword", {
                  required: "La nueva contraseña es requerida",
                  validate: (value) => {
                    if (!value || value.trim() === "") {
                      return "La nueva contraseña es requerida";
                    }
                    
                    const errors = [];
                    
                    if (value.length < 8) {
                      errors.push("al menos 8 caracteres");
                    }
                    if (!/[A-Z]/.test(value)) {
                      errors.push("una letra mayúscula (A-Z)");
                    }
                    if (!/[a-z]/.test(value)) {
                      errors.push("una letra minúscula (a-z)");
                    }
                    if (!/[0-9]/.test(value)) {
                      errors.push("un número (0-9)");
                    }
                    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
                      errors.push("un símbolo (!@#$%^&*...)");
                    }
                    
                    if (errors.length > 0) {
                      return `La contraseña debe contener: ${errors.join(", ")}. Ejemplo válido: MiPassword123!`;
                    }
                    
                    return true;
                  },
                })}
              />

              <Input
                label="Confirmar Nueva Contraseña"
                name="confirmNewPassword"
                type="password"
                placeholder="Confirma tu nueva contraseña"
                error={errors.confirmNewPassword?.message}
                required
                {...register("confirmNewPassword", {
                  required: "Debes confirmar tu nueva contraseña",
                  validate: (value) => {
                    // Usar getValues para obtener el valor actual de newPassword
                    // Esto asegura que siempre compare con el valor más reciente
                    const currentNewPassword = getValues("newPassword");
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

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                disabled={loading || !token}
                className="w-full"
              >
                Restablecer Contraseña
              </Button>

              <div className="text-center">
                <Link
                  to="/login"
                  className="text-sm text-acento-violetaManga hover:text-primary-600 inline-flex items-center gap-1"
                >
                  <FaArrowLeft size={12} />
                  Volver a Iniciar Sesión
                </Link>
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
