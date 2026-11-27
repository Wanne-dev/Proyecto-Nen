// Smoke E2E de la instalación Docker local. Solo cuentas ficticias y un volumen desechable.
const assert = require('node:assert/strict');
const { randomUUID, randomInt } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { join } = require('node:path');
const { stripVTControlCharacters } = require('node:util');
const { setTimeout: delay } = require('node:timers/promises');
const { createRequire } = require('node:module');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = join(__dirname, '..');
const speakeasy = createRequire(join(root, 'backend/package.json'))('speakeasy');
const base = new URL(process.env.LOCAL_URL || 'http://localhost:5173');
const project = process.env.COMPOSE_PROJECT_NAME || 'nen-local-validacion';
assert.equal(process.env.LOCAL_FIXTURE_OK, '1', 'Usa LOCAL_FIXTURE_OK=1 solo en una instalación local desechable.');
assert.match(project, /^nen-local-(?:smoke|validacion)(?:-[a-z0-9-]+)?$/);
assert(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Solo ejecutar el smoke contra una instalación local desechable.');
const composeBin = process.env.COMPOSE_BIN || 'docker';
const composeArgs = process.env.COMPOSE_BIN ? [] : ['compose'];
const compose = (...args) => execFileSync(composeBin, [...composeArgs, '-p', project, ...args], {
  cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 20_000,
});
const pathOf = (page) => new URL(page.url()).pathname;
const apiPath = (path) => `${base.origin}/api/v1${path}`;
const go = (page, path) => page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded' });
const sessionProfile = (context) => context.request.get(apiPath('/auth/profile'));
const availableCode = (secret, offset) => speakeasy.totp({ secret, encoding: 'base32', time: (Math.floor(Date.now()/30_000) + offset) * 30 });
const stepCode = (secret, step) => speakeasy.totp({ secret, encoding: 'base32', time: step * 30 });
const codeStep = () => Math.floor(Date.now()/30_000);
async function allowTimeForTotp() {
  const remaining = 30_000 - Date.now() % 30_000;
  if (remaining < 6_000) await delay(remaining + 150);
}
const uid = randomUUID().slice(0, 10);
const email = `smoke-${uid}@example.com`;
const person = `destino-${uid}@example.com`;
const password = `Local${randomUUID()}7!`;
const changed = `Nueva${randomUUID()}9!`;
const post = (page, path) => page.waitForResponse((r) => new URL(r.url()).pathname === `/api/v1${path}` && r.request().method() === 'POST');

function readMailbox(target, type = 'VERIFICACION') {
  const rows = stripVTControlCharacters(compose('logs', '--no-color', '--no-log-prefix', '--tail', '300', 'backend')).split('\n');
  const contact = rows.findLastIndex((row, index) => row.trim() === `Para: ${target}` && rows[index - 1]?.includes(`CODIGO DE ${type}: `));
  const result = rows[contact - 1]?.match(/: (\d{6})(?:\s+\(token: ([^\s)]+)\))?\s*$/);
  assert(result, 'No llegó al buzón de consola el código del usuario ficticio.');
  return { code: result[1], token: result[2] };
}

async function register(page, target, tag, testInvalid = false) {
  await go(page, '/register');
  const fields = { Email: target, Nombre: 'Fixture', Apellido: 'Académica', 'Número de documento': `E2E-${tag}`,
    'Fecha de nacimiento': '1996-01-02', Teléfono: `+12025550${randomInt(1000, 9999)}`,
    Contraseña: password, 'Confirmar contraseña': password };
  for (const [label, value] of Object.entries(fields)) await page.getByLabel(label, { exact: true }).fill(value);
  const registered = post(page, '/auth/register');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();
  const response = await registered;
  assert.equal(response.status(), 201, 'Registro por la interfaz');
  const { data } = await response.json();
  assert(!('token' in data) && !('credentials' in data));
  assert.equal(await (await page.request.get(apiPath('/wallet'))).status(), 403);
  await page.waitForURL('**/verify');
  const code = readMailbox(target).code;
  const codeField = page.getByLabel('Código de correo');
  if (testInvalid) {
    await codeField.fill(code === '000000' ? '000001' : '000000');
    const denied = post(page, '/auth/verify-email');
    await page.getByRole('button', { name: 'Verificar email' }).click();
    assert.equal((await denied).status(), 400, 'Código incorrecto');
  }
  await codeField.fill(code);
  await page.getByRole('button', { name: 'Verificar email' }).click();
  await page.waitForURL('**/asistente');
  return data.user.id;
}

