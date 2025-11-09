import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Input, Alert, Card } from "../components/ui/index.js";

const LoginPage = () => {
  const navigate = useNavigate();
  const { signin, isAuth, errors: authErrors, loading: authLoading, setErrors } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Limpiar errores al montar y desmontar el componente
  useEffect(() => {
    setErrors(null);
    setError(null);
    return () => {
      setErrors(null);
      setError(null);
    };
  }, [setErrors]);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuth && !authLoading) {
      navigate("/catalogo");
    }
  }, [isAuth, authLoading, navigate]);

  // Mostrar errores del backend
  useEffect(() => {
    if (authErrors && authErrors.length > 0) {
      setError(authErrors[0]);
    } else {
      setError(null);
    }
  }, [authErrors]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);
      await signin(data);
      // Redirigir después de login exitoso al catálogo
      navigate("/catalogo");
    } catch (error) {
      console.error("Error en login:", error);
      // El error ya se maneja en AuthContext
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.data) {
        setError(Array.isArray(error.response.data) 
          ? error.response.data[0] 
          : error.response.data.message || "Error al iniciar sesión");
      } else {
        setError("Error al iniciar sesión. Por favor, intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-base-crema flex items-center justify-center px-4 py-4 min-h-0">
      <div className="max-w-md w-full space-y-3">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-oscuro-negro">
            Iniciar Sesión
          </h2>
          <p className="mt-2 text-sm text-oscuro-azulMarino">
            ¿No tienes una cuenta?{" "}
            <Link
              to="/register"
              className="font-medium text-acento-violetaManga hover:text-primary-600"
            >
              Regístrate aquí
            </Link>
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
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: "Debe ser un correo electrónico válido",
                },
              })}
            />
              {errors.email && (
                <p className="mt-0.5 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Contraseña <span className="text-red-500">*</span>
              </label>
            <Input
                id="password"
                name="password"
              type="password"
              placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
              {...register("password", {
                required: "La contraseña es requerida",
              })}
            />
              {errors.password && (
                <p className="mt-0.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Link
                to="/forgot-password"
                className="text-sm text-acento-violetaManga hover:text-primary-600"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              loading={loading}
              disabled={loading}
              className="w-full"
            >
              Iniciar Sesión
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
