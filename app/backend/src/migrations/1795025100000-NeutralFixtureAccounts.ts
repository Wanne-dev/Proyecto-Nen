import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Las cuentas creadas por el instalador local usaban correos y documentos con
 * la etiqueta anterior. Se neutralizan conservando el mismo id, la clave y el
 * segundo factor, de modo que el instalador siga reconociendo esas cuentas.
 * Solo actúa sobre los correos exactos de la edición; no toca cuentas reales.
 */
export class NeutralFixtureAccounts1795025100000 implements MigrationInterface {
  name = "NeutralFixtureAccounts1795025100000";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "users" SET
        "email" = 'usuario@example.com',
        "last_name" = 'Local',
        "document_number" = REPLACE("document_number", 'DEMO-', 'LOCAL-')
      WHERE "email" = 'usuario.demo@example.com'
        AND NOT EXISTS (SELECT 1 FROM "users" WHERE "email" = 'usuario@example.com')
    `);
    await queryRunner.query(`
      UPDATE "users" SET
        "email" = 'admin@example.com',
        "last_name" = 'Local',
        "document_number" = REPLACE("document_number", 'DEMO-', 'LOCAL-')
      WHERE "email" = 'admin.demo@example.com'
        AND NOT EXISTS (SELECT 1 FROM "users" WHERE "email" = 'admin@example.com')
    `);
  }

  async down(): Promise<void> {
    throw new Error("Los correos neutralizados no se revierten automáticamente.");
  }
}
