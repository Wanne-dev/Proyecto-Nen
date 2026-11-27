import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import request from "supertest";
import app from "../../src/app";
import { AppDataSource } from "../../src/config/database";
import { InitialSchema1795024800000 } from "../../src/migrations/1795024800000-InitialSchema";
import { unsealTotp } from "../../src/config/auth-keys";
import { logAudit } from "../../src/services/audit.service";
import { hashToken, opaqueTokenId } from "../../src/services/session.service";
import { AuditAction } from "../../src/models/AuditLog";
import { CodeType } from "../../src/models/VerificationCode";
import { Currency } from "../../src/models/WalletBalance";
import { AccountStatus, User, UserRole } from "../../src/models/User";

// Correo y SMS siempre se capturan en memoria. No se consulta la BD para leer OTP en claro.
const delivery = vi.hoisted(() => {
  process.env.MARKET_OFFLINE = "true";
  process.env.APP_MODE = "virtual";
  return { email: new Map<string, string>(), phone: new Map<string, string>(), reset: new Map<string, { code: string; token: string }>(), sms: false };
});
vi.mock("../../src/config/email", () => ({
  EMAIL_PROVIDER: "console",
  sendVerificationEmail: async (target: string, code: string) => { delivery.email.set(target, code); return { sent: true }; },
  sendPasswordResetEmail: async (target: string, code: string, token: string) => { delivery.reset.set(target, { code, token }); return { sent: true }; },
  verifyEmailConfig: async () => false,
}));
vi.mock("../../src/config/sms", () => ({
  get SMS_ENABLED() { return delivery.sms; },
  sendVerificationSMS: async (target: string, code: string) => { delivery.phone.set(target, code); return true; },
}));

// Fixtures dentro de las pruebas, no un modo de cotización del servidor distribuido.
vi.mock("../../src/services/kraken-market", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/services/kraken-market")>();
  return { ...actual, getSpotQuotes: async () => process.env.MARKET_OFFLINE === "true"
    ? { status: "offline", source: "Kraken", asOf: null, data: null }
    : { status: "fresh", source: "Kraken", asOf: new Date().toISOString(), data: { BTC: { price: 50_000 } } } };
});

const api = request(app);
const AUTH = "/api/v1/auth";
const ADMIN = "/api/v1/admin";
const password = "PruebaBancaNen2026!";
const newPassword = "SiguienteClave2026!";
let userNumber = 0;
const legacyUser = randomUUID();
const legacySecret = "JBSWY3DPEHPK3PXP";

const cookieList = (r: request.Response): string[] => r.headers["set-cookie"] as unknown as string[];
const cookies = (r: request.Response) => ({ Cookie: cookieList(r).map((value) => value.split(";", 1)[0]).join("; ") });
const cookieValue = (auth: Record<string, string>, name: string) => auth.Cookie.split("; ").find((value) => value.startsWith(`${name}=`))!.slice(name.length + 1);
const login = (email: string, pass = password, code?: string) => api.post(`${AUTH}/login`).send({ email, password: pass, twoFactorCode: code });
const profile = (auth: Record<string, string>) => api.get(`${AUTH}/profile`).set(auth);
const wrongCode = (code: string) => code === "000000" ? "000001" : "000000";

function registration() {
  const tag = randomUUID().slice(0, 8);
  return {
    email: `local-${tag}@example.com`, firstName: "Prueba", lastName: "Virtual", documentType: "cc",
    documentNumber: `TEST-${tag}`, dateOfBirth: "1995-01-01",
    phone: `+12025550${String(100 + userNumber++).padStart(3, "0")}`, password,
  };
}
async function account(verified = true) {
  const data = registration();
  const registered = await api.post(`${AUTH}/register`).send(data).expect(201);
  expect(registered.body.data).not.toHaveProperty("token");
  expect(registered.body.data).not.toHaveProperty("credentials");
  expect(cookieList(registered)).toSatisfy((list: string[]) => list.length === 2 && list.every((item) => /HttpOnly.*SameSite=Strict/.test(item)));
  const userId = registered.body.data.user.id as string;
  let auth = cookies(registered);
  if (verified) {
    const response = await api.post(`${AUTH}/verify-email`).set(auth).send({ code: delivery.email.get(data.email) }).expect(200);
    expect(response.body.data.fullyVerified).toBe(true);
    expect(response.body.data.user.phoneVerified).toBe(false);
    auth = cookies(response);
  }
  return { userId, auth, email: data.email, phone: data.phone, data };
}

