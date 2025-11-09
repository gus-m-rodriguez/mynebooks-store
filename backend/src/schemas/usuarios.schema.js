import Joi from "joi";

export const crearUsuarioSchema = Joi.object({
  nombre: Joi.string().min(3).max(100).required().messages({
    "string.min": "El nombre debe tener al menos 3 caracteres",
    "string.max": "El nombre no puede exceder 100 caracteres",
    "any.required": "El nombre es requerido",
  }),
  apellido: Joi.string().min(3).max(100).required().messages({
    "string.min": "El apellido debe tener al menos 3 caracteres",
    "string.max": "El apellido no puede exceder 100 caracteres",
    "any.required": "El apellido es requerido",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "El email debe ser válido",
    "any.required": "El email es requerido",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "La contraseña debe tener al menos 6 caracteres",
    "any.required": "La contraseña es requerida",
  }),
  rol: Joi.string().valid("cliente", "admin").optional().messages({
    "any.only": "El rol debe ser 'cliente' o 'admin'",
  }),
});

export const actualizarRolPermisosSchema = Joi.object({
  rol: Joi.string().valid("cliente", "admin").optional().messages({
    "any.only": "El rol debe ser 'cliente' o 'admin'",
  }),
  permisos: Joi.array()
    .items(Joi.string().valid("Dashboard", "Productos", "Ordenes", "Usuarios", "Ingresos", "Auditoria"))
    .optional()
    .messages({
      "array.base": "Los permisos deben ser un array",
      "any.only": "Permiso inválido",
    }),
});


