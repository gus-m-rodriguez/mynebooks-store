import { pool } from "../db.js";

/**
 * Middleware para verificar que el usuario es administrador (admin o super_admin)
 * Debe usarse DESPUÉS de isAuth
 */
export const isAdmin = async (req, res, next) => {
  // Verificar que el usuario esté autenticado
  if (!req.usuarioId) {
    return res.status(401).json({
      message: "No autorizado. Debe iniciar sesión primero.",
    });
  }

  // Verificar que sea administrador (admin o super_admin)
  if (req.usuarioRol !== "admin" && req.usuarioRol !== "super_admin") {
    return res.status(403).json({
      message: "Acceso denegado. Se requieren permisos de administrador.",
    });
  }

  // Obtener información completa del usuario para verificar es_super_admin
  try {
    const usuario = await pool.query(
      "SELECT es_super_admin, rol FROM usuarios WHERE id_usuario = $1",
      [req.usuarioId]
    );

    if (usuario.rowCount > 0) {
      req.esSuperAdmin = usuario.rows[0].es_super_admin === true && usuario.rows[0].rol === "super_admin";
    }
  } catch (error) {
    console.error("Error verificando super admin:", error);
  }

  next();
};
