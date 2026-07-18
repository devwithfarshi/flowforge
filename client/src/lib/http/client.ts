/**
 * Typed `fetch` wrapper — the single seam between the frontend and the real
 * Flowforge REST API (blueprint §6). Task 24 rewrites `api.ts`'s method bodies
 * to call these helpers; no UI component imports this module directly.
 *
 * Responsibilities:
 *   • Prefix every path with `NEXT_PUBLIC_API_BASE_URL` (…/api/v1).
 *   • Send/receive JSON; attach the in-memory access token as `Bearer`.
 *   • `credentials:"include"` so the HttpOnly refresh cookie rides along.
 *   • On `401`, transparently `POST /auth/refresh` (once, de-duplicated) and
 *     retry the original request; if refresh fails, clear the token and notify
 *     the app so it can bounce to `/login`.
 *   • Turn any non-2xx into an `ApiError` (problem+json) for the existing
 *     form/toast error handling.
 */
import { ApiError } from "./errors";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
} from "./token-store";

// Referenced literally so Next.js can inline it at build time (a dynamic lookup
// like process.env[key] would NOT be inlined — see the env-variables guide).
const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:5289/api/v1"
).replace(/\/+$/, "");

const REFRESH_PATH = "/auth/refresh";

export type QueryValue = string | number | boolean | null | undefined;

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  /** Request payload. Plain objects are JSON-encoded; `FormData` is sent as-is. */
  body?: unknown;
  /** Query params appended to the path; `null`/`undefined` values are skipped. */
  query?: Record<string, QueryValue>;
  /** Attach the bearer token and refresh-on-401. Default `true`. */
  auth?: boolean;
  /** Return the raw `Response` instead of a parsed body. Default `false`. */
  raw?: boolean;
  /**
   * Don't invoke the session-expired handler if a refresh fails — just throw the
   * 401. Used by bootstrap (`GET /auth/me`) and `logout`, where "no valid
   * session" is expected and must not trigger a redirect. Default `false`.
   */
  silentAuthFailure?: boolean;
}

/* ----------------------------------------------------------- session expiry */

type SessionExpiredHandler = () => void;
let sessionExpiredHandler: SessionExpiredHandler | null = null;

/**
 * Register a callback invoked once when a refresh attempt fails (the session is
 * truly gone). The AuthProvider uses this to clear user state and redirect to
 * `/login`. Returns an unsubscribe.
 */
export function setSessionExpiredHandler(
  fn: SessionExpiredHandler,
): () => void {
  sessionExpiredHandler = fn;
  return () => {
    if (sessionExpiredHandler === fn) sessionExpiredHandler = null;
  };
}

/* ------------------------------------------------------------------ helpers */

function buildUrl(path: string, query?: Record<string, QueryValue>): string {
  const base = path.startsWith("/") ? path : `/${path}`;
  let url = `${API_BASE_URL}${base}`;
  if (query) {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      qs.append(key, String(value));
    }
    const s = qs.toString();
    if (s) url += `${url.includes("?") ? "&" : "?"}${s}`;
  }
  return url;
}

function isPlainJsonBody(body: unknown): boolean {
  return (
    body !== undefined &&
    body !== null &&
    !(body instanceof FormData) &&
    !(body instanceof Blob) &&
    !(body instanceof ArrayBuffer) &&
    typeof body !== "string"
  );
}

function buildRequestInit(
  opts: ApiFetchOptions,
  token: string | null,
): RequestInit {
  const {
    body,
    query: _q,
    auth: _a,
    raw: _r,
    silentAuthFailure: _s,
    headers,
    ...rest
  } = opts;
  const h = new Headers(headers);
  if (!h.has("Accept")) h.set("Accept", "application/json");

  let payload: BodyInit | undefined;
  if (isPlainJsonBody(body)) {
    if (!h.has("Content-Type")) h.set("Content-Type", "application/json");
    payload = JSON.stringify(body);
  } else if (body !== undefined && body !== null) {
    payload = body as BodyInit;
  }

  if (token) h.set("Authorization", `Bearer ${token}`);

  return {
    ...rest,
    headers: h,
    body: payload,
    // Always send/receive the refresh cookie across origins.
    credentials: "include",
  };
}

