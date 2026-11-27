import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { EntityManager, MoreThan, Not } from "typeorm";
import { AppDataSource } from "../config/database";
import { SESSION_TTL_MS } from "../config/jwt";
import { AppError } from "../middleware/errorHandler.middleware";
import { AuditAction } from "../models/AuditLog";
import { AccountStatus, User } from "../models/User";
import { UserSession, type SessionScope } from "../models/UserSession";
import { signAccessToken, UUID, verifyAccessToken, type AccessClaims } from "../utils/jwt";
import { logAudit } from "./audit.service";

export interface SessionIdentity { id: string; sessionId: string }
export interface ClientContext { ipAddress?: string; userAgent?: string }
export interface SessionCredentials { access: string; refresh: string; expiresAt: Date }
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export function compareHash(left: string, right: string): boolean {
  const a = Buffer.from(left, "hex"); const b = Buffer.from(right, "hex");
  return a.length === 32 && b.length === 32 && timingSafeEqual(a, b);
}

export function opaqueToken(id: string): string {
  return `${id}.${randomBytes(32).toString("base64url")}`;
}

export function opaqueTokenId(token?: string): string | null {
  const parts = token?.split(".");
  return parts?.length === 2 && UUID.test(parts[0]) && /^[\w-]{43}$/.test(parts[1]) ? parts[0] : null;
}

export function credentialsFor(session: UserSession, refresh: string): SessionCredentials {
  return {
    access: signAccessToken({ userId: session.userId, sessionId: session.id, scope: session.scope }),
    refresh, expiresAt: session.expiresAt,
  };
}

export async function issueSession(manager: EntityManager, user: User, context: ClientContext, mfaVerified = false) {
  const sessions = manager.getRepository(UserSession);
  const id = randomUUID();
  const refresh = opaqueToken(id);
  const scope: SessionScope = user.isVerified ? "access" : "verify";
  const now = new Date();
  const session = await sessions.save(sessions.create({
    id, userId: user.id, refreshHash: hashToken(refresh), scope, mfaVerified,
    expiresAt: new Date(now.getTime() + (scope === "access" ? SESSION_TTL_MS : 24 * 60 * 60 * 1000)),
    lastActivityAt: now,
    ipAddress: context.ipAddress?.slice(0, 45) || null,
    userAgent: context.userAgent?.slice(0, 250) || null,
  }));
  return credentialsFor(session, refresh);
}

export async function revokeAll(manager: EntityManager, userId: string, except?: string): Promise<number> {
  const updated = await manager.getRepository(UserSession).update({
    userId, isActive: true, ...(except ? { id: Not(except) } : {}),
  }, { isActive: false });
  return updated.affected ?? 0;
}

export async function lockIdentity(manager: EntityManager, field: "id" | "email", value: string) {
  return manager.getRepository(User).createQueryBuilder("u")
    .addSelect(["u.passwordHash", "u.twoFactorSecret", "u.twoFactorPending", "u.twoFactorPendingSession", "u.twoFactorPendingExpires", "u.twoFactorLastStep"])
    .where(`u.${field} = :value`, { value }).setLock("pessimistic_write").getOne();
}

export async function activeIdentity(manager: EntityManager, userId: string, sessionId: string) {
  const user = await lockIdentity(manager, "id", userId);
  if (!user || user.accountStatus !== AccountStatus.ACTIVE) throw new AppError("Cuenta no disponible", 403);
  const session = await manager.getRepository(UserSession).findOneBy({ id: sessionId, userId, isActive: true, expiresAt: MoreThan(new Date()) });
  if (!session || (session.scope === "access") !== user.isVerified || (user.twoFactorEnabled && !session.mfaVerified)) {
    throw new AppError("La sesión ya no está activa", 401);
  }
  return user;
}

export async function verifiedIdentity(manager: EntityManager, identity: SessionIdentity) {
  const user = await activeIdentity(manager, identity.id, identity.sessionId);
  if (!user.isVerified) throw new AppError("Verifica tu cuenta antes de continuar", 403);
  return user;
}

