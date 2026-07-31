import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/database";
import { User, UserRole, UserStatus, DocumentType } from "../models/User";
import { AppError } from "../middleware/errorHandler.middleware";
import { sendVerificationEmail, sendPasswordResetEmail, send2FACodeEmail } from "../config/email";
import { sendVerificationSMS, sendPasswordResetSMS } from "../config/sms";
import logger from "../config/logger";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "24h";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";

const generateToken = (userId: string, role: string): string => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const generateRefreshToken = (userId: string): string => {
  return jwt.sign({ id: userId, type: "refresh" }, JWT_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

const generateCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const isAdult = (dateOfBirth: string): boolean => {
  const today = new Date();
  const birth = new Date(dateOfBirth);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 18;
};

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

  const user = userRepo.create({
    email: data.email,
    firstName: data.firstName,
    lastName: data.lastName,
    documentType: data.documentType as DocumentType,
    documentNumber: data.documentNumber,
    dateOfBirth: data.dateOfBirth,
    phone: data.phone,
    password: data.password,
    role: UserRole.USER,
    status: UserStatus.INACTIVE,
    isVerified: false,
    emailVerified: false,
    phoneVerified: false,
    verificationToken: JSON.stringify({ emailCode, phoneCode }),
  });

  const savedUser = await userRepo.save(user);

  const token = generateToken(savedUser.id, savedUser.role);
  const refreshToken = generateRefreshToken(savedUser.id);

  try {
    await sendVerificationEmail(savedUser.email, emailCode);
  } catch (error) {
    logger.warn(`No se pudo enviar email a ${savedUser.email}: ${error}`);
  }

  try {
    await sendVerificationSMS(savedUser.phone, phoneCode);
  } catch (error) {
    logger.warn(`No se pudo enviar SMS a ${savedUser.phone}: ${error}`);
  }

  logger.info(`Nuevo usuario registrado: ${savedUser.email}`);

  return {
    user: savedUser.toJSON(),
    token,
    refreshToken,
    message: "Se enviaron codigos de verificacion a tu email y telefono.",
  };
};

export const verifyEmailCode = async (userId: string, code: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  if (user.emailVerified) {
    throw new AppError("Tu email ya esta verificado", 400);
  }

  let verification: any = {};
  try { verification = JSON.parse(user.verificationToken || "{}"); } catch {}

  if (verification.emailCode !== code) {
    throw new AppError("Codigo de email incorrecto", 400);
  }

  user.emailVerified = true;

  if (user.emailVerified) {
    user.isVerified = true;
    user.status = UserStatus.ACTIVE;
    user.verificationToken = undefined;
  } else {
    verification.emailVerified = true;
    user.verificationToken = JSON.stringify(verification);
  }

  await userRepo.save(user);

  logger.info(`Email verificado: ${user.email}`);

  return {
    emailVerified: true,
    phoneVerified: user.phoneVerified,
    fullyVerified: user.isVerified,
    message: user.isVerified ? "Cuenta verificada completamente. Ya puedes iniciar sesion." : "Email verificado. Ahora verifica tu telefono.",
  };
};

export const verifyPhoneCode = async (userId: string, code: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  if (user.phoneVerified) {
    throw new AppError("Tu telefono ya esta verificado", 400);
  }

  let verification: any = {};
  try { verification = JSON.parse(user.verificationToken || "{}"); } catch {}

  if (verification.phoneCode !== code) {
    throw new AppError("Codigo de telefono incorrecto", 400);
  }

  user.phoneVerified = true;

  if (user.emailVerified) {
    user.isVerified = true;
    user.status = UserStatus.ACTIVE;
    user.verificationToken = undefined;
  } else {
    verification.phoneVerified = true;
    user.verificationToken = JSON.stringify(verification);
  }

  await userRepo.save(user);

  logger.info(`Telefono verificado: ${user.email}`);

  return {
    emailVerified: user.emailVerified,
    phoneVerified: true,
    fullyVerified: user.isVerified,
    message: user.isVerified ? "Cuenta verificada completamente. Ya puedes iniciar sesion." : "Telefono verificado. Ahora verifica tu email.",
  };
};

export const resendVerificationCodes = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  if (user.isVerified) {
    throw new AppError("Tu cuenta ya esta verificada", 400);
  }

  const emailCode = generateCode();
  const phoneCode = generateCode();

  let verification: any = {};
  try { verification = JSON.parse(user.verificationToken || "{}"); } catch {}

  if (!user.emailVerified) verification.emailCode = emailCode;
  if (!user.phoneVerified) verification.phoneCode = phoneCode;

  user.verificationToken = JSON.stringify(verification);
  await userRepo.save(user);

  if (!user.emailVerified) {
    try { await sendVerificationEmail(user.email, emailCode); } catch (error) { logger.warn(`No se pudo reenviar email: ${error}`); }
  }

  if (!user.phoneVerified && user.phone) {
    try { await sendVerificationSMS(user.phone, phoneCode); } catch (error) { logger.warn(`No se pudo reenviar SMS: ${error}`); }
  }

  return { message: "Codigos reenviados" };
};

