import { pool } from "../db.js";
import bcrypt from "bcrypt";
import { createAccessToken } from "../libs/jwt.js";
import { BLOQUEO_TTL_MINUTOS } from "../config.js";

// SIGN IN
export const signin = async (req, res) => {
  const { email, password } = req.body;

  const result = await pool.query(
    "SELECT id_usuario, nombre, apellido, email, password_hash, direccion_envio, rol, es_super_admin, intentos_fallidos, cuenta_bloqueada_hasta FROM usuarios WHERE email = $1",
    [email]
  );

  if (result.rowCount === 0) {
    // Registrar intento de acceso con email inexistente en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["intento_acceso_email_inexistente", `email_${email}`]
    );
    return res.status(400).json({ message: "El correo no está registrado" });
  }

  const usuario = result.rows[0];
  const ahora = new Date();
  const cuentaBloqueadaHasta = usuario.cuenta_bloqueada_hasta ? new Date(usuario.cuenta_bloqueada_hasta) : null;

  // Verificar si la cuenta está bloqueada
  if (cuentaBloqueadaHasta && cuentaBloqueadaHasta > ahora) {
    // Calcular minutos restantes de bloqueo
    const minutosRestantes = Math.ceil((cuentaBloqueadaHasta - ahora) / (1000 * 60));
    
    // Registrar intento de acceso a cuenta bloqueada en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["intento_acceso_cuenta_bloqueada", `usuario_${usuario.id_usuario}`]
    );
    
    return res.status(423).json({ 
      message: `Cuenta bloqueada temporalmente. Intenta nuevamente en ${minutosRestantes} minuto(s).`,
      cuenta_bloqueada: true,
      minutos_restantes: minutosRestantes
    });
  }

  // Si el bloqueo expiró, resetear los campos
  if (cuentaBloqueadaHasta && cuentaBloqueadaHasta <= ahora) {
    await pool.query(
      "UPDATE usuarios SET intentos_fallidos = 0, cuenta_bloqueada_hasta = NULL WHERE id_usuario = $1",
      [usuario.id_usuario]
    );
    usuario.intentos_fallidos = 0;
    usuario.cuenta_bloqueada_hasta = null;
  }

  const validPassword = await bcrypt.compare(
    password,
    usuario.password_hash
  );

  if (!validPassword) {
    // Incrementar contador de intentos fallidos
    const nuevosIntentos = (usuario.intentos_fallidos || 0) + 1;
    
    // Si alcanzó 5 intentos fallidos, bloquear la cuenta
    if (nuevosIntentos >= 5) {
      const fechaBloqueo = new Date();
      fechaBloqueo.setMinutes(fechaBloqueo.getMinutes() + BLOQUEO_TTL_MINUTOS);
      
      await pool.query(
        "UPDATE usuarios SET intentos_fallidos = $1, cuenta_bloqueada_hasta = $2 WHERE id_usuario = $3",
        [nuevosIntentos, fechaBloqueo, usuario.id_usuario]
      );
      
      // Registrar bloqueo de cuenta en auditoría
      await pool.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["cuenta_bloqueada", `usuario_${usuario.id_usuario}`]
      );
      
      // Registrar intento de acceso fallido en auditoría
      await pool.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["intento_acceso_fallido", `usuario_${usuario.id_usuario}`]
      );
      
      return res.status(423).json({ 
        message: `Contraseña incorrecta. Cuenta bloqueada por ${BLOQUEO_TTL_MINUTOS} minutos tras 5 intentos fallidos.`,
        cuenta_bloqueada: true,
        minutos_bloqueo: BLOQUEO_TTL_MINUTOS
      });
    } else {
      // Incrementar intentos fallidos sin bloquear
      await pool.query(
        "UPDATE usuarios SET intentos_fallidos = $1 WHERE id_usuario = $2",
        [nuevosIntentos, usuario.id_usuario]
      );
      
      // Registrar intento de acceso fallido en auditoría
      await pool.query(
        `INSERT INTO auditoria (tipo, usuario, fecha) 
         VALUES ($1, $2, CURRENT_TIMESTAMP)`,
        ["intento_acceso_fallido", `usuario_${usuario.id_usuario}`]
      );
      
      const intentosRestantes = 5 - nuevosIntentos;
      return res.status(400).json({ 
        message: `La contraseña es incorrecta. Intentos restantes: ${intentosRestantes}`,
        intentos_restantes: intentosRestantes
      });
    }
  }

  // Login exitoso: resetear contador de intentos fallidos y desbloquear cuenta
  await pool.query(
    "UPDATE usuarios SET intentos_fallidos = 0, cuenta_bloqueada_hasta = NULL WHERE id_usuario = $1",
    [usuario.id_usuario]
  );

  const token = await createAccessToken({
    id: usuario.id_usuario,
    rol: usuario.rol,
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    maxAge: 1000 * 60 * 60 * 24, // 1 día
  });

  // Registrar acceso exitoso en auditoría
  await pool.query(
    `INSERT INTO auditoria (tipo, usuario, fecha) 
     VALUES ($1, $2, CURRENT_TIMESTAMP)`,
    ["acceso_exitoso", `usuario_${usuario.id_usuario}`]
  );

  return res.json({
    id: usuario.id_usuario,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    email: usuario.email,
    direccion_envio: usuario.direccion_envio || null,
    rol: usuario.rol,
    es_super_admin: usuario.es_super_admin || false,
  });
};

