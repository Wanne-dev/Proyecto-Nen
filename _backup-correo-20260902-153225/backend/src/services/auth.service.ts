import crypto from "crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { AppDataSource } from "../config/database";
import { User, UserRole, AccountStatus, DocumentType } from "../models/User";
import { AppError } from "../middleware/errorHandler.middleware";
import { sendVerificationEmail, sendPasswordResetEmail, sendWelcomeEmail } from "../config/email";
import { sendVerificationSMS } from "../config/sms";
import logger from "../config/logger";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions);
};

const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId, type: "refresh" }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions);
};

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/* Los codigos de verificacion caducan a los 10 minutos */
const CODE_TTL_MS = 10 * 60 * 1000;

/* Solo exigimos verificacion por SMS si Twilio esta realmente configurado */
const SMS_ENABLED = (process.env.TWILIO_ACCOUNT_SID || "").startsWith("AC");

const maskEmail = (email: string): string => {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return visible + "*".repeat(Math.max(1, name.length - 2)) + "@" + domain;
};

const isAdult = (dateOfBirth: string): boolean => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age >= 18;
};

const userToJSON = (user: User) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  kycStatus: user.kycStatus,
  accountStatus: user.accountStatus,
  isVerified: user.isVerified,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  twoFactorEnabled: user.twoFactorEnabled,
  phone: user.phone,
  documentType: user.documentType,
  documentNumber: user.documentNumber,
  dateOfBirth: user.dateOfBirth,
  country: user.country,
  timezone: user.timezone,
  preferredCurrency: user.preferredCurrency,
  createdAt: user.createdAt,
  lastLoginAt: user.lastLoginAt,
});

export const registerUser = async (data: {
  email: string;
  firstName: string;
  lastName: string;
  documentType: string;
  documentNumber: string;
  dateOfBirth: string;
  phone: string;
  password: string;
}) => {
  const userRepo = AppDataSource.getRepository(User);

  if (!isAdult(data.dateOfBirth)) {
    throw new AppError("Debes ser mayor de 18 anos para crear una cuenta", 400);
  }

  data.email = String(data.email || "").trim().toLowerCase();

  const existingEmail = await userRepo.findOne({ where: { email: data.email } });
  if (existingEmail) {
    if (existingEmail.isVerified) throw new AppError("Ya existe una cuenta con este email", 409);
    await userRepo.remove(existingEmail);
  }

  const existingDoc = await userRepo.findOne({ where: { documentNumber: data.documentNumber } });
  if (existingDoc) {
    if (existingDoc.isVerified) throw new AppError("Ya existe una cuenta con este numero de documento", 409);
    await userRepo.remove(existingDoc);
  }

  const existingPhone = await userRepo.findOne({ where: { phone: data.phone } });
  if (existingPhone) {
    if (existingPhone.isVerified) throw new AppError("Ya existe una cuenta con este numero de telefono", 409);
    await userRepo.remove(existingPhone);
  }

  const emailCode = generateCode();
  const phoneCode = generateCode();

  const saltRounds = 12;
  const passwordHash = await bcrypt.hash(data.password, saltRounds);

  const user = userRepo.create({
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    documentType: data.documentType as DocumentType,
    documentNumber: data.documentNumber,
    dateOfBirth: data.dateOfBirth,
    phone: data.phone,
    passwordHash,
    role: UserRole.USER,
    accountStatus: AccountStatus.ACTIVE,
    // El usuario NO queda verificado hasta que introduzca el codigo enviado por email.
    isVerified: false,
    emailVerified: false,
    // El SMS es opcional: si Twilio no esta configurado no bloqueamos la cuenta.
    phoneVerified: !SMS_ENABLED,
    twoFactorSecret: JSON.stringify({ emailCode, phoneCode, codesExpireAt: Date.now() + CODE_TTL_MS }),
  });

  const savedUser = await userRepo.save(user);

  const token = generateToken(savedUser.id, savedUser.role);
  const refreshToken = generateRefreshToken(savedUser.id);

  let emailSent = false;
  try {
    const result = await sendVerificationEmail(savedUser.email, emailCode);
    emailSent = result.sent;
    if (!result.sent && result.error) {
      logger.error("Registro: el email de verificacion NO se envio: " + result.error);
    }
  } catch (error) {
    logger.error("Registro: excepcion enviando email de verificacion: " + error);
  }

  if (SMS_ENABLED) {
    try {
      await sendVerificationSMS(savedUser.phone, phoneCode);
    } catch (error) {
      logger.warn("No se pudo enviar SMS: " + error);
    }
  }

  /* Bienvenida + notificación */
  try {
    const { createNotification } = await import("./admin.service");
    createNotification(savedUser.id, "system", "Bienvenido a BANCA NEN 🎉",
      "Tu cuenta fue creada exitosamente. Ya puedes depositar e invertir.").catch(() => {});
  } catch { /* ignore */ }

  return {
    user: userToJSON(savedUser),
    token,
    refreshToken,
    needsVerification: true,
    emailSent,
    message: emailSent
      ? "Cuenta creada. Te enviamos un codigo de 6 digitos a " + maskEmail(savedUser.email) + "."
      : "Cuenta creada. No pudimos enviar el correo en este momento: revisa la consola del servidor o pulsa 'Reenviar codigo'.",
  };
};

