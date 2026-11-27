import type { EntityManager } from "typeorm";
import { SystemSetting } from "../models/SystemSetting";

// La app solo ofrece un ajuste administrativo que sí aplica: abrir/cerrar el registro.
export async function registrationAllowed(manager: EntityManager): Promise<boolean> {
  const row = await manager.getRepository(SystemSetting).findOneBy({ key: "system" });
  return row?.value?.allowRegistration !== false;
}
