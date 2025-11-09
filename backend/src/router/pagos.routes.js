import Router from "express-promise-router";
import { webhookMercadoPago } from "../controllers/pagos.controller.js";

const router = Router();

// Webhook de Mercado Pago (NO requiere autenticación, MP lo llama directamente)
router.post("/webhook/mercadopago", webhookMercadoPago);

export default router;