export const loginUser = async (data: { email: string; password: string; twoFactorCode?: string }) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email: String(data.email || "").trim().toLowerCase() } });

  if (!user) throw new AppError("Credenciales invalidas", 401);
  if (user.accountStatus === AccountStatus.SUSPENDED) throw new AppError("Tu cuenta ha sido suspendida. Contacta soporte.", 403);

  /* Si 2FA activo: primero exigir credenciales, luego el código TOTP */
  if (user.twoFactorEnabled) {
    const isPasswordValid = await bcrypt.compare(data.password || "", user.passwordHash);
    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.accountStatus = AccountStatus.SUSPENDED;
        await userRepo.save(user);
        throw new AppError("Cuenta bloqueada por multiples intentos fallidos.", 423);
      }
      await userRepo.save(user);
      throw new AppError("Credenciales invalidas. Intentos restantes: " + (5 - user.failedLoginAttempts), 401);
    }
    if (!data.twoFactorCode) {
      return { user: userToJSON(user), requiresTwoFactor: true, message: "Se requiere codigo 2FA" };
    }
    const secret = user.twoFactorSecret;
    const verified = secret
      ? speakeasy.totp.verify({ secret, encoding: "base32", token: data.twoFactorCode, window: 1 })
      : false;
    if (!verified) throw new AppError("Codigo 2FA invalido", 401);
  } else {
    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      user.failedLoginAttempts += 1;
      if (user.failedLoginAttempts >= 5) {
        user.accountStatus = AccountStatus.SUSPENDED;
        await userRepo.save(user);
        throw new AppError("Cuenta bloqueada por multiples intentos fallidos.", 423);
      }
      await userRepo.save(user);
      throw new AppError("Credenciales invalidas. Intentos restantes: " + (5 - user.failedLoginAttempts), 401);
    }
  }

  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date();
  await userRepo.save(user);

  const token = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  logger.info("Usuario logueado: " + user.email);

  /* Si aun no verifico el email, le mandamos un codigo nuevo automaticamente */
  if (!user.isVerified) {
    resendVerificationCodes(user.id).catch(() => {});
    return {
      user: userToJSON(user),
      token,
      refreshToken,
      needsVerification: true,
      message: "Te enviamos un codigo de verificacion a " + maskEmail(user.email),
    };
  }

  return { user: userToJSON(user), token, refreshToken };
};

export const verifyEmailCode = async (userId: string, code: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);

  if (user.emailVerified) {
    return { emailVerified: true, fullyVerified: user.isVerified, needsPhone: !user.phoneVerified };
  }

  let stored: any = {};
  try { stored = JSON.parse(user.twoFactorSecret || "{}"); } catch { /* ignore */ }

  if (!stored.emailCode) {
    throw new AppError("No hay un codigo activo. Pulsa 'Reenviar codigo'.", 400);
  }
  if (stored.codesExpireAt && Date.now() > Number(stored.codesExpireAt)) {
    throw new AppError("El codigo expiro. Pulsa 'Reenviar codigo' para recibir uno nuevo.", 400);
  }
  if (String(stored.emailCode).trim() !== String(code).trim()) {
    throw new AppError("Codigo de email incorrecto", 400);
  }

  user.emailVerified = true;
  user.isVerified = user.phoneVerified === true;
  await userRepo.save(user);

  if (user.isVerified) {
    sendWelcomeEmail(user.email, user.firstName).catch(() => {});
  }

  logger.info("Email verificado: " + user.email);
  return { emailVerified: true, fullyVerified: user.isVerified, needsPhone: !user.phoneVerified };
};

export const verifyPhoneCode = async (userId: string, code: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);

  if (user.phoneVerified) {
    return { phoneVerified: true, fullyVerified: user.isVerified };
  }

  let stored: any = {};
  try { stored = JSON.parse(user.twoFactorSecret || "{}"); } catch { /* ignore */ }

  if (stored.codesExpireAt && Date.now() > Number(stored.codesExpireAt)) {
    throw new AppError("El codigo expiro. Pulsa 'Reenviar codigo' para recibir uno nuevo.", 400);
  }
  if (String(stored.phoneCode || "").trim() !== String(code).trim()) {
    throw new AppError("Codigo de telefono incorrecto", 400);
  }

  user.phoneVerified = true;
  user.isVerified = user.emailVerified === true;
  await userRepo.save(user);

  if (user.isVerified) {
    sendWelcomeEmail(user.email, user.firstName).catch(() => {});
  }

  return { phoneVerified: true, fullyVerified: user.isVerified };
};

