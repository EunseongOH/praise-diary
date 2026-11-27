import assert from 'node:assert/strict';
import { test } from 'node:test';
import { makeTossAnonymousBridge } from './toss-anonymous-bridge.mjs';

const origin = 'https://miniapp.example.test';
const request = (body, from = origin) => new Request('https://auth.example.test/v1/auth/toss-anonymous/exchange', {
  method: 'POST', headers: { Origin: from, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
test('verified Toss exchange is required before session issuance and subject never leaks', async () => {
  const seenCodes = [], subjects = [];
  const handler = makeTossAnonymousBridge({
    allowedOrigins: [origin],
    exchangeCodeWithToss: async code => { seenCodes.push(code); return { subject: 'toss-verified-subject' }; },
    issueSession: async x => { subjects.push(x); return { token: 'signed.firebase.custom.token', tokenType: 'firebase_custom_token', expiresAt: '2026-11-27T12:00:00Z' }; },
  });
  const response = await handler(request({ code: 'one-time-auth-code' }));
  assert.equal(response.status, 200);
  const text = await response.text();
  assert.equal(JSON.parse(text).token, 'signed.firebase.custom.token');
  assert.equal(JSON.parse(text).tokenType, 'firebase_custom_token');
  assert.equal(text.includes('toss-verified-subject'), false);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.deepEqual(seenCodes, ['one-time-auth-code']);
  assert.deepEqual(subjects, [{ provider: 'toss_verified_anonymous', subject: 'toss-verified-subject' }]);
});
test('spoofed userId, anonymous key and untrusted origin are rejected without exchange', async () => {
  let exchanged = 0;
  const handler = makeTossAnonymousBridge({
    allowedOrigins: [origin],
    exchangeCodeWithToss: async () => { exchanged++; return { subject: 's' }; },
    issueSession: async () => ({ token: 's', tokenType: 'app_session', expiresAt: 'future' }),
  });
  for (const bad of [{ anonKey: 'other-user' }, { code: 'valid', userId: 'victim' }, { code: '' }]) {
    assert.equal((await handler(request(bad))).status, 400);
  }
  assert.equal((await handler(request({ code: 'valid' }, 'https://evil.example'))).status, 403);
  assert.equal(exchanged, 0);
});
test('failed, missing, replayed or invalid Toss exchange never creates a session', async () => {
  let issued = 0;
  const used = new Set();
  const handler = makeTossAnonymousBridge({
    allowedOrigins: [origin],
    exchangeCodeWithToss: async code => {
      if (used.has(code)) throw Error('replayed');
      used.add(code);
      return code === 'invalid' ? null : { subject: 'verified' };
    },
    issueSession: async () => { issued++; return { token: 'safe', tokenType: 'app_session', expiresAt: 'soon' }; },
  });
  assert.equal((await handler(request({ code: 'invalid' }))).status, 502);
  assert.equal((await handler(request({ code: 'success' }))).status, 200);
  assert.equal((await handler(request({ code: 'success' }))).status, 401);
  assert.equal(issued, 1);
});
test('server refuses to initialize without verified exchange and signed session issuer', () => {
  assert.throws(() => makeTossAnonymousBridge({ allowedOrigins: [origin], issueSession: () => {} }));
  assert.throws(() => makeTossAnonymousBridge({ allowedOrigins: ['http://insecure.example.test'], exchangeCodeWithToss: () => {}, issueSession: () => {} }));
});
