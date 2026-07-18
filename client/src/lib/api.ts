/**
 * REST API service layer.
 *
 * Every method issues an HTTP request to the Flowforge backend (blueprint §6)
 * through the typed `http` wrapper in `@/lib/http`, and returns the exact shapes
 * the UI already consumes. Method signatures and the `Paginated<T>` envelope are
 * unchanged from the former mock layer, so no component needed to change (P8).
 *
 * Auth transport (§4.1–4.2): the access token lives in memory — set here on
 * login/register/google, cleared on logout — while the HttpOnly refresh cookie
 * and the `401 → /auth/refresh → retry` dance are handled inside `@/lib/http`.
 *
 * Known contract drift to close in task 26 (E2E), where the mock's simulation
 * had no real equivalent:
 *   • `loginWithGoogle` needs a Google Identity Services `idToken` from the
 *     sign-in button (not yet wired) — throws a clear error until then.
 *   • `verifyEmail`/`resetPassword` need the single-use token from the emailed
 *     link; the pages must read it from the URL and pass it through.
 *   • `updateProfile` cannot change email server-side; that field is ignored.
 *   • Live-updating views after a mutation returns in task 25 (SignalR +
 *     `useAsyncData` invalidation) — the LocalStorage pub/sub is gone.
 */
import { ApiError, clearAccessToken, http, setAccessToken } from "@/lib/http";
import type {
  ActivityEntry,
  ApiKey,
  Execution,
  Integration,
  LoginSession,
  Notification,
  Preferences,
  PublicUser,
  Settings,
  Template,
  User,
  Variable,
  Workflow,
} from "@/lib/types";
import { initials } from "@/lib/utils";

// Re-exported so existing imports (`import { ApiError } from "@/lib/api"`) keep working.
export { ApiError };

/**
 * No-op retained for import compatibility. The mock seeded LocalStorage on first
 * load; the real backend owns all data, so there is nothing to seed client-side.
 */
export function ensureSeeded() {}

/* --------------------------------------------------------------- list params */
export interface ListParams {
  search?: string;
  status?: string;
  trigger?: string;
  tag?: string;
  owner?: string;
  sort?: string; // e.g. "updatedAt:desc"
  page?: number;
  pageSize?: number;
  includeArchived?: boolean;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** `{ accessToken, user }` envelope returned by login/register/google (§4.2). */
interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  user: PublicUser;
}

