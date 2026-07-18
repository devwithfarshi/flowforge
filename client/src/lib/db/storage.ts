/**
 * LocalStorage-backed persistence with SSR safety + a tiny pub/sub so that
 * components can react to data changes across the app.
 */

export const NS = "ff";

export const KEYS = {
  users: `${NS}.users`,
  session: `${NS}.session`,
  loginSessions: `${NS}.loginSessions`,
  workflows: `${NS}.workflows`,
  executions: `${NS}.executions`,
  templates: `${NS}.templates`,
  integrations: `${NS}.integrations`,
  variables: `${NS}.variables`,
  notifications: `${NS}.notifications`,
  activity: `${NS}.activity`,
  apiKeys: `${NS}.apiKeys`,
  aiProviders: `${NS}.aiProviders`,
  preferences: `${NS}.preferences`,
  settings: `${NS}.settings`,
  favorites: `${NS}.favorites`,
  recentSearches: `${NS}.recentSearches`,
  recentWorkflows: `${NS}.recentWorkflows`,
  theme: `${NS}.theme`,
  seeded: `${NS}.seeded`,
} as const;

export type StorageKey = (typeof KEYS)[keyof typeof KEYS];

const isBrowser = typeof window !== "undefined";

export function read<T>(key: string, fallback: T): T {
  if (!isBrowser) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function write<T>(key: string, value: T): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    emit(key);
  } catch {
    /* quota / serialization errors ignored in mock */
  }
}

export function remove(key: string): void {
  if (!isBrowser) return;
  window.localStorage.removeItem(key);
  emit(key);
}

/* ---- pub/sub ---- */
type Listener = () => void;
const listeners = new Map<string, Set<Listener>>();

function emit(key: string) {
  for (const l of listeners.get(key) ?? []) l();
  for (const l of listeners.get("*") ?? []) l();
}

export function subscribe(key: string, listener: Listener): () => void {
  if (!listeners.has(key)) listeners.set(key, new Set());
  const set = listeners.get(key)!;
  set.add(listener);
  return () => set.delete(listener);
}

/** Cross-tab sync — reflect changes made in other browser tabs. */
if (isBrowser) {
  window.addEventListener("storage", (e) => {
    if (e.key) emit(e.key);
  });
}
