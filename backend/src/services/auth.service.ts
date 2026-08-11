import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { AppDataSource } from "../config/database";
import { User, UserRole, AccountStatus, DocumentType } from "../models/User";
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

const userToJSON = (user: User) => ({
  id: user.id,
  email: user.email,
  firstName: user.firstName,
  lastName: user.lastName,
  role: user.role,
  kycStatus: user.kycStatus,
  isVerified: user.isVerified,
  emailVerified: user.emailVerified,
  phoneVerified: user.phoneVerified,
  accountStatus: user.accountStatus,
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
    isVerified: true,
    emailVerified: true,
    phoneVerified: true,
    twoFactorSecret: JSON.stringify({ emailCode, phoneCode }),
  });

  const savedUser = await userRepo.save(user);

  const token = generateToken(savedUser.id, savedUser.role);
  const refreshToken = generateRefreshToken(savedUser.id);

  try {
    await sendVerificationEmail(savedUser.email, emailCode);
  } catch (error) {
    logger.warn("No se pudo enviar email: " + error);
  }

  try {
    await sendVerificationSMS(savedUser.phone, phoneCode);
  } catch (error) {
    logger.warn("No se pudo enviar SMS: " + error);
  }

  logger.info("Nuevo usuario registrado: " + savedUser.email);

  return {
    user: userToJSON(savedUser),
    token,
    refreshToken,
    message: "Cuenta creada exitosamente.",
  };
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

  if (user.accountStatus === AccountStatus.SUSPENDED) {
    throw new AppError("Tu cuenta ha sido suspendida. Contacta soporte.", 403);
  }

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

  user.failedLoginAttempts = 0;
  user.lastLoginAt = new Date();
  await userRepo.save(user);

  const token = generateToken(user.id, user.role);
  const refreshToken = generateRefreshToken(user.id);

  logger.info("Usuario logueado: " + user.email);

  return { user: userToJSON(user), token, refreshToken };
};

export const getProfile = async (userId: string) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);
  return userToJSON(user);
};