// SIGN UP
export const signup = async (req, res, next) => {
  const { nombre, apellido, email, password, direccion_envio } = req.body;

  try {
    // Validar campos requeridos
    if (!nombre || nombre.trim().length < 3) {
      return res.status(400).json({
        message: "El nombre debe tener al menos 3 caracteres",
      });
    }
    if (!apellido || apellido.trim().length < 2) {
      return res.status(400).json({
        message: "El apellido debe tener al menos 2 caracteres",
      });
    }
    if (!email || !/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      return res.status(400).json({
        message: "Debe ser un correo electrónico válido",
      });
    }
    if (!password) {
      return res.status(400).json({
        message: "La contraseña es requerida",
      });
    }

    // Validar contraseña con reglas estrictas
    if (password.length < 8) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 8 caracteres",
      });
    }
    
    const tieneMayuscula = /[A-Z]/.test(password);
    const tieneMinuscula = /[a-z]/.test(password);
    const tieneNumero = /[0-9]/.test(password);
    const tieneSimbolo = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!tieneMayuscula || !tieneMinuscula || !tieneNumero || !tieneSimbolo) {
      const errores = [];
      if (!tieneMayuscula) errores.push("una letra mayúscula (A-Z)");
      if (!tieneMinuscula) errores.push("una letra minúscula (a-z)");
      if (!tieneNumero) errores.push("un número (0-9)");
      if (!tieneSimbolo) errores.push("un símbolo (!@#$%^&*...)");
      
      return res.status(400).json({
        message: `La contraseña debe contener: ${errores.join(", ")}. Ejemplo válido: MiPassword123!`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const resultado = await pool.query(
      "INSERT INTO usuarios (nombre, apellido, email, password_hash, direccion_envio, rol) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id_usuario, nombre, apellido, email, direccion_envio, rol",
      [nombre, apellido || "", email, hashedPassword, direccion_envio ? direccion_envio.trim() : null, "cliente"]
    );

    const token = await createAccessToken({
      id: resultado.rows[0].id_usuario,
      rol: resultado.rows[0].rol,
    });

    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24, // 1 día
    });

    // Registrar nuevo registro de usuario en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["usuario_registrado", `usuario_${resultado.rows[0].id_usuario}`]
    );

    // Enviar email de bienvenida (no bloquea si falla)
    try {
      const { enviarEmailBienvenida } = await import("../utils/email.js");
      await enviarEmailBienvenida(
        resultado.rows[0].email,
        resultado.rows[0].nombre,
        resultado.rows[0].id_usuario
      );
    } catch (emailError) {
      console.error("Error enviando email de bienvenida:", emailError);
      // No fallar el registro si el email falla
    }

    return res.json({
      id: resultado.rows[0].id_usuario,
      nombre: resultado.rows[0].nombre,
      apellido: resultado.rows[0].apellido,
      email: resultado.rows[0].email,
      rol: resultado.rows[0].rol,
    });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({
        message: "El correo ya está registrado",
      });
    }
    next(error);
  }
};

