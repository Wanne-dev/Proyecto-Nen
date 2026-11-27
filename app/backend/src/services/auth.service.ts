import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import type { EntityManager } from "typeorm";
import { AppDataSource } from "../config/database";
import { sealTotp, unsealTotp } from "../config/auth-keys";
import { CodeType, VerificationCode } from "../models/VerificationCode";
import { User, UserRole, AccountStatus, DocumentType } from "../models/User";
import { AppError } from "../middleware/errorHandler.middleware";
import { AuditAction } from "../models/AuditLog";
import { sendVerificationEmail, sendPasswordResetEmail, send2FACodeEmail, EMAIL_PROVIDER } from "../config/email";
import { sendVerificationSMS, SMS_ENABLED } from "../config/sms";
import logger from "../config/logger";
import { toPublicUser } from "./user.service";
import { registrationAllowed } from "./system-policy.service";
import { logAudit } from "./audit.service";
import { activeIdentity, type ClientContext, issueSession, lockIdentity, opaqueTokenId, revokeAll } from "./session.service";
import { CODE_TTL_MS, consumeChallenge, coolingDown, createChallenge, latestChallenge } from "./verification.service";

const LOWER = (email: string) => email.trim().toLowerCase();
const passwordCost = 12;
const credentialLimit = 5;
const lockDuration = 15 * 60 * 1000;
// Hash bcrypt de relleno (coste 12); solo iguala el trabajo para cuentas inexistentes.
const dummyHash = "$2b$12$ZKMNTRyg.GySJKw0QvASuOa92XwTfxNJSWjS2woPE3bszy9nha7YS";
const invalidReset = () => new AppError("Código o enlace inválido, vencido o no disponible. Solicita otro.", 400);
const invalidOtp = () => new AppError("Código inválido, vencido o agotado. Solicita otro si es necesario.", 400);

function presentUser(user: User) {
  return { ...toPublicUser(user), phoneVerificationRequired: SMS_ENABLED && !user.phoneVerified };
}

function isAdult(rawDate: string): boolean {
  const birth = new Date(rawDate);
  const today = new Date();
  let years = today.getUTCFullYear() - birth.getUTCFullYear();
  if (today.getUTCMonth() < birth.getUTCMonth() ||
    (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) years--;
  return Number.isFinite(years) && years >= 18;
}

async function deliver(email: string, phone: string | null, codes: { email?: string; phone?: string }) {
  const results = await Promise.allSettled([
    codes.email ? sendVerificationEmail(email, codes.email) : Promise.resolve(undefined),
    codes.phone && phone && SMS_ENABLED ? sendVerificationSMS(phone, codes.phone) : Promise.resolve(undefined),
  ]);
  if (results.some((result) => result.status === "rejected")) logger.warn("Un canal de verificación no pudo entregar el código");
  const result = results[0];
  return result.status === "fulfilled" && !!result.value?.sent;
}

export const registerUser = async (data: {
  email: string; firstName: string; lastName: string; documentType: string; documentNumber: string;
  dateOfBirth: string; phone: string; password: string;
}, context: ClientContext = {}) => {
  if (!isAdult(data.dateOfBirth)) throw new AppError("Debes ser mayor de 18 años", 400);
  const email = LOWER(data.email);
  const duplicate = () => new AppError("El correo, documento o teléfono ya está registrado. Inicia sesión o recupera el acceso.", 409);
  const passwordHash = await bcrypt.hash(data.password, passwordCost);
  try {
    const result = await AppDataSource.transaction(async (manager) => {
      if (!(await registrationAllowed(manager))) throw new AppError("El registro está temporalmente cerrado", 403);
      const repo = manager.getRepository(User);
      if (await repo.exists({ where: [{ email }, { documentNumber: data.documentNumber }, { phone: data.phone }] })) throw duplicate();
      const user = await repo.save(repo.create({
        email, firstName: data.firstName, lastName: data.lastName,
        documentType: (data.documentType === "pasaporte" ? DocumentType.PASSPORT : data.documentType) as DocumentType,
        documentNumber: data.documentNumber, dateOfBirth: data.dateOfBirth, phone: data.phone,
        passwordHash, role: UserRole.USER, accountStatus: AccountStatus.ACTIVE,
      }));
      const emailCode = await createChallenge(manager, user.id, CodeType.EMAIL_VERIFICATION, user.email);
      const phoneCode = SMS_ENABLED ? await createChallenge(manager, user.id, CodeType.PHONE_VERIFICATION, user.phone!) : undefined;
      const session = await issueSession(manager, user, context);
      await logAudit({ userId: user.id, action: AuditAction.REGISTER, entityType: "user", entityId: user.id,
        details: "Registro de cuenta; verificación pendiente", ...context }, manager);
      return { user, session, emailCode: emailCode.code, phoneCode: phoneCode?.code };
    });
    const emailSent = await deliver(result.user.email, result.user.phone, { email: result.emailCode, phone: result.phoneCode });
    return { user: presentUser(result.user), credentials: result.session, needsVerification: true, emailSent,
      message: EMAIL_PROVIDER === "console" && process.env.NODE_ENV !== "production"
        ? "Cuenta creada. El código está en la consola local de BANCA NEN."
        : emailSent ? "Cuenta creada. Consulta tu correo." : "Cuenta creada. No se pudo entregar el código." };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") throw duplicate();
    throw error;
  }
};

/** Devolver el error como resultado hace que los contadores y la auditoría sí se confirmen. */
async function committed<T>(work: (manager: EntityManager) => Promise<T | AppError>): Promise<T> {
  const result = await AppDataSource.transaction(work);
  if (result instanceof AppError) throw result;
  return result;
}

function assertCredentialWindow(user: User) {
  if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
    throw new AppError("Demasiados intentos. Espera 15 minutos o recupera tu contraseña.", 429);
  }
  if (user.lockedUntil) { user.lockedUntil = null; user.failedLoginAttempts = 0; }
}

