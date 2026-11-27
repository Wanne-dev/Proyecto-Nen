/* ============================================================
   BANCA NEN — Servicio de Administración
   ============================================================ */
import { MoreThan, type EntityManager } from "typeorm";
import { AppDataSource } from "../config/database";
import { User, UserRole, AccountStatus, KYCStatus } from "../models/User";
import { Order, OrderStatus } from "../models/Order";
import { Transaction, TransactionType } from "../models/Transaction";
import { Wallet } from "../models/Wallet";
import { SystemSetting } from "../models/SystemSetting";
import { logAudit } from "./audit.service";
import { AuditAction } from "../models/AuditLog";
import { AppError } from "../middleware/errorHandler.middleware";

import { verifiedIdentity, revokeAll, type SessionIdentity, type ClientContext } from "./session.service";
import { registrationAllowed } from "./system-policy.service";
import { UUID } from "../utils/jwt";

import { lockAdminMutations } from "./admin-lock";

const userRepo = () => AppDataSource.getRepository(User);
const orderRepo = () => AppDataSource.getRepository(Order);
const txRepo = () => AppDataSource.getRepository(Transaction);

async function withAdmin<T>(admin: SessionIdentity, action: (manager: EntityManager) => Promise<T>) {
  return AppDataSource.transaction(async (manager) => {
    await lockAdminMutations(manager);
    const actor = await verifiedIdentity(manager, admin);
    if (actor.role !== UserRole.ADMIN || !actor.twoFactorEnabled) throw new AppError("Se requiere administrador con 2FA", 403);
    return action(manager);
  });
}

function adminProjection(u: User) {
  return { id: u.id, email: u.email, firstName: u.firstName, lastName: u.lastName, role: u.role,
    accountStatus: u.accountStatus, kycStatus: u.kycStatus, isVerified: u.isVerified,
    twoFactorEnabled: u.twoFactorEnabled, country: u.country, createdAt: u.createdAt, lastLoginAt: u.lastLoginAt };
}

export type UserFilters = { search?: string; role?: UserRole | "all"; status?: AccountStatus | "all"; page?: number; limit?: number };

function num(v: unknown) { return Number(v) || 0; }

/* ---- Usuarios ---- */
export async function getUsers(filters: UserFilters) {
  const qb = userRepo().createQueryBuilder("u").orderBy("u.createdAt", "DESC");
  if (filters.search) {
    qb.andWhere("(u.email ILIKE :s OR u.firstName ILIKE :s OR u.lastName ILIKE :s)", { s: `%${filters.search}%` });
  }
  if (filters.role && filters.role !== "all") qb.andWhere("u.role = :r", { r: filters.role });
  if (filters.status && filters.status !== "all") qb.andWhere("u.account_status = :st", { st: filters.status });
  qb.skip(((filters.page || 1) - 1) * (filters.limit || 50)).take(filters.limit || 50);
  const users = await qb.getMany();

  /* Adjuntar balance USD + número de operaciones (una sola consulta) */
  const ids = users.map((u) => u.id);
  const wallets = ids.length ? await AppDataSource.getRepository(Wallet)
    .createQueryBuilder("w").select(["w.id", "w.userId", "w.totalBalanceUsd"]).where("w.userId IN (:...ids)", { ids }).getMany() : [];
  const walletByUser = new Map(wallets.map((w) => [w.userId, num(w.totalBalanceUsd)]));
  const orderCounts = ids.length ? await orderRepo().createQueryBuilder("o")
    .select("o.userId", "uid").addSelect("COUNT(*)", "n").where("o.userId IN (:...ids)", { ids }).groupBy("o.userId").getRawMany<{uid: string; n: string}>() : [];
  const tradesByUser = new Map(orderCounts.map((r) => [r.uid, num(r.n)]));
  return users.map((u) => ({ ...adminProjection(u), balanceUsd: walletByUser.get(u.id) ?? 0, tradesCount: tradesByUser.get(u.id) ?? 0 }));
}

type AccountPatch = { status: AccountStatus } | { role: UserRole };
export async function changeUser(admin: SessionIdentity, userId: string, patch: AccountPatch, context: ClientContext) {
  if (!UUID.test(userId)) throw new AppError("Identificador de usuario inválido", 400);
  if (admin.id === userId) throw new AppError("No puedes cambiar tu propio rol ni estado", 403);
  return withAdmin(admin, async (manager) => {
    const repo = manager.getRepository(User);
    const user = await repo.findOne({ where: { id: userId }, lock: { mode: "pessimistic_write" } });
    if (!user) throw new AppError("Usuario no encontrado", 404);
    if (user.accountStatus === AccountStatus.DELETED) throw new AppError("Una cuenta eliminada no se puede modificar", 409);
    const byStatus = "status" in patch;
    const oldValues = byStatus ? { accountStatus: user.accountStatus } : { role: user.role };
    if (byStatus ? patch.status === user.accountStatus : patch.role === user.role) return adminProjection(user);
    if (byStatus) user.accountStatus = patch.status;
    else user.role = patch.role;
    await repo.save(user);
    await revokeAll(manager, userId);
    await logAudit({ userId: admin.id, entityType: "user", entityId: userId, ...context,
      action: byStatus ? (patch.status === AccountStatus.ACTIVE ? AuditAction.ACCOUNT_UNLOCKED : AuditAction.ACCOUNT_BLOCKED) : AuditAction.ADMIN_ACTION,
      oldValues, newValues: byStatus ? { accountStatus: user.accountStatus } : { role: user.role },
      details: byStatus ? `Estado: ${oldValues.accountStatus} → ${user.accountStatus}; sesiones cerradas`
        : `Rol: ${oldValues.role} → ${user.role}; sesiones cerradas`,
    }, manager);
    return adminProjection(user);
  });
}

