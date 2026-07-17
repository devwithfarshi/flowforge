/**
 * In-memory access-token store.
 *
 * Per the auth model (blueprint §4.1) the short-lived JWT access token is kept
 * **in memory only** — never in localStorage/cookies readable by JS — so an XSS
 * payload can't exfiltrate it. The long-lived refresh token lives in an
 * HttpOnly, Secure, SameSite=Strict cookie the browser sends automatically; the
 * client calls `/auth/refresh` (with `credentials:"include"`) to mint a new
 * access token when the current one expires.
 *
 * Because it's in memory, the token is naturally cleared on a full page reload —
 * the app rehydrates the session by calling `/auth/refresh` on startup.
 */

let accessToken: string | null = null;

type Listener = (token: string | null) => void;
const listeners = new Set<Listener>();

export function getAccessToken(): string | null {
  return accessToken;
}

export function setAccessToken(token: string | null): void {
  if (token === accessToken) return;
  accessToken = token;
  for (const fn of listeners) fn(accessToken);
}

export function clearAccessToken(): void {
  setAccessToken(null);
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

/** Subscribe to access-token changes (e.g. to gate UI). Returns an unsubscribe. */
export function onAccessTokenChange(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