function clearFailures(user: User) { user.failedLoginAttempts = 0; user.lockedUntil = null; }

async function failedCredential(manager: EntityManager, user: User, context: ClientContext, forLogin: boolean) {
  user.failedLoginAttempts += 1;
  const locked = user.failedLoginAttempts >= credentialLimit;
  if (locked) user.lockedUntil = new Date(Date.now() + lockDuration);
  await manager.getRepository(User).save(user);
  await logAudit({ userId: user.id, action: AuditAction.LOGIN_FAILED, entityType: "authentication",
    details: locked ? "Espera temporal por intentos fallidos" : "Credencial no validada", ...context }, manager);
  return locked
    ? new AppError("Demasiados intentos. Espera 15 minutos o recupera tu contraseña.", 429)
    : new AppError("Las credenciales o el código no coinciden. Si es TOTP, usa un código nuevo.", forLogin ? 401 : 400);
}

function acceptedTotpStep(encodedSecret: string, userId: string, code: string, lastStep: number | null) {
  const time = Math.floor(Date.now() / 1000);
  const delta = speakeasy.totp.verifyDelta({ secret: unsealTotp(encodedSecret, userId), encoding: "base32", token: code, time, window: 1 });
  const step = delta ? Math.floor(time / 30) + delta.delta : null;
  return step !== null && (lastStep === null || step > lastStep) ? step : null;
}

function clearPendingTotp(user: User) {
  user.twoFactorPending = user.twoFactorPendingSession = null;
  user.twoFactorPendingExpires = null;
}

