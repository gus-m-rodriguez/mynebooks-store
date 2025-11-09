// Cargar variables de entorno desde .env (solo en desarrollo)
import "dotenv/config";

import app from "./app.js";
import { PORT, RESERVA_TTL_MINUTOS } from "./config.js";
import { expirarReservas } from "./jobs/expirarReservas.js";

app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || "development"}`);
  console.log(`⏱️  TTL de reservas: ${RESERVA_TTL_MINUTOS} minutos`);
});

// Job periódico para expirar reservas temporales
// Se ejecuta cada 5 minutos (ajustable según necesidad)
const INTERVALO_JOB_MS = 5 * 60 * 1000; // 5 minutos

const ejecutarJobExpiración = async () => {
  try {
    await expirarReservas();
  } catch (error) {
    console.error("Error en job de expiración:", error);
  }
};

// Ejecutar inmediatamente al iniciar (por si hay órdenes expiradas)
ejecutarJobExpiración();

// Ejecutar periódicamente
setInterval(ejecutarJobExpiración, INTERVALO_JOB_MS);

console.log(`🔄 Job de expiración de reservas configurado (cada ${INTERVALO_JOB_MS / 1000 / 60} minutos)`);

