import Joi from "joi";

export const productoSchema = Joi.object({
  titulo: Joi.string().min(1).max(200).required().messages({
    "string.min": "El título es requerido",
    "string.max": "El título no puede exceder 200 caracteres",
    "any.required": "El título es requerido",
  }),
  autor: Joi.string().min(1).max(150).required().messages({
    "string.min": "El autor es requerido",
    "string.max": "El autor no puede exceder 150 caracteres",
    "any.required": "El autor es requerido",
  }),
  categoria: Joi.string().max(100).allow("").optional(),
  precio: Joi.number().positive().required().messages({
    "number.positive": "El precio debe ser un número positivo",
    "any.required": "El precio es requerido",
  }),
  precio_promocional: Joi.number().positive().optional().allow(null, "").messages({
    "number.positive": "El precio promocional debe ser un número positivo",
  }).custom((value, helpers) => {
    const precio = helpers.state.ancestors[0].precio;
    if (value !== null && value !== "" && precio && value >= precio) {
      return helpers.message("El precio promocional debe ser menor que el precio regular");
    }
    return value;
  }),
  stock: Joi.number().integer().min(0).required().messages({
    "number.integer": "El stock debe ser un número entero",
    "number.min": "El stock no puede ser negativo",
    "any.required": "El stock es requerido",
  }),
  imagen_url: Joi.string().uri().allow("").optional().messages({
    "string.uri": "Debe ser una URL válida",
  }),
  descripcion: Joi.string().max(5000).allow(null, "").optional().messages({
    "string.max": "La descripción no puede exceder 5000 caracteres",
  }),
});

