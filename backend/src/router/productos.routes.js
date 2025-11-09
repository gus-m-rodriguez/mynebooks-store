import Router from "express-promise-router";
import {
  listarProductos,
  obtenerProducto,
  buscarProductos,
  listarNovedades,
  listarPromociones,
  obtenerProductosRelacionados,
} from "../controllers/productos.controller.js";

const router = Router();

// Rutas públicas
router.get("/", listarProductos);
router.get("/buscar", buscarProductos);
router.get("/novedades", listarNovedades);
router.get("/promociones", listarPromociones);
router.get("/:id", obtenerProducto);
router.get("/:id/relacionados", obtenerProductosRelacionados);

export default router;