export const loginUser = async (data: { email: string; password: string; twoFactorCode?: string }) => {
  const userRepo = AppDataSource.getRepository(User);

  const user = await userRepo.findOne({ where: { email: data.email } });
  if (!user) {
    throw new AppError("Credenciales invalidas", 401);
  }

  if (!user.isVerified) {
    throw new AppError("Debes verificar tu email antes de iniciar sesion", 403);
  }

  if (user.status === UserStatus.SUSPENDED) {
    throw new AppError("Tu cuenta ha sido suspendida. Contacta soporte.", 403);
  }

  const isPasswordValid = await user.comparePassword(data.password);
  if (!isPasswordValid) {
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.status = UserStatus.SUSPENDED;
      await userRepo.save(user);
      throw new AppError("Cuenta bloqueada por multiples intentos fallidos. Contacta soporte.", 423);
    }
    await userRepo.save(user);
    throw new AppError(`Credenciales invalidas. Intentos restantes: ${5 - user.loginAttempts}`, 401);
  }

  if (user.twoFactorEnabled) {
    if (!data.twoFactorCode) {
      const code = generateCode();
      user.twoFactorSecret = code;
      await userRepo.save(user);

      try { await send2FACodeEmail(user.email, code); } catch {}
      if (user.phone) {
        try { await sendVerificationSMS(user.phone, code); } catch {}
      }

      return { requiresTwoFactor: true, message: "Se envio un codigo 2FA a tu email y telefono." };
    }

    if (data.twoFactorCode !== user.twoFactorSecret) {
      throw new AppError("Codigo 2FA incorrecto", 401);
    }

    user.twoFactorSecret = undefined;
  }

  user.loginAttempts = 0;
  await userRepo.save(user);

  const token = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  logger.info(`Usuario logueado: ${user.email}`);

  return { user: user.toJSON(), token, refreshToken };
};

export const forgotPassword = async (email: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { email } });

  if (!user) {
    throw new AppError("No existe una cuenta con este email", 404);
  }

  if (!user.isVerified) {
    throw new AppError("Debes verificar tu cuenta primero", 403);
  }

  const resetToken = jwt.sign({ id: user.id, purpose: "reset" }, JWT_SECRET, { expiresIn: "1h" });
  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = new Date(Date.now() + 3600000);
  await userRepo.save(user);

  await sendPasswordResetEmail(user.email, resetToken);

  if (user.phone) {
    const smsCode = generateCode();
    user.twoFactorSecret = smsCode;
    await userRepo.save(user);
    try { await sendPasswordResetSMS(user.phone, smsCode); } catch {}
  }

  logger.info(`Reset de contrasena solicitado: ${email}`);

  return { message: "Se envio un enlace de recuperacion a tu email", hasPhone: !!user.phone };
};

export const resetPassword = async (token: string, newPassword: string) => {
  const userRepo = AppDataSource.getRepository(User);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; purpose: string };

    if (decoded.purpose !== "reset") {
      throw new AppError("Token invalido", 400);
    }

    const user = await userRepo.findOne({ where: { id: decoded.id } });
    if (!user || user.resetPasswordToken !== token) {
      throw new AppError("Token invalido o ya utilizado", 400);
    }

    if (user.resetPasswordExpires && user.resetPasswordExpires < new Date()) {
      throw new AppError("El token ha expirado, solicita uno nuevo", 400);
    }

    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_SALT_ROUNDS || "12"));
    user.password = await bcrypt.hash(newPassword, salt);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.loginAttempts = 0;
    await userRepo.save(user);

    logger.info(`Contrasena restablecida: ${user.email}`);

    return { message: "Contrasena actualizada correctamente" };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Token invalido o expirado", 400);
  }
};

export const enable2FA = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  if (!user.phoneVerified) {
    throw new AppError("Necesitas verificar tu telefono para activar 2FA", 400);
  }

  user.twoFactorEnabled = true;
  await userRepo.save(user);

  return { message: "2FA activado. Se enviara un codigo por SMS y email al iniciar sesion." };
};

export const disable2FA = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  user.twoFactorEnabled = false;
  user.twoFactorSecret = undefined;
  await userRepo.save(user);

  return { message: "2FA desactivado" };
};

export const getProfile = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user) {
    throw new AppError("Usuario no encontrado", 404);
  }

  return user.toJSON();
};
