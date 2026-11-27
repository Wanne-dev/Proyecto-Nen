// Solo para staging descartable de validación. Crea una cuenta ficticia verificada sin proveedor externo.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { mkdtempSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const http = require('node:http');
const https = require('node:https');
const { once } = require('node:events');

assert.equal(process.env.STAGING_FIXTURE_OK, '1', 'Usa STAGING_FIXTURE_OK=1 solo en una BD desechable y vacía.');
assert(process.env.STAGING_ENV_FILE, 'Indica STAGING_ENV_FILE, el archivo privado usado al arrancar staging.');
const project = process.env.COMPOSE_PROJECT_NAME || 'nen-stage-validacion';
assert.match(project, /^nen-stage-(?:smoke|validacion)\b/);
const bin = process.env.COMPOSE_BIN || 'docker';
const args = process.env.COMPOSE_BIN ? [] : ['compose'];
const compose = (extra, input) => execFileSync(bin, [...args, '--env-file', process.env.STAGING_ENV_FILE, '-f', 'docker-compose.yml', '-f', 'docker-compose.prod.yml', '-p', project, ...extra], {
  cwd: join(__dirname, '..'), input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 20_000,
});
const webPort = Number(process.env.WEB_PORT || '8080');
const tlsPort = Number(process.env.STAGING_TLS_PORT || '8447');
const address = `https://localhost:${tlsPort}`;
const suffix = crypto.randomUUID().slice(0, 10);
const password = `Fixture-${crypto.randomUUID()}9A`;
const email = `locked-${suffix}@example.com`;

async function run() {
  const dir = mkdtempSync(join(tmpdir(), 'nen-staging-tls-'));
  const key = join(dir, 'key.pem'); const cert = join(dir, 'cert.pem');
  const server = await startProxy(dir, key, cert);
  try {
    const api = (path, { method = 'GET', body, cookie } = {}) => new Promise((resolve, reject) => {
      const input = body === undefined ? null : Buffer.from(JSON.stringify(body));
      const request = https.request({ hostname: '127.0.0.1', servername: 'localhost', port: tlsPort, ca: readFileSync(cert), path: `/api/v1${path}`,
        method, headers: { host: `localhost:${tlsPort}`, ...(method !== 'GET' ? { origin: address, 'sec-fetch-site': 'same-origin' } : {}),
          ...(input && { 'content-type': 'application/json', 'content-length': input.length }), ...(cookie && { cookie }) } }, (response) => {
        let raw = '';
        response.setEncoding('utf8'); response.on('data', (chunk) => { raw += chunk; });
        response.on('end', () => { try { resolve({ status: response.statusCode, cookies: response.headers['set-cookie'], data: raw ? JSON.parse(raw) : null }); } catch (error) { reject(error); } });
      });
      request.on('error', reject); request.setTimeout(10_000, () => request.destroy(new Error('Timeout de API de staging'))); request.end(input);
    });
    const health = await api('/health');
    assert.equal(health.status, 200);
    assert.equal(health.data.database, 'conectada');
    assert.equal(health.data.email, 'console');
    const seed = `
      const assert = require('node:assert/strict');
      const { readFileSync } = require('node:fs');
      const bcrypt = require('bcrypt');
      const { AppDataSource } = require('./dist/config/database');
      const { User } = require('./dist/models/User');
      async function main() {
        assert.equal(process.env.NODE_ENV, 'production'); assert.equal(process.env.APP_MODE, 'locked');
        const { email, password } = JSON.parse(readFileSync(0, 'utf8'));
        await AppDataSource.initialize();
        try {
          const repo = AppDataSource.getRepository(User);
          assert.equal(await repo.count(), 0, 'La base de staging de pruebas debe estar vacía');
          await repo.save(repo.create({ email, passwordHash: await bcrypt.hash(password, 12), firstName: 'Staging', lastName: 'Fixture', emailVerified: true, isVerified: true }));
        } finally { await AppDataSource.destroy(); }
      }
      main().catch(() => { process.exitCode = 1; });`;
    compose(['exec', '-T', 'backend', 'node', '-e', seed], JSON.stringify({ email, password }));
    const login = await api('/auth/login', { method: 'POST', body: { email, password } });
    assert.equal(login.status, 200);
    assert.equal(login.data.data.user.isVerified, true);
    assert(!('token' in login.data.data));
    assert.equal(login.cookies.length, 2);
    assert(login.cookies.every((cookie) => /HttpOnly/.test(cookie) && /Secure/.test(cookie) && /SameSite=Strict/.test(cookie)));
    const cookie = login.cookies.map((entry) => entry.split(';', 1)[0]).join('; ');
    assert.equal((await api('/auth/profile', { cookie })).status, 200);
    const wallet = await api('/wallet', { cookie });
    assert.equal(wallet.status, 200);
    assert.equal(Number(wallet.data.data.totalBalanceUsd), 0);
    const blocked = [
      ['/wallet/deposit', { currency: 'USD', amount: 100 }],
      ['/wallet/withdraw', { currency: 'USD', amount: 20 }],
      ['/orders', { symbol: 'BTC', type: 'market', side: 'buy', quantity: 0.001 }],
    ];
    for (const [path, body] of blocked) {
      assert.equal((await api(path, { method: 'POST', cookie, body })).status, 403, path);
    }
    assert.equal(Number((await api('/wallet', { cookie })).data.data.totalBalanceUsd), 0);
    assert.equal((await api('/webhooks/wompi', { method: 'POST', body: {} })).status, 503);
    const register = await api('/auth/register', { method: 'POST', body: {
      email: `pending-${suffix}@example.com`, password, firstName: 'Verificación', lastName: 'Fixture',
      documentType: 'cc', documentNumber: `TEST-${suffix}`, dateOfBirth: '1996-01-02', phone: '+12025550189',
    } });
    assert.equal(register.status, 201);
    assert.equal(register.data.data.emailSent, false);
    assert.doesNotMatch(compose(['logs', '--no-color', 'backend']), /CODIGO DE (?:RESET|VERIFICACION)/);
    assert.equal((await api('/auth/logout', { method: 'POST', cookie })).status, 204);
    assert.equal((await api('/auth/profile', { cookie })).status, 401);
    console.log('Staging Compose/TLS local: health 200, cookies Secure/HttpOnly, login y logout reales, 3 operaciones 403, saldo intacto, Wompi 503, sin OTP en la consola.');
  } finally { server.close(); rmSync(dir, { recursive: true, force: true }); }
}

async function startProxy(dir, key, cert) {
  try {
    execFileSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', key, '-out', cert, '-subj', '/CN=localhost', '-addext', 'subjectAltName=DNS:localhost', '-days', '1'], { stdio: 'ignore' });
    const server = https.createServer({ key: readFileSync(key), cert: readFileSync(cert) }, (request, response) => {
      const forwarded = http.request({ host: '127.0.0.1', port: webPort, path: request.url, method: request.method, headers: request.headers }, (result) => {
        response.writeHead(result.statusCode, result.headers); result.pipe(response);
      });
      forwarded.on('error', () => { response.writeHead(502); response.end(); });
      request.pipe(forwarded);
    });
    server.listen(tlsPort, '127.0.0.1');
    await once(server, 'listening');
    return server;
  } catch (error) { rmSync(dir, { recursive: true, force: true }); throw error; }
}
run().catch((error) => { console.error(error.message); process.exitCode = 1; });
