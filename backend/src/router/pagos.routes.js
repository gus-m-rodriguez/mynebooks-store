import Router from "express-promise-router";
import express from "express";
import { webhookMercadoPago } from "../controllers/pagos.controller.js";

const router = Router();

// Middleware para capturar body raw del webhook
// Esto es necesario para validar la firma de Mercado Pago correctamente
const rawBodyMiddleware = express.raw({ type: "application/json" });

// Webhook de Mercado Pago (NO requiere autenticación, MP lo llama directamente)
// Usar raw body para capturar el body exacto que Mercado Pago envía (sin parsear)
router.post("/webhook/mercadopago", rawBodyMiddleware, (req, res, next) => {
  // Guardar el body raw como string para validar la firma
  req.rawBody = req.body.toString("utf8");
  // Parsear el JSON para que req.body esté disponible como objeto
  try {
    req.body = JSON.parse(req.rawBody);
  } catch (e) {
    req.body = {};
  }
  next();
}, webhookMercadoPago);

export default router;


