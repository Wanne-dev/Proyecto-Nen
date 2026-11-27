/* Validadores — BANCA NEN */
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}

export function isValidPassword(pw: string): boolean {
  return pw.length >= 8;
}

export function isValidPhone(phone: string): boolean {
  return /^\+?[0-9\s\-()]{7,15}$/.test(phone.trim());
}

export function isValidDocument(documentNumber: string): boolean {
  return /^[0-9]{6,12}$/.test(documentNumber.trim());
}

export function isValidAmount(value: number | string, min = 0): boolean {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return isFinite(n) && n >= min;
}

export function isValidCode6(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function isValidTOTP(code: string): boolean {
  return /^\d{6}$/.test(code.trim());
}

export function isStrongPassword(pw: string): { valid: boolean; checks: { length: boolean; number: boolean; upper: boolean; lower: boolean; special: boolean } } {
  const checks = {
    length: pw.length >= 8,
    number: /\d/.test(pw),
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
  return { valid: Object.values(checks).every(Boolean), checks };
}
