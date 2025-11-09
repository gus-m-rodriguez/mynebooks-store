import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { useAuth } from "../context/AuthContext.jsx";
import { Button, Input, Alert, Card } from "../components/ui/index.js";

const RegisterPage = () => {
  const navigate = useNavigate();
  const { signup, isAuth, errors: authErrors, loading: authLoading, setErrors } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    getValues,
    trigger,
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

  // Observar el valor de password para revalidar confirmPassword cuando cambie
  const password = watch("password");
  
  useEffect(() => {
    // Revalidar confirmPassword cuando cambie password
    if (password) {
      const confirmPasswordValue = getValues("confirmPassword");
      if (confirmPasswordValue) {
        trigger("confirmPassword");
      }
    }
  }, [password, getValues, trigger]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      setError(null);

      // Validar que las contraseñas coincidan (validación del frontend)
      if (data.password !== data.confirmPassword) {
        setError("Las contraseñas no coinciden");
        setLoading(false);
        return;
      }

      // Preparar datos para el backend
      const signupData = {
        nombre: data.nombre,
        apellido: data.apellido || "",
        email: data.email,
        password: data.password,
        direccion_envio: data.direccion_envio || null,
      };

      await signup(signupData);
      // Redirigir después de registro exitoso al catálogo
      navigate("/catalogo");
    } catch (error) {
      console.error("Error en registro:", error);
      
      // Mostrar errores del backend
      if (error.response?.data?.message) {
        setError(error.response.data.message);
      } else if (error.response?.status === 409) {
        setError("Este correo electrónico ya está registrado. ¿Ya tienes una cuenta? Intenta iniciar sesión.");
      } else if (!error.response) {
        // Error de red
        if (error.code === 'ERR_NETWORK' || error.message?.includes('Network Error') || error.message?.includes('ERR_CONNECTION_RESET')) {
          setError("Error de conexión. Verifica tu conexión a internet e intenta nuevamente.");
        } else {
          setError("Error de conexión. Por favor, intenta nuevamente.");
        }
      } else {
        setError("Error al registrarse. Por favor, intenta nuevamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 bg-base-crema flex items-center justify-center px-4 py-4 min-h-0 overflow-y-auto">
      <div className="max-w-md w-full space-y-3">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-oscuro-negro">
            Crear Cuenta
          </h2>
          <p className="mt-2 text-sm text-oscuro-azulMarino">
            ¿Ya tienes una cuenta?{" "}
            <Link
              to="/login"
              className="font-medium text-acento-violetaManga hover:text-primary-600"
            >
              Inicia sesión aquí
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="nombre" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
            <Input
                  id="nombre"
                  name="nombre"
              type="text"
              placeholder="Tu nombre"
                  autoComplete="given-name"
              {...register("nombre", {
                required: "El nombre es requerido",
              })}
            />
                {errors.nombre && (
                  <p className="mt-0.5 text-xs text-red-600">{errors.nombre.message}</p>
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
                placeholder="Tu apellido"
                  autoComplete="family-name"
                {...register("apellido", {
                  required: "El apellido es requerido",
                })}
              />
                {errors.apellido && (
                  <p className="mt-0.5 text-xs text-red-600">{errors.apellido.message}</p>
                )}
              </div>
            </div>

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
              placeholder="Mín. 8 caracteres: Mayúscula, minúscula, número y símbolo"
                autoComplete="new-password"
              {...register("password", {
                required: "La contraseña es requerida",
              })}
            />
              {errors.password && (
                <p className="mt-0.5 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Confirmar Contraseña <span className="text-red-500">*</span>
              </label>
            <Input
                id="confirmPassword"
                name="confirmPassword"
              type="password"
              placeholder="Confirma tu contraseña"
                autoComplete="new-password"
              {...register("confirmPassword", {
                required: "Debes confirmar tu contraseña",
                validate: (value) => {
                    const currentPassword = getValues("password");
                    if (value !== currentPassword) {
                    return "Las contraseñas no coinciden";
                  }
                  return true;
                },
              })}
            />
              {errors.confirmPassword && (
                <p className="mt-0.5 text-xs text-red-600">{errors.confirmPassword.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="direccion_envio" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Dirección de Envío (Opcional)
              </label>
            <Input
                id="direccion_envio"
                name="direccion_envio"
              type="text"
              placeholder="Calle, número, ciudad, código postal"
              {...register("direccion_envio", {
                maxLength: {
                  value: 500,
                  message: "La dirección no puede exceder 500 caracteres",
                },
              })}
            />
              {errors.direccion_envio && (
                <p className="mt-0.5 text-xs text-red-600">{errors.direccion_envio.message}</p>
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
              Registrarse
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