/* ---- KPIs ---- */
export async function getStats() {
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  const [totalUsers, activeUsers24h, openOrders, depositsToday, totalTransactions, volume, pendingKyc, blockedAccounts] = await Promise.all([
    userRepo().count(),
    userRepo().countBy({ lastLoginAt: MoreThan(new Date(Date.now() - 86_400_000)) }),
    orderRepo().countBy({ status: OrderStatus.OPEN }),
    txRepo().countBy({ type: TransactionType.DEPOSIT, createdAt: MoreThan(today) }),
    txRepo().count(),
    txRepo().createQueryBuilder("t").select("COALESCE(SUM(t.amountUsd), 0)", "vol")
      .where("t.createdAt > :since", { since: new Date(Date.now() - 30 * 86_400_000) }).getRawOne<{vol: string}>(),
    userRepo().countBy({ kycStatus: KYCStatus.PENDING }),
    userRepo().countBy({ accountStatus: AccountStatus.BLOCKED }),
  ]);
  return { totalUsers, activeUsers24h, openOrders, depositsToday, totalTransactions, totalVolumeUsd30d: num(volume?.vol), pendingKyc, blockedAccounts };
}

/* ---- Serie de tiempo ---- */
export async function getChart(range: "7d" | "30d" | "90d" = "30d") {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = new Date(Date.now() - (days - 1) * 86400000);
  since.setUTCHours(0, 0, 0, 0);
  const rows = await txRepo().createQueryBuilder("t")
    .select("to_char(t.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", "day")
    .addSelect("t.type", "type")
    .addSelect("COALESCE(SUM(t.amount_usd), 0)", "vol")
    .addSelect("COUNT(*)", "n")
    .where("t.created_at >= :since", { since })
    .groupBy("day, t.type")
    .orderBy("day", "ASC")
    .getRawMany();

  const byDay: Record<string, any> = {};
  for (const r of rows) {
    byDay[r.day] = byDay[r.day] || { date: r.day, deposits: 0, withdrawals: 0, volume: 0, trades: 0, users: 0 };
    const v = num(r.vol);
    byDay[r.day].volume += v;
    if (r.type === "deposit") byDay[r.day].deposits += v;
    if (r.type === "withdrawal") byDay[r.day].withdrawals += v;
    if (r.type === "trade_buy" || r.type === "trade_sell") { byDay[r.day].trades += num(r.n); }
  }
  const usersByDay = await userRepo().createQueryBuilder("u")
    .select("to_char(u.created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD')", "day")
    .addSelect("COUNT(*)", "n")
    .where("u.created_at >= :since", { since })
    .groupBy("day").getRawMany();
  for (const r of usersByDay) {
    byDay[r.day] ||= { date: r.day, deposits: 0, withdrawals: 0, volume: 0, trades: 0, users: 0 };
    byDay[r.day].users = num(r.n);
  }

  const out: any[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push(byDay[d] || { date: d, deposits: 0, withdrawals: 0, volume: 0, trades: 0, users: 0 });
  }
  return out;
}

/* ---- Configuración ---- */
export async function getSettings() {
  return { allowRegistration: await registrationAllowed(AppDataSource.manager) };
}

export async function saveSettings(admin: SessionIdentity, allowRegistration: boolean, context: ClientContext) {
  return withAdmin(admin, async (manager) => {
    const previous = await registrationAllowed(manager);
    if (previous !== allowRegistration) {
      const repo = manager.getRepository(SystemSetting);
      const row = await repo.findOneBy({ key: "system" }) ?? repo.create({ key: "system" });
      row.value = { ...row.value, allowRegistration };
      await repo.save(row);
      await logAudit({ userId: admin.id, action: AuditAction.SETTINGS_CHANGED, entityType: "system", entityId: "settings", ...context,
        oldValues: { allowRegistration: previous }, newValues: { allowRegistration },
        details: allowRegistration ? "Registro abierto" : "Registro cerrado",
      }, manager);
    }
    return { allowRegistration };
  });
}

/* ---- Notificaciones ---- */
/* La lógica de notificaciones vive en notification.service; se re-exporta
   aquí para no romper los imports existentes (wallet.service, etc.). */
export {
  listUserNotifications,
  createNotification,
  markRead,
  markAllRead,
  unreadCount,
} from "./notification.service";
