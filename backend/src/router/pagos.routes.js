import Router from "express-promise-router";
import { webhookMercadoPago } from "../controllers/pagos.controller.js";

const router = Router();

// Webhook de Mercado Pago (NO requiere autenticación, MP lo llama directamente)
// El body raw se maneja en app.js para esta ruta específica
router.post("/webhook/mercadopago", webhookMercadoPago);

export default router;


