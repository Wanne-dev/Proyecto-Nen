/**
 * Correos transaccionales de la billetera virtual.
 * Respeta UserSettings.emailNotifications y nunca bloquea la operación.
 */
import { AppDataSource } from "../config/database";
import { sendMovementEmail, sendOrderEmail, type MovementMailData, type OrderMailData } from "../config/email";
import { User } from "../models/User";
import { UserSettings } from "../models/UserSettings";

async function recipient(userId: string) {
  const user = await AppDataSource.getRepository(User).findOne({
    where: { id: userId },
    select: { id: true, email: true, firstName: true },
  });
  if (!user) return null;
  const settings = await AppDataSource.getRepository(UserSettings).findOne({
    where: { userId },
    select: { emailNotifications: true },
  });
  if (settings && !settings.emailNotifications) return null;
  return { email: user.email, firstName: user.firstName };
}

export async function notifyOrderByEmail(userId: string, data: OrderMailData): Promise<void> {
  const to = await recipient(userId);
  if (to) await sendOrderEmail(to.email, to.firstName, data);
}

export async function notifyMovementByEmail(userId: string, data: MovementMailData): Promise<void> {
  const to = await recipient(userId);
  if (to) await sendMovementEmail(to.email, to.firstName, data);
}
