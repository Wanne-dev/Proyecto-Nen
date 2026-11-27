import { createHash, randomUUID } from "node:crypto";
import { EntityManager, IsNull, Not } from "typeorm";
import { AppDataSource } from "../config/database";
import { AuditLog, AuditAction } from "../models/AuditLog";

const MAX_PAGE_SIZE = 100;
const AUDIT_LOCK = 9100271;
const RESTRICTED = /password|contrase[nñ]a|secret|token|otp|refresh|document|phone|banco|tarjeta/i;

export function hashEntry(prevHash: string | null, payload: string): string {
  return createHash("sha256").update(`${prevHash || "GENESIS"}|${payload}`).digest("hex");
}

function canonicalize(value: unknown, redact = false): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => canonicalize(item, redact));
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([name]) => !redact || !RESTRICTED.test(name))
      .sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0)
      .map(([name, item]) => [name, canonicalize(item, redact)]));
  }
  return value;
}

export function auditPayload(entry: AuditLog): string {
  return JSON.stringify(canonicalize({
    id: entry.id, chainPosition: entry.chainPosition, createdAt: entry.createdAt,
    userId: entry.userId, action: entry.action, entityType: entry.entityType, entityId: entry.entityId,
    oldValues: entry.oldValues, newValues: entry.newValues, details: entry.details,
    ipAddress: entry.ipAddress, userAgent: entry.userAgent,
    riskScore: entry.riskScore == null ? null : Number(entry.riskScore).toFixed(2),
  }));
}

interface AuditParams {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: string;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
  userAgent?: string;
  riskScore?: number;
}

/** Usa el mismo manager que la operación sensible. La cadena se serializa al final de la transacción. */
export async function logAudit(params: AuditParams, manager?: EntityManager): Promise<AuditLog> {
  if (!manager) return AppDataSource.transaction((em) => logAudit(params, em));
  if (params.userId) await manager.query('SELECT id FROM users WHERE id = $1 FOR KEY SHARE', [params.userId]);
  await manager.query("SELECT pg_advisory_xact_lock($1)", [AUDIT_LOCK]);
  const repo = manager.getRepository(AuditLog);
  const [last] = await repo.find({ where: { chainPosition: Not(IsNull()) }, order: { chainPosition: "DESC" }, take: 1 });
  const entry = repo.create({
    id: randomUUID(), chainPosition: ((last?.chainPosition ? BigInt(last.chainPosition) : 0n) + 1n).toString(),
    userId: params.userId || null, action: params.action, entityType: params.entityType || null, entityId: params.entityId || null,
    oldValues: canonicalize(params.oldValues, true) as object | null, newValues: canonicalize(params.newValues, true) as object | null,
    ipAddress: params.ipAddress?.slice(0, 45) || null, userAgent: params.userAgent?.slice(0, 250) || null,
    details: params.details || null, riskScore: params.riskScore ?? null, createdAt: new Date(), prevHash: last?.currHash ?? null,
  });
  entry.currHash = hashEntry(entry.prevHash, auditPayload(entry));
  await repo.insert(entry);
  return entry;
}

export function checkAuditChain(entries: AuditLog[]) {
  let prevHash: string | null = null;
  let position = 0n;
  for (const entry of entries) {
    position += 1n;
    if (entry.chainPosition !== position.toString() || entry.prevHash !== prevHash ||
      entry.currHash !== hashEntry(prevHash, auditPayload(entry))) {
      return { valid: false, checked: Number(position - 1n), firstInvalid: entry.chainPosition };
    }
    prevHash = entry.currHash;
  }
  return { valid: true, checked: entries.length, firstInvalid: null };
}

export async function getAuditIntegrity() {
  const repo = AppDataSource.getRepository(AuditLog);
  const events = await repo.find({ order: { chainPosition: { direction: "ASC", nulls: "LAST" } } });
  const newEvents = events.filter((entry) => entry.chainPosition !== null);
  return { ...checkAuditChain(newEvents), legacy: events.length - newEvents.length };
}

export async function listAudit(filters: { search?: string; category?: string; severity?: string; limit?: number; page?: number } = {}) {
  const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, filters.limit || 50));
  const page = Math.min(1000, Math.max(1, filters.page || 1));
  const qb = AppDataSource.getRepository(AuditLog).createQueryBuilder("audit")
    .select(["audit.id", "audit.chainPosition", "audit.action", "audit.entityType", "audit.entityId", "audit.details",
      "audit.prevHash", "audit.currHash", "audit.createdAt", "audit.ipAddress", "audit.riskScore"])
    .leftJoin("audit.user", "user").addSelect(["user.id", "user.email", "user.firstName", "user.lastName"])
    .orderBy("audit.chainPosition", "DESC", "NULLS LAST").addOrderBy("audit.createdAt", "DESC").addOrderBy("audit.id", "DESC")
    .skip((page - 1) * limit).take(limit);
  if (filters.search) qb.andWhere(
    "(CAST(audit.action AS text) ILIKE :s OR audit.details ILIKE :s OR user.email ILIKE :s OR CONCAT(user.firstName,' ',user.lastName) ILIKE :s)",
    { s: `%${filters.search.slice(0, 100)}%` },
  );
  if (filters.category && filters.category !== "all") qb.andWhere("audit.entityType = :c", { c: filters.category });
  const severity = `CASE WHEN audit.risk_score >= 0.7 OR audit.action IN ('login_failed','account_blocked','fraud_detected') THEN 'danger'
    WHEN audit.risk_score >= 0.4 OR audit.action IN ('two_factor_disabled','password_change') THEN 'warning' ELSE 'info' END`;
  if (filters.severity && filters.severity !== "all") qb.andWhere(`(${severity}) = :severity`, { severity: filters.severity });
  return qb.getManyAndCount();
}
