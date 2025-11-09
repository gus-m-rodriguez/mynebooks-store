import pg from "pg";
import {
  PG_PORT,
  PG_HOST,
  PG_USER,
  PG_PASSWORD,
  PG_DATABASE,
  DATABASE_URL,
} from "./config.js";

const { Pool } = pg;

// Si hay DATABASE_URL, úsala; si no, usa los campos sueltos
const isInternal = (PG_HOST || "").includes(".internal");
const isLocalhost = PG_HOST === "localhost" || PG_HOST === "127.0.0.1";

export const pool = DATABASE_URL
  ? new Pool({
      connectionString: DATABASE_URL,
      // con dominio público usar SSL
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      host: PG_HOST,
      port: PG_PORT,
      user: PG_USER,
      password: PG_PASSWORD,
      database: PG_DATABASE,
      // localhost NO necesita SSL, Railway/Heroku sí
      ssl: (isLocalhost || isInternal) ? false : { rejectUnauthorized: false },
    });

pool.on("connect", () => {
  console.log("✅ Conectado a la base de datos PostgreSQL", {
    host: PG_HOST || "via DATABASE_URL",
    port: PG_PORT || "via DATABASE_URL",
    database: PG_DATABASE || "via DATABASE_URL",
  });
});

pool.on("error", (err) => {
  console.error("❌ Error inesperado en la base de datos:", err);
});

export default pool;

