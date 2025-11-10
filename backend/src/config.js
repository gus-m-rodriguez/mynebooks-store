// ============================================
// CONFIGURACIÓN DEL SERVIDOR
// ============================================
export const PORT = process.env.PORT || 3000;

// ============================================
// CONFIGURACIÓN DE BASE DE DATOS (PostgreSQL)
// ============================================
// Acepta variables de Railway y las tuyas
export const PG_HOST = process.env.PGHOST || process.env.PG_HOST || "localhost";
export const PG_PORT = Number(process.env.PGPORT || process.env.PG_PORT);
export const PG_USER = process.env.PGUSER || process.env.PG_USER || "postgres";
export const PG_PASSWORD = process.env.PGPASSWORD || process.env.PG_PASSWORD;
export const PG_DATABASE = process.env.PGDATABASE || process.env.PG_DATABASE;

// ⬇️ ESTA LÍNEA ES CLAVE (faltaba en el deploy)
// URL de conexión completa (para Railway, Heroku, etc.)
// Si está configurada, se usa esta en lugar de las variables individuales
export const DATABASE_URL = process.env.DATABASE_URL || null;

// ============================================
// CONFIGURACIÓN DE CORS Y FRONTEND
// ============================================
export const ORIGIN = process.env.ORIGIN || "http://localhost:5173";

// ============================================
// CONFIGURACIÓN DE AUTENTICACIÓN (JWT)
// ============================================
export const JWT_SECRET = process.env.JWT_SECRET || "mynebooks_secret_key_change_in_production";

// ============================================
// CONFIGURACIÓN DE MERCADO PAGO
// ============================================
export const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "";
export const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";
// Indicar si estamos usando sandbox de Mercado Pago (incluso en producción)
// Útil cuando NODE_ENV=production pero usas sandbox de MP (proyectos académicos)
export const MP_SANDBOX = process.env.MP_SANDBOX === "true" || process.env.MP_SANDBOX === "1";
// Email de comprador de prueba para sandbox (opcional)
// Si está configurado, todos los pagos usarán este email en modo desarrollo
export const MP_TEST_PAYER_EMAIL = process.env.MP_TEST_PAYER_EMAIL || "";

// ============================================
// CONFIGURACIÓN DE EMAIL (Gmail OAuth2)
// ============================================
// Email desde el cual se envían los correos
export const EMAIL_FROM = process.env.EMAIL_FROM || "";

// OAuth2 para Gmail (requerido - Gmail no acepta "aplicaciones menos seguras")
export const GMAIL_CLIENT_ID = process.env.GMAIL_CLIENT_ID || "";
export const GMAIL_CLIENT_SECRET = process.env.GMAIL_CLIENT_SECRET || "";
export const GMAIL_REFRESH_TOKEN = process.env.GMAIL_REFRESH_TOKEN || "";
export const GMAIL_ACCESS_TOKEN = process.env.GMAIL_ACCESS_TOKEN || "";

// Configuración SMTP (usado con OAuth2)
export const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
export const SMTP_PORT = Number(process.env.SMTP_PORT || 587);

// Límites de envío (para evitar spam)
export const EMAIL_MAX_PER_USER_PER_DAY = Number(process.env.EMAIL_MAX_PER_USER_PER_DAY || 10);
export const EMAIL_MAX_PER_IP_PER_DAY = Number(process.env.EMAIL_MAX_PER_IP_PER_DAY || 20);

// ============================================
// CONFIGURACIÓN DE TTL (Time To Live)
// ============================================
// Tiempo en minutos que una orden permanece en 'en_pago' antes de expirar
export const RESERVA_TTL_MINUTOS = Number(process.env.RESERVA_TTL_MINUTOS || 15);

// Tiempo en minutos que una cuenta permanece bloqueada tras 5 intentos fallidos
export const BLOQUEO_TTL_MINUTOS = Number(process.env.BLOQUEO_TTL_MINUTOS || 15);

// ============================================
// CONFIGURACIÓN DE AMAZON S3
// ============================================
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || "";
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";
export const AWS_REGION = process.env.AWS_REGION || "";
export const AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || "";
export const AWS_S3_BASE_URL = process.env.AWS_S3_BASE_URL || "";