// SIGNOUT
export const signout = (req, res) => {
  res.clearCookie("token", {
    path: "/",
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  });
  return res.json({ message: "Sesión cerrada" });
};

// PROFILE
export const profile = async (req, res) => {
  const resultado = await pool.query(
    "SELECT id_usuario, nombre, apellido, email, direccion_envio, rol, es_super_admin FROM usuarios WHERE id_usuario = $1",
    [req.usuarioId]
  );
  
  if (resultado.rowCount === 0) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }
  
  const usuario = resultado.rows[0];
  
  // Si es admin o super admin, incluir permisos
  let permisos = [];
  if (usuario.rol === "admin" || usuario.rol === "super_admin") {
    // Si es super admin, devolver todos los permisos disponibles
    if (usuario.es_super_admin || usuario.rol === "super_admin") {
      const todosLosPermisos = await pool.query(
        "SELECT nombre_permiso FROM permisos ORDER BY nombre_permiso"
      );
      permisos = todosLosPermisos.rows.map((p) => p.nombre_permiso);
    } else {
      // Admin normal: obtener permisos asignados
      const permisosData = await pool.query(
        `SELECT p.nombre_permiso
         FROM permisos p
         INNER JOIN permisos_usuarios pu ON p.id_permiso = pu.id_permiso
         WHERE pu.id_usuario = $1
         ORDER BY p.nombre_permiso`,
        [req.usuarioId]
      );
      permisos = permisosData.rows.map((p) => p.nombre_permiso);
    }
  }
  
  return res.json({
    ...usuario,
    permisos: permisos,
  });
};

export const updateProfile = async (req, res) => {
  const { nombre, apellido, email, direccion_envio } = req.body;

  try {
    if (!nombre || nombre.trim().length < 3) {
      return res
        .status(400)
        .json({ message: "El nombre debe tener al menos 3 caracteres" });
    }
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Email inválido" });
    }
    // Validar dirección de envío si se proporciona (debe tener mínimo 10 caracteres)
    if (direccion_envio !== undefined && direccion_envio !== null && direccion_envio.trim().length > 0 && direccion_envio.trim().length < 10) {
      return res.status(400).json({ message: "La dirección de envío debe tener al menos 10 caracteres" });
    }

    // ¿ya existe ese email en otro user?
    const exists = await pool.query(
      "SELECT id_usuario FROM usuarios WHERE email = $1 AND id_usuario <> $2",
      [email, req.usuarioId]
    );
    if (exists.rowCount > 0) {
      return res
        .status(409)
        .json({
          message: "El correo ya se encuentra registrado por otro usuario",
        });
    }

    const updated = await pool.query(
      "UPDATE usuarios SET nombre=$1, apellido=$2, email=$3, direccion_envio=$4 WHERE id_usuario=$5 RETURNING id_usuario, nombre, apellido, email, direccion_envio, rol",
      [nombre.trim(), apellido?.trim() || "", email.trim(), direccion_envio ? direccion_envio.trim() : null, req.usuarioId]
    );

    // Registrar actualización de perfil en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["perfil_actualizado", `usuario_${req.usuarioId}`]
    );

    return res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error al actualizar el perfil" });
  }
};