const totp = (secret: string, time: number) => speakeasy.totp({ secret, encoding: "base32", time });
async function enroll(auth: Record<string, string>, confirmOffset = 0) {
  const { body } = await api.post(`${AUTH}/2fa/setup`).set(auth).send({ password }).expect(200);
  const secret = body.data.secret as string;
  const epoch = Math.floor(Date.now() / 30_000) * 30;
  const confirmed = await api.post(`${AUTH}/2fa/confirm`).set(auth).send({ code: totp(secret, epoch + confirmOffset * 30) }).expect(200);
  return { auth: cookies(confirmed), secret, epoch };
}

function postDeposit(auth: Record<string, string>, amount: number, description?: string) {
  return api.post("/api/v1/wallet/deposit").set(auth).send({ currency: "USD", amount, description });
}

function postBuy(auth: Record<string, string>, quantity: number) {
  // Un cliente antiguo todavía envía una referencia; el servidor la ignora.
  return api.post("/api/v1/orders").set(auth).send({ symbol: "btc", type: "market", side: "buy", quantity, price: 49900 });
}

async function wallet(auth: Record<string, string>) {
  const { body } = await api.get("/api/v1/wallet").set(auth).expect(200);
  const balances = Object.fromEntries(body.data.balances.map((item: { currency: string; balance: number | string }) => [item.currency, Number(item.balance)]));
  return { total: Number(body.data.totalBalanceUsd), balances, raw: body.data };
}

let healthEmpty = 0;
let migrationCount = 0;
let missingSecondHealth = 0;
let migrationRepeatCount = 0;