async function parseBody<T>(res: Response): Promise<T> {
  if (res.status === 204 || res.headers.get("content-length") === "0") {
    return undefined as T;
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("json")) {
    const text = await res.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
  return (await res.text()) as unknown as T;
}

/* ----------------------------------------------------- single-flight refresh */

let refreshInFlight: Promise<boolean> | null = null;

function refreshAccessToken(): Promise<boolean> {
  // Collapse concurrent 401s into one refresh call so we don't rotate the
  // refresh-token family multiple times (which would trip reuse detection).
  if (!refreshInFlight) {
    refreshInFlight = performRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

async function performRefresh(): Promise<boolean> {
  try {
    const res = await fetch(buildUrl(REFRESH_PATH), {
      method: "POST",
      credentials: "include",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      clearAccessToken();
      return false;
    }
    const data = (await res.json()) as { accessToken?: string };
    if (!data.accessToken) {
      clearAccessToken();
      return false;
    }
    setAccessToken(data.accessToken);
    return true;
  } catch {
    clearAccessToken();
    return false;
  }
}

/* -------------------------------------------------------------- core request */

/**
 * Perform an API request and return the parsed JSON body typed as `T`.
 * Throws `ApiError` on any non-2xx response or transport failure.
 */
export async function apiFetch<T>(
  path: string,
  opts: ApiFetchOptions = {},
): Promise<T> {
  const useAuth = opts.auth !== false;
  const url = buildUrl(path, opts.query);

  let res: Response;
  try {
    res = await fetch(
      url,
      buildRequestInit(opts, useAuth ? getAccessToken() : null),
    );
  } catch {
    throw new ApiError(
      "Network error — could not reach the server. Check your connection and try again.",
      { status: 0 },
    );
  }

  // Transparently refresh once on 401 (never for the refresh call itself).
  const isRefreshCall = path.replace(/\?.*$/, "").endsWith(REFRESH_PATH);
  if (res.status === 401 && useAuth && !isRefreshCall) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      try {
        res = await fetch(url, buildRequestInit(opts, getAccessToken()));
      } catch {
        throw new ApiError(
          "Network error — could not reach the server. Check your connection and try again.",
          { status: 0 },
        );
      }
    } else if (!opts.silentAuthFailure) {
      // Session is gone — let the app react (clear user, redirect to /login).
      // Suppressed for bootstrap/logout, where a failed refresh is expected.
      sessionExpiredHandler?.();
    }
  }

  if (opts.raw) {
    if (!res.ok) throw await ApiError.fromResponse(res);
    return res as unknown as T;
  }

  if (!res.ok) throw await ApiError.fromResponse(res);
  return parseBody<T>(res);
}

/* --------------------------------------------------------- verb conveniences */

type BodyOpts = Omit<ApiFetchOptions, "body" | "method">;

export const http = {
  get: <T>(path: string, opts?: Omit<ApiFetchOptions, "body" | "method">) =>
    apiFetch<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, body?: unknown, opts?: BodyOpts) =>
    apiFetch<T>(path, { ...opts, method: "POST", body }),
  put: <T>(path: string, body?: unknown, opts?: BodyOpts) =>
    apiFetch<T>(path, { ...opts, method: "PUT", body }),
  patch: <T>(path: string, body?: unknown, opts?: BodyOpts) =>
    apiFetch<T>(path, { ...opts, method: "PATCH", body }),
  del: <T>(path: string, opts?: BodyOpts) =>
    apiFetch<T>(path, { ...opts, method: "DELETE" }),
};

export { API_BASE_URL };
