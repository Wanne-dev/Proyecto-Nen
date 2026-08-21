/* ============================================================
   BANCA NEN — Auditoría (hash encadenado inmutable)
   ============================================================ */
import { createHash } from "crypto";
import { AppDataSource } from "../config/database";
import { AuditLog, AuditAction } from "../models/AuditLog";

const repo = () => AppDataSource.getRepository(AuditLog);

export function hashEntry(prevHash: string | null, payload: string): string {
  return createHash("sha256").update(`${prevHash || "GENESIS"}|${payload}`).digest("hex");
}

export async function logAudit(params: {
  userId?: string | null;
  action: AuditAction;
  entityType?: string;
  entityId?: string;
  details?: string;
  oldValues?: object;
  newValues?: object;
  ipAddress?: string;
  riskScore?: number;
}): Promise<AuditLog> {
  const last = await repo().find({ order: { createdAt: "DESC" }, take: 1 });
  const prevHash = last[0]?.currHash || null;
  const payload = JSON.stringify({
    userId: params.userId || null,
    action: params.action,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    details: params.details || "",
    newValues: params.newValues || null,
    ts: Date.now(),
  });
  const currHash = hashEntry(prevHash, payload);
  const entry = repo().create({
    userId: params.userId || null,
    action: params.action,
    entityType: params.entityType || null,
    entityId: params.entityId || null,
    oldValues: params.oldValues || null,
    newValues: params.newValues || null,
    prevHash,
    currHash,
    ipAddress: params.ipAddress || null,
    details: params.details || null,
    riskScore: params.riskScore ?? null,
  });
  return repo().save(entry);
}

export async function listAudit(filters: { search?: string; category?: string; severity?: string; limit?: number; page?: number } = {}) {
  const qb = repo()
    .createQueryBuilder("audit")
    .leftJoinAndSelect("audit.user", "user")
    .orderBy("audit.createdAt", "DESC")
    .skip(((filters.page || 1) - 1) * (filters.limit || 50))
    .take(filters.limit || 50);

  if (filters.search) {
    qb.andWhere(
      "(audit.action ILIKE :s OR audit.details ILIKE :s OR user.email ILIKE :s OR CONCAT(user.firstName,' ',user.lastName) ILIKE :s)",
      { s: `%${filters.search}%` }
    );
  }
  if (filters.category) qb.andWhere("audit.entityType = :c", { c: filters.category });

  return qb.getManyAndCount();
}