export async function refreshSession(token?: string): Promise<SessionCredentials> {
  const id = opaqueTokenId(token);
  const error = new AppError("Sesión vencida o no disponible", 401);
  if (!id || !token) throw error;
  const before = await AppDataSource.getRepository(UserSession).findOneBy({ id });
  if (!before) throw error;
  return AppDataSource.transaction(async (manager) => {
    const user = await lockIdentity(manager, "id", before.userId);
    if (!user || user.accountStatus !== AccountStatus.ACTIVE) throw error;
    const repo = manager.getRepository(UserSession);
    const session = await repo.createQueryBuilder("s").addSelect("s.refreshHash").where("s.id = :id", { id }).getOne();
    if (!session || !session.isActive || session.expiresAt.getTime() <= Date.now() ||
      (session.scope === "access") !== user.isVerified || (user.twoFactorEnabled && !session.mfaVerified) ||
      !compareHash(session.refreshHash, hashToken(token))) throw error;
    const rotated = opaqueToken(id);
    session.refreshHash = hashToken(rotated);
    session.lastActivityAt = new Date();
    await repo.save(session);
    return credentialsFor(session, rotated);
  });
}

export async function endSession(access?: string, refresh?: string, context: ClientContext = {}) {
  let claims: AccessClaims | undefined;
  if (access) { try { claims = verifyAccessToken(access); } catch { /* Puede haber expirado el acceso. */ } }
  const id = claims?.sessionId ?? opaqueTokenId(refresh);
  if (!id) return;
  const before = await AppDataSource.getRepository(UserSession).findOneBy({ id });
  if (!before) return;
  await AppDataSource.transaction(async (manager) => {
    if (!(await lockIdentity(manager, "id", before.userId))) return;
    const repo = manager.getRepository(UserSession);
    const session = await repo.createQueryBuilder("s").addSelect("s.refreshHash").where("s.id = :id", { id }).getOne();
    if (!session?.isActive) return;
    if (claims?.userId !== session.userId && (!refresh || !compareHash(session.refreshHash, hashToken(refresh)))) return;
    await repo.update(id, { isActive: false });
    await logAudit({ userId: session.userId, action: AuditAction.LOGOUT, entityType: "session", entityId: id, details: "Cierre de sesión", ...context }, manager);
  });
}

export async function listSessions(userId: string, currentId: string) {
  const sessions = await AppDataSource.getRepository(UserSession).find({
    where: { userId, scope: "access", isActive: true, expiresAt: MoreThan(new Date()) }, order: { createdAt: "DESC" },
  });
  return sessions.map((session) => ({
    id: session.id, device: session.userAgent || "Navegador no identificado", createdAt: session.createdAt,
    lastActiveAt: session.lastActivityAt, expiresAt: session.expiresAt, isCurrent: session.id === currentId,
  }));
}

export async function revokeSessions(userId: string, currentId: string, target: string | null, context: ClientContext) {
  if (target === currentId) throw new AppError("Usa Cerrar sesión para desconectar este navegador", 400);
  if (target && !UUID.test(target)) throw new AppError("Identificador de sesión inválido", 400);
  return AppDataSource.transaction(async (manager) => {
    await activeIdentity(manager, userId, currentId);
    const changes = target
      ? (await manager.getRepository(UserSession).update({ userId, id: target, isActive: true }, { isActive: false })).affected ?? 0
      : await revokeAll(manager, userId, currentId);
    if (target && !changes) throw new AppError("Sesión no encontrada", 404);
    if (changes) await logAudit({ userId, action: AuditAction.LOGOUT, entityType: "session", entityId: target || undefined,
      details: target ? "Sesión revocada por el titular" : "Otras sesiones revocadas", newValues: { revoked: changes }, ...context }, manager);
    return { revoked: changes };
  });
}
