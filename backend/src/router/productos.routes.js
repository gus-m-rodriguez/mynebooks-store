import Router from "express-promise-router";
import {
  listarProductos,
  obtenerProducto,
  buscarProductos,
  listarNovedades,
  listarPromociones,
  obtenerProductosRelacionados,
  listarCategorias,
} from "../controllers/productos.controller.js";

const router = Router();

// Rutas públicas
router.get("/", listarProductos);
router.get("/buscar", buscarProductos);
router.get("/novedades", listarNovedades);
router.get("/promociones", listarPromociones);
router.get("/categorias", listarCategorias);
router.get("/:id", obtenerProducto);
router.get("/:id/relacionados", obtenerProductosRelacionados);

export default router;

