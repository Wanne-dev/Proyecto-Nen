import { MigrationInterface, QueryRunner } from "typeorm";
import { authKey, sealTotp } from "../config/auth-keys";

export class SecureBaseline1795024900000 implements MigrationInterface {
  name = "SecureBaseline1795024900000";

  async up(queryRunner: QueryRunner): Promise<void> {
    authKey();
    // Instalaciones anteriores ya aplicaron esta migración con otro nombre de clase.
    // El índice único es su marca inequívoca; no se repiten los cambios destructivos.
    const applied = await queryRunner.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_nen_unique_phone' LIMIT 1`,
    );
    if (applied.length) return;
    const repeated = await queryRunner.query(`SELECT 1 FROM users WHERE phone IS NOT NULL GROUP BY phone HAVING COUNT(*) > 1 LIMIT 1`);
    if (repeated.length) throw new Error("Hay teléfonos duplicados en la base anterior; concilia esos registros en una copia respaldada antes de migrar.");
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_nen_unique_phone" ON "users" ("phone")`);
    // Sesiones y desafíos legados son efímeros: se cierran, no se reusan.
    // Usuarios, billeteras, órdenes, transacciones y eventos se conservan.
    await queryRunner.query(`DELETE FROM "user_sessions"`);
    await queryRunner.query(`DELETE FROM "verification_codes"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" RENAME COLUMN "refresh_token" TO "refresh_hash"`);
    await queryRunner.query(`ALTER TABLE "user_sessions" DROP CONSTRAINT "UQ_69214fd09be67af95c186be26db"`);
    await queryRunner.query(`ALTER TABLE "user_sessions"
      ALTER COLUMN "refresh_hash" TYPE varchar(64),
      ADD COLUMN "scope" varchar(12) NOT NULL DEFAULT 'verify',
      ADD COLUMN "mfa_verified" boolean NOT NULL DEFAULT false,
      ADD CONSTRAINT "uq_nen_refresh_hash" UNIQUE ("refresh_hash"),
      ADD CONSTRAINT "fk_nen_session_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "verification_codes" DROP COLUMN "userId"`);
    await queryRunner.query(`ALTER TABLE "verification_codes" RENAME COLUMN "code" TO "code_hash"`);
    await queryRunner.query(`ALTER TABLE "verification_codes"
      ALTER COLUMN "code_hash" TYPE varchar(64),
      ADD COLUMN "token_hash" varchar(64),
      ADD CONSTRAINT "fk_nen_code_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE`);
    await queryRunner.query(`ALTER TABLE "users"
      DROP COLUMN "reset_password_token", DROP COLUMN "reset_password_expires",
      ADD COLUMN "two_factor_pending" varchar(255), ADD COLUMN "two_factor_pending_session" uuid,
      ADD COLUMN "two_factor_pending_expires" timestamptz, ADD COLUMN "two_factor_last_step" integer`);
    // Preservar TOTP de la entrega anterior sin volver a guardar la clave en claro.
    const totp: Array<{ id: string; two_factor_secret: string | null }> = await queryRunner.query(
      `SELECT "id", "two_factor_secret" FROM "users" WHERE "two_factor_enabled" = true`,
    );
    for (const { id, two_factor_secret: value } of totp) {
      if (!value || !/^[A-Z2-7]+$/i.test(value)) throw new Error("Hay una cuenta con 2FA previo inválido; restaura el respaldo y revisa su configuración antes de migrar.");
      await queryRunner.query(`UPDATE "users" SET "two_factor_secret"=$1 WHERE "id"=$2`, [sealTotp(value, id), id]);
    }
    await queryRunner.query(`UPDATE "users" SET "two_factor_secret"=NULL WHERE "two_factor_enabled"=false AND "two_factor_secret" IS NOT NULL`);
    await queryRunner.query(`ALTER TYPE "public"."audit_logs_action_enum" ADD VALUE 'account_verified' AFTER 'register'`);
    await queryRunner.query(`ALTER TABLE "audit_logs" ADD COLUMN "chain_position" bigint`);
    await queryRunner.query(`CREATE UNIQUE INDEX "idx_nen_audit_chain" ON "audit_logs" ("chain_position")`);
    await queryRunner.query(`ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0",
      ADD CONSTRAINT "FK_bd2726fd31b35443f2245b93ba0" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT`);
    await queryRunner.query(`CREATE FUNCTION nen_audit_require_chain() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF NEW.chain_position IS NULL OR NEW.chain_position < 1 OR NEW.curr_hash IS NULL OR NEW.curr_hash !~ '^[0-9a-f]{64}$' THEN
          RAISE EXCEPTION 'Los eventos nuevos requieren posición y hash';
        END IF;
        RETURN NEW;
      END
    $$`);
    await queryRunner.query(`CREATE TRIGGER nen_audit_require_chain BEFORE INSERT ON "audit_logs"
      FOR EACH ROW EXECUTE FUNCTION nen_audit_require_chain()`);
    await queryRunner.query(`CREATE FUNCTION nen_audit_append_only() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN RAISE EXCEPTION 'La tabla audit_logs solo admite inserciones'; END
    $$`);
    await queryRunner.query(`CREATE TRIGGER nen_audit_append_only BEFORE UPDATE OR DELETE OR TRUNCATE ON "audit_logs"
      FOR EACH STATEMENT EXECUTE FUNCTION nen_audit_append_only()`);
  }

  async down(): Promise<void> {
    throw new Error("No se restauran credenciales anteriores. Usa un respaldo previo de esta base.");
  }
}