export const loginUser = (data: { email: string; password: string; twoFactorCode?: string }, context: ClientContext = {}) =>
  committed(async (manager) => {
    const user = await lockIdentity(manager, "email", LOWER(data.email));
    if (!user || user.accountStatus !== AccountStatus.ACTIVE) {
      await bcrypt.compare(data.password, dummyHash);
      return new AppError("Credenciales inválidas o cuenta no disponible", 401);
    }
    assertCredentialWindow(user);
    if (!(await bcrypt.compare(data.password, user.passwordHash))) return failedCredential(manager, user, context, true);
    if (user.twoFactorEnabled) {
      if (!data.twoFactorCode) {
        // El administrador recibe su código de acceso por correo, sin dejar de
        // funcionar con la app autenticadora ni exponer el secreto TOTP.
        if (user.role === UserRole.ADMIN && user.twoFactorSecret) {
          try {
            const code = speakeasy.totp({ secret: unsealTotp(user.twoFactorSecret, user.id), encoding: "base32" });
            void send2FACodeEmail(user.email, code).catch(() => {});
          } catch {
            // Si falla el correo, el autenticador sigue siendo válido.
          }
        }
        return { requiresTwoFactor: true as const };
      }
      const step = user.twoFactorSecret ? acceptedTotpStep(user.twoFactorSecret, user.id, data.twoFactorCode, user.twoFactorLastStep) : null;
      if (step === null) return failedCredential(manager, user, context, true);
      user.twoFactorLastStep = step;
    }
    clearFailures(user);
    user.lastLoginAt = new Date();
    user.lastLoginIp = context.ipAddress?.slice(0, 45) || null;
    await manager.getRepository(User).save(user);
    const credentials = await issueSession(manager, user, context, user.twoFactorEnabled);
    await logAudit({ userId: user.id, action: AuditAction.LOGIN, entityType: "authentication",
      details: user.isVerified ? "Inicio de sesión" : "Inicio de una sesión de verificación", ...context }, manager);
    return { requiresTwoFactor: false as const, user: presentUser(user), credentials, needsVerification: !user.isVerified };
  });

async function verifyChannel(userId: string, sessionId: string, code: string, type: CodeType, context: ClientContext) {
  return committed(async (manager) => {
    const user = await activeIdentity(manager, userId, sessionId);
    if (user.isVerified) return { user: presentUser(user), fullyVerified: true, needsPhone: false };
    const isEmail = type === CodeType.EMAIL_VERIFICATION;
    if (!isEmail && (!user.emailVerified || !SMS_ENABLED)) throw new AppError("Verifica primero el correo o comprueba el canal SMS", 400);
    const wasVerified = isEmail ? user.emailVerified : user.phoneVerified;
    if (!wasVerified) {
      const challenge = await latestChallenge(manager, userId, type);
      if (!challenge || challenge.target !== (isEmail ? user.email : user.phone) ||
          !(await consumeChallenge(manager, challenge, code))) return invalidOtp();
    }
    if (isEmail) user.emailVerified = true;
    else user.phoneVerified = true;
    user.isVerified = user.emailVerified && (!SMS_ENABLED || user.phoneVerified);
    await manager.getRepository(User).save(user);
    let credentials;
    if (user.isVerified) {
      await revokeAll(manager, userId);
      credentials = await issueSession(manager, user, context, user.twoFactorEnabled);
      await logAudit({ userId, action: AuditAction.ACCOUNT_VERIFIED, entityType: "user", entityId: userId,
        details: "Cuenta verificada", ...context }, manager);
    }
    return { user: presentUser(user), fullyVerified: user.isVerified, needsPhone: SMS_ENABLED && !user.phoneVerified, credentials };
  });
}

export const verifyEmailCode = (userId: string, sessionId: string, code: string, context: ClientContext) =>
  verifyChannel(userId, sessionId, code, CodeType.EMAIL_VERIFICATION, context);
export const verifyPhoneCode = (userId: string, sessionId: string, code: string, context: ClientContext) =>
  verifyChannel(userId, sessionId, code, CodeType.PHONE_VERIFICATION, context);