// FORGOT PASSWORD - Solicitar restablecimiento
export const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Validar que el email no esté vacío
    if (!email || !email.trim()) {
      return res.status(400).json({
        message: "El correo electrónico es requerido",
      });
    }

    // Normalizar el email (trim y lowercase para comparación)
    const emailNormalizado = email.trim().toLowerCase();

    // Buscar usuario por email (comparación case-insensitive)
    const usuario = await pool.query(
      "SELECT id_usuario, nombre, apellido, email FROM usuarios WHERE LOWER(TRIM(email)) = $1",
      [emailNormalizado]
    );

    // Si el email no existe, informar explícitamente
    if (usuario.rowCount === 0) {
      return res.status(404).json({
        message: "El correo electrónico ingresado no está registrado en nuestro sistema.",
      });
    }

    // IMPORTANTE: Enviar el email SOLO al email exacto del usuario registrado
    // No usar el email del request, sino el email de la base de datos
    const emailDestino = usuario.rows[0].email;

    // Generar token de restablecimiento (JWT con expiración de 1 hora)
    const crypto = await import("crypto");
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1); // Expira en 1 hora

    // Guardar token en base de datos
    await pool.query(
      "UPDATE usuarios SET reset_password_token = $1, reset_password_expires = $2 WHERE id_usuario = $3",
      [resetTokenHash, resetExpires, usuario.rows[0].id_usuario]
    );

    // Enviar email con token
    // IMPORTANTE: Enviar SOLO al email registrado en la BD, no al email del request
    try {
      const { enviarEmailResetPassword } = await import("../utils/email.js");
      await enviarEmailResetPassword(
        emailDestino, // Usar el email de la BD, no el del request
        usuario.rows[0].nombre,
        resetToken, // Enviar token sin hash
        usuario.rows[0].id_usuario
      );
    } catch (emailError) {
      console.error("❌ Error enviando email de restablecimiento:", emailError);
      console.error("📋 Detalles del error:", emailError.message);
      if (emailError.stack) {
        console.error("📚 Stack trace:", emailError.stack);
      }
      // Limpiar token si el email falla
      await pool.query(
        "UPDATE usuarios SET reset_password_token = NULL, reset_password_expires = NULL WHERE id_usuario = $1",
        [usuario.rows[0].id_usuario]
      );
      return res.status(500).json({
        message: "Error enviando email. Por favor, intenta más tarde.",
        error: process.env.NODE_ENV === "development" ? emailError.message : undefined
      });
    }

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["solicitud_reset_password", `usuario_${usuario.rows[0].id_usuario}`]
    );

    return res.json({
      message: "Se ha enviado un enlace de recuperación a tu correo electrónico. Por favor, revisa tu bandeja de entrada y la carpeta de spam.",
    });
  } catch (error) {
    console.error("❌ Error en forgotPassword:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ 
      message: "Error procesando la solicitud",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// RESET PASSWORD - Restablecer contraseña con token
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token y nueva contraseña son requeridos",
      });
    }

    // IMPORTANTE: Validar el token PRIMERO (antes de validar la contraseña)
    // para evitar que errores de validación de contraseña invaliden el token
    const crypto = await import("crypto");
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Buscar usuario con token válido y no expirado
    const usuario = await pool.query(
      "SELECT id_usuario, nombre, email FROM usuarios WHERE reset_password_token = $1 AND reset_password_expires > NOW()",
      [resetTokenHash]
    );

    if (usuario.rowCount === 0) {
      return res.status(400).json({
        message: "Token inválido o expirado. Por favor, solicita un nuevo enlace.",
      });
    }

    // AHORA validar la contraseña (después de verificar el token)
    // Validación estricta de contraseña (igual que en el frontend)
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "La contraseña debe tener al menos 8 caracteres",
      });
    }
    
    // Verificar requisitos de seguridad
    const tieneMayuscula = /[A-Z]/.test(newPassword);
    const tieneMinuscula = /[a-z]/.test(newPassword);
    const tieneNumero = /[0-9]/.test(newPassword);
    const tieneSimbolo = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!tieneMayuscula || !tieneMinuscula || !tieneNumero || !tieneSimbolo) {
      const errores = [];
      if (!tieneMayuscula) errores.push("una letra mayúscula (A-Z)");
      if (!tieneMinuscula) errores.push("una letra minúscula (a-z)");
      if (!tieneNumero) errores.push("un número (0-9)");
      if (!tieneSimbolo) errores.push("un símbolo (!@#$%^&*...)");
      
      return res.status(400).json({
        message: `La contraseña debe contener: ${errores.join(", ")}. Ejemplo válido: MiPassword123!`,
      });
    }

    // Si llegamos aquí, el token es válido y la contraseña cumple los requisitos
    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y limpiar token (SOLO cuando todo es válido)
    await pool.query(
      "UPDATE usuarios SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id_usuario = $2",
      [hashedPassword, usuario.rows[0].id_usuario]
    );

    // Registrar en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["password_reseteado", `usuario_${usuario.rows[0].id_usuario}`]
    );

    return res.json({
      message: "Contraseña restablecida exitosamente. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    console.error("❌ Error en resetPassword:", error);
    console.error("Stack trace:", error.stack);
    res.status(500).json({ 
      message: "Error procesando la solicitud",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
};

// CHANGE PASSWORD (cambiar contraseña desde perfil autenticado)
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // Validar que se proporcionen ambos campos
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "La contraseña actual y la nueva contraseña son requeridas",
      });
    }

    // Validar la contraseña actual PRIMERO
    const q = await pool.query(
      "SELECT id_usuario, password_hash FROM usuarios WHERE id_usuario=$1",
      [req.usuarioId]
    );
    if (q.rowCount === 0)
      return res.status(404).json({ message: "Usuario no encontrado" });

    const ok = await bcrypt.compare(
      currentPassword,
      q.rows[0].password_hash
    );
    if (!ok) {
      return res.status(400).json({ 
        message: "La contraseña actual es incorrecta" 
      });
    }

    // AHORA validar la nueva contraseña con requisitos estrictos
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "La nueva contraseña debe tener al menos 8 caracteres",
      });
    }
    
    // Verificar requisitos de seguridad
    const tieneMayuscula = /[A-Z]/.test(newPassword);
    const tieneMinuscula = /[a-z]/.test(newPassword);
    const tieneNumero = /[0-9]/.test(newPassword);
    const tieneSimbolo = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
    
    if (!tieneMayuscula || !tieneMinuscula || !tieneNumero || !tieneSimbolo) {
      const errores = [];
      if (!tieneMayuscula) errores.push("una letra mayúscula (A-Z)");
      if (!tieneMinuscula) errores.push("una letra minúscula (a-z)");
      if (!tieneNumero) errores.push("un número (0-9)");
      if (!tieneSimbolo) errores.push("un símbolo (!@#$%^&*...)");
      
      return res.status(400).json({
        message: `La nueva contraseña debe contener: ${errores.join(", ")}. Ejemplo válido: MiPassword123!`,
      });
    }

    // Verificar que la nueva contraseña sea diferente a la actual
    const mismaContraseña = await bcrypt.compare(newPassword, q.rows[0].password_hash);
    if (mismaContraseña) {
      return res.status(400).json({
        message: "La nueva contraseña debe ser diferente a la contraseña actual",
      });
    }

    // Si llegamos aquí, todo es válido - actualizar contraseña
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      "UPDATE usuarios SET password_hash=$1 WHERE id_usuario=$2",
      [hashed, req.usuarioId]
    );

    // Registrar cambio de contraseña en auditoría
    await pool.query(
      `INSERT INTO auditoria (tipo, usuario, fecha) 
       VALUES ($1, $2, CURRENT_TIMESTAMP)`,
      ["contraseña_cambiada", `usuario_${req.usuarioId}`]
    );

    return res.json({ message: "Contraseña actualizada correctamente" });
  } catch (err) {
    console.error("❌ Error en changePassword:", err);
    console.error("Stack trace:", err.stack);
    return res
      .status(500)
      .json({ message: "Error al actualizar la contraseña" });
  }
};

