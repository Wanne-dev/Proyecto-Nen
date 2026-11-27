/** Las operaciones virtuales nunca se habilitan en procesos de producción. */
export function virtualOperationsEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env.NODE_ENV?.trim().toLowerCase() === "production") return false;
  return (env.APP_MODE ?? "virtual").trim() === "virtual";
}

export function offlineMarketEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return (env.MARKET_OFFLINE ?? "false").trim() === "true";
}

/** La clave del proveedor de IA solo se lee en el backend; nunca se expone al navegador. */
export function geminiApiKey(env: NodeJS.ProcessEnv = process.env): string {
  return (env.GEMINI_API_KEY ?? "").trim();
}

export function geminiModel(env: NodeJS.ProcessEnv = process.env): string {
  const model = (env.GEMINI_MODEL ?? "").trim() || "gemini-3.5-flash-lite";
  return /^[A-Za-z0-9._-]{1,80}$/.test(model) ? model : "gemini-3.5-flash-lite";
}

export function geminiChatEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return geminiApiKey(env).length > 0;
}
