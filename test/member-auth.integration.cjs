// Run inside the isolated Docker API container only. Never use a production database.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const mysql = require('mysql2/promise');
const Redis = require('ioredis');
const api = process.env.AUTH_TEST_API || 'http://127.0.0.1:3000';
const mailpit = 'http://mailpit:8025/api/v1';
/** Hashes a synthetic credential. Returns its SHA-256 hex digest. */
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const emails = [];
const http = require('node:http');
// Each disposable test run uses its own loopback client IP, preserving rate limits.
const testAddress = `127.${crypto.randomInt(1, 250)}.${crypto.randomInt(1, 250)}.2`;
let db, redis;
/** Calls a local auth route from this test client. Returns status and parsed envelope. */
async function call(path, body, token) {
  const url = new URL(`${api}/member-auth/${path}`);
  const { status, data } = await new Promise((resolve, reject) => {
    const request = http.request(url, {
      method: body ? 'POST' : 'GET', localAddress: url.hostname === '127.0.0.1' ? testAddress : undefined,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    }, response => {
      let text = ''; response.setEncoding('utf8'); response.on('data', chunk => text += chunk);
      response.on('end', () => { try { resolve({ status: response.statusCode, data: JSON.parse(text) }); } catch (error) { reject(error); } });
    });
    request.on('error', reject); request.end(body ? JSON.stringify(body) : undefined);
  });
  return { status, ...data };
}
/** Reads the synthetic member's latest Mailpit message. Returns its four-digit OTP. */
async function codeFor(email) {
  const list = await (await fetch(`${mailpit}/messages`)).json();
  const message = list.messages.find(m => m.To.some(to => to.Address === email));
  assert(message, 'OTP email must arrive in Mailpit');
  const full = await (await fetch(`${mailpit}/message/${message.ID}`)).json();
  const match = full.Text.match(/Kode OTP Anda: (\d{4})/);
  assert(match, 'Email contains a four-digit OTP');
  return match[1];
}
/** Removes only this synthetic email's cooldown. Returns Promise<void>. */
async function cooldown(email) { await redis.del(`member-auth:send-cooldown:${digest(email)}`); }
/** Registers a disposable member. Returns its normalized email and delivered OTP. */
async function register(suffix) {
  const email = `auth-test-${Date.now()}-${suffix}@example.test`; emails.push(email);
  const result = await call('register', { email: ` ${email.toUpperCase()} `, name: 'Auth Test', password: 'Testpass123!', agreeTerms: true });
  assert.equal(result.status, 201);
  return { email, code: await codeFor(email) };
}
(async () => {
  assert.equal(process.env.DB_HOST, 'mysql', 'Test is restricted to the isolated Docker database');
  db = await mysql.createConnection({ host: process.env.DB_HOST, user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD, database: process.env.DB_DATABASE_MIMATE });
  redis = new Redis({ host: process.env.BULL_HOST, port: Number(process.env.BULL_PORT) });
  assert.equal((await call('register', { email: 'bad', password: 'weak', name: '', agreeTerms: false, role: 'admin' })).status, 400);
  const main = await register('main');
  const loginBody = { email: main.email, password: 'Testpass123!', rememberMe: true };
  assert.equal((await call('login', loginBody)).status, 403);
  const verify = { email: main.email, purpose: 'registration', password: 'Testpass123!', code: main.code };
  assert.equal((await call('otp/verify', { ...verify, purpose: 'recovery' })).status, 400);
  assert.equal((await call('otp/verify', { ...verify, code: main.code === '0000' ? '0001' : '0000' })).status, 400);
  assert.equal((await call('otp/verify', { ...verify, password: 'Wrongpass123!' })).status, 400);
  const verifiedSession = await call('otp/verify', verify);
  assert.equal(verifiedSession.status, 200);
  assert(verifiedSession.data.token && verifiedSession.data.refreshToken);
  assert.equal((await call('me', undefined, verifiedSession.data.token)).status, 200, 'Registration verification logs in immediately');
  assert.equal((await call('otp/verify', verify)).status, 400);
  assert.equal((await call('login', { ...loginBody, password: 'wrong' })).status, 401);
  const login = await call('login', loginBody); assert.equal(login.status, 200);
  const token = login.data.token;
  assert.equal(login.data.member.email, main.email);
  assert.equal('passwordHash' in login.data.member, false);
  const jwt = require('jsonwebtoken');
  const claims = jwt.decode(token);
  assert.equal(claims.exp - claims.iat, 86400, 'JWT access expiry is exactly one day, including remember-me');
  const signingKey = process.env.MEMBER_JWT_SECRET || crypto.createHmac('sha256', process.env.JWT_SECRET).update('temu-sobat-member-access-v1').digest('hex');
  const expiredAccess = jwt.sign({ ...claims, iat: Math.floor(Date.now()/1000)-86401, exp: Math.floor(Date.now()/1000)-1 }, signingKey, { algorithm: 'HS256' });
  assert.equal((await call('me', undefined, expiredAccess)).status, 401);
  const renewed = await call('refresh', { refreshToken: login.data.refreshToken });
  assert.equal(renewed.status, 200, 'Expired access token can be renewed with a live refresh token');
  assert.equal(renewed.data.refreshExpiresAt, login.data.refreshExpiresAt, 'Refresh cannot extend its absolute lifetime');
  assert.notEqual(renewed.data.refreshToken, login.data.refreshToken);
  assert.equal((await call('refresh', { refreshToken: login.data.refreshToken })).status, 401, 'Refresh token cannot be replayed');
  assert.equal((await call('me', undefined, renewed.data.token)).status, 200);
  const concurrentRefresh = await Promise.all([call('refresh', { refreshToken: renewed.data.refreshToken }), call('refresh', { refreshToken: renewed.data.refreshToken })]);
  assert.deepEqual(concurrentRefresh.map(r=>r.status).sort(), [200,401], 'Concurrent refresh has one successful consumer');
  const latestRefresh = concurrentRefresh.find(r=>r.status===200).data.refreshToken;
  assert.equal((await call('me', undefined, token.slice(0,-1) + '!')).status, 401, 'Tampered JWT rejected');
  const adminSigned = jwt.sign(claims, process.env.JWT_SECRET, { algorithm: 'HS256' });
  assert.equal((await call('me', undefined, adminSigned)).status, 401, 'Admin signing key cannot authenticate as member');
  const wrongAudience = jwt.sign({ ...claims, aud: 'cms' }, signingKey, { algorithm: 'HS256' });
  assert.equal((await call('me', undefined, wrongAudience)).status, 401);
  assert.equal((await call('refresh', { refreshToken: 'invalid' })).status, 400);

  assert.equal((await call('me', undefined, token)).status, 200);
  const admin = await fetch(`${api}/admin-auth/change-password`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(admin.status, 401, 'Member session cannot authenticate to admin routes');
  const expiredJwt = require('jsonwebtoken').sign({ id: 1 }, process.env.JWT_SECRET, { expiresIn: -1 });
  await redis.set(`token:${expiredJwt}`, JSON.stringify({ id: 1, is_suspended: false }), 'EX', 60);
  const cachedExpired = await fetch(`${api}/profile/me`, { headers: { Authorization: `Bearer ${expiredJwt}` } });
  assert.equal(cachedExpired.status, 401, 'Cached identity cannot bypass JWT expiry');
  await redis.del(`token:${expiredJwt}`);
  await db.execute('UPDATE members SET is_suspended=1 WHERE email=?', [main.email]);
  assert.equal((await call('me', undefined, token)).status, 401);
  await db.execute('UPDATE members SET is_suspended=0 WHERE email=?', [main.email]);
  await cooldown(main.email);
  assert.equal((await call('forgot-password', { email: main.email })).status, 200);
  assert.equal((await call('forgot-password', { email: main.email })).status, 429);
  const recoveryCode = await codeFor(main.email);
  const proof = await call('otp/verify', { email: main.email, purpose: 'recovery', code: recoveryCode });
  assert.equal(proof.status, 200); assert(proof.data.resetToken);
  assert.equal((await call('otp/verify', { email: main.email, purpose: 'recovery', code: recoveryCode })).status, 400);
  const resets = await Promise.all([call('reset-password', { resetToken: proof.data.resetToken, password: 'Newpass123!' }), call('reset-password', { resetToken: proof.data.resetToken, password: 'Newpass123!' })]);
  assert.deepEqual(resets.map(r => r.status).sort(), [200, 400], 'Reset proof has one successful consumer');
  assert.equal((await call('me', undefined, token)).status, 401, 'Reset revokes existing sessions');
  assert.equal((await call('refresh', { refreshToken: latestRefresh })).status, 401, 'Reset revokes refresh credentials');
  assert.equal((await call('login', loginBody)).status, 401);
  const fresh = await call('login', { ...loginBody, password: 'Newpass123!' }); assert.equal(fresh.status, 200);
  assert.equal((await call('logout', {}, fresh.data.token)).status, 200);
  assert.equal((await call('me', undefined, fresh.data.token)).status, 401);
  assert.equal((await call('refresh', { refreshToken: fresh.data.refreshToken })).status, 401, 'Logout revokes refresh credentials');
  const expiredSession = await call('login', { ...loginBody, password: 'Newpass123!' });
  await db.execute('UPDATE member_sessions SET expiresAt=DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE tokenHash=?', [jwt.decode(expiredSession.data.token).sid]);
  assert.equal((await call('me', undefined, expiredSession.data.token)).status, 401);
  assert.equal((await call('refresh', { refreshToken: expiredSession.data.refreshToken })).status, 401, 'Expired refresh session rejected');
  const pending = await register('pending');
  await cooldown(pending.email);
  assert.equal((await call('register', { email: pending.email, name: 'Owner', password: 'Ownerpass123!', agreeTerms: true })).status, 201);
  const latest = await codeFor(pending.email);
  assert.equal((await call('otp/verify', { email: pending.email, purpose: 'registration', password: 'Testpass123!', code: latest })).status, 400, 'Pre-registration password cannot verify a later registration');
  assert.equal((await call('otp/verify', { email: pending.email, purpose: 'registration', password: 'Ownerpass123!', code: latest })).status, 200);
  assert.equal((await call('login', { email: pending.email, password: 'Testpass123!' })).status, 401);
  assert.equal((await call('login', { email: pending.email, password: 'Ownerpass123!' })).status, 200);
  const expired = await register('expired');
  await db.execute('UPDATE member_otps o JOIN members m ON m.id=o.memberId SET o.expiresAt=DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE m.email=?', [expired.email]);
  assert.equal((await call('otp/verify', { email: expired.email, purpose: 'registration', password: 'Testpass123!', code: expired.code })).status, 400);
  const attempts = await register('attempts');
  for (let i=0;i<5;i++) assert.equal((await call('otp/verify', { email: attempts.email, purpose: 'registration', password: 'Testpass123!', code: attempts.code === '0000' ? '0001' : '0000' })).status, 400);
  assert.equal((await call('otp/verify', { email: attempts.email, purpose: 'registration', password: 'Testpass123!', code: attempts.code })).status, 400);
  await cooldown(attempts.email);
  await call('otp/send', { email: attempts.email, purpose: 'registration' });
  const newCode = await codeFor(attempts.email);
  const verifications = await Promise.all([call('otp/verify', { email: attempts.email, purpose: 'registration', password: 'Testpass123!', code: newCode }), call('otp/verify', { email: attempts.email, purpose: 'registration', password: 'Testpass123!', code: newCode })]);
  assert.deepEqual(verifications.map(r => r.status).sort(), [200, 400], 'OTP has one successful consumer');
  const unknown = `auth-test-missing-${Date.now()}@example.test`; emails.push(unknown);
  const unknownResult = await call('forgot-password', { email: unknown }); assert.equal(unknownResult.status, 200);
  await cooldown(main.email);
  const knownResult = await call('forgot-password', { email: main.email }); assert.equal(knownResult.status, 200);
  assert.equal(knownResult.alert.message, unknownResult.alert.message, 'Recovery response does not enumerate accounts');
  const resetExpiry = await call('otp/verify', { email: main.email, purpose: 'recovery', code: await codeFor(main.email) });
  assert.equal(resetExpiry.status, 200);
  await db.execute('UPDATE member_otps SET resetExpiresAt=DATE_SUB(NOW(), INTERVAL 1 MINUTE) WHERE resetHash=?', [digest(resetExpiry.data.resetToken)]);
  assert.equal((await call('reset-password', { resetToken: resetExpiry.data.resetToken, password: 'Otherpass123!' })).status, 400);
  await cooldown(main.email);
  assert.equal((await call('register', { email: main.email, name: 'Duplicate', password: 'Different123!', agreeTerms: true })).status, 201);
  const [duplicates] = await db.execute('SELECT COUNT(*) AS total FROM members WHERE email=?', [main.email]); assert.equal(duplicates[0].total, 1);
  console.log('PASS: one-day JWT, refresh rotation/expiry/concurrency, token revocation, password-bound registration, cached JWT expiry, registration, SMTP OTP, login, recovery/reset, logout, validation, normalization, expiry, attempt/resend limits, replay/concurrency, session revocation, suspension and admin isolation.');
})().catch(error => { console.error(error.message); process.exitCode=1; }).finally(async () => {
  if (db) {
    for (const email of emails) {
      await db.execute('DELETE s FROM member_sessions s JOIN members m ON m.id=s.memberId WHERE m.email=?', [email]);
      await db.execute('DELETE o FROM member_otps o JOIN members m ON m.id=o.memberId WHERE m.email=?', [email]);
      await db.execute('DELETE FROM members WHERE email=?', [email]);
    }
    await db.end();
  }
  if (redis) await redis.quit();
});
