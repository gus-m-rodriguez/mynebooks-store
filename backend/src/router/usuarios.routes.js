import Router from "express-promise-router";
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarRolPermisos,
  listarPermisos,
} from "../controllers/usuarios.controller.js";
import { isAuth } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import { hasPermission } from "../middlewares/permissions.middleware.js";
import { validateSchema } from "../middlewares/validate.middleware.js";
import { crearUsuarioSchema, actualizarRolPermisosSchema } from "../schemas/usuarios.schema.js";

const router = Router();

// Todas las rutas requieren autenticación y ser admin
router.use(isAuth);
router.use(isAdmin);

// Listar usuarios (requiere permiso: Usuarios)
router.get("/", hasPermission("Usuarios"), listarUsuarios);

// Listar permisos disponibles
router.get("/permisos", listarPermisos);

// Obtener usuario específico (requiere permiso: Usuarios)
router.get("/:id", hasPermission("Usuarios"), obtenerUsuario);

// Crear usuario (requiere permiso: Usuarios)
router.post("/", hasPermission("Usuarios"), validateSchema(crearUsuarioSchema), crearUsuario);

// Actualizar rol y permisos (requiere permiso: Usuarios)
// Solo super admin puede modificar roles/permisos de otros admins
// Admin normal puede asignar permisos a usuarios no-admin
router.put("/:id/rol-permisos", hasPermission("Usuarios"), validateSchema(actualizarRolPermisosSchema), actualizarRolPermisos);

export default router;

