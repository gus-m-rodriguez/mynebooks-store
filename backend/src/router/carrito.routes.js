import Router from "express-promise-router";
import {
  obtenerCarrito,
  agregarProducto,
  actualizarCantidad,
  eliminarProducto,
  vaciarCarrito,
} from "../controllers/carrito.controller.js";
import { isAuth } from "../middlewares/auth.middleware.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(isAuth);

router.get("/", obtenerCarrito);
router.post("/agregar", agregarProducto);
router.put("/:productoId", actualizarCantidad);
router.delete("/:productoId", eliminarProducto);
router.delete("/", vaciarCarrito);

export default router;