export async function resendVerificationCodes(userId: string, sessionId: string) {
  const result = await AppDataSource.transaction(async (manager) => {
    const user = await activeIdentity(manager, userId, sessionId);
    if (user.isVerified) return null;
    const type = user.emailVerified ? CodeType.PHONE_VERIFICATION : CodeType.EMAIL_VERIFICATION;
    if (coolingDown(await latestChallenge(manager, userId, type))) throw new AppError("Espera un minuto antes de solicitar otro código", 429);
    const target = type === CodeType.EMAIL_VERIFICATION ? user.email : user.phone;
    if (!target || (type === CodeType.PHONE_VERIFICATION && !SMS_ENABLED)) throw new AppError("Canal de verificación no disponible", 409);
    const challenge = await createChallenge(manager, userId, type, target);
    return { user, codes: type === CodeType.EMAIL_VERIFICATION ? { email: challenge.code } : { phone: challenge.code } };
  });
  if (!result) return { emailSent: false, message: "La cuenta ya está verificada" };
  const sent = await deliver(result.user.email, result.user.phone, result.codes);
  return { emailSent: sent, message: EMAIL_PROVIDER === "console" && !result.user.emailVerified && process.env.NODE_ENV !== "production"
    ? "Código nuevo en la consola local de BANCA NEN." : "Se solicitó el envío del nuevo código." };
}

export async function forgotPassword(email: string) {
  const generic = { success: true, message: "Si la cuenta está disponible, recibirás un código de recuperación." };
  const challenge = await AppDataSource.transaction(async (manager) => {
    const user = await lockIdentity(manager, "email", LOWER(email));
    if (!user || user.accountStatus !== AccountStatus.ACTIVE || !user.emailVerified ||
      coolingDown(await latestChallenge(manager, user.id, CodeType.PASSWORD_RESET))) return null;
    return { email: user.email, ...await createChallenge(manager, user.id, CodeType.PASSWORD_RESET, user.email) };
  });
  if (challenge) void sendPasswordResetEmail(challenge.email, challenge.code, challenge.token)
    .catch(() => logger.warn("No se pudo entregar el mensaje de recuperación"));
  return generic;
}

export async function resetPassword(credential: string, password: string, email?: string, context: ClientContext = {}) {
  const id = opaqueTokenId(credential);
  return committed(async (manager) => {
    const byId = id ? await manager.getRepository(VerificationCode).findOneBy({ id, type: CodeType.PASSWORD_RESET }) : null;
    const user = id ? (byId && await lockIdentity(manager, "id", byId.userId))
      : (email && /^\d{6}$/.test(credential) && await lockIdentity(manager, "email", LOWER(email)));
    if (!user || !user.emailVerified || user.accountStatus !== AccountStatus.ACTIVE) return invalidReset();
    const challenge = await latestChallenge(manager, user.id, CodeType.PASSWORD_RESET, id || undefined);
    if (!challenge || challenge.target !== user.email || (email && LOWER(email) !== user.email) ||
        !(await consumeChallenge(manager, challenge, credential, !!id))) return invalidReset();
    user.passwordHash = await bcrypt.hash(password, passwordCost);
    clearFailures(user);
    clearPendingTotp(user);
    await manager.getRepository(User).save(user);
    await revokeAll(manager, user.id);
    await logAudit({ userId: user.id, action: AuditAction.PASSWORD_CHANGE, entityType: "user", entityId: user.id,
      details: "Contraseña restablecida; sesiones cerradas", ...context }, manager);
    return { success: true, message: "Contraseña actualizada. Inicia sesión de nuevo." };
  });
}

export async function setup2FA(userId: string, sessionId: string, password: string, context: ClientContext) {
  return committed(async (manager) => {
    const user = await activeIdentity(manager, userId, sessionId);
    if (user.twoFactorEnabled) throw new AppError("2FA ya está activado", 409);
    assertCredentialWindow(user);
    if (!(await bcrypt.compare(password, user.passwordHash))) return failedCredential(manager, user, context, false);
    const secret = speakeasy.generateSecret({ length: 20 }).base32;
    user.twoFactorPending = sealTotp(secret, userId);
    user.twoFactorPendingSession = sessionId;
    user.twoFactorPendingExpires = new Date(Date.now() + CODE_TTL_MS);
    await manager.getRepository(User).save(user);
    const otpauthUrl = `otpauth://totp/BANCA%20NEN:${encodeURIComponent(user.email)}?secret=${secret}&issuer=BANCA%20NEN`;
    return { secret, otpauthUrl, expiresAt: user.twoFactorPendingExpires };
  });
}

