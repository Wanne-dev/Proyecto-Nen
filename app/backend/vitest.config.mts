import { defineConfig } from "vitest/config";

/**
 * Configuración de tests del backend (BANCA NEN).
 * - Solo se ejecutan los archivos dentro de tests/.
 * - Entorno Node (sin DOM).
 * - Los tests de integración/e2e que requieren base de datos real se
 *   ejecutan por separado con pnpm test:postgres.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts", "tests/e2e/**/*.test.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    // Los tests unitarios no tocan la red; los de integración se saltan sin DB.
    pool: "threads",
  },
});
