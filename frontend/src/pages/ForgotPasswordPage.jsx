import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { authApi } from "../api/auth.api.js";
import { Button, Alert, Card, Input } from "../components/ui/index.js";
import { FaEnvelope, FaArrowLeft } from "react-icons/fa";

const ForgotPasswordPage = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      await authApi.forgotPassword(data.email);
      setSuccess(true);
    } catch (err) {
      console.error("Error solicitando reset:", err);
      setError(
        err.response?.data?.message ||
          "Error al procesar la solicitud. Por favor, intenta nuevamente."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-base-crema flex items-center justify-center px-4 py-4 min-h-0 overflow-y-auto">
      <div className="max-w-md w-full space-y-3">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-oscuro-negro">
            ¿Olvidaste tu contraseña?
          </h2>
          <p className="mt-2 text-sm text-oscuro-azulMarino">
            Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña
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

          {success ? (
            <div className="space-y-4">
              <div className="text-center py-4">
                <FaEnvelope className="mx-auto text-green-500 mb-4" size={48} />
                <h3 className="text-lg font-bold text-oscuro-azulMarino mb-2">
                  Email Enviado
                </h3>
                <p className="text-gray-600 text-sm">
                  Se ha enviado un enlace de recuperación a tu correo electrónico.
                </p>
                <p className="text-gray-600 text-sm mt-2">
                  Por favor, revisa tu bandeja de entrada y la carpeta de spam.
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <Link to="/login">
                  <Button variant="primary" className="w-full">
                    Volver a Iniciar Sesión
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setSuccess(false);
                    setError(null);
                  }}
                >
                  Enviar otro email
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@email.com"
                  autoComplete="email"
                  {...register("email", {
                    required: "El correo electrónico es requerido",
                    pattern: {
                      value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                      message: "Debe ser un correo electrónico válido",
                    },
                  })}
                />
                {errors.email && (
                  <p className="mt-0.5 text-xs text-red-600">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={loading}
                disabled={loading}
                className="w-full"
              >
                Enviar Enlace de Recuperación
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

export default ForgotPasswordPage;
