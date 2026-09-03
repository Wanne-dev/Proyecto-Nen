/* Configuración de límites de peticiones — BANCA NEN */

export const rateLimitConfig = {
  // Puntos consumidos por ventana (por IP)
  points: Number(process.env.RATE_LIMIT_POINTS) || 300,
  // Duración de la ventana en segundos
  duration: Number(process.env.RATE_LIMIT_DURATION_SEC) || 60,
  // Bloqueo tras exceder (segundos)
  blockDuration: Number(process.env.RATE_LIMIT_BLOCK_SEC) || 60,
};
