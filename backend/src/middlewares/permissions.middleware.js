import { pool } from "../db.js";

/**
 * Middleware para verificar que el usuario tiene un permiso específico
 * Los super admins tienen todos los permisos automáticamente
 * Debe usarse DESPUÉS de isAuth
 * 
 * @param {string} permiso - Nombre del permiso requerido
 */
export const hasPermission = (permiso) => {
  return async (req, res, next) => {
    try {
      // Verificar que el usuario esté autenticado
      if (!req.usuarioId) {
        return res.status(401).json({
          message: "No autorizado. Debe iniciar sesión primero.",
        });
      }

      // Obtener información del usuario
      const usuario = await pool.query(
        "SELECT id_usuario, rol, es_super_admin FROM usuarios WHERE id_usuario = $1",
        [req.usuarioId]
      );

      if (usuario.rowCount === 0) {
        return res.status(404).json({
          message: "Usuario no encontrado",
        });
      }

      const usuarioData = usuario.rows[0];

      // Super admin tiene todos los permisos
      if (usuarioData.es_super_admin && usuarioData.rol === "super_admin") {
        req.tienePermiso = true;
        return next();
      }

      // Verificar que sea admin (solo admins pueden tener permisos)
      if (usuarioData.rol !== "admin") {
        return res.status(403).json({
          message: "Acceso denegado. Se requieren permisos de administrador.",
        });
      }

      // Verificar si tiene el permiso específico
      const permisoData = await pool.query(
        `SELECT p.id_permiso 
         FROM permisos p
         INNER JOIN permisos_usuarios pu ON p.id_permiso = pu.id_permiso
         WHERE pu.id_usuario = $1 AND p.nombre_permiso = $2`,
        [req.usuarioId, permiso]
      );

      if (permisoData.rowCount === 0) {
        return res.status(403).json({
          message: `Acceso denegado. Se requiere el permiso: ${permiso}`,
        });
      }

      req.tienePermiso = true;
      next();
    } catch (error) {
      console.error("Error en hasPermission:", error);
      return res.status(500).json({
        message: "Error al verificar permisos",
      });
    }
  };
};

/**
 * Función helper para verificar permisos en código (no como middleware)
 */
export const verificarPermiso = async (usuarioId, permiso) => {
  try {
    // Verificar si es super admin
    const usuario = await pool.query(
      "SELECT es_super_admin, rol FROM usuarios WHERE id_usuario = $1",
      [usuarioId]
    );

    if (usuario.rowCount === 0) return false;

    const usuarioData = usuario.rows[0];

    // Super admin tiene todos los permisos
    if (usuarioData.es_super_admin && usuarioData.rol === "super_admin") {
      return true;
    }

    // Verificar permiso específico
    const permisoData = await pool.query(
      `SELECT p.id_permiso 
       FROM permisos p
       INNER JOIN permisos_usuarios pu ON p.id_permiso = pu.id_permiso
       WHERE pu.id_usuario = $1 AND p.nombre_permiso = $2`,
      [usuarioId, permiso]
    );

    return permisoData.rowCount > 0;
  } catch (error) {
    console.error("Error en verificarPermiso:", error);
    return false;
  }
};


