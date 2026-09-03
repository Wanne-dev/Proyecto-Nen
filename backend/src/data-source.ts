/* ============================================================
   BANCA NEN — DataSource para el CLI de TypeORM
   ------------------------------------------------------------
   Permite generar/aplicar migraciones:
     npm run migration:generate -- src/migrations/MiCambio
     npm run migration:run
     npm run migration:revert
   En desarrollo el esquema se sincroniza automáticamente; en producción
   se deben aplicar migraciones con `migration:run` (synchronize=false).
   ============================================================ */
import "reflect-metadata";
import { AppDataSource } from "./config/database";

export default AppDataSource;
