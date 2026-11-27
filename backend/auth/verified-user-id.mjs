export async function deriveAppUserId({verifiedSubject, appId, secretPepper}) {
  // Only call after server-to-server Toss mTLS exchange, never on client-supplied key.
  if (typeof verifiedSubject !== 'string' || !verifiedSubject ||
      typeof appId !== 'string' || !appId ||
      typeof secretPepper !== 'string' || secretPepper.length < 32) {
    throw Error('Verified subject, app scope and strong server secret required');
  }
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secretPepper),
    {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  const value = new TextEncoder().encode('dajeongrok:v1:toss-anonymous:'+appId+':'+verifiedSubject);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, value));
  return 'u_'+Array.from(bytes, n=>n.toString(16).padStart(2,'0')).join('');
}
