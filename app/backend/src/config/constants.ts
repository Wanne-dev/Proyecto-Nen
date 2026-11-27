/* Constantes globales del backend — BANCA NEN */

export const APP_NAME = "BANCA NEN";
export const APP_VERSION = "1.0.0";

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const COMMISSION_RATE = 0.001;

export const TOKEN_LENGTHS = {
  verificationCode: 6,
  resetToken: 32,
} as const;
