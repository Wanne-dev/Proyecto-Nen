import { DataSource } from "typeorm";
import logger from "./logger";

/**
 * Config de la base de datos.
 * Acepta DATABASE_URL (Heroku/Render/Railway) o las variables sueltas DB_*.
 * En Docker, DB_HOST vale "postgres" (el nombre del servicio de compose),
 * NO "localhost": localhost dentro del contenedor es el propio contenedor.
 */
// DB_HOST tiene PRIORIDAD sobre DATABASE_URL: en Docker compose inyecta
// DB_HOST=postgres, y un DATABASE_URL viejo apuntando a localhost dejaria
// el contenedor sin conexion.
const url = process.env.DB_HOST ? "" : (process.env.DATABASE_URL || "").trim();
const usaSsl = (process.env.DB_SSL || "").toLowerCase() === "true";

const comun = {
  type: "postgres" as const,
  ssl: usaSsl ? { rejectUnauthorized: false } : false,
  synchronize: true,
  logging: false,
  entities: [__dirname + "/../models/**/*.{js,ts}"],
  migrations: [__dirname + "/../migrations/**/*.{js,ts}"],
  subscribers: [],
};

export const AppDataSource = url
  ? new DataSource({ ...comun, url })
  : new DataSource({
      ...comun,
      host: process.env.DB_HOST || "127.0.0.1",
      port: parseInt(process.env.DB_PORT || "5433", 10),
      username: process.env.DB_USER || "banca_nen",
      password: process.env.DB_PASSWORD || "banca_nen_secret",
      database: process.env.DB_NAME || "banca_nen",
    });

/** Describe a dónde nos estamos conectando (sin exponer la contraseña). */
export function describirConexion(): string {
  if (url) return url.replace(/:\/\/([^:]+):[^@]+@/, "://$1:****@");
  return `${process.env.DB_HOST || "127.0.0.1"}:${process.env.DB_PORT || "5433"}` +
         `/${process.env.DB_NAME || "banca_nen"} (usuario: ${process.env.DB_USER || "banca_nen"})`;
}

/**
 * Conecta reintentando.
 *
 * Es imprescindible en Docker: aunque compose espere al healthcheck de
 * Postgres, el contenedor puede tardar un poco más en aceptar conexiones.
 * Sin reintentos el backend hacía process.exit(1) y el stack quedaba caído.
 */
export async function connectDatabase(intentos = 15, esperaMs = 3000): Promise<void> {
  logger.info(`Conectando a PostgreSQL en ${describirConexion()}`);

  for (let i = 1; i <= intentos; i++) {
    try {
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }
      logger.info("Base de datos PostgreSQL conectada.");
      return;
    } catch (error: any) {
      const msg = error?.message || String(error);

      if (i === intentos) {
        logger.error(`No se pudo conectar a la base de datos tras ${intentos} intentos: ${msg}`);
        // Pistas concretas segun el error, para no dejar al usuario a ciegas
        if (msg.includes("ECONNREFUSED")) {
          logger.error("Nadie escucha en ese host/puerto. En Docker, DB_HOST debe ser 'postgres'.");
          logger.error("Fuera de Docker, DB_HOST=127.0.0.1 y DB_PORT=5433 (el puerto que publica compose).");
        } else if (msg.includes("ENOTFOUND") || msg.includes("EAI_AGAIN")) {
          logger.error(`El nombre '${process.env.DB_HOST}' no resuelve. Debe coincidir con el servicio de compose.`);
        } else if (msg.includes("password") || msg.includes("autenticación") || msg.includes("authentication")) {
          logger.error("Usuario o contraseña incorrectos. Revisa DB_USER y DB_PASSWORD.");
          logger.error("Si cambiaste la contraseña, borra el volumen: docker compose down -v");
        } else if (msg.includes("does not exist") || msg.includes("no existe")) {
          logger.error(`La base '${process.env.DB_NAME}' no existe. Recrea el volumen: docker compose down -v`);
        }
        throw error;
      }

      logger.warn(`Intento ${i}/${intentos} fallido (${msg}). Reintento en ${esperaMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, esperaMs));
    }
  }
}

/** Cierre ordenado, para que Docker no deje conexiones colgadas. */
export async function disconnectDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
    logger.info("Conexión a la base de datos cerrada.");
  }
}
