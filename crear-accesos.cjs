/* BANCA NEN - solo para las dos cuentas descartables de este paquete local. */
'use strict';
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const { readFileSync, writeFileSync, renameSync, rmSync } = require('node:fs');
const { setTimeout: delay } = require('node:timers/promises');
const tag = '796ed55771';
const base = 'http://banca-nen.localhost:5184';
const keyPath = '/app/backend/.local/nen-auth.key';
const stateFile = `/app/backend/.local/accesos-${tag}.json`;
const context = { ipAddress: '127.0.0.1', userAgent: 'Configuracion local de cuentas' };
const account = (kind, email, password, phone) => ({
  email, password, phone, firstName: kind === 'U' ? 'Usuario' : 'Administrador', lastName: 'Local',
  dateOfBirth: '1995-01-01', documentNumber: `LOCAL-${tag}-${kind}`, documentType: 'cc',
});
const normal = account('U', 'usuario@example.com', 'NenUsuario7-79fc656752', '+12025550142');
const admin = account('A', 'wanne.lopez.1@gmail.com', 'NenAdmin9-89753730c1', '+12025550143');
const digest = (value) => createHash('sha256').update(value).digest('hex');
const mode = process.argv[2] ?? 'iniciar';

function guard() {
  const env = process.env;
  assert(['iniciar', 'codigo'].includes(mode), 'Usa INICIAR.bat o CODIGO-ADMIN.bat desde la carpeta BANCA-NEN.');
  assert(env.NEN_FIXTURE_EDITION === tag && env.APP_MODE === 'virtual' && env.NODE_ENV === 'development'
    && env.FRONTEND_URL === base && env.AUTH_KEY_FILE === keyPath && ['false', 'true'].includes(env.MARKET_OFFLINE)
    && ['console', 'smtp'].includes(env.EMAIL_PROVIDER) && env.DB_HOST === 'postgres' && env.DB_NAME.endsWith(tag)
    && !env.DATABASE_URL && !env.JWT_SECRET && !env.ENCRYPTION_KEY && !env.RESEND_API_KEY
    && !env.TWILIO_ACCOUNT_SID && !env.TWILIO_AUTH_TOKEN && !env.TWILIO_PHONE_NUMBER,
    'Solo funciona con el proyecto aislado de este ZIP. No se hizo ningun cambio.');
}