describe("API de operaciones virtuales con PostgreSQL", () => {
  beforeAll(async () => {
    const db = AppDataSource.options;
    if (db.type !== "postgres" || db.url || !db.database?.endsWith("_test") ||
        (!db.host?.startsWith("/") && db.host !== "127.0.0.1" && db.host !== "localhost") ||
        process.env.PG_TEST_DATABASE !== "1") {
      throw new Error("Usa PG_TEST_DATABASE=1, DB_HOST local y DB_NAME con sufijo _test. Se rechazó la conexión.");
    }
    process.env.MARKET_OFFLINE = "false";
    await AppDataSource.initialize();
    const [result] = await AppDataSource.query("SELECT COUNT(*)::int AS tables FROM pg_tables WHERE schemaname = 'public'");
    if (result.tables !== 0) throw new Error("La base de pruebas debe estar vacía; no se modificó el esquema existente.");
    const readiness = await api.get("/api/v1/health").expect(503);
    expect(readiness.body.database).toBe("esquema_pendiente");
    healthEmpty = readiness.status;
    const first = new DataSource({ ...AppDataSource.options, migrations: [InitialSchema1795024800000] });
    await first.initialize();
    try { migrationCount = (await first.runMigrations()).length; }
    finally { await first.destroy(); }
    missingSecondHealth = (await api.get("/api/v1/health").expect(503)).status;
    const hash = await bcrypt.hash(password, 4); // Fixture, no credencial de runtime.
    await AppDataSource.query(`INSERT INTO users (id, email, password_hash, first_name, last_name, email_verified, is_verified, two_factor_enabled, two_factor_secret, reset_password_token)
      VALUES ($1, 'legacy-fixture@example.com', $2, 'Cuenta', 'Histórica', true, true, true, 'NO ES TOTP', 'reset-obsoleto')`, [legacyUser, hash]);
    const [{ id: walletId }] = await AppDataSource.query(`INSERT INTO wallets (user_id, total_balance_usd) VALUES ($1, 40.75) RETURNING id`, [legacyUser]);
    await AppDataSource.query(`INSERT INTO transactions (wallet_id, user_id, type, status, amount, currency, amount_usd, reference_id)
      VALUES ($1, $2, 'deposit', 'completed', 40.75, 'USD', 40.75, 'LEGACY-FIXTURE')`, [walletId, legacyUser]);
    await AppDataSource.query(`INSERT INTO orders (user_id, symbol, type, side, status, quantity) VALUES ($1, 'BTC', 'market', 'buy', 'filled', .001)`, [legacyUser]);
    await AppDataSource.query(`INSERT INTO audit_logs (user_id, action, details) VALUES ($1,'deposit','Evento legado preservado')`, [legacyUser]);
    await AppDataSource.query(`INSERT INTO user_sessions (user_id, "userId", refresh_token, expires_at) VALUES ($1, $1,'sesion-legada', now()+interval '1 day')`, [legacyUser]);
    await AppDataSource.query(`INSERT INTO verification_codes (user_id, "userId", type, code, expires_at) VALUES ($1, $1,'password_reset','123456', now()+interval '10 min')`, [legacyUser]);
    await expect(AppDataSource.runMigrations()).rejects.toThrow(/2FA previo inválido/);
    expect(await AppDataSource.query(`SELECT refresh_token FROM user_sessions`)).toEqual([{ refresh_token: "sesion-legada" }]);
    await AppDataSource.query(`UPDATE users SET two_factor_secret=$1 WHERE id=$2`, [legacySecret, legacyUser]);
    migrationCount += (await AppDataSource.runMigrations()).length;
    migrationRepeatCount = (await AppDataSource.runMigrations()).length;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) await AppDataSource.destroy();
  });

  it("solo indica que está lista tras la migración, que no vuelve a aplicar", async () => {
    expect(healthEmpty).toBe(503);
    expect(missingSecondHealth).toBe(503);
    expect(migrationCount).toBe(2);
    expect(migrationRepeatCount).toBe(0);
    const { body } = await api.get("/api/v1/health").expect(200);
    expect(body.database).toBe("conectada");
  });

  it("preserva cuenta, TOTP compatible y datos de negocio en actualización; elimina credenciales efímeras legadas", async () => {
    const [user] = await AppDataSource.query(`SELECT password_hash, two_factor_secret FROM users WHERE id=$1`, [legacyUser]);
    expect(user.two_factor_secret).toMatch(/^v1\./);
    expect(unsealTotp(user.two_factor_secret, legacyUser)).toBe(legacySecret);
    expect(await bcrypt.compare(password, user.password_hash)).toBe(true);
    expect(await AppDataSource.query(`SELECT total_balance_usd FROM wallets WHERE user_id=$1`, [legacyUser])).toEqual([{ total_balance_usd: "40.75" }]);
    expect(await AppDataSource.query(`SELECT reference_id FROM transactions WHERE user_id=$1`, [legacyUser])).toEqual([{ reference_id: "LEGACY-FIXTURE" }]);
    expect(await AppDataSource.query(`SELECT symbol FROM orders WHERE user_id=$1`, [legacyUser])).toEqual([{ symbol: "BTC" }]);
    expect(await AppDataSource.query(`SELECT chain_position FROM audit_logs WHERE user_id=$1`, [legacyUser])).toEqual([{ chain_position: null }]);
    expect(await AppDataSource.query(`SELECT id FROM user_sessions WHERE user_id=$1`, [legacyUser])).toEqual([]);
    expect(await AppDataSource.query(`SELECT id FROM verification_codes WHERE user_id=$1`, [legacyUser])).toEqual([]);
    const first = await login("legacy-fixture@example.com").expect(200);
    expect(first.body.data.requiresTwoFactor).toBe(true);
    expect(first.headers["set-cookie"]).toBeUndefined();
    await login("legacy-fixture@example.com", password, totp(legacySecret, Math.floor(Date.now() / 1000))).expect(200);
  });

  it("verifica registro/login; compra, vende y retira con valoración y comisiones coherentes", async () => {
    const { auth, email } = await account();
    const login = await api.post("/api/v1/auth/login").send({ email, password }).expect(200);
    expect(login.body.data.user.isVerified).toBe(true);
    const deposit = await postDeposit(auth, 100).expect(200);
    expect(deposit.body.data.transaction.referenceId).toMatch(/^DEP-/);
    const order = await postBuy(auth, 0.001).expect(201);
    expect(order.body.data.status).toBe("filled");
    expect(order.body.data.quoteSource).toBe("kraken");
    expect(Number(order.body.data.avgFillPrice)).toBe(50_000);
    expect(Number(order.body.data.commission)).toBe(0.05);
    expect(Number(order.body.data.executedTotalUsd)).toBe(50);
    const history = await api.get("/api/v1/orders").set(auth).expect(200);
    expect(history.body.data.items[0]).toMatchObject({ id: order.body.data.id, quoteSource: "kraken" });
    expect(await wallet(auth)).toMatchObject({ total: 99.95, balances: { USD: 49.95, BTC: 0.001 } });

    const sell = await api.post("/api/v1/orders").set(auth).send({ symbol: "BTC", type: "market", side: "sell", quantity: 0.0004 }).expect(201);
    expect(Number(sell.body.data.commission)).toBe(0.02);
    expect(await wallet(auth)).toMatchObject({ total: 99.93, balances: { USD: 69.93, BTC: 0.0006 } });

    const withdrawal = await api.post("/api/v1/wallet/withdraw").set(auth).send({ currency: "USD", amount: 20 }).expect(200);
    expect(Number(withdrawal.body.data.transaction.fee)).toBe(0.02);
    expect(await wallet(auth)).toMatchObject({ total: 79.91, balances: { USD: 49.91, BTC: 0.0006 } });
    const { body } = await api.get("/api/v1/wallet/transactions").set(auth).expect(200);
    expect(body.data.map((row: { type: string }) => row.type)).toEqual(["withdrawal", "trade_sell", "trade_buy", "deposit"]);
  });

  it("sin mercado rechaza operar y no altera el saldo; el USD virtual sigue disponible", async () => {
    const { auth } = await account();
    process.env.MARKET_OFFLINE = "true";
    try {
      await postDeposit(auth, 100).expect(200);
      const before = await wallet(auth);
      const response = await postBuy(auth, 0.001).expect(503);
      expect(response.body.message).toMatch(/No se registró/);
      await api.post("/api/v1/wallet/deposit").set(auth).send({ currency: Currency.ETH, amount: 1 }).expect(503);
      expect(await wallet(auth)).toEqual(before);
      const { body } = await api.get("/api/v1/orders").set(auth).expect(200);
      expect(body.data.total).toBe(0);
    } finally { process.env.MARKET_OFFLINE = "false"; }
  });

  it("impide operar sin verificar y rechaza precisión, activos y órdenes no admitidas", async () => {
    const pending = await account(false);
    await postDeposit(pending.auth, 100).expect(403);
    const { auth } = await account();
    await postDeposit(auth, 0.001).expect(400);
    await api.post("/api/v1/orders").set(auth).send({ symbol: "SOL", type: "market", side: "buy", quantity: 1 }).expect(400);
    await api.post("/api/v1/orders").set(auth).send({ symbol: "BTC", type: "limit", side: "buy", quantity: 0.001 }).expect(400);
    expect((await wallet(auth)).total).toBe(0);
    await AppDataSource.getRepository(User).update(pending.userId, { accountStatus: AccountStatus.SUSPENDED });
    await postDeposit(pending.auth, 100).expect(403);
  });

  it("serializa depósitos concurrentes desde una billetera inexistente", async () => {
    const { auth, userId } = await account();
    const replies = await Promise.all([postDeposit(auth, 40), postDeposit(auth, 60)]);
    expect(replies.map((r) => r.status)).toEqual([200, 200]);
    expect(await wallet(auth)).toMatchObject({ total: 100, balances: { USD: 100 } });
    const [row] = await AppDataSource.query('SELECT COUNT(*)::int AS wallets FROM wallets WHERE user_id=$1', [userId]);
    expect(row.wallets).toBe(1);
  });

  it("no gasta el mismo saldo en dos órdenes concurrentes", async () => {
    const { auth } = await account();
    await postDeposit(auth, 100).expect(200);
    const replies = await Promise.all([postBuy(auth, 0.0012), postBuy(auth, 0.0012)]);
    expect(replies.map((r) => r.status).sort()).toEqual([201, 400]);
    expect(await wallet(auth)).toMatchObject({ total: 99.94, balances: { USD: 39.94, BTC: 0.0012 } });
    const { body } = await api.get("/api/v1/orders").set(auth).expect(200);
    expect(body.data.total).toBe(1);
  });

  it("revierte el cambio de saldo cuando falla el registro del movimiento", async () => {
    const { auth } = await account();
    await postDeposit(auth, 10).expect(200);
    await AppDataSource.query(`ALTER TABLE transactions ADD CONSTRAINT test_rollback_guard CHECK (description IS DISTINCT FROM 'fixture-rollback')`);
    try {
      await postDeposit(auth, 25, "fixture-rollback").expect(500);
      expect(await wallet(auth)).toMatchObject({ total: 10, balances: { USD: 10 } });
      const { body } = await api.get("/api/v1/wallet/transactions").set(auth).expect(200);
      expect(body.data).toHaveLength(1);
    } finally {
      await AppDataSource.query("ALTER TABLE transactions DROP CONSTRAINT test_rollback_guard");
    }
  });

  it("muestra un actor proyectado y verifica la cadena nueva sin atribuir validez a lo histórico", async () => {
    const { userId, email, auth } = await account();
    const enrolled = await enroll(auth);
    await AppDataSource.getRepository(User).update(userId, { role: UserRole.ADMIN });
    await logAudit({ userId, action: AuditAction.ADMIN_ACTION, details: "actor de prueba" });
    const { body } = await api.get(`${ADMIN}/audit`).set(enrolled.auth).expect(200);
    const actor = body.data.logs.find((row: { details: string }) => row.details === "actor de prueba").user;
    expect(actor).toEqual({ id: userId, email, firstName: "Prueba", lastName: "Virtual" });
    const integrity = (await api.get(`${ADMIN}/audit/integrity`).set(enrolled.auth).expect(200)).body.data;
    expect(integrity).toMatchObject({ valid: true, legacy: 1 });
    expect(integrity.checked).toBeGreaterThan(10);
    await expect(AppDataSource.query(`UPDATE audit_logs SET details='fixture' WHERE user_id=$1`, [userId])).rejects.toThrow(/solo admite inserciones/);
    await expect(AppDataSource.query(`DELETE FROM audit_logs WHERE user_id=$1`, [userId])).rejects.toThrow(/solo admite inserciones/);
    await expect(AppDataSource.query(`TRUNCATE audit_logs`)).rejects.toThrow(/solo admite inserciones/);
    await expect(AppDataSource.query(`INSERT INTO audit_logs (action) VALUES ('login')`)).rejects.toThrow(/requieren posición y hash/);
  });

  it("bloquea las mutaciones virtuales cuando el modo está cerrado", async () => {
    const { auth } = await account();
    const previous = process.env.APP_MODE;
    process.env.APP_MODE = "locked";
    try {
      await postDeposit(auth, 100).expect(403);
      await postBuy(auth, 0.001).expect(403);
      expect((await wallet(auth)).total).toBe(0);
    } finally {
      process.env.APP_MODE = previous;
    }
  });

  it("no reemplaza registros pendientes duplicados; liga el desafío al destino actual", async () => {
    const fixture = await account(false);
    const code = delivery.email.get(fixture.email)!;
    await api.post(`${AUTH}/register`).send({ ...fixture.data, email: ` ${fixture.email.toUpperCase()} `, password: newPassword }).expect(409);
    const [row] = await AppDataSource.query(`SELECT code_hash, target FROM verification_codes WHERE user_id=$1`, [fixture.userId]);
    expect(row.target).toBe(fixture.email);
    expect(row.code_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(row.code_hash).not.toBe(code);
    await AppDataSource.query(`UPDATE users SET email=$1 WHERE id=$2`, ["cambio-fixture@example.com", fixture.userId]);
    await api.post(`${AUTH}/verify-email`).set(fixture.auth).send({ code }).expect(400);
    await AppDataSource.query(`UPDATE users SET email=$1 WHERE id=$2`, [fixture.email, fixture.userId]);
    const verified = await api.post(`${AUTH}/verify-email`).set(fixture.auth).send({ code }).expect(200);
    await profile(fixture.auth).expect(401);
    await profile(cookies(verified)).expect(200);
  });

  it("no admite registros concurrentes con el mismo teléfono", async () => {
    const a = registration(); const b = { ...registration(), phone: a.phone };
    const replies = await Promise.all([a, b].map((body) => api.post(`${AUTH}/register`).send(body)));
    expect(replies.map((reply) => reply.status).sort()).toEqual([201, 409]);
  });

  it("rechaza OTP vencido o agotado; el reenvío invalida el anterior y respeta la espera", async () => {
    const fixture = await account(false);
    const code = delivery.email.get(fixture.email)!;
    const tryCode = (value: string) => api.post(`${AUTH}/verify-email`).set(fixture.auth).send({ code: value });
    for (let i = 0; i < 5; i++) await tryCode(wrongCode(code)).expect(400);
    await tryCode(code).expect(400);
    await api.post(`${AUTH}/resend-verification`).set(fixture.auth).expect(429);
    await AppDataSource.query(`UPDATE verification_codes SET created_at=now()-interval '2 min' WHERE user_id=$1`, [fixture.userId]);
    await api.post(`${AUTH}/resend-verification`).set(fixture.auth).expect(200);
    const rows = await AppDataSource.query(`SELECT used, attempts FROM verification_codes WHERE user_id=$1 ORDER BY created_at`, [fixture.userId]);
    expect(rows).toEqual([{ used: true, attempts: 5 }, { used: false, attempts: 0 }]);
    await AppDataSource.query(`UPDATE verification_codes SET expires_at=now()-interval '1 second' WHERE user_id=$1`, [fixture.userId]);
    await tryCode(delivery.email.get(fixture.email)!).expect(400);
  });

  it("exige verificar por separado correo y teléfono cuando SMS está habilitado", async () => {
    delivery.sms = true;
    try {
      const { email, phone, auth } = await account(false);
      await api.post(`${AUTH}/verify-phone`).set(auth).send({ code: delivery.phone.get(phone) || "000000" }).expect(400);
      const { body } = await api.post(`${AUTH}/verify-email`).set(auth).send({ code: delivery.email.get(email) }).expect(200);
      expect(body.data).toMatchObject({ fullyVerified: false, needsPhone: true, user: { emailVerified: true, phoneVerified: false } });
      await postDeposit(auth, 10).expect(403);
      const result = await api.post(`${AUTH}/verify-phone`).set(auth).send({ code: delivery.phone.get(phone) }).expect(200);
      expect(result.body.data).toMatchObject({ fullyVerified: true, user: { phoneVerified: true } });
      await postDeposit(cookies(result), 10).expect(200);
    } finally { delivery.sms = false; }
  });

  it("rota la renovación, rechaza su reutilización y revoca desde el servidor al cerrar sesión", async () => {
    const { auth } = await account();
    const old = cookieValue(auth, "nen_refresh");
    const rotate = () => api.post(`${AUTH}/refresh`).set(auth);
    const events = await Promise.all([rotate(), rotate()]);
    expect(events.map((r) => r.status).sort()).toEqual([204, 401]);
    const fresh = cookies(events.find((r) => r.status === 204)!);
    const current = cookieValue(fresh, "nen_refresh");
    const [row] = await AppDataSource.query(`SELECT refresh_hash FROM user_sessions WHERE id=$1`, [opaqueTokenId(current)]);
    expect(current).not.toBe(old);
    expect(row.refresh_hash).toBe(hashToken(current));
    await api.post(`${AUTH}/refresh`).set(auth).expect(401);
    const logout = await api.post(`${AUTH}/logout`).set("Cookie", `nen_refresh=${current}`).expect(204);
    expect(cookieList(logout).every((line) => /=;/.test(line))).toBe(true);
    await profile(fresh).expect(401);
    await api.post(`${AUTH}/refresh`).set(fresh).expect(401);
  });

  it("solo lista y revoca sesiones del titular; la expiración absoluta vence el acceso y su renovación", async () => {
    const first = await account();
    const stranger = await account();
    const second = cookies(await login(first.email).expect(200));
    const third = cookies(await login(first.email).expect(200));
    const { body } = await api.get(`${AUTH}/sessions`).set(first.auth).expect(200);
    expect(body.data).toHaveLength(3);
    expect(body.data.filter((item: { isCurrent: boolean }) => item.isCurrent)).toHaveLength(1);
    expect(body.data[0]).not.toHaveProperty("refreshHash");
    const foreignId = opaqueTokenId(cookieValue(stranger.auth, "nen_refresh"));
    await api.delete(`${AUTH}/sessions/${foreignId}`).set(first.auth).expect(404);
    await profile(stranger.auth).expect(200);
    await api.delete(`${AUTH}/sessions/${opaqueTokenId(cookieValue(second, "nen_refresh"))}`).set(first.auth).expect(200);
    await profile(second).expect(401);
    await api.delete(`${AUTH}/sessions/others`).set(first.auth).expect(200);
    await profile(third).expect(401);
    await profile(first.auth).expect(200);
    await AppDataSource.query(`UPDATE user_sessions SET expires_at=now()-interval '1 second' WHERE user_id=$1`, [first.userId]);
    await profile(first.auth).expect(401);
    await api.post(`${AUTH}/refresh`).set(first.auth).expect(401);
  });

  it("recuperación genérica: código ligado al correo, enlace de un uso, contraseña nueva y revocación", async () => {
    const { auth, email, userId } = await account();
    const known = await api.post(`${AUTH}/forgot-password`).send({ email }).expect(200);
    const unknown = await api.post(`${AUTH}/forgot-password`).send({ email: "no-existe@example.com" }).expect(200);
    expect(known.body).toEqual(unknown.body);
    const reset = delivery.reset.get(email)!;
    expect(reset.code).toMatch(/^\d{6}$/);
    const [stored] = await AppDataSource.query(`SELECT token_hash, code_hash, target FROM verification_codes WHERE user_id=$1 AND type=$2`, [userId, CodeType.PASSWORD_RESET]);
    expect(stored.token_hash).toBe(hashToken(reset.token));
    expect(stored.code_hash).not.toBe(reset.code);
    expect(stored.target).toBe(email);
    await api.post(`${AUTH}/reset-password`).send({ token: reset.code, password: newPassword }).expect(400);
    await api.post(`${AUTH}/reset-password`).send({ token: reset.code, email: "otro@example.com", password: newPassword }).expect(400);
    await api.post(`${AUTH}/reset-password`).send({ token: reset.token, email: "otro@example.com", password: newPassword }).expect(400);
    await api.post(`${AUTH}/reset-password`).send({ token: reset.token, password: newPassword }).expect(200);
    await api.post(`${AUTH}/reset-password`).send({ token: reset.code, email, password }).expect(400);
    await api.post(`${AUTH}/reset-password`).send({ token: reset.token, password }).expect(400);
    await profile(auth).expect(401);
    await api.post(`${AUTH}/refresh`).set(auth).expect(401);
    await login(email).expect(401);
    await login(email, newPassword).expect(200);
  });

  it("no permite restablecer una cuenta suspendida con un código emitido antes de suspenderla", async () => {
    const a = await account();
    await api.post(`${AUTH}/forgot-password`).send({ email: a.email }).expect(200);
    const { code } = delivery.reset.get(a.email)!;
    await AppDataSource.getRepository(User).update(a.userId, { accountStatus: AccountStatus.SUSPENDED });
    await api.post(`${AUTH}/reset-password`).send({ token: code, email: a.email, password: newPassword }).expect(400);
    await login(a.email, newPassword).expect(401);
    const user = await AppDataSource.getRepository(User).findOneByOrFail({ id: a.userId });
    expect(user.accountStatus).toBe(AccountStatus.SUSPENDED);
  });

  it("al solicitar 2FA la cuenta sigue sin 2FA; confirmación ligada a la sesión, código sin replay y baja reforzada", async () => {
    const { auth, email, userId } = await account();
    const other = cookies(await login(email).expect(200));
    await api.post(`${AUTH}/2fa/setup`).set(auth).send({ password: "Incorrecta1" }).expect(400);
    const { body } = await api.post(`${AUTH}/2fa/setup`).set(auth).send({ password }).expect(200);
    expect(body.data.otpauthUrl).toMatch(/^otpauth:\/\/totp\//);
    const secret = body.data.secret as string;
    const [row] = await AppDataSource.query(`SELECT two_factor_secret, two_factor_pending, two_factor_enabled FROM users WHERE id=$1`, [userId]);
    expect(row.two_factor_secret).toBeNull();
    expect(row.two_factor_pending).toMatch(/^v1\./);
    expect(row.two_factor_enabled).toBe(false);
    const epoch = Math.floor(Date.now() / 30_000) * 30;
    const confirmCode = totp(secret, epoch - 30);
    await api.post(`${AUTH}/2fa/confirm`).set(other).send({ code: confirmCode }).expect(400);
    let invalid = wrongCode(confirmCode);
    while ([epoch - 30, epoch, epoch + 30, epoch + 60].some((time) => totp(secret, time) === invalid)) invalid = String(Number(invalid) + 1).padStart(6, "0");
    await api.post(`${AUTH}/2fa/confirm`).set(auth).send({ code: invalid }).expect(400);
    const enabled = cookies(await api.post(`${AUTH}/2fa/confirm`).set(auth).send({ code: confirmCode }).expect(200));
    await profile(other).expect(401);
    await profile(auth).expect(401);
    const challenge = await login(email).expect(200);
    expect(challenge.body.data).toEqual({ requiresTwoFactor: true });
    expect(challenge.headers["set-cookie"]).toBeUndefined();
    await login(email, password, confirmCode).expect(401);
    const signed = cookies(await login(email, password, totp(secret, epoch)).expect(200));
    await api.post(`${AUTH}/2fa/disable`).set(signed).send({ password }).expect(400);
    const next = totp(secret, epoch + 30);
    await api.post(`${AUTH}/2fa/disable`).set(signed).send({ password: "Incorrecta1", code: next }).expect(400);
    const disabled = await api.post(`${AUTH}/2fa/disable`).set(signed).send({ password, code: next }).expect(200);
    expect(disabled.body.data.user.twoFactorEnabled).toBe(false);
    await profile(enabled).expect(401);
    await profile(signed).expect(401);
    await login(email).expect(200);
  });

  it("bloquea temporalmente cinco intentos errados; un cambio de contraseña autorizado termina todas las sesiones", async () => {
    const { auth, email, userId } = await account();
    for (let i = 0; i < 4; i++) await login(email, "Incorrecta1").expect(401);
    await login(email, "Incorrecta1").expect(429);
    await login(email).expect(429);
    await AppDataSource.query(`UPDATE users SET locked_until=now()-interval '1 second' WHERE id=$1`, [userId]);
    const other = cookies(await login(email).expect(200));
    await api.post(`${AUTH}/password`).set(auth).send({ currentPassword: password, password: newPassword }).expect(200);
    await profile(other).expect(401);
    await profile(auth).expect(401);
    await login(email, newPassword).expect(200);
  });

  it("aplica rol actual de BD, MFA de personal, permisos mínimos y revocación al administrar cuentas", async () => {
    const a = await account(); const b = await account();
    await api.get(`${ADMIN}/users`).set(a.auth).expect(403);
    await AppDataSource.getRepository(User).update(a.userId, { role: UserRole.ADMIN });
    await api.get(`${ADMIN}/users`).set(a.auth).expect(403); // Rol actualizado, pero falta MFA.
    const admin = (await enroll(a.auth)).auth;
    await api.patch(`${ADMIN}/users/${a.userId}/status`).set(admin).send({ status: "blocked" }).expect(403);
    const role = await api.patch(`${ADMIN}/users/${b.userId}/role`).set(admin).send({ role: "operator" }).expect(200);
    expect(Object.keys(role.body.data).sort()).toEqual(["accountStatus","country","createdAt","email","firstName","id","isVerified","kycStatus","lastLoginAt","lastName","role","twoFactorEnabled"].sort());
    await profile(b.auth).expect(401);
    const operator0 = cookies(await login(b.email).expect(200));
    const staff = (await enroll(operator0)).auth;
    await api.get(`${ADMIN}/users`).set(staff).expect(200);
    await api.get(`${ADMIN}/audit`).set(staff).expect(403);
    await api.patch(`${ADMIN}/users/${a.userId}/role`).set(staff).send({ role: "user" }).expect(403);
    await AppDataSource.getRepository(User).update(b.userId, { role: UserRole.COMPLIANCE });
    await api.get(`${ADMIN}/users`).set(staff).expect(403);
    await api.get(`${ADMIN}/audit`).set(staff).expect(200);
    await AppDataSource.getRepository(User).update(b.userId, { role: UserRole.ANALYST });
    await api.get(`${ADMIN}/stats`).set(staff).expect(200);
    await api.get(`${ADMIN}/chart?range=7d`).set(staff).expect(200);
    await api.get(`${ADMIN}/audit`).set(staff).expect(403);
    await api.get(`${ADMIN}/settings`).set(staff).expect(403);
    await api.patch(`${ADMIN}/users/${b.userId}/status`).set(admin).send({ status: "blocked" }).expect(200);
    await profile(staff).expect(401);
    await api.post(`${AUTH}/refresh`).set(staff).expect(401);
    await login(b.email).expect(401);
  });

  it("aplica cierre y reapertura del registro y registra el cambio de configuración", async () => {
    const a = await account();
    const admin = (await enroll(a.auth)).auth;
    await AppDataSource.getRepository(User).update(a.userId, { role: UserRole.ADMIN });
    await api.put(`${ADMIN}/settings`).set(admin).send({ allowRegistration: false, twoFactorRequired: false }).expect(400);
    await api.put(`${ADMIN}/settings`).set(admin).send({ allowRegistration: false }).expect(200);
    try {
      await api.post(`${AUTH}/register`).send(registration()).expect(403);
      await profile(admin).expect(200);
    } finally { await api.put(`${ADMIN}/settings`).set(admin).send({ allowRegistration: true }).expect(200); }
    await api.post(`${AUTH}/register`).send(registration()).expect(201);
    const { body } = await api.get(`${ADMIN}/audit?category=system`).set(admin).expect(200);
    expect(body.data.logs.slice(0, 2).map((row: { details: string }) => row.details)).toEqual(["Registro abierto", "Registro cerrado"]);
  });

  it("revierte el depósito y su movimiento si la inserción de auditoría falla", async () => {
    const a = await account();
    await AppDataSource.query(`ALTER TABLE audit_logs ADD CONSTRAINT test_reject_deposit_audit CHECK (action <> 'deposit') NOT VALID`);
    try {
      await postDeposit(a.auth, 30).expect(500);
      expect((await wallet(a.auth)).total).toBe(0);
      expect((await api.get("/api/v1/wallet/transactions").set(a.auth).expect(200)).body.data).toHaveLength(0);
    } finally { await AppDataSource.query(`ALTER TABLE audit_logs DROP CONSTRAINT test_reject_deposit_audit`); }
  });
});
