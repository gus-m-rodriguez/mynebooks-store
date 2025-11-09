import Joi from "joi";

export const signupSchema = Joi.object({
  nombre: Joi.string().min(3).max(100).required().messages({
    "string.min": "El nombre debe tener al menos 3 caracteres",
    "string.max": "El nombre no puede exceder 100 caracteres",
    "any.required": "El nombre es requerido",
  }),
  apellido: Joi.string().max(100).optional().allow("").messages({
    "string.max": "El apellido no puede exceder 100 caracteres",
  }),
  email: Joi.string().email().required().messages({
    "string.email": "Debe ser un email válido",
    "any.required": "El email es requerido",
  }),
  password: Joi.string().min(6).required().messages({
    "string.min": "La contraseña debe tener al menos 6 caracteres",
    "any.required": "La contraseña es requerida",
  }),
  direccion_envio: Joi.string().max(500).optional().allow(null, "").messages({
    "string.max": "La dirección de envío no puede exceder 500 caracteres",
  }),
});

export const signinSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Debe ser un email válido",
    "any.required": "El email es requerido",
  }),
  password: Joi.string().required().messages({
    "any.required": "La contraseña es requerida",
  }),
});

export const forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({
    "string.email": "Debe ser un email válido",
    "any.required": "El email es requerido",
  }),
});

export const resetPasswordSchema = Joi.object({
  token: Joi.string().required().messages({
    "any.required": "El token es requerido",
  }),
  newPassword: Joi.string().min(6).required().messages({
    "string.min": "La contraseña debe tener al menos 6 caracteres",
    "any.required": "La nueva contraseña es requerida",
  }),
});

