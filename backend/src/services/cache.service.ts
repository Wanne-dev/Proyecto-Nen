/* Caché Redis con fallback en memoria — BANCA NEN
 * Usa Redis cuando está configurado (REDIS_URL o REDIS_HOST); si no hay
 * Redis disponible, degrada a una caché en memoria para no romper el dev.
 */
import Redis from "ioredis";
import logger from "../config/logger";

const REDIS_URL =
  process.env.REDIS_URL ||
  (process.env.REDIS_HOST
    ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || "6379"}`
    : "");

let client: Redis | null = null;

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

const memory = new Map<string, MemoryEntry>();

export function getRedisClient(): Redis | null {
  if (!REDIS_URL) return null;
  if (!client) {
    client = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
    client.on("error", () => {
      /* Redis caído → se usa la caché en memoria */
    });
  }
  return client;
}

export async function cacheGet(key: string): Promise<string | null> {
  const redis = getRedisClient();
  if (redis) {
    try {
      return await redis.get(key);
    } catch (err: any) {
      logger.warn("Redis no disponible, usando caché en memoria: " + (err?.message || ""));
    }
  }
  const entry = memory.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memory.delete(key);
    return null;
  }
  return entry.value;
}

export async function cacheSet(key: string, value: string, ttlSeconds = 60): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.set(key, value, "EX", ttlSeconds);
      return;
    } catch (err: any) {
      logger.warn("Redis no disponible, usando caché en memoria: " + (err?.message || ""));
    }
  }
  memory.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedisClient();
  if (redis) {
    try {
      await redis.del(key);
    } catch {
      /* ignorar */
    }
  }
  memory.delete(key);
}