/* =============================================================== AUTH */
export const authApi = {
  async login(
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<PublicUser> {
    const res = await http.post<AuthResponse>("/auth/login", {
      email,
      password,
      rememberMe,
    });
    setAccessToken(res.accessToken);
    return res.user;
  },

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<PublicUser> {
    const res = await http.post<AuthResponse>("/auth/register", {
      name,
      email,
      password,
    });
    setAccessToken(res.accessToken);
    return res.user;
  },

  async loginWithGoogle(idToken?: string): Promise<PublicUser> {
    if (!idToken) {
      throw new ApiError(
        "Google sign-in isn't wired up yet — the Google Identity Services button needs to supply an ID token (task 26).",
        { status: 0 },
      );
    }
    const res = await http.post<AuthResponse>("/auth/google", { idToken });
    setAccessToken(res.accessToken);
    return res.user;
  },

  async logout(): Promise<void> {
    try {
      await http.post<void>("/auth/logout", undefined, {
        silentAuthFailure: true,
      });
    } finally {
      // Always drop the in-memory token, even if the server call failed.
      clearAccessToken();
    }
  },

  async currentUser(): Promise<PublicUser | null> {
    try {
      // A fresh page load has no in-memory token; `@/lib/http` will attempt a
      // silent refresh via the cookie. If that fails, treat it as "logged out".
      return await http.get<PublicUser>("/auth/me", {
        silentAuthFailure: true,
      });
    } catch {
      // Best-effort "who am I": any failure (no/expired session, or the backend
      // being unreachable) resolves to "not signed in". This preserves the
      // former mock's non-throwing contract so `AuthProvider` can safely do
      // `currentUser().then(setUser)` without a rejection handler.
      return null;
    }
  },

  async requestPasswordReset(email: string): Promise<{ token: string }> {
    await http.post<void>("/auth/forgot-password", { email });
    // The reset token is emailed, never returned in the body (§4.3). The shape
    // is kept for signature parity; callers don't read `token`.
    return { token: "" };
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await http.post<void>("/auth/reset-password", { token, password });
  },

  async verifyEmail(token?: string): Promise<PublicUser> {
    return http.post<PublicUser>("/auth/verify-email", { token });
  },

  async updateProfile(
    patch: Partial<
      Pick<User, "name" | "email" | "jobTitle" | "company" | "bio">
    >,
  ): Promise<PublicUser> {
    // `email` is intentionally ignored server-side; the rest map to PATCH body.
    return http.patch<PublicUser>("/users/me", patch);
  },

  async changePassword(current: string, next: string): Promise<void> {
    await http.post<void>("/users/me/password", {
      currentPassword: current,
      newPassword: next,
    });
  },
};

/* =============================================================== WORKFLOWS */
export const workflowApi = {
  async list(params: ListParams = {}): Promise<Paginated<Workflow>> {
    return http.get<Paginated<Workflow>>("/workflows", {
      query: {
        search: params.search,
        status: params.status,
        trigger: params.trigger,
        tag: params.tag,
        sort: params.sort,
        page: params.page,
        pageSize: params.pageSize,
        includeArchived: params.includeArchived,
      },
    });
  },

  async listArchived(): Promise<Workflow[]> {
    const res = await http.get<Paginated<Workflow>>("/workflows", {
      query: { status: "archived", includeArchived: true, pageSize: 200 },
    });
    return res.items;
  },

  async get(id: string): Promise<Workflow> {
    return http.get<Workflow>(`/workflows/${id}`);
  },

  async create(partial: Partial<Workflow> = {}): Promise<Workflow> {
    return http.post<Workflow>("/workflows", partial);
  },

  async update(id: string, patch: Partial<Workflow>): Promise<Workflow> {
    return http.put<Workflow>(`/workflows/${id}`, patch);
  },

  async remove(ids: string | string[]): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    await Promise.all(list.map((id) => http.del<void>(`/workflows/${id}`)));
  },

  async duplicate(id: string): Promise<Workflow> {
    return http.post<Workflow>(`/workflows/${id}/duplicate`);
  },

  async setArchived(ids: string | string[], archived: boolean): Promise<void> {
    const list = Array.isArray(ids) ? ids : [ids];
    await Promise.all(
      list.map((id) =>
        http.post<Workflow>(`/workflows/${id}/archive`, { archived }),
      ),
    );
  },

  async toggleFavorite(id: string): Promise<Workflow> {
    return http.post<Workflow>(`/workflows/${id}/favorite`);
  },

  async setStatus(id: string, status: Workflow["status"]): Promise<Workflow> {
    return http.patch<Workflow>(`/workflows/${id}/status`, { status });
  },

  /** Enqueue a run; the returned execution starts `queued`/`running` and its
   *  progress streams over SignalR (wired in task 25). */
  async run(id: string): Promise<Execution> {
    return http.post<Execution>(`/workflows/${id}/run`);
  },
};

/* =============================================================== EXECUTIONS */
export const executionApi = {
  async list(
    params: ListParams & { workflowId?: string } = {},
  ): Promise<Paginated<Execution>> {
    return http.get<Paginated<Execution>>("/executions", {
      query: {
        workflowId: params.workflowId,
        status: params.status,
        trigger: params.trigger,
        search: params.search,
        sort: params.sort,
        page: params.page,
        pageSize: params.pageSize,
      },
    });
  },
  async get(id: string): Promise<Execution> {
    return http.get<Execution>(`/executions/${id}`);
  },
  async recent(n = 5): Promise<Execution[]> {
    return http.get<Execution[]>("/executions/recent", { query: { n } });
  },
};

/* =============================================================== TEMPLATES */
export const templateApi = {
  async list(
    params: { search?: string; category?: string; sort?: string } = {},
  ): Promise<Template[]> {
    return http.get<Template[]>("/templates", {
      query: {
        search: params.search,
        category: params.category,
        sort: params.sort,
      },
    });
  },
  async get(id: string): Promise<Template> {
    return http.get<Template>(`/templates/${id}`);
  },
  async install(id: string): Promise<Workflow> {
    return http.post<Workflow>(`/templates/${id}/install`);
  },
};

/* =============================================================== INTEGRATIONS */
export const integrationApi = {
  async list(): Promise<Integration[]> {
    return http.get<Integration[]>("/integrations");
  },
  async connect(id: string, label: string): Promise<Integration> {
    return http.post<Integration>(`/integrations/${id}/connect`, { label });
  },
  async disconnect(id: string, accountId?: string): Promise<Integration> {
    if (accountId) {
      return http.del<Integration>(`/integrations/${id}/accounts/${accountId}`);
    }
    // No account specified → disconnect every account (mock parity). The backend
    // only removes one account per call, so fetch the list and remove each.
    const list = await http.get<Integration[]>("/integrations");
    const target = list.find((i) => i.id === id);
    if (!target) throw new ApiError("Integration not found", { status: 404 });
    let result = target;
    for (const acc of target.accounts) {
      result = await http.del<Integration>(
        `/integrations/${id}/accounts/${acc.id}`,
      );
    }
    return result;
  },
};