async function startLogin(page, address, pass) {
  await go(page, '/login');
  await page.getByLabel('Email', { exact: true }).fill(address);
  await page.getByLabel('Contraseña', { exact: true }).fill(pass);
  const response = post(page, '/auth/login');
  await page.locator('form button[type=submit]').click();
  return response;
}
async function sendTotp(page, code) {
  await page.getByLabel('Código 2FA').fill(code);
  const response = post(page, '/auth/login');
  await page.locator('form button[type=submit]').click();
  return response;
}
async function balance(context, cash, btc, total, other = {}) {
  const response = await context.request.get(apiPath('/wallet'));
  assert.equal(response.status(), 200);
  const { data } = await response.json();
  const found = Object.fromEntries(data.balances.map((r) => [r.currency, Number(r.balance)]));
  for (const [currency, value] of Object.entries({ USD: cash, BTC: btc, ...other })) assert.equal(found[currency], value, currency);
  assert.equal(Number(data.totalBalanceUsd), total);
}

async function main() {
  assert.equal((await fetch(apiPath('/health'))).status, 200, 'Health por proxy Nginx');
  const accounts = compose('exec', '-T', 'postgres', 'psql', '-XAt', '-U', 'banca_nen', '-d', 'banca_nen', '-c', 'SELECT count(*) FROM users');
  assert.equal(accounts.trim(), '0', 'La suite necesita una instalación de pruebas con base vacía. Usa otro proyecto desechable.');
  const browser = await chromium.launch();
  const pageErrors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1450, height: 950 } });
    const other = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, hasTouch: true });
    for (const ctx of [context, other]) await ctx.route('**/*', (request) => {
      return new URL(request.request().url()).origin === base.origin ? request.continue() : request.abort();
    });
    const page = await context.newPage(); const phone = await other.newPage();
    for (const p of [page, phone]) { p.setDefaultTimeout(15_000); p.on('pageerror', (error) => pageErrors.push(error.message)); }
    await go(page, '/asistente'); await page.waitForURL('**/login');
    await register(page, email, uid, true);
    assert.equal(await page.evaluate(() => localStorage.getItem('auth-storage')), null);
    assert.equal((await context.cookies()).filter((cookie) => /^nen_/.test(cookie.name) && cookie.httpOnly && cookie.sameSite === 'Strict').length, 2);
    const before = (await context.cookies()).find((cookie) => cookie.name === 'nen_refresh').value;
    await context.clearCookies({ name: 'nen_access' });
    const renew = post(page, '/auth/refresh');
    await page.reload({ waitUntil: 'domcontentloaded' });
    assert.equal((await renew).status(), 204);
    await page.getByRole('main').waitFor();
    const after = (await context.cookies()).find((cookie) => cookie.name === 'nen_refresh')?.value;
    assert(after && after !== before, 'La renovación debe rotar la cookie');
    assert.equal((await sessionProfile(context)).status(), 200);
    await go(page, '/admin'); await page.waitForURL('**/asistente');
    await go(page, '/dashboard'); await page.waitForURL('**/asistente');
    await page.getByRole('heading', { name: '¿En qué te puedo ayudar?' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enviar', exact: true }).isDisabled(), true);
    const assistantWrites = [];
    const listen = (request) => { if (request.url().includes('/api/') && request.method() !== 'GET') assistantWrites.push(request.method()); };
    page.on('request', listen);
    await page.getByRole('button', { name: /Mi billetera/ }).click();
    assert.match(await page.getByRole('textbox', { name: 'Tu consulta' }).inputValue(), /saldo de mi billetera/);
    await page.getByRole('button', { name: 'Limpiar', exact: true }).click();
    assert.equal(await page.getByRole('textbox', { name: 'Tu consulta' }).inputValue(), '');
    page.off('request', listen);
    assert.deepEqual(assistantWrites, [], 'El borrador no genera solicitudes de escritura');
    assert.equal(await page.getByRole('link', { name: 'Explorar', exact: true }).count(), 0);
    assert.equal(await page.getByRole('link', { name: 'New IA', exact: true }).count(), 1);
    assert.equal(await page.locator('main header').count(), 0, 'No debe haber una cabecera dentro del contenido');
    await go(page, '/explorar'); await page.waitForURL(`${base.origin}/`);
    console.log('UI: New IA es el inicio y la sección retirada ya no existe');
    await go(page, '/trading/prediction');
    await page.getByText(/El mercado está desconectado/).waitFor();
    assert.equal(await page.getByText('Precio estimado', { exact: true }).count(), 0);
    console.log('UI: registro, verificación, cookies, protección de personal, New IA sin escrituras y análisis desconectado OK');

    await go(page, '/wallet/deposit');
    await page.locator('#deposit-virtual-amount').fill('100');
    const deposit = post(page, '/wallet/deposit');
    await page.getByRole('button', { name: 'Depositar saldo virtual' }).click();
    assert.equal((await deposit).status(), 200);
    await go(page, '/trading');
    await page.getByRole('heading', { name: 'Mercado cripto' }).waitFor();
    await page.getByText('No se muestran datos de ejemplo.').waitFor();
    await page.locator('#trade-sim-quantity').fill('0.001');
    assert.equal(await page.getByRole('button', { name: 'Comprar BTC', exact: true }).isDisabled(), true);
    assert.equal(await page.locator('main canvas').count(), 0);
    const quoteState = await context.request.get(apiPath('/market/quotes'));
    assert.deepEqual(await quoteState.json(), { source: 'Kraken', status: 'offline', asOf: null, data: null });
    const blocked = await context.request.post(apiPath('/orders'), { data: { symbol: 'BTC', side: 'buy', type: 'market', quantity: 0.001 } });
    assert.equal(blocked.status(), 503);
    await balance(context, 100, 0, 100);
    await go(page, '/wallet/withdraw');
    await page.locator('#withdraw-virtual-amount').fill('20');
    const withdrawal = post(page, '/wallet/withdraw');
    await page.getByRole('button', { name: 'Retirar saldo virtual' }).click();
    assert.equal((await withdrawal).status(), 200);
    await balance(context, 79.98, 0, 79.98);
    console.log('UI: mercado desconectado sin precios de relleno; órdenes bloqueadas y depósito/retiro USD operativo');

    assert.equal((await startLogin(phone, email, password)).status(), 200);
    await phone.waitForURL('**/asistente');
    for (const path of ['/asistente', '/trading', '/trading/prediction', '/wallet', '/wallet/deposit', '/wallet/withdraw', '/trading/history', '/settings/security']) {
      await go(phone, path);
      await phone.getByRole('main').waitFor();
      assert.equal(pathOf(phone), path);
      const widths = await phone.evaluate(() => ({ viewport: window.innerWidth, doc: document.documentElement.scrollWidth, main: document.querySelector('main').scrollWidth }));
      assert(widths.doc <= widths.viewport && widths.main <= widths.viewport, `Desborde en ${path}: ${JSON.stringify(widths)}`);
    }
    await go(page, '/settings/security');
    await page.getByText('Esta sesión', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Cerrar otras sesiones' }).click();
    await page.getByText('Otras sesiones cerradas', { exact: true }).waitFor();
    assert.equal((await sessionProfile(other)).status(), 401);
    await go(phone, '/wallet'); await phone.waitForURL('**/login');
    console.log('UI: móvil 390 px sin desborde en ocho rutas y revocación efectiva en otro navegador');

    await go(phone, '/forgot-password');
    await phone.getByPlaceholder('tu@email.com').fill(email);
    await phone.locator('form button[type=submit]').click();
    await phone.getByText('Revisa tu correo', { exact: true }).waitFor();
    const { token } = readMailbox(email, 'RESET');
    assert(token, 'El correo simulado tiene enlace');
    await go(phone, `/reset-password#token=${encodeURIComponent(token)}`);
    await phone.getByLabel('Contraseña nueva', { exact: true }).fill(changed);
    assert.equal(new URL(phone.url()).hash, '');
    await phone.getByLabel('Confirmar contraseña nueva', { exact: true }).fill(changed);
    const reset = post(phone, '/auth/reset-password');
    await phone.locator('form button[type=submit]').click();
    assert.equal((await reset).status(), 200);
    assert.equal((await sessionProfile(context)).status(), 401);
    await go(page, '/asistente'); await page.waitForURL('**/login');
    assert.equal((await startLogin(page, email, changed)).status(), 200);
    await page.waitForURL('**/asistente');
    await go(page, '/settings');
    await page.getByLabel('Nombres', { exact: true }).fill('Nombre de prueba');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await page.getByText('Perfil guardado en el servidor.').waitFor();
    assert.equal((await (await sessionProfile(context)).json()).data.firstName, 'Nombre de prueba');
    console.log('UI: recuperación desde enlace, revocación de sesión previa y edición de perfil persistente');

    await go(page, '/settings/security');
    await page.getByRole('link', { name: 'Configurar 2FA →' }).click();
    await page.getByLabel('Contraseña actual', { exact: true }).fill(changed);
    await page.getByRole('button', { name: 'Generar código QR' }).click();
    const secret = (await page.getByTestId('totp-setup-secret').innerText()).trim();
    assert.equal((await (await sessionProfile(context)).json()).data.twoFactorEnabled, false);
    const epoch = codeStep();
    let incorrect = 0;
    while ([-1, 0, 1, 2].some((offset) => stepCode(secret, epoch + offset) === String(incorrect).padStart(6, '0'))) incorrect++;
    await page.getByLabel('Código de la aplicación').fill(String(incorrect).padStart(6, '0'));
    let pending = post(page, '/auth/2fa/confirm');
    await page.getByRole('button', { name: 'Confirmar y activar 2FA' }).click();
    assert.equal((await pending).status(), 400);
    await allowTimeForTotp();
    const confirmation = availableCode(secret, -1);
    await page.getByLabel('Código de la aplicación').fill(confirmation);
    pending = post(page, '/auth/2fa/confirm');
    await page.getByRole('button', { name: 'Confirmar y activar 2FA' }).click();
    assert.equal((await pending).status(), 200);
    await page.getByText('2FA activo', { exact: true }).waitFor();
    const challenge = await startLogin(phone, email, changed);
    assert.equal((await challenge.json()).data.requiresTwoFactor, true);
    assert.equal((await sendTotp(phone, confirmation)).status(), 401);
    assert.equal((await sendTotp(phone, availableCode(secret, 0))).status(), 200);
    await phone.waitForURL('**/asistente');
    console.log('UI: alta TOTP confirmada, inicio en dos pasos y rechazo de código reutilizado');

    await go(phone, '/settings/security');
    await phone.getByRole('button', { name: 'Desactivar 2FA' }).click();
    await phone.getByLabel('Contraseña para desactivar').fill(changed);
    await phone.getByLabel('Código TOTP para desactivar').fill(availableCode(secret, +1));
    const disabled = post(phone, '/auth/2fa/disable');
    await phone.getByRole('button', { name: 'Confirmar desactivación' }).click();
    assert.equal((await disabled).status(), 200);
    await phone.getByText('2FA inactivo', { exact: true }).waitFor();
    assert.equal((await sessionProfile(context)).status(), 401);
    console.log('UI: baja con contraseña y TOTP nuevos; otras sesiones revocadas');

    await go(phone, '/2fa-setup');
    await phone.getByLabel('Contraseña actual', { exact: true }).fill(changed);
    await phone.getByRole('button', { name: 'Generar código QR' }).click();
    const staffSecret = (await phone.getByTestId('totp-setup-secret').innerText()).trim();
    await allowTimeForTotp();
    await phone.getByLabel('Código de la aplicación').fill(availableCode(staffSecret, -1));
    await phone.getByRole('button', { name: 'Confirmar y activar 2FA' }).click();
    await phone.getByText('2FA activo', { exact: true }).waitFor();

    // El entorno de smoke debe estar vacío de administradores; este comando solo promueve al primero.
    compose('exec', '-T', 'backend', 'node', 'dist/cli/grant-first-admin.js', email);
    assert.equal((await sessionProfile(context)).status(), 401);
    await go(page, '/admin'); await page.waitForURL('**/login');
    assert.equal((await (await startLogin(page, email, changed)).json()).data.requiresTwoFactor, true);
    assert.equal((await sendTotp(page, availableCode(staffSecret, 0))).status(), 200);
    await page.waitForURL('**/asistente');
    const targetId = await register(phone, person, `${uid}-b`);
    await go(page, '/admin/users');
    await page.getByRole('button', { name: `Ver detalle de ${person}` }).click();
    const role = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().endsWith(`/admin/users/${targetId}/role`));
    await page.getByLabel('Cambiar rol', { exact: true }).selectOption('operator');
    assert.equal((await role).status(), 200);
    await page.getByText('Rol actualizado', { exact: true }).waitFor();
    assert.equal((await sessionProfile(other)).status(), 401);
    assert.equal((await startLogin(phone, person, password)).status(), 200);
    await phone.waitForURL('**/asistente');
    await go(phone, '/admin/users');
    await phone.waitForURL('**/settings/security?staff=2fa');
    await go(phone, '/2fa-setup');
    await phone.getByLabel('Contraseña actual', { exact: true }).fill(password);
    await phone.getByRole('button', { name: 'Generar código QR' }).click();
    const operatorSecret = (await phone.getByTestId('totp-setup-secret').innerText()).trim();
    await phone.getByLabel('Código de la aplicación').fill(availableCode(operatorSecret, 0));
    await phone.getByRole('button', { name: 'Confirmar y activar 2FA' }).click();
    await phone.getByText('2FA activo', { exact: true }).waitFor();
    await go(phone, '/admin/users');
    await phone.getByText('Consulta de cuentas · acceso de solo lectura').waitFor();
    await go(phone, '/admin/audit'); await phone.waitForURL('**/asistente');
    const status = page.waitForResponse((r) => r.request().method() === 'PATCH' && r.url().endsWith(`/admin/users/${targetId}/status`));
    await page.getByLabel('Cambiar estado', { exact: true }).selectOption('blocked');
    assert.equal((await status).status(), 200);
    await page.getByText('Estado actualizado', { exact: true }).waitFor();
    assert.equal((await sessionProfile(other)).status(), 401);
    await page.keyboard.press('Escape');
    await go(page, '/admin/settings');
    const toggle = page.getByRole('checkbox', { name: 'Permitir nuevos registros' });
    await toggle.uncheck();
    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await page.getByText('Se deshabilitó el registro de nuevas cuentas.').waitFor();
    await toggle.check();
    await page.getByRole('button', { name: 'Guardar configuración' }).click();
    await page.getByText('Se habilitó el registro de nuevas cuentas.').waitFor();
    await go(page, '/admin/audit');
    await page.getByRole('button', { name: 'Comprobar cadena' }).click();
    await page.getByText(/Cadena válida: \d+ eventos comprobados/).waitFor();
    await page.getByText(/Estado: active → blocked/).waitFor();
    console.log('UI: primer admin, rol de operador con 2FA y solo lectura, bloqueo, cierre/reapertura de registro y auditoría');

    await page.getByTitle('Cerrar sesión', { exact: true }).first().click();
    await page.waitForURL('**/login');
    assert.equal((await sessionProfile(context)).status(), 401);
    assert.deepEqual(pageErrors, []);
    console.log('UI: cierre de sesión confirmado por API, cero excepciones de JavaScript');
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
