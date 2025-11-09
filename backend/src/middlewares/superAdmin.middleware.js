import { pool } from "../db.js";

/**
 * Middleware para verificar que el usuario es Super Administrador
 * Debe usarse DESPUÉS de isAuth
 */
export const isSuperAdmin = async (req, res, next) => {
  try {
    // Verificar que el usuario esté autenticado
    if (!req.usuarioId) {
      return res.status(401).json({
        message: "No autorizado. Debe iniciar sesión primero.",
      });
    }

    // Obtener información completa del usuario desde la BD
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

    // Verificar que sea super admin
    if (!usuarioData.es_super_admin || usuarioData.rol !== "super_admin") {
      return res.status(403).json({
        message: "Acceso denegado. Se requieren permisos de Super Administrador.",
      });
    }

    // Agregar información al request
    req.esSuperAdmin = true;
    next();
  } catch (error) {
    console.error("Error en isSuperAdmin:", error);
    return res.status(500).json({
      message: "Error al verificar permisos",
    });
  }
};

