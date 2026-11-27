import { createHmac, randomInt, randomUUID } from "node:crypto";
import { EntityManager } from "typeorm";
import { keyFor } from "../config/auth-keys";
import { CodeType, VerificationCode } from "../models/VerificationCode";
import { compareHash, hashToken, opaqueToken } from "./session.service";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const RESEND_COOLDOWN_MS = 60 * 1000;
const digest = (record: VerificationCode, code: string) => createHmac("sha256", keyFor("verification"))
  .update(JSON.stringify([record.id, record.userId, record.type, record.target, code])).digest("hex");

export async function latestChallenge(manager: EntityManager, userId: string, type: CodeType, id?: string) {
  const qb = manager.getRepository(VerificationCode).createQueryBuilder("v")
    .addSelect(["v.codeHash", "v.tokenHash"])
    .where("v.userId = :userId AND v.type = :type", { userId, type });
  if (id) qb.andWhere("v.id = :id", { id });
  return qb.orderBy("v.createdAt", "DESC").addOrderBy("v.id", "DESC").getOne();
}

/** El llamador mantiene el bloqueo de la identidad hasta guardar el desafío. */
export async function createChallenge(manager: EntityManager, userId: string, type: CodeType, target: string) {
  const repo = manager.getRepository(VerificationCode);
  const id = randomUUID();
  const now = new Date();
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const token = type === CodeType.PASSWORD_RESET ? opaqueToken(id) : undefined;
  await repo.update({ userId, type, used: false }, { used: true, usedAt: now });
  const value = repo.create({ id, userId, type, target, expiresAt: new Date(now.getTime() + CODE_TTL_MS), tokenHash: token ? hashToken(token) : null });
  value.codeHash = digest(value, code);
  await repo.insert(value);
  return { code, token };
}

export function coolingDown(challenge: VerificationCode | null): boolean {
  return !!challenge && Date.now() - challenge.createdAt.getTime() < RESEND_COOLDOWN_MS;
}

export async function consumeChallenge(manager: EntityManager, record: VerificationCode | null, value: string, asToken = false) {
  if (!record || record.used || record.attempts >= record.maxAttempts || record.expiresAt.getTime() <= Date.now()) return false;
  const correct = asToken
    ? !!record.tokenHash && compareHash(record.tokenHash, hashToken(value))
    : compareHash(record.codeHash, digest(record, value));
  const repo = manager.getRepository(VerificationCode);
  if (correct) await repo.update(record.id, { used: true, usedAt: new Date() });
  else await repo.increment({ id: record.id }, "attempts", 1);
  return correct;
}