export async function confirm2FA(userId: string, sessionId: string, code: string, context: ClientContext) {
  return committed(async (manager) => {
    const user = await activeIdentity(manager, userId, sessionId);
    assertCredentialWindow(user);
    if (user.twoFactorEnabled || !user.twoFactorPending || user.twoFactorPendingSession !== sessionId ||
      !user.twoFactorPendingExpires || user.twoFactorPendingExpires.getTime() <= Date.now()) {
      throw new AppError("Inicia una nueva configuración de 2FA", 400);
    }
    const step = acceptedTotpStep(user.twoFactorPending, userId, code, null);
    if (step === null) return failedCredential(manager, user, context, false);
    user.twoFactorEnabled = true;
    user.twoFactorSecret = user.twoFactorPending;
    user.twoFactorLastStep = step;
    clearPendingTotp(user);
    clearFailures(user);
    await manager.getRepository(User).save(user);
    await revokeAll(manager, userId);
    const credentials = await issueSession(manager, user, context, true);
    await logAudit({ userId, action: AuditAction.TWO_FACTOR_ENABLED, entityType: "user", entityId: userId,
      details: "2FA confirmado con la aplicación autenticadora", ...context }, manager);
    return { user: presentUser(user), credentials };
  });
}

export function disable2FA(userId: string, sessionId: string, password: string, code: string, context: ClientContext) {
  return committed(async (manager) => {
    const user = await activeIdentity(manager, userId, sessionId);
    assertCredentialWindow(user);
    if (!user.twoFactorEnabled || !user.twoFactorSecret) throw new AppError("2FA no está activado", 409);
    if (!(await bcrypt.compare(password, user.passwordHash)) ||
      acceptedTotpStep(user.twoFactorSecret, userId, code, user.twoFactorLastStep) === null) return failedCredential(manager, user, context, false);
    user.twoFactorEnabled = false;
    user.twoFactorSecret = user.twoFactorLastStep = null;
    clearPendingTotp(user);
    clearFailures(user);
    await manager.getRepository(User).save(user);
    await revokeAll(manager, userId);
    const credentials = await issueSession(manager, user, context);
    await logAudit({ userId, action: AuditAction.TWO_FACTOR_DISABLED, entityType: "user", entityId: userId,
      details: "2FA desactivado con contraseña y código; otras sesiones cerradas", ...context }, manager);
    return { user: presentUser(user), credentials };
  });
}

export function changePassword(userId: string, sessionId: string, currentPassword: string, password: string, code: string | undefined, context: ClientContext) {
  return committed(async (manager) => {
    const user = await activeIdentity(manager, userId, sessionId);
    assertCredentialWindow(user);
    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) return failedCredential(manager, user, context, false);
    if (user.twoFactorEnabled) {
      const step = user.twoFactorSecret && code ? acceptedTotpStep(user.twoFactorSecret, userId, code, user.twoFactorLastStep) : null;
      if (step === null) return failedCredential(manager, user, context, false);
      user.twoFactorLastStep = step;
    }
    user.passwordHash = await bcrypt.hash(password, passwordCost);
    clearFailures(user);
    clearPendingTotp(user);
    await manager.getRepository(User).save(user);
    await manager.getRepository(VerificationCode).update({ userId, type: CodeType.PASSWORD_RESET, used: false }, { used: true, usedAt: new Date() });
    await revokeAll(manager, userId);
    await logAudit({ userId, action: AuditAction.PASSWORD_CHANGE, entityType: "user", entityId: userId,
      details: "Contraseña cambiada; sesiones cerradas", ...context }, manager);
    return { success: true, message: "Contraseña actualizada. Inicia sesión de nuevo." };
  });
}

export async function getProfile(userId: string) {
  const user = await AppDataSource.getRepository(User).findOneBy({ id: userId });
  if (!user) throw new AppError("Cuenta no disponible", 401);
  return presentUser(user);
}