/* =============================================================== VARIABLES */
export const variableApi = {
  async list(
    params: { search?: string; scope?: string } = {},
  ): Promise<Variable[]> {
    return http.get<Variable[]>("/variables", {
      query: { search: params.search, scope: params.scope },
    });
  },
  async create(v: Omit<Variable, "id" | "updatedAt">): Promise<Variable> {
    return http.post<Variable>("/variables", v);
  },
  async update(id: string, patch: Partial<Variable>): Promise<Variable> {
    return http.put<Variable>(`/variables/${id}`, patch);
  },
  async remove(id: string): Promise<void> {
    await http.del<void>(`/variables/${id}`);
  },
};

/* =============================================================== NOTIFICATIONS */
export const notificationApi = {
  async list(
    filter: "all" | "unread" | "archived" = "all",
  ): Promise<Notification[]> {
    return http.get<Notification[]>("/notifications", { query: { filter } });
  },
  async unreadCount(): Promise<number> {
    return http.get<number>("/notifications/unread-count");
  },
  async markRead(id: string, read = true): Promise<void> {
    // The backend exposes only "mark read" — there is no "mark unread" endpoint,
    // so a `read: false` toggle is a client-side no-op.
    if (read) await http.post<void>(`/notifications/${id}/read`);
  },
  async markAllRead(): Promise<void> {
    await http.post<void>("/notifications/read-all");
  },
  async setArchived(id: string, archived: boolean): Promise<void> {
    await http.post<void>(`/notifications/${id}/archive`, { archived });
  },
  async remove(id: string): Promise<void> {
    await http.del<void>(`/notifications/${id}`);
  },
};

/* =============================================================== ACTIVITY */
export const activityApi = {
  async list(
    params: { search?: string; category?: string } = {},
  ): Promise<ActivityEntry[]> {
    return http.get<ActivityEntry[]>("/activity", {
      query: { search: params.search, category: params.category },
    });
  },
  async recent(n = 6): Promise<ActivityEntry[]> {
    return http.get<ActivityEntry[]>("/activity/recent", { query: { n } });
  },
};

/* =============================================================== API KEYS */
export const apiKeyApi = {
  async list(): Promise<ApiKey[]> {
    return http.get<ApiKey[]>("/api-keys");
  },
  async create(
    name: string,
    scopes: string[],
  ): Promise<{ key: ApiKey; secret: string }> {
    return http.post<{ key: ApiKey; secret: string }>("/api-keys", {
      name,
      scopes,
    });
  },
  async revoke(id: string): Promise<void> {
    await http.del<void>(`/api-keys/${id}`);
  },
};

/* =============================================================== SESSIONS */
export const sessionApi = {
  async list(): Promise<LoginSession[]> {
    return http.get<LoginSession[]>("/sessions");
  },
  async revoke(id: string): Promise<void> {
    await http.del<void>(`/sessions/${id}`);
  },
  async revokeOthers(): Promise<void> {
    await http.del<void>("/sessions/others");
  },
};

/* =============================================================== SETTINGS / PREFS */
export const settingsApi = {
  async getPreferences(): Promise<Preferences> {
    return http.get<Preferences>("/me/preferences");
  },
  async updatePreferences(patch: Partial<Preferences>): Promise<Preferences> {
    return http.patch<Preferences>("/me/preferences", patch);
  },
  async getSettings(): Promise<Settings> {
    return http.get<Settings>("/me/settings");
  },
  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    return http.patch<Settings>("/me/settings", patch);
  },
};

/* =============================================================== DASHBOARD STATS */
export interface DashboardStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  failedExecutions: number;
  successRate: number;
  connectedIntegrations: number;
  unreadNotifications: number;
  execToday: number;
  trend: number[]; // last 14 days execution counts
}

export const statsApi = {
  async dashboard(): Promise<DashboardStats> {
    return http.get<DashboardStats>("/dashboard/stats");
  },
};

export const api = {
  auth: authApi,
  workflows: workflowApi,
  executions: executionApi,
  templates: templateApi,
  integrations: integrationApi,
  variables: variableApi,
  notifications: notificationApi,
  activity: activityApi,
  apiKeys: apiKeyApi,
  sessions: sessionApi,
  settings: settingsApi,
  stats: statsApi,
};

export { initials };
