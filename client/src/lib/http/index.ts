/**
 * HTTP transport for the real Flowforge backend (blueprint §6).
 *
 * Public surface used by the rest of the app:
 *   • `http` / `apiFetch`      — the typed fetch wrapper (task 24 wires api.ts to these)
 *   • `ApiError`               — thrown on any non-2xx; the mock throws it too
 *   • access-token store       — in-memory JWT (§4.1)
 *   • `setSessionExpiredHandler` — AuthProvider hook for refresh failure → /login
 */
export {
  API_BASE_URL,
  type ApiFetchOptions,
  apiFetch,
  http,
  type QueryValue,
  setSessionExpiredHandler,
} from "./client";
export { ApiError, type ApiErrorInit, type ProblemDetails } from "./errors";
export {
  clearAccessToken,
  getAccessToken,
  hasAccessToken,
  onAccessTokenChange,
  setAccessToken,
} from "./token-store";
