import Joi from "joi";

export const crearOrdenSchema = Joi.object({
  direccion_envio: Joi.string().min(10).max(500).optional().allow(null, "").messages({
    "string.min": "La dirección debe tener al menos 10 caracteres",
    "string.max": "La dirección no puede exceder 500 caracteres",
  }),
  // metodo_pago: Siempre será Mercado Pago en esta versión (no se envía en el request)
});

export const actualizarEstadoSchema = Joi.object({
  estado: Joi.string()
    .valid("pendiente", "en_pago", "pagado", "en_envio", "entregada", "cancelado", "cancelada_usuario", "cancelada_administrador", "cancelada_mp", "rechazado", "error", "expirada")
    .required()
    .messages({
      "any.only": "El estado debe ser uno de: pendiente, en_pago, pagado, en_envio, entregada, cancelado, cancelada_usuario, cancelada_administrador, cancelada_mp, rechazado, error, expirada",
      "any.required": "El estado es requerido",
    }),
});

