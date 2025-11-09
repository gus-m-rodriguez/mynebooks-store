import Joi from "joi";

export const actualizarOrdenDesdePagoSchema = Joi.object({
  nuevo_estado: Joi.string()
    .valid("pagado", "cancelado", "rechazado")
    .required()
    .messages({
      "any.only": "El nuevo_estado debe ser uno de: pagado, cancelado, rechazado",
      "any.required": "El nuevo_estado es requerido",
    }),
});


