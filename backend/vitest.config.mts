import { defineConfig } from "vitest/config";

/**
 * Configuración de tests del backend (BANCA NEN).
 * - Solo se ejecutan los archivos dentro de tests/.
 * - Entorno Node (sin DOM).
 * - Los tests de integración/e2e que requieren base de datos real se
 *   saltan automáticamente si no hay conexión (ver los propios archivos).
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    // Los tests unitarios no tocan la red; los de integración se saltan sin DB.
    pool: "threads",
  },
});
