import { verifyToken } from "../libs/jwt.js";

export const isAuth = async (req, res, next) => {
  try {
    const token = req.cookies.token;

    if (!token) {
      console.log("❌ [isAuth] Token no proporcionado en cookies");
      console.log("Cookies recibidas:", req.cookies);
      return res.status(401).json({
        message: "No autorizado. Token no proporcionado.",
      });
    }

    const decoded = await verifyToken(token);
    req.usuarioId = decoded.id;
    req.usuarioRol = decoded.rol || "cliente";

    next();
  } catch (error) {
    console.error("❌ [isAuth] Error verificando token:", error.message);
    return res.status(401).json({
      message: "Token inválido o expirado",
    });
  }
};

