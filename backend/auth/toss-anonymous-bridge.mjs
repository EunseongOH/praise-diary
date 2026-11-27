/** Server-only authentication boundary, NOT a deployed or credentialed Toss integration.
 *
 * To assemble in production:
 *   - exchangeCodeWithToss must be implemented via the official server-to-server
 *     Apps-in-Toss anonymous code exchange with mTLS, with certificate secrets
 *     inaccessible to the WebView.
 *   - issueSession must sign a Firebase Custom Token (or issue a verified server
 *     session for a later provider). Never use client getAnonymousKey() as proof.
 *   - enable upstream one-use code validation, rate limiting and origin allowlist.
 * These dependencies are REQUIRED: there is no insecure fallback.
 */
export function makeTossAnonymousBridge({ exchangeCodeWithToss, issueSession, allowedOrigins }) {
  if (typeof exchangeCodeWithToss !== 'function' || typeof issueSession !== 'function' ||
      !Array.isArray(allowedOrigins) || !allowedOrigins.length ||
      allowedOrigins.some(origin => typeof origin !== 'string' || !origin.startsWith('https://'))) {
    throw Error('Verified Toss exchange, signed session issuer and exact HTTPS origins are required');
  }
  const response = (status, payload, origin) => new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      'Vary': 'Origin',
      ...(origin ? { 'Access-Control-Allow-Origin': origin } : {}),
    },
  });
  return async function handle(request) {
    const origin = request.headers.get('Origin');
    if (!origin || !allowedOrigins.includes(origin)) return response(403, { error: 'origin_not_allowed' }, origin);
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '300',
        'Cache-Control': 'no-store',
        'Vary': 'Origin',
      } });
    }
    if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' }, origin);
    if (!(request.headers.get('Content-Type') ?? '').toLowerCase().startsWith('application/json')) {
      return response(415, { error: 'json_required' }, origin);
    }
    const declaredSize = Number(request.headers.get('Content-Length'));
    if (Number.isFinite(declaredSize) && declaredSize > 4096) return response(413, { error: 'request_too_large' }, origin);
    let body;
    try {
      const raw = await request.text();
      if (raw.length > 4096) return response(413, { error: 'request_too_large' }, origin);
      body = JSON.parse(raw);
    } catch { return response(400, { error: 'invalid_request' }, origin); }
    if (!body || Array.isArray(body) || typeof body !== 'object' ||
        Object.keys(body).length !== 1 || typeof body.code !== 'string' ||
        !body.code.trim() || body.code.length > 3500) {
      // Deliberately reject userId/anonKey fields; client-supplied identity is NOT proof.
      return response(400, { error: 'invalid_request' }, origin);
    }
    try {
      const verified = await exchangeCodeWithToss(body.code);
      if (!verified || typeof verified.subject !== 'string' || !verified.subject) {
        return response(502, { error: 'verification_unavailable' }, origin);
      }
      // Never send a raw Toss subject/anonKey to the client.
      const token = await issueSession({ provider: 'toss_verified_anonymous', subject: verified.subject });
      if (!token || typeof token.accessToken !== 'string' || !token.accessToken ||
          typeof token.expiresAt !== 'string') return response(502, { error: 'session_unavailable' }, origin);
      return response(200, { accessToken: token.accessToken, expiresAt: token.expiresAt }, origin);
    } catch {
      // Do not log auth code, mTLS data, raw Toss subject, JWT, or exception contents.
      return response(401, { error: 'verification_failed' }, origin);
    }
  };
}
