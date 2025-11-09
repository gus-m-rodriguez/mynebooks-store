import { pool } from "../db.js";
import bcrypt from "bcrypt";

/**
 * Listar todos los usuarios (solo admin)
 * Super admin ve todos, admin normal ve todos excepto otros admins
 */
export const listarUsuarios = async (req, res) => {
  try {
    let query;
    let params = [];

    // Si es super admin, ver todos
    // Si es admin normal, ver todos excepto otros admins
    if (req.esSuperAdmin) {
      query = `SELECT id_usuario, nombre, apellido, email, rol, es_super_admin
               FROM usuarios
               ORDER BY es_super_admin DESC, rol, nombre ASC`;
    } else {
      query = `SELECT id_usuario, nombre, apellido, email, rol, es_super_admin
               FROM usuarios
               WHERE rol != 'admin' AND rol != 'super_admin'
               ORDER BY nombre ASC`;
    }

    const resultado = await pool.query(query, params);
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

/**
 * Obtener un usuario específico con sus permisos (solo admin)
 */
export const obtenerUsuario = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar que el usuario existe
    const usuario = await pool.query(
      "SELECT id_usuario, nombre, apellido, email, rol, es_super_admin FROM usuarios WHERE id_usuario = $1",
      [id]
    );

    if (usuario.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuarioData = usuario.rows[0];

    // Admin normal solo puede ver sus propios datos (no otros admins)
    if (!req.esSuperAdmin) {
      // Si el usuario que hace la petición es admin normal, solo puede ver sus propios datos
      if (req.usuarioRol === "admin" && parseInt(id) !== req.usuarioId) {
        return res.status(403).json({
          message: "Solo puedes ver tus propios datos",
        });
      }
      // Admin normal no puede ver otros admins o super admins
      if (usuarioData.rol === "admin" || usuarioData.rol === "super_admin") {
        if (parseInt(id) !== req.usuarioId) {
          return res.status(403).json({
            message: "No tienes permisos para ver este usuario",
          });
        }
      }
    }

    // Obtener permisos del usuario (si es admin)
    let permisos = [];
    if (usuarioData.rol === "admin" || usuarioData.rol === "super_admin") {
      // Si es super admin, siempre devolver todos los permisos disponibles
      if (usuarioData.es_super_admin || usuarioData.rol === "super_admin") {
        const todosLosPermisos = await pool.query(
          `SELECT id_permiso, nombre_permiso, descripcion
           FROM permisos
           ORDER BY nombre_permiso`
        );
        permisos = todosLosPermisos.rows;
      } else {
        // Admin normal: obtener permisos asignados
        const permisosData = await pool.query(
          `SELECT p.id_permiso, p.nombre_permiso, p.descripcion
           FROM permisos p
           INNER JOIN permisos_usuarios pu ON p.id_permiso = pu.id_permiso
           WHERE pu.id_usuario = $1
           ORDER BY p.nombre_permiso`,
          [id]
        );
        permisos = permisosData.rows;
      }
    }

    res.json({
      ...usuarioData,
      permisos: permisos,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener el usuario" });
  }
};

/**
 * Crear nuevo usuario (solo admin)
 * NO permite crear super admin (solo puede haber uno)
 */
export const crearUsuario = async (req, res) => {
  try {
    const { nombre, apellido, email, password, rol } = req.body;

    // Validaciones
    if (!nombre || !apellido || !email || !password) {
      return res.status(400).json({
        message: "Debe proporcionar nombre, apellido, email y password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 6 caracteres",
      });
    }

    // Validar rol
    const rolesValidos = ["cliente", "admin"];
    if (rol && !rolesValidos.includes(rol)) {
      return res.status(400).json({
        message: `Rol inválido. Debe ser uno de: ${rolesValidos.join(", ")}`,
      });
    }

    // NO permitir crear super admin
    if (rol === "super_admin") {
      return res.status(403).json({
        message: "No se puede crear un Super Administrador desde esta función",
      });
    }

    // Verificar que el email no exista
    const existe = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE email = $1",
      [email]
    );

    if (existe.rowCount > 0) {
      return res.status(409).json({
        message: "El correo ya está registrado",
      });
    }

    // Hash de contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const resultado = await pool.query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, es_super_admin)
       VALUES ($1, $2, $3, $4, $5, false)
       RETURNING id_usuario, nombre, apellido, email, rol, es_super_admin`,
      [nombre, apellido, email, hashedPassword, rol || "cliente"]
    );

    const nuevoUsuario = resultado.rows[0];

    // Si el usuario es admin, asignar automáticamente el permiso Dashboard
    if (nuevoUsuario.rol === "admin") {
      const dashboardPermiso = await pool.query(
        "SELECT id_permiso FROM permisos WHERE nombre_permiso = 'Dashboard'"
      );
      
      if (dashboardPermiso.rowCount > 0) {
        await pool.query(
          "INSERT INTO permisos_usuarios (id_usuario, id_permiso) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [nuevoUsuario.id_usuario, dashboardPermiso.rows[0].id_permiso]
        );
      }
    }

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["usuario_creado", `admin_${req.usuarioId}`]
    );

    res.status(201).json(nuevoUsuario);
  } catch (error) {
    console.error(error);
    if (error.code === "23505") {
      return res.status(409).json({
        message: "El correo ya está registrado",
      });
    }
    res.status(500).json({ message: "Error al crear el usuario" });
  }
};

/**
 * Actualizar rol y permisos de un usuario (solo super admin puede cambiar roles de admins)
 * Admin normal puede asignar permisos a usuarios no-admin
 */
export const actualizarRolPermisos = async (req, res) => {
  try {
    const { id } = req.params;
    const { rol, permisos } = req.body;

    // Verificar que el usuario existe
    const usuarioActual = await pool.query(
      "SELECT id_usuario, nombre, apellido, email, rol, es_super_admin FROM usuarios WHERE id_usuario = $1",
      [id]
    );

    if (usuarioActual.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    const usuarioData = usuarioActual.rows[0];

    // NO permitir modificar al super admin (ni roles ni permisos)
    if (usuarioData.es_super_admin) {
      return res.status(403).json({
        message: "No se puede modificar al Administrador General. El Super Admin siempre tiene todos los permisos habilitados.",
      });
    }
    
    // NO permitir que el super admin modifique sus propios permisos
    if (req.esSuperAdmin && parseInt(id) === req.usuarioId) {
      return res.status(403).json({
        message: "El Super Administrador siempre tiene todos los permisos habilitados y no pueden ser modificados",
      });
    }

    // Si el usuario que hace la petición es admin normal (no super admin), no puede modificar roles ni permisos
    if (req.usuarioRol === "admin" && !req.esSuperAdmin) {
      return res.status(403).json({
        message: "Los administradores normales no pueden modificar roles ni permisos",
      });
    }
    
    // Si el usuario objetivo es admin, solo super admin puede modificar su rol/permisos
    if (usuarioData.rol === "admin" && !req.esSuperAdmin) {
      return res.status(403).json({
        message: "Solo el Super Administrador puede modificar roles y permisos de administradores",
      });
    }

    // Actualizar rol si se proporciona
    if (rol) {
      const rolesValidos = ["cliente", "admin"];
      if (!rolesValidos.includes(rol)) {
        return res.status(400).json({
          message: `Rol inválido. Debe ser uno de: ${rolesValidos.join(", ")}`,
        });
      }

      // NO permitir cambiar a super_admin
      if (rol === "super_admin") {
        return res.status(403).json({
          message: "No se puede asignar el rol de Super Administrador",
        });
      }

      // Si se cambia de admin a cliente, eliminar todos los permisos
      if (usuarioData.rol === "admin" && rol === "cliente") {
        await pool.query(
          "DELETE FROM permisos_usuarios WHERE id_usuario = $1",
          [id]
        );
      }

      await pool.query(
        "UPDATE usuarios SET rol = $1 WHERE id_usuario = $2",
        [rol, id]
      );
    }

    // Actualizar permisos solo si el usuario es o será admin
    const nuevoRol = rol || usuarioData.rol;
    if (nuevoRol === "admin" && permisos !== undefined) {
      // Validar que los permisos existan
      if (!Array.isArray(permisos)) {
        return res.status(400).json({
          message: "Los permisos deben ser un array",
        });
      }

      // Verificar que todos los permisos sean válidos
      const permisosValidos = await pool.query(
        "SELECT nombre_permiso FROM permisos"
      );
      const nombresPermisos = permisosValidos.rows.map((p) => p.nombre_permiso);

      console.log("Permisos recibidos:", permisos);
      console.log("Permisos válidos en BD:", nombresPermisos);

      for (const permiso of permisos) {
        if (!nombresPermisos.includes(permiso)) {
          console.error(`Permiso inválido detectado: "${permiso}"`);
          console.error("Permisos disponibles:", nombresPermisos);
          return res.status(400).json({
            message: `Permiso inválido: ${permiso}`,
            permisosDisponibles: nombresPermisos,
          });
        }
      }

      // Eliminar permisos actuales
      await pool.query(
        "DELETE FROM permisos_usuarios WHERE id_usuario = $1",
        [id]
      );

      // Asegurar que Dashboard esté siempre incluido para admins
      if (nuevoRol === "admin" && !permisos.includes("Dashboard")) {
        permisos.push("Dashboard");
      }

      // Agregar nuevos permisos
      for (const nombrePermiso of permisos) {
        const permisoData = await pool.query(
          "SELECT id_permiso FROM permisos WHERE nombre_permiso = $1",
          [nombrePermiso]
        );

        if (permisoData.rowCount > 0) {
          await pool.query(
            "INSERT INTO permisos_usuarios (id_usuario, id_permiso) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [id, permisoData.rows[0].id_permiso]
          );
        }
      }
    }

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["rol_permisos_actualizados", `admin_${req.usuarioId}`]
    );

    // Obtener usuario actualizado
    const usuarioActualizado = await pool.query(
      "SELECT id_usuario, nombre, apellido, email, rol, es_super_admin FROM usuarios WHERE id_usuario = $1",
      [id]
    );

    // Obtener permisos actualizados
    let permisosActualizados = [];
    const usuarioFinal = usuarioActualizado.rows[0];
    if (usuarioFinal.es_super_admin || usuarioFinal.rol === "super_admin") {
      // Super admin siempre tiene todos los permisos
      const todosLosPermisos = await pool.query(
        "SELECT nombre_permiso FROM permisos ORDER BY nombre_permiso"
      );
      permisosActualizados = todosLosPermisos.rows.map((p) => p.nombre_permiso);
    } else if (nuevoRol === "admin") {
      const permisosData = await pool.query(
        `SELECT p.nombre_permiso
         FROM permisos p
         INNER JOIN permisos_usuarios pu ON p.id_permiso = pu.id_permiso
         WHERE pu.id_usuario = $1
         ORDER BY p.nombre_permiso`,
        [id]
      );
      permisosActualizados = permisosData.rows.map((p) => p.nombre_permiso);
    }

    res.json({
      ...usuarioActualizado.rows[0],
      permisos: permisosActualizados,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al actualizar rol y permisos" });
  }
};

/**
 * Eliminar cuenta propia (usuario puede eliminar su propia cuenta)
 * NO se puede eliminar el super admin
 */
export const eliminarMiCuenta = async (req, res) => {
  try {
    const usuarioId = req.usuarioId;

    // Verificar que el usuario existe
    const usuario = await pool.query(
      "SELECT id_usuario, es_super_admin FROM usuarios WHERE id_usuario = $1",
      [usuarioId]
    );

    if (usuario.rowCount === 0) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }

    // NO permitir eliminar al super admin
    if (usuario.rows[0].es_super_admin) {
      return res.status(403).json({
        message: "El Administrador General no puede eliminar su cuenta",
      });
    }

    // Eliminar usuario (CASCADE eliminará carrito, órdenes, etc.)
    await pool.query("DELETE FROM usuarios WHERE id_usuario = $1", [usuarioId]);

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["cuenta_eliminada", `usuario_${usuarioId}`]
    );

    // Limpiar cookie
    res.clearCookie("token", {
      path: "/",
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    });

    res.json({ message: "Cuenta eliminada correctamente" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al eliminar la cuenta" });
  }
};

/**
 * Listar todos los permisos disponibles
 */
export const listarPermisos = async (req, res) => {
  try {
    const resultado = await pool.query(
      "SELECT id_permiso, nombre_permiso, descripcion FROM permisos ORDER BY nombre_permiso"
    );

    // Asegurar codificación UTF-8
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.json(resultado.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error al obtener permisos" });
  }
};