export const resendVerificationCodes = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);

  if (user.emailVerified && user.phoneVerified) {
    return { success: true, emailSent: false, message: "Tu cuenta ya esta verificada" };
  }

  let stored: any = {};
  try { stored = JSON.parse(user.twoFactorSecret || "{}"); } catch { /* ignore */ }

  /* Anti-spam: maximo 1 reenvio cada 60 segundos */
  if (stored.lastSentAt && Date.now() - Number(stored.lastSentAt) < 60_000) {
    const wait = Math.ceil((60_000 - (Date.now() - Number(stored.lastSentAt))) / 1000);
    throw new AppError("Espera " + wait + " segundos antes de pedir otro codigo", 429);
  }

  const emailCode = user.emailVerified ? stored.emailCode : generateCode();
  const phoneCode = user.phoneVerified ? stored.phoneCode : generateCode();

  user.twoFactorSecret = JSON.stringify({
    emailCode,
    phoneCode,
    codesExpireAt: Date.now() + CODE_TTL_MS,
    lastSentAt: Date.now(),
  });
  await userRepo.save(user);

  let emailSent = false;
  let emailError: string | undefined;

  if (!user.emailVerified) {
    const result = await sendVerificationEmail(user.email, emailCode);
    emailSent = result.sent;
    emailError = result.error;
    if (!result.sent) {
      logger.error("Reenvio: el email no se envio a " + user.email + " -> " + (result.error || "sin proveedor"));
    }
  }

  if (!user.phoneVerified && SMS_ENABLED) {
    sendVerificationSMS(user.phone, phoneCode).catch((e) => logger.warn("SMS: " + e));
  }

  return {
    success: true,
    emailSent,
    emailError,
    message: emailSent
      ? "Enviamos un nuevo codigo a " + maskEmail(user.email)
      : "No pudimos enviar el correo. Revisa la configuracion SMTP/Resend del servidor.",
  };
};

export const forgotPassword = async (email: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const normalized = String(email || "").trim().toLowerCase();
  const user = await userRepo.findOne({ where: { email: normalized } });

  /* Respuesta identica exista o no la cuenta (no filtrar usuarios) */
  const genericResponse = {
    success: true,
    message: "Si existe una cuenta con ese correo, te enviamos un codigo de recuperacion.",
  };

  if (!user) {
    logger.info("forgot-password para email inexistente: " + normalized);
    return genericResponse;
  }

  /* Anti-spam: 1 solicitud por minuto */
  if (user.resetPasswordExpires && user.resetPasswordExpires.getTime() - CODE_TTL_MS > Date.now() - 60_000) {
    logger.warn("forgot-password demasiado seguido para " + normalized);
    return genericResponse;
  }

  const code = generateCode();
  const token = code + "-" + crypto.randomBytes(24).toString("hex");

  user.resetPasswordToken = token;
  user.resetPasswordExpires = new Date(Date.now() + CODE_TTL_MS);
  await userRepo.save(user);

  const result = await sendPasswordResetEmail(user.email, code, token);
  if (!result.sent) {
    logger.error("forgot-password: email NO enviado a " + user.email + " -> " + (result.error || "sin proveedor"));
  }

  return genericResponse;
};

export const resetPassword = async (tokenOrCode: string, password: string, email?: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const value = String(tokenOrCode || "").trim();

  let user: User | null = null;

  /* Caso 1: enlace del correo -> token completo */
  user = await userRepo.findOne({ where: { resetPasswordToken: value } });

  /* Caso 2: el usuario escribio solo el codigo de 6 digitos */
  if (!user && /^\d{6}$/.test(value)) {
    const candidates = await userRepo
      .createQueryBuilder("u")
      .where("u.resetPasswordToken LIKE :prefix", { prefix: value + "-%" })
      .getMany();

    if (candidates.length === 1) {
      user = candidates[0];
    } else if (candidates.length > 1) {
      if (!email) throw new AppError("Indica tambien tu email para confirmar el codigo", 400);
      user = candidates.find((c) => c.email.toLowerCase() === email.trim().toLowerCase()) || null;
    }
  }

  if (!user || !user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
    throw new AppError("Token invalido o expirado. Solicita un nuevo codigo.", 400);
  }

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetPasswordToken = "";
  user.resetPasswordExpires = null as any;
  user.failedLoginAttempts = 0;
  if (user.accountStatus === AccountStatus.SUSPENDED) {
    user.accountStatus = AccountStatus.ACTIVE;
  }
  await userRepo.save(user);

  logger.info("Contrasena restablecida para " + user.email);
  return { success: true, message: "Contrasena actualizada correctamente" };
};

export const enable2FA = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);

  const secret = speakeasy.generateSecret({ name: "BANCA NEN (" + user.email + ")" });
  user.twoFactorSecret = secret.base32;
  user.twoFactorEnabled = true;
  await userRepo.save(user);
  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url,
    qrCodeUrl: "otpauth://totp/BANCA%20NEN:" + encodeURIComponent(user.email) + "?secret=" + secret.base32 + "&issuer=BANCA%20NEN",
  };
};

export const disable2FA = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);
  user.twoFactorEnabled = false;
  user.twoFactorSecret = "";
  await userRepo.save(user);
  return { success: true };
};

export const getProfile = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);
  return userToJSON(user);
};
