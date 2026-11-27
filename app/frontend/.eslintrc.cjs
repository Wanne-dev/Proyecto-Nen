/* ESLint — BANCA NEN (frontend)
 * Configuración base: TypeScript + React + Hooks + Prettier.
 * Reglas de estilo como warnings; errores solo para problemas reales.
 */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  },
  settings: {
    react: { version: "detect" },
  },
  plugins: ["@typescript-eslint", "react", "react-hooks"],
  rules: {
    // JSX transform moderno: no exige importar React
    "react/react-in-jsx-scope": "off",
    "react/prop-types": "off",
    // Permitir `any` en fronteras de datos (APIs) sin bloquear el build
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
    "@typescript-eslint/ban-ts-comment": "warn",
    "no-empty": ["warn", { allowEmptyCatch: true }],
  },
  ignorePatterns: ["dist", "node_modules", "*.config.ts", "*.config.mts", "*.config.js", "*.config.cjs"],
};
