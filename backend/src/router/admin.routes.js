import Router from "express-promise-router";
import {
  listarProductosAdmin,
  crearProducto,
  actualizarProducto,
  eliminarProducto,
  listarOrdenesAdmin,
  generarCatalogoPDF,
  listarLogsAuditoria,
  misAccionesLogs,
  exportarLogs,
  listarPagos,
  obtenerPago,
  actualizarOrdenDesdePago,
} from "../controllers/admin.controller.js";
import { uploadImage, uploadSingle, handleMulterError } from "../controllers/upload.controller.js";
import { isAuth } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import { isSuperAdmin } from "../middlewares/superAdmin.middleware.js";
import { hasPermission } from "../middlewares/permissions.middleware.js";
import { validateSchema } from "../middlewares/validate.middleware.js";
import { productoSchema } from "../schemas/productos.schema.js";
import { actualizarOrdenDesdePagoSchema } from "../schemas/pagos.schema.js";

const router = Router();

// Todas las rutas requieren autenticación Y ser administrador
router.use(isAuth);
router.use(isAdmin);

// Gestión de productos (requiere permiso: Productos)
router.get("/productos", hasPermission("Productos"), listarProductosAdmin);
router.post("/productos", hasPermission("Productos"), validateSchema(productoSchema), crearProducto);
router.put("/productos/:id", hasPermission("Productos"), validateSchema(productoSchema), actualizarProducto);
router.delete("/productos/:id", hasPermission("Productos"), eliminarProducto);

// Subida de imágenes (requiere permiso: Productos)
// Nota: uploadSingle debe ir antes de uploadImage para procesar el archivo
// handleMulterError maneja errores de multer (tamaño de archivo, etc.)
router.post("/upload/image", hasPermission("Productos"), uploadSingle, handleMulterError, uploadImage);

// Generación de catálogo PDF (requiere permiso: Productos)
router.get("/catalogo/pdf", hasPermission("Productos"), generarCatalogoPDF);

// Gestión de órdenes (requiere permiso: Ordenes)
router.get("/ordenes", hasPermission("Ordenes"), listarOrdenesAdmin);

// Gestión de pagos (requiere permiso: Ingresos)
router.get("/pagos", hasPermission("Ingresos"), listarPagos);
router.get("/pagos/:id", hasPermission("Ingresos"), obtenerPago);
router.patch("/pagos/:id/actualizar-orden", hasPermission("Ingresos"), validateSchema(actualizarOrdenDesdePagoSchema), actualizarOrdenDesdePago);

// Logs de auditoría (requiere permiso: Auditoria)
router.get("/logs", hasPermission("Auditoria"), listarLogsAuditoria);
router.get("/logs/export", hasPermission("Auditoria"), exportarLogs);

// Logs de acciones propias (para admins)
router.get("/logs/mis-acciones", misAccionesLogs);

export default router;

