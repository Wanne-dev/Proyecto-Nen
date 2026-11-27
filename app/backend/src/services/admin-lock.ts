import type { EntityManager } from "typeorm";

/** Serializa las mutaciones administrativas y el alta inicial con el mismo candado. */
export async function lockAdminMutations(manager: EntityManager): Promise<void> {
  await manager.query("SELECT pg_advisory_xact_lock($1)", [9100272]);
}
