import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * El tipo de billetera persistido usaba la etiqueta "demo". Se renombra a
 * "virtual" sin recrear la columna, de modo que los registros existentes
 * conservan su identificador y la API deja de exponer la etiqueta anterior.
 */
export class WalletVirtualType1795025000000 implements MigrationInterface {
  name = "WalletVirtualType1795025000000";

  async up(queryRunner: QueryRunner): Promise<void> {
    const previous = await queryRunner.query(
      `SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'wallets_type_enum' AND e.enumlabel = 'demo'
       LIMIT 1`,
    );
    if (previous.length) {
      await queryRunner.query(`ALTER TYPE "public"."wallets_type_enum" RENAME VALUE 'demo' TO 'virtual'`);
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    const current = await queryRunner.query(
      `SELECT 1 FROM pg_enum e
       JOIN pg_type t ON t.oid = e.enumtypid
       WHERE t.typname = 'wallets_type_enum' AND e.enumlabel = 'virtual'
       LIMIT 1`,
    );
    if (current.length) {
      await queryRunner.query(`ALTER TYPE "public"."wallets_type_enum" RENAME VALUE 'virtual' TO 'demo'`);
    }
  }
}
