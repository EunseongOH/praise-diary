/** Apps-in-Toss client boundary. No Toss SDK dependency is imported into
 * the normal Vite preview; production injects the actual SDK method.
 *
 * Never call getAnonymousKey() for authentication and never persist
 * returned tokens in localStorage, analytics, URL query or logs.
 */
export type AuthCodeProvider = () => Promise<string>;
export type VerifiedSession = { accessToken: string; expiresAt: string };
export type TossSessionClientOptions = {
  createAuthCode: AuthCodeProvider;
  serverUrl: string;
  request?: typeof fetch;
};

export function createTossSessionClient({ createAuthCode, serverUrl, request = fetch }: TossSessionClientOptions) {
  if (!serverUrl.startsWith('https://')) throw Error('The Toss exchange backend must use HTTPS.');
  return async (): Promise<VerifiedSession> => {
    const code = await createAuthCode();
    if (typeof code !== 'string' || !code.trim()) throw Error('Toss authentication code was not issued.');
    const response = await request(serverUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      cache: 'no-store',
      redirect: 'error',
      body: JSON.stringify({ code }),
    });
    if (!response.ok) throw Error('사용자 인증을 완료하지 못했어요. 다시 시도해 주세요.');
    const data: unknown = await response.json();
    if (!data || typeof data !== 'object' || !('accessToken' in data) ||
      typeof data.accessToken !== 'string' || !data.accessToken ||
      !('expiresAt' in data) || typeof data.expiresAt !== 'string') {
      throw Error('인증 서버의 응답이 올바르지 않습니다.');
    }
    return { accessToken: data.accessToken, expiresAt: data.expiresAt };
  };
}
