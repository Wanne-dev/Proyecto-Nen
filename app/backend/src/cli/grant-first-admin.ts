import "dotenv/config";
import "reflect-metadata";
import { virtualOperationsEnabled } from "../config/operations";
import { AppDataSource } from "../config/database";
import { AuditAction } from "../models/AuditLog";
import { AccountStatus, User, UserRole } from "../models/User";
import { logAudit } from "../services/audit.service";
import { lockAdminMutations } from "../services/admin-lock";
import { lockIdentity, revokeAll } from "../services/session.service";

async function run() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!virtualOperationsEnabled() || !email) {
    throw new Error("Solo en la instalación local: grant-first-admin <correo verificado>");
  }
  await AppDataSource.initialize();
  try {
    if (await AppDataSource.showMigrations()) throw new Error("Aplica las migraciones primero");
    await AppDataSource.transaction(async (manager) => {
      await lockAdminMutations(manager);
      const repo = manager.getRepository(User);
      if (await repo.exists({ where: { role: UserRole.ADMIN } })) throw new Error("Ya existe un admin. Usa el panel para gestionar roles.");
      const user = await lockIdentity(manager, "email", email);
      if (!user?.isVerified || !user.twoFactorEnabled || user.accountStatus !== AccountStatus.ACTIVE) {
        throw new Error("La primera cuenta admin debe estar activa y tener verificación y 2FA confirmados");
      }
      const oldRole = user.role;
      await repo.update(user.id, { role: UserRole.ADMIN });
      await revokeAll(manager, user.id);
      await logAudit({ action: AuditAction.ADMIN_ACTION, entityType: "user", entityId: user.id,
        oldValues: { role: oldRole }, newValues: { role: UserRole.ADMIN }, details: "Primer administrador asignado por CLI local" }, manager);
    });
    console.log("Primer administrador configurado. Vuelve a iniciar sesión con un nuevo código TOTP.");
  } finally { await AppDataSource.destroy(); }
}

void run().catch((error: Error) => { console.error(error.message); process.exitCode = 1; });
