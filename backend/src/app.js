import express from "express";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import cors from "cors";
import { ORIGIN } from "./config.js";
import { pool } from "./db.js";

// Importar rutas
import authRoutes from "./router/auth.routes.js";
import productosRoutes from "./router/productos.routes.js";
import carritoRoutes from "./router/carrito.routes.js";
import ordenesRoutes from "./router/ordenes.routes.js";
import adminRoutes from "./router/admin.routes.js";
import usuariosRoutes from "./router/usuarios.routes.js";
import pagosRoutes from "./router/pagos.routes.js";

const app = express();

// ★ Detrás de Railway/NGINX:
app.set("trust proxy", 1);

// Middlewares
app.use(
  cors({
    origin: ORIGIN, // p.ej. http://localhost:5173 o https://mynebooks.up.railway.app
    credentials: true, // ← permite cookies
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(cookieParser());

// Middleware para capturar body raw del webhook antes de parsearlo
// Esto es necesario para validar la firma de Mercado Pago correctamente
app.use((req, res, next) => {
  if (req.path === "/api/pagos/webhook/mercadopago") {
    // Para el webhook, capturar el body raw
    let data = "";
    req.on("data", (chunk) => {
      data += chunk.toString();
    });
    req.on("end", () => {
      req.rawBody = data;
      // Parsear el JSON para que req.body esté disponible
      try {
        req.body = JSON.parse(data);
      } catch (e) {
        req.body = {};
      }
      next();
    });
  } else {
    // Para todas las demás rutas, usar JSON parser normal
    express.json()(req, res, next);
  }
});

app.use(express.urlencoded({ extended: false }));

// Logging (solo en desarrollo)
if (process.env.NODE_ENV !== "production") {
  app.use(morgan("dev"));
}

// Rutas
app.get("/", (req, res) =>
  res.json({ message: "Bienvenido a MyneBooks Store API" })
);

app.get("/api/ping", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      status: "ok",
      message: "API funcionando correctamente",
      timestamp: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Error conectando a la base de datos",
    });
  }
});

// Rutas de la API
app.use("/api/auth", authRoutes);
app.use("/api/productos", productosRoutes);
app.use("/api/carrito", carritoRoutes);
app.use("/api/ordenes", ordenesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/usuarios", usuariosRoutes); // Gestión de usuarios y permisos (admin)
app.use("/api/pagos", pagosRoutes); // Webhook de Mercado Pago

// Manejo de errores
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    status: "error",
    message: err.message || "Error interno del servidor",
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: "Ruta no encontrada",
  });
});

export default app;

