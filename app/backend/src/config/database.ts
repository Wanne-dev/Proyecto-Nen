import { DataSource } from "typeorm";
import logger from "./logger";
import {
  Asset, AuditLog, MarketPrice, Notification, Order, Transaction, User,
  UserSession, UserSettings, VerificationCode, Wallet, WalletBalance, WebhookLog,
} from "../models";
import { SystemSetting } from "../models/SystemSetting";
import { migrations } from "../migrations";

// El esquema se gestiona con migraciones en todos los entornos. No sincronizar
// al iniciar: alteraría la BD sin un cambio versionado y podría borrar datos.
const url = process.env.DB_HOST ? "" : (process.env.DATABASE_URL || "").trim();
const useSsl = process.env.DB_SSL?.toLowerCase() === "true";
const host = process.env.DB_HOST || "127.0.0.1";
const port = Number(process.env.DB_PORT || 5433);
const username = process.env.DB_USER || "banca_nen";
const database = process.env.DB_NAME || "banca_nen";

const options = {
  type: "postgres" as const,
  ssl: useSsl ? { rejectUnauthorized: true } : false,
  // PostgreSQL 16/17 incluyen gen_random_uuid() sin extensiones de terceros.
  uuidExtension: "pgcrypto" as const,
  installExtensions: false,
  synchronize: false,
  logging: false,
  // Registro explícito: evita cargar por glob versiones duplicadas (TS/JS) y
  // mantiene el mismo esquema en Vitest, el CLI y las imágenes Docker.
  entities: [Asset, AuditLog, MarketPrice, Notification, Order, SystemSetting, Transaction,
    User, UserSession, UserSettings, VerificationCode, Wallet, WalletBalance, WebhookLog],
  migrations,
  migrationsRun: false,
};

export const AppDataSource = url
  ? new DataSource({ ...options, url })
  : new DataSource({ ...options, host, port, username,
      password: process.env.DB_PASSWORD || "", database });

/** No devolver cadenas de conexión en logs ni credenciales en /health. */
export function describirConexion(): string {
  if (url) return "PostgreSQL (DATABASE_URL)";
  return `${host.startsWith("/") ? "socket local" : host}:${port}/${database}`;
}

export type DatabaseStatus = "conectada" | "esquema_pendiente" | "desconectada";

/** Readiness de solo lectura: una conexión válida no implica un esquema válido. */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  if (!AppDataSource.isInitialized) return "desconectada";
  try {
    const expected = AppDataSource.migrations.map((m) => m.name || m.constructor.name);
    if (expected.length === 0) return "esquema_pendiente";
    const tables = [...new Set([
      "migrations", ...AppDataSource.entityMetadatas.map((entity) => entity.tableName),
    ])];
    const [status] = await AppDataSource.query(
      `SELECT COUNT(*)::int AS present
       FROM unnest($1::text[]) AS required(name)
       WHERE to_regclass(format('%I.%I', current_schema(), required.name)) IS NOT NULL`, [tables],
    );
    if (status.present !== tables.length) return "esquema_pendiente";
    const [versions] = await AppDataSource.query(
      'SELECT COUNT(DISTINCT name)::int AS applied FROM "migrations" WHERE name = ANY($1::text[])',
      [expected],
    );
    return versions.applied === expected.length ? "conectada" : "esquema_pendiente";
  } catch {
    return "desconectada";
  }
}

/** Reintentar conexión transitoria; el proceso migrador se ejecuta por separado. */
export async function connectDatabase(intentos = 15, esperaMs = 3000): Promise<void> {
  logger.info(`Conectando a ${describirConexion()}`);
  for (let i = 1; i <= intentos; i++) {
    try {
      if (!AppDataSource.isInitialized) await AppDataSource.initialize();
      logger.info("Conexión a PostgreSQL establecida");
      return;
    } catch (error) {
      if (i === intentos) {
        const code = (error as NodeJS.ErrnoException).code || "sin código";
        throw new Error(`No se pudo conectar a PostgreSQL (${code}). Revisa DB_* o DATABASE_URL.`);
      }
      logger.warn(`PostgreSQL no disponible. Reintento ${i}/${intentos}.`);
      await new Promise((resolve) => setTimeout(resolve, esperaMs));
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) await AppDataSource.destroy();
}