function readState() {
  let data;
  try { data = JSON.parse(readFileSync(stateFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  assert(data.tag === tag && data.ver === 1, 'El registro privado de la instalacion no corresponde a esta edicion.');
  return data;
}

function persist(data) {
  const pending = `${stateFile}.${randomUUID()}.tmp`;
  try {
    writeFileSync(pending, JSON.stringify(data), { mode: 0o600, flag: 'wx' });
    renameSync(pending, stateFile);
  } finally { rmSync(pending, { force: true }); }
}

async function consoleCode(email, send) {
  const lines = [];
  const log = console.log;
  let result;
  try {
    // Solo esta llamada local: no se muestra el OTP ni se cambia el logger de la API.
    console.log = (...args) => { if (typeof args[0] === 'string') lines.push(args[0].trim()); };
    result = await send();
  } finally { console.log = log; }
  const recipient = lines.findLastIndex((line) => line === `Para: ${email}`);
  const code = lines[recipient - 1]?.match(/^CODIGO DE VERIFICACION:\s*(\d{6})$/)?.[1];
  assert(code, 'No se obtuvo el codigo del buzon de consola local.');
  return { result, code };
}

async function main() {
  guard(); // Antes de importar el servicio, abrir archivos o conectar PostgreSQL.
  require('reflect-metadata');
  const { AppDataSource } = require('./dist/config/database');
  const { SMS_ENABLED } = require('./dist/config/sms');
  const { unsealTotp } = require('./dist/config/auth-keys');
  const { User } = require('./dist/models/User');
  const { registerSchema } = require('./dist/validators/auth.validator');
  const auth = require('./dist/services/auth.service');
  const { opaqueTokenId, endSession } = require('./dist/services/session.service');
  const bcrypt = require('bcrypt');
  const speakeasy = require('speakeasy');
  assert(!SMS_ENABLED, 'La instalacion no admite envio real de mensajes SMS.');

  await AppDataSource.initialize();
  const repo = AppDataSource.getRepository(User);
  const query = () => repo.createQueryBuilder('u').addSelect(['u.passwordHash', 'u.twoFactorPending', 'u.twoFactorSecret', 'u.twoFactorLastStep']);
  const byEmail = (email) => query().where('u.email = :email', { email }).getOne();
  const byId = (id) => query().where('u.id = :id', { id }).getOne();
  const identity = (row, input) => row.email === input.email && row.documentNumber === input.documentNumber && row.phone === input.phone;
  const matchesPassword = (row, input) => !!row?.passwordHash && bcrypt.compare(input.password, row.passwordHash);
  const close = (credentials) => credentials ? endSession(credentials.access, credentials.refresh, context) : Promise.resolve();
  const login = (input) => auth.loginUser({ email: input.email, password: input.password }, context);
  const totp = (secret, step) => speakeasy.totp({ secret, encoding: 'base32', time: step * 30 });

  async function availableCode(state) {
    assert(state?.ready, 'Primero ejecuta INICIAR.bat desde la carpeta BANCA-NEN para preparar las dos cuentas.');
    for (let attempt = 0; attempt < 3; attempt++) {
      const row = await byId(state.adminId);
      assert(row && row.email === admin.email && row.role === 'admin' && row.accountStatus === 'active'
        && row.isVerified && row.twoFactorEnabled && row.twoFactorSecret
        && digest(row.twoFactorSecret) === state.factor,
        'No se genera codigo: el administrador o su autenticador ya no son los de la instalacion.');
      const now = Date.now();
      const step = Math.floor(now / 30000);
      const remaining = (step + 1) * 30000 - now;
      assert(row.twoFactorLastStep === null || row.twoFactorLastStep <= step,
        'El reloj de Docker esta atrasado. Corrige la fecha y la hora del equipo.');
      if (row.twoFactorLastStep === step || remaining < 7000) {
        console.log('Esperando el siguiente codigo para que no venza al escribirlo...');
        await delay(remaining + 200);
        continue;
      }
      console.log(`Codigo 2FA: ${totp(unsealTotp(row.twoFactorSecret, row.id), step)}`);
      console.log(`Escribelo ahora en el login (aprox. ${Math.floor(remaining / 1000)} s). Si vence o ya lo usaste, ejecuta CODIGO-ADMIN.bat desde la carpeta BANCA-NEN otra vez.`);
      return;
    }
    throw new Error('No se encontro un codigo nuevo. Vuelve a ejecutar CODIGO-ADMIN.bat desde la carpeta BANCA-NEN.');
  }

  async function ensureVerified(input) {
    const existing = await byEmail(input.email);
    if (existing?.isVerified) return existing;
    let session;
    let verified;
    try {
      let received;
      if (existing) {
        session = (await login(input)).credentials;
        assert(session, 'No se pudo recuperar el registro incompleto de la instalacion.');
        // Si se interrumpio el arranque, la API de dominio aplica su espera normal.
        received = await consoleCode(input.email,
          () => auth.resendVerificationCodes(existing.id, opaqueTokenId(session.refresh)));
      } else {
        const data = registerSchema.validate(input);
        if (data.error) throw data.error;
        received = await consoleCode(input.email, () => auth.registerUser(data.value, context));
        session = received.result.credentials;
      }
      const id = existing?.id ?? received.result.user.id;
      verified = await auth.verifyEmailCode(id, opaqueTokenId(session.refresh), received.code, context);
      assert(verified.fullyVerified && verified.user.id === id, 'No se pudo verificar la cuenta de la instalacion.');
      return await byEmail(input.email);
    } finally { await close(verified?.credentials ?? session); }
  }

  async function promote(row, state) {
    if (!row.twoFactorEnabled) {
      const session = (await login(admin)).credentials;
      assert(session, 'No se pudo iniciar la sesion local para el autenticador.');
      let verified;
      try {
        const id = opaqueTokenId(session.refresh);
        const enrollment = await auth.setup2FA(row.id, id, admin.password, context);
        const pending = await byEmail(admin.email);
        assert(pending?.twoFactorPending, 'El servicio no guardo la configuracion 2FA de la instalacion.');
        state.factor = digest(pending.twoFactorPending);
        persist(state);
        const remaining = 30000 - Date.now() % 30000;
        if (remaining < 2500) await delay(remaining + 150);
        // El servicio admite la ventana anterior. Deja libre el codigo actual para el usuario.
        const code = totp(enrollment.secret, Math.floor(Date.now() / 30000) - 1);
        verified = await auth.confirm2FA(row.id, id, code, context);
        assert(verified.user.twoFactorEnabled, 'No se confirmo el 2FA. No se dara el rol de administrador.');
      } finally { await close(verified?.credentials ?? session); }
      row = await byEmail(admin.email);
    }
    assert(row.twoFactorSecret && digest(row.twoFactorSecret) === state.factor, 'El autenticador no coincide con el configurado por esta instalacion.');
    if (row.role !== 'admin') {
      const grant = spawnSync(process.execPath, ['dist/cli/grant-first-admin.js', admin.email], { stdio: ['ignore', 'inherit', 'inherit'] });
      assert(grant.status === 0, 'El CLI no pudo dar el rol de administrador.');
    }
    const promoted = await byEmail(admin.email);
    assert(promoted.role === 'admin' && promoted.twoFactorEnabled && promoted.isVerified, 'El rol de administrador no quedo configurado.');
    return promoted;
  }

  async function showAccount(role, row, input, expectedRole) {
    if (!row || row.email !== input.email || row.role !== expectedRole || row.accountStatus !== 'active' || !row.isVerified) {
      console.log(`${role}: la cuenta original ya no esta disponible con ese rol. No se modifico.`);
      return;
    }
    console.log(`${role}: ${row.email}`);
    console.log(await matchesPassword(row, input) ? `Clave: ${input.password}` : 'Clave cambiada: usa la que elegiste. No se modifico.');
  }

  try {
    if (mode === 'codigo') return await availableCode(readState());
    const guardSession = AppDataSource.createQueryRunner();
    await guardSession.connect();
    try {
      const lock = await guardSession.query('SELECT pg_try_advisory_lock($1, $2) AS ok', [1820500123, 5184]);
      assert(lock[0]?.ok, 'Ya hay otro arranque preparando la instalacion. Espera a que termine.');
      let state = readState();
      if (!state) {
        assert(await repo.count() === 0, 'La base no esta vacia y no pertenece a un alta de esta instalacion. No se hicieron cambios.');
        state = { tag, ver: 1, ready: false };
        persist(state);
      }
      if (!state.ready) {
        // Una interrupcion solo se puede reanudar con los registros exactos de esta copia.
        const partial = await query().take(3).getMany();
        for (const row of partial) {
          const input = row.email === normal.email ? normal : row.email === admin.email ? admin : undefined;
          assert(input && identity(row, input) && row.accountStatus === 'active'
            && (row.role === 'user' || (input === admin && row.role === 'admin')) && await matchesPassword(row, input),
            'Hay una cuenta ajena o modificada: no se puede continuar preparando la instalacion.');
        }
        const user = await ensureVerified(normal);
        const administrator = await promote(await ensureVerified(admin), state);
        state = { ...state, ready: true, userId: user.id, adminId: administrator.id };
        persist(state);
      }
      console.log('\nACCESOS DE ESTA INSTALACION LOCAL');
      await showAccount('Usuario', await byId(state.userId), normal, 'user');
      await showAccount('Administrador', await byId(state.adminId), admin, 'admin');
      console.log(`Entra en ${base}/login. Para el 2FA del administrador ejecuta CODIGO-ADMIN.bat desde la carpeta BANCA-NEN cuando el login pida los seis digitos.`);
      console.log('No uses datos reales en esta copia.\n');
    } finally {
      try { await guardSession.query('SELECT pg_advisory_unlock($1, $2)', [1820500123, 5184]); }
      finally { await guardSession.release(); }
    }
  } finally { await AppDataSource.destroy(); }
}

main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
