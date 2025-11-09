import Router from "express-promise-router";
import {
  listarOrdenes,
  obtenerOrden,
  crearOrden,
  iniciarPago,
  actualizarEstadoOrden,
  verificarPago,
  eliminarItemOrden,
} from "../controllers/ordenes.controller.js";
import { isAuth } from "../middlewares/auth.middleware.js";
import { validateSchema } from "../middlewares/validate.middleware.js";
import { actualizarEstadoSchema } from "../schemas/ordenes.schema.js";

const router = Router();

// Rutas de usuario autenticado
router.use(isAuth);

router.get("/", listarOrdenes);
router.get("/:id", obtenerOrden);
router.post("/", crearOrden);
router.post("/:id/iniciar-pago", iniciarPago); // Iniciar proceso de pago (reserva stock)
router.post("/:id/verificar-pago", verificarPago); // Verificar estado del pago con Mercado Pago

// Actualizar estado (solo admin, pero lo manejamos en el controller)
router.patch("/:id/estado", validateSchema(actualizarEstadoSchema), actualizarEstadoOrden);

// Eliminar item individual de una orden
router.delete("/:id/items/:itemId", eliminarItemOrden);

export default router;

