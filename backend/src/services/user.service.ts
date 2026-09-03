/* ============================================================
   BANCA NEN — Servicio de Usuarios (perfil y preferencias)
   ============================================================ */
import { AppDataSource } from "../config/database";
import { User } from "../models/User";
import { UserSettings } from "../models/UserSettings";
import { AppError } from "../middleware/errorHandler.middleware";

const userRepo = () => AppDataSource.getRepository(User);
const settingsRepo = () => AppDataSource.getRepository(UserSettings);

/** Datos públicos del usuario (nunca exponer passwordHash ni secretos). */
export function toPublicUser(user: User) {
  return {
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
  };
}

const EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "country",
  "timezone",
  "preferredCurrency",
  "dateOfBirth",
] as const;

export async function getProfile(userId: string) {
  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);
  return toPublicUser(user);
}

export async function updateProfile(userId: string, patch: Record<string, unknown>) {
  const user = await userRepo().findOne({ where: { id: userId } });
  if (!user) throw new AppError("Usuario no encontrado", 404);

  for (const field of EDITABLE_FIELDS) {
    if (field in patch && patch[field] !== undefined) {
      (user as unknown as Record<string, unknown>)[field] = patch[field];
    }
  }
  await userRepo().save(user);
  return toPublicUser(user);
}

export async function getSettings(userId: string) {
  let settings = await settingsRepo().findOne({ where: { userId } as any });
  if (!settings) {
    settings = await settingsRepo().save(settingsRepo().create({ userId }));
  }
  return settings;
}

export async function updateSettings(userId: string, patch: Record<string, unknown>) {
  const settings = await getSettings(userId);
  const allowed = [
    "theme",
    "language",
    "currencyDisplay",
    "emailNotifications",
    "pushNotifications",
    "smsNotifications",
    "twoFactorMethod",
    "biometricEnabled",
    "tradingConfirmations",
    "riskTolerance",
    "autoLogoutMinutes",
    "hideSmallBalances",
  ];
  for (const field of allowed) {
    if (field in patch && patch[field] !== undefined) {
      (settings as unknown as Record<string, unknown>)[field] = patch[field];
    }
  }
  return settingsRepo().save(settings);
}
