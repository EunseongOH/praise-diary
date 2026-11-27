import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createTossSessionClient } from '../src/data/access/tossSessionClient.ts';
test('Toss WebView sends only one-time code to trusted HTTPS server', async () => {
  let endpoint = '', sent = '';
  const client = createTossSessionClient({
    createAuthCode: async () => 'one-time-code',
    serverUrl: 'https://backend.example.test/v1/auth/toss-anonymous/exchange',
    request: async (url, init) => {
      endpoint = String(url); sent = String(init?.body);
      return new Response(JSON.stringify({ accessToken: 'firebase-signed', expiresAt: 'tomorrow' }), { status: 200 });
    },
  });
  const session = await client();
  assert.equal(endpoint, 'https://backend.example.test/v1/auth/toss-anonymous/exchange');
  assert.deepEqual(JSON.parse(sent), { code: 'one-time-code' });
  assert.equal(session.accessToken, 'firebase-signed');
  assert.equal(sent.includes('anonKey'), false);
});
test('Toss client refuses insecure server and failed auth never pretends success', async () => {
  assert.throws(() => createTossSessionClient({ createAuthCode: async () => 'code', serverUrl: 'http://insecure.example' }));
  await assert.rejects(createTossSessionClient({
    createAuthCode: async () => 'code', serverUrl: 'https://backend.example.test',
    request: async () => new Response(JSON.stringify({ error: 'verification_failed' }), { status: 401 }),
  })(), /사용자 인증/);
});
