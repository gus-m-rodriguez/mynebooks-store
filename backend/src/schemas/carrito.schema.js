import Joi from "joi";

export const agregarCarritoSchema = Joi.object({
  producto_id: Joi.number().integer().positive().required().messages({
    "number.integer": "El producto_id debe ser un número entero",
    "number.positive": "El producto_id debe ser positivo",
    "any.required": "El producto_id es requerido",
  }),
  cantidad: Joi.number().integer().min(1).required().messages({
    "number.integer": "La cantidad debe ser un número entero",
    "number.min": "La cantidad debe ser al menos 1",
    "any.required": "La cantidad es requerida",
  }),
});

export const actualizarCantidadSchema = Joi.object({
  cantidad: Joi.number().integer().min(0).max(10000).required().messages({
    "number.integer": "La cantidad debe ser un número entero",
    "number.min": "La cantidad debe ser mayor o igual a 0 (0 elimina el producto del carrito)",
    "number.max": "La cantidad no puede exceder 10000",
    "any.required": "La cantidad es requerida",
  }),
});

