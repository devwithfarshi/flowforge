/**
 * Mock API service layer.
 *
 * Every method returns a Promise and simulates network latency, so UI code is
 * written exactly as it would be against a real backend. Swapping this file for
 * `fetch` calls later requires no changes in components.
 */
import { seedDatabase } from "@/lib/db/seed";
import { KEYS, read, write } from "@/lib/db/storage";
// The real HTTP transport (blueprint §6). For now only its `ApiError` is used —
// task 24 rewrites the method bodies below to call `http`. Sharing this one
// `ApiError` class keeps the app's `err instanceof ApiError` checks working
// whether a call hits the mock (today) or the real backend (after task 24).
import { ApiError } from "@/lib/http";
import { defaultConfig, getNodeDef } from "@/lib/nodes/catalog";
import type {
  ActivityCategory,
  ActivityEntry,
  ApiKey,
  Execution,
  Integration,
  LogEntry,
  LoginSession,
  NodeRun,
  Notification,
  NotificationType,
  Preferences,
  PublicUser,
  Session,
  Settings,
  Template,
  User,
  Variable,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "@/lib/types";
import { initials, uid } from "@/lib/utils";

/* --------------------------------------------------------------- helpers */
const LATENCY = [90, 260];
function tx<T>(fn: () => T, fixed?: number): Promise<T> {
  const ms = fixed ?? LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0]);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      try {
        resolve(fn());
      } catch (e) {
        reject(e);
      }
    }, ms);
  });
}

// Re-exported so existing imports (`import { ApiError } from "@/lib/api"`) keep working.
export { ApiError };

function coll<T>(key: string): { all: () => T[]; set: (v: T[]) => void } {
  return { all: () => read<T[]>(key, []), set: (v: T[]) => write(key, v) };
}

const AVATAR = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#059669",
  "#d97706",
  "#0891b2",
];

function toPublic(u: User): PublicUser {
  const { password: _pw, ...rest } = u;
  return rest;
}

/* Ensure DB is seeded before any read (client-only). */
export function ensureSeeded() {
  seedDatabase();
}

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

function paginate<T>(items: T[], page = 1, pageSize = 10): Paginated<T> {
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const p = Math.min(Math.max(1, page), totalPages);
  return {
    items: items.slice((p - 1) * pageSize, p * pageSize),
    total,
    page: p,
    pageSize,
    totalPages,
  };
}

function sortBy<T>(items: T[], sort?: string): T[] {
  if (!sort) return items;
  const [field, dir] = sort.split(":");
  const mul = dir === "asc" ? 1 : -1;
  return [...items].sort((a, b) => {
    const av = (a as Record<string, unknown>)[field];
    const bv = (b as Record<string, unknown>)[field];
    if (av == null) return 1;
    if (bv == null) return -1;
    if (typeof av === "string" && typeof bv === "string") {
      // date strings compare correctly lexicographically when ISO
      return av.localeCompare(bv) * mul;
    }
    return ((av as number) - (bv as number)) * mul;
  });
}

/* =============================================================== AUTH */
export const authApi = {
  async login(
    email: string,
    password: string,
    rememberMe = false,
  ): Promise<PublicUser> {
    return tx(() => {
      const user = coll<User>(KEYS.users)
        .all()
        .find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user || user.password !== password)
        throw new ApiError("Invalid email or password");
      const session: Session = {
        userId: user.id,
        token: uid("tok"),
        createdAt: new Date().toISOString(),
        rememberMe,
      };
      write(KEYS.session, session);
      activityApi.log("auth", user.name, "signed in", "from this device");
      return toPublic(user);
    });
  },

  async register(
    name: string,
    email: string,
    password: string,
  ): Promise<PublicUser> {
    return tx(() => {
      const users = coll<User>(KEYS.users).all();
      if (users.some((u) => u.email.toLowerCase() === email.toLowerCase()))
        throw new ApiError("An account with this email already exists");
      const user: User = {
        id: uid("user"),
        name,
        email,
        password,
        role: "Owner",
        avatarColor: AVATAR[users.length % AVATAR.length],
        emailVerified: false,
        createdAt: new Date().toISOString(),
      };
      coll<User>(KEYS.users).set([...users, user]);
      write(KEYS.session, {
        userId: user.id,
        token: uid("tok"),
        createdAt: new Date().toISOString(),
        rememberMe: true,
      } satisfies Session);
      return toPublic(user);
    });
  },

  async loginWithGoogle(): Promise<PublicUser> {
    return tx(() => {
      // Simulated Google OAuth/OIDC: find-or-create the linked account, then start a session.
      const email = "casey.morgan@gmail.com";
      const c = coll<User>(KEYS.users);
      const users = c.all();
      let user = users.find((u) => u.email.toLowerCase() === email);
      if (!user) {
        user = {
          id: uid("user"),
          name: "Casey Morgan",
          email,
          password: "", // OAuth account — no local password
          role: "Owner",
          avatarColor: AVATAR[users.length % AVATAR.length],
          jobTitle: "Product Manager",
          company: "Northwind Labs",
          emailVerified: true,
          createdAt: new Date().toISOString(),
        };
        c.set([...users, user]);
      }
      write(KEYS.session, {
        userId: user.id,
        token: uid("tok"),
        createdAt: new Date().toISOString(),
        rememberMe: true,
      } satisfies Session);
      activityApi.log("auth", user.name, "signed in", "with Google");
      return toPublic(user);
    }, 550);
  },

  async logout(): Promise<void> {
    return tx(() => write(KEYS.session, null), 120);
  },

  async currentUser(): Promise<PublicUser | null> {
    return tx(() => {
      const session = read<Session | null>(KEYS.session, null);
      if (!session) return null;
      const user = coll<User>(KEYS.users)
        .all()
        .find((u) => u.id === session.userId);
      return user ? toPublic(user) : null;
    }, 60);
  },

  async requestPasswordReset(email: string): Promise<{ token: string }> {
    return tx(() => {
      const exists = coll<User>(KEYS.users)
        .all()
        .some((u) => u.email.toLowerCase() === email.toLowerCase());
      // Always resolve (don't leak which emails exist), but return a mock token.
      return { token: exists ? uid("reset") : uid("reset") };
    });
  },

  async resetPassword(email: string, password: string): Promise<void> {
    return tx(() => {
      const c = coll<User>(KEYS.users);
      const users = c.all();
      const idx = users.findIndex(
        (u) => u.email.toLowerCase() === email.toLowerCase(),
      );
      if (idx >= 0) {
        users[idx] = { ...users[idx], password };
        c.set(users);
      }
    });
  },

  async verifyEmail(): Promise<PublicUser> {
    return tx(() => {
      const session = read<Session | null>(KEYS.session, null);
      const c = coll<User>(KEYS.users);
      const users = c.all();
      const idx = users.findIndex((u) => u.id === session?.userId);
      if (idx < 0) throw new ApiError("No active session");
      users[idx] = { ...users[idx], emailVerified: true };
      c.set(users);
      return toPublic(users[idx]);
    });
  },

  async updateProfile(
    patch: Partial<
      Pick<User, "name" | "email" | "jobTitle" | "company" | "bio">
    >,
  ): Promise<PublicUser> {
    return tx(() => {
      const session = read<Session | null>(KEYS.session, null);
      const c = coll<User>(KEYS.users);
      const users = c.all();
      const idx = users.findIndex((u) => u.id === session?.userId);
      if (idx < 0) throw new ApiError("No active session");
      users[idx] = { ...users[idx], ...patch };
      c.set(users);
      return toPublic(users[idx]);
    });
  },

  async changePassword(current: string, next: string): Promise<void> {
    return tx(() => {
      const session = read<Session | null>(KEYS.session, null);
      const c = coll<User>(KEYS.users);
      const users = c.all();
      const idx = users.findIndex((u) => u.id === session?.userId);
      if (idx < 0) throw new ApiError("No active session");
      if (users[idx].password !== current)
        throw new ApiError("Current password is incorrect");
      users[idx] = { ...users[idx], password: next };
      c.set(users);
    });
  },
};

/* =============================================================== WORKFLOWS */
function currentUserSync(): PublicUser {
  const session = read<Session | null>(KEYS.session, null);
  const user = coll<User>(KEYS.users)
    .all()
    .find((u) => u.id === session?.userId);
  if (!user)
    return {
      id: "user_demo",
      name: "Alex Morgan",
      email: "demo@flowforge.app",
      role: "Owner",
      avatarColor: AVATAR[0],
      emailVerified: true,
      createdAt: new Date().toISOString(),
    };
  return toPublic(user);
}

function newWorkflow(partial: Partial<Workflow> = {}): Workflow {
  const me = currentUserSync();
  const nowIso = new Date().toISOString();
  return {
    id: uid("wf"),
    name: "Untitled workflow",
    description: "",
    status: "draft",
    triggerType: "manual",
    tags: [],
    ownerId: me.id,
    ownerName: me.name,
    favorite: false,
    nodes: [],
    edges: [],
    variables: [],
    executionCount: 0,
    successCount: 0,
    failureCount: 0,
    lastRunAt: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    archivedAt: null,
    ...partial,
  };
}

export const workflowApi = {
  async list(params: ListParams = {}): Promise<Paginated<Workflow>> {
    return tx(() => {
      let items = coll<Workflow>(KEYS.workflows).all();
      if (!params.includeArchived)
        items = items.filter((w) => w.status !== "archived");
      if (params.status && params.status !== "all")
        items = items.filter((w) => w.status === params.status);
      if (params.trigger && params.trigger !== "all")
        items = items.filter((w) => w.triggerType === params.trigger);
      if (params.tag && params.tag !== "all")
        items = items.filter((w) => w.tags.includes(params.tag!));
      if (params.owner && params.owner !== "all")
        items = items.filter((w) => w.ownerId === params.owner);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (w) =>
            w.name.toLowerCase().includes(q) ||
            w.description.toLowerCase().includes(q) ||
            w.tags.some((t) => t.includes(q)),
        );
      }
      items = sortBy(items, params.sort ?? "updatedAt:desc");
      return paginate(items, params.page, params.pageSize ?? 12);
    });
  },

  async listArchived(): Promise<Workflow[]> {
    return tx(() =>
      coll<Workflow>(KEYS.workflows)
        .all()
        .filter((w) => w.status === "archived"),
    );
  },

  async get(id: string): Promise<Workflow> {
    return tx(() => {
      const wf = coll<Workflow>(KEYS.workflows)
        .all()
        .find((w) => w.id === id);
      if (!wf) throw new ApiError("Workflow not found");
      return wf;
    });
  },

  async create(partial: Partial<Workflow> = {}): Promise<Workflow> {
    return tx(() => {
      const wf = newWorkflow(partial);
      const c = coll<Workflow>(KEYS.workflows);
      c.set([wf, ...c.all()]);
      activityApi.log(
        "workflow",
        currentUserSync().name,
        "created workflow",
        wf.name,
      );
      return wf;
    });
  },

  async update(id: string, patch: Partial<Workflow>): Promise<Workflow> {
    return tx(() => {
      const c = coll<Workflow>(KEYS.workflows);
      const items = c.all();
      const idx = items.findIndex((w) => w.id === id);
      if (idx < 0) throw new ApiError("Workflow not found");
      items[idx] = {
        ...items[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      c.set(items);
      return items[idx];
    });
  },

  async remove(ids: string | string[]): Promise<void> {
    return tx(() => {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      const c = coll<Workflow>(KEYS.workflows);
      c.set(c.all().filter((w) => !set.has(w.id)));
    });
  },

  async duplicate(id: string): Promise<Workflow> {
    return tx(() => {
      const c = coll<Workflow>(KEYS.workflows);
      const items = c.all();
      const src = items.find((w) => w.id === id);
      if (!src) throw new ApiError("Workflow not found");
      const copy = newWorkflow({
        ...src,
        id: undefined,
        name: `${src.name} (copy)`,
        status: "draft",
        favorite: false,
        executionCount: 0,
        successCount: 0,
        failureCount: 0,
        lastRunAt: null,
      });
      c.set([copy, ...items]);
      activityApi.log(
        "workflow",
        currentUserSync().name,
        "duplicated workflow",
        src.name,
      );
      return copy;
    });
  },

  async setArchived(ids: string | string[], archived: boolean): Promise<void> {
    return tx(() => {
      const set = new Set(Array.isArray(ids) ? ids : [ids]);
      const c = coll<Workflow>(KEYS.workflows);
      c.set(
        c.all().map((w) =>
          set.has(w.id)
            ? {
                ...w,
                status: archived ? "archived" : "inactive",
                archivedAt: archived ? new Date().toISOString() : null,
                updatedAt: new Date().toISOString(),
              }
            : w,
        ),
      );
    });
  },

  async toggleFavorite(id: string): Promise<Workflow> {
    return tx(() => {
      const c = coll<Workflow>(KEYS.workflows);
      const items = c.all();
      const idx = items.findIndex((w) => w.id === id);
      if (idx < 0) throw new ApiError("Workflow not found");
      items[idx] = { ...items[idx], favorite: !items[idx].favorite };
      c.set(items);
      return items[idx];
    });
  },

  async setStatus(id: string, status: Workflow["status"]): Promise<Workflow> {
    return this.update(id, { status });
  },

  /** Simulate an execution run, streaming nothing — returns the finished execution. */
  async run(id: string): Promise<Execution> {
    return tx(() => {
      const c = coll<Workflow>(KEYS.workflows);
      const items = c.all();
      const idx = items.findIndex((w) => w.id === id);
      if (idx < 0) throw new ApiError("Workflow not found");
      const wf = items[idx];
      const exec = simulateExecution(wf);
      // persist execution + bump counters
      const execC = coll<Execution>(KEYS.executions);
      execC.set([exec, ...execC.all()]);
      const success = exec.status === "success";
      items[idx] = {
        ...wf,
        executionCount: wf.executionCount + 1,
        successCount: wf.successCount + (success ? 1 : 0),
        failureCount: wf.failureCount + (success ? 0 : 1),
        lastRunAt: new Date().toISOString(),
      };
      c.set(items);
      notificationApi.push(
        success ? "workflow_completed" : "workflow_failed",
        success ? `${wf.name} completed` : `${wf.name} failed`,
        success
          ? "Run finished successfully."
          : "Run failed — see execution logs.",
      );
      activityApi.log(
        "workflow",
        currentUserSync().name,
        "ran workflow",
        wf.name,
      );
      return exec;
    }, 600);
  },
};

function simulateExecution(wf: Workflow): Execution {
  const startedAt = new Date().toISOString();
  const failNode =
    Math.random() < 0.12
      ? Math.floor(Math.random() * Math.max(1, wf.nodes.length))
      : -1;
  const runs: NodeRun[] = [];
  const logs: LogEntry[] = [];
  let t = Date.now();
  let failed = false;
  const orderedNodes = wf.nodes.length
    ? wf.nodes
    : [
        {
          id: uid("node"),
          type: "trigger.manual",
          name: "Manual",
          position: { x: 0, y: 0 },
          config: {},
        } as WorkflowNode,
      ];
  orderedNodes.forEach((node, i) => {
    if (failed) return;
    const dur = 100 + Math.round(Math.random() * 900);
    const isFail = i === failNode;
    logs.push({
      id: uid("log"),
      ts: new Date(t).toISOString(),
      level: "info",
      message: `Executing "${node.name}"`,
      nodeId: node.id,
      nodeName: node.name,
    });
    if (isFail) {
      logs.push({
        id: uid("log"),
        ts: new Date(t + dur).toISOString(),
        level: "error",
        message: `"${node.name}" failed: request timed out`,
        nodeId: node.id,
        nodeName: node.name,
      });
      runs.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        status: "failed",
        durationMs: dur,
        startedAt: new Date(t).toISOString(),
      });
      failed = true;
    } else {
      logs.push({
        id: uid("log"),
        ts: new Date(t + dur).toISOString(),
        level: "success",
        message: `"${node.name}" completed (${dur}ms)`,
        nodeId: node.id,
        nodeName: node.name,
      });
      runs.push({
        nodeId: node.id,
        nodeName: node.name,
        nodeType: node.type,
        status: "success",
        durationMs: dur,
        startedAt: new Date(t).toISOString(),
        output: `{ "ok": true }`,
      });
    }
    t += dur;
  });
  const durationMs = runs.reduce((a, r) => a + r.durationMs, 0);
  return {
    id: uid("exec"),
    workflowId: wf.id,
    workflowName: wf.name,
    status: failed ? "failed" : "success",
    trigger: wf.triggerType,
    triggeredBy: currentUserSync().name,
    startedAt,
    finishedAt: new Date(Date.now() + durationMs).toISOString(),
    durationMs,
    nodeRuns: runs,
    logs,
  };
}

/* =============================================================== EXECUTIONS */
export const executionApi = {
  async list(
    params: ListParams & { workflowId?: string } = {},
  ): Promise<Paginated<Execution>> {
    return tx(() => {
      let items = coll<Execution>(KEYS.executions).all();
      if (params.workflowId)
        items = items.filter((e) => e.workflowId === params.workflowId);
      if (params.status && params.status !== "all")
        items = items.filter((e) => e.status === params.status);
      if (params.trigger && params.trigger !== "all")
        items = items.filter((e) => e.trigger === params.trigger);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (e) => e.workflowName.toLowerCase().includes(q) || e.id.includes(q),
        );
      }
      items = sortBy(items, params.sort ?? "startedAt:desc");
      return paginate(items, params.page, params.pageSize ?? 15);
    });
  },
  async get(id: string): Promise<Execution> {
    return tx(() => {
      const e = coll<Execution>(KEYS.executions)
        .all()
        .find((x) => x.id === id);
      if (!e) throw new ApiError("Execution not found");
      return e;
    });
  },
  async recent(n = 5): Promise<Execution[]> {
    return tx(() =>
      sortBy(coll<Execution>(KEYS.executions).all(), "startedAt:desc").slice(
        0,
        n,
      ),
    );
  },
};

/* =============================================================== TEMPLATES */
export const templateApi = {
  async list(
    params: { search?: string; category?: string; sort?: string } = {},
  ): Promise<Template[]> {
    return tx(() => {
      let items = coll<Template>(KEYS.templates).all();
      if (params.category && params.category !== "all")
        items = items.filter((t) => t.category === params.category);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.description.toLowerCase().includes(q) ||
            t.tags.some((x) => x.includes(q)),
        );
      }
      if (params.sort === "installs") items = sortBy(items, "installs:desc");
      else if (params.sort === "rating") items = sortBy(items, "rating:desc");
      return items;
    });
  },
  async get(id: string): Promise<Template> {
    return tx(() => {
      const t = coll<Template>(KEYS.templates)
        .all()
        .find((x) => x.id === id);
      if (!t) throw new ApiError("Template not found");
      return t;
    });
  },
  async install(id: string): Promise<Workflow> {
    return tx(() => {
      const t = coll<Template>(KEYS.templates)
        .all()
        .find((x) => x.id === id);
      if (!t) throw new ApiError("Template not found");
      // mark recently used + bump installs
      const tc = coll<Template>(KEYS.templates);
      tc.set(
        tc
          .all()
          .map((x) =>
            x.id === id
              ? { ...x, installs: x.installs + 1, recentlyUsed: true }
              : x,
          ),
      );
      const nodes: WorkflowNode[] = ["trigger.manual", "ai.llm", "comm.slack"]
        .slice(0, t.nodeCount)
        .map((type, i) => ({
          id: uid("node"),
          type,
          name: getNodeDef(type)?.label ?? type,
          position: { x: 120 + i * 240, y: 220 },
          config: defaultConfig(type),
          status: "idle",
        }));
      const edges: WorkflowEdge[] = nodes.slice(1).map((n, i) => ({
        id: uid("edge"),
        source: nodes[i].id,
        target: n.id,
      }));
      const wf = newWorkflow({
        name: t.name,
        description: t.description,
        tags: t.tags,
        status: "draft",
        nodes,
        edges,
      });
      const wc = coll<Workflow>(KEYS.workflows);
      wc.set([wf, ...wc.all()]);
      activityApi.log(
        "workflow",
        currentUserSync().name,
        "installed template",
        t.name,
      );
      return wf;
    });
  },
};

/* =============================================================== INTEGRATIONS */
export const integrationApi = {
  async list(): Promise<Integration[]> {
    return tx(() => coll<Integration>(KEYS.integrations).all());
  },
  async connect(id: string, label: string): Promise<Integration> {
    return tx(() => {
      const c = coll<Integration>(KEYS.integrations);
      const items = c.all();
      const idx = items.findIndex((i) => i.id === id);
      if (idx < 0) throw new ApiError("Integration not found");
      items[idx] = {
        ...items[idx],
        status: "connected",
        accounts: [
          ...items[idx].accounts,
          { id: uid("acc"), label, connectedAt: new Date().toISOString() },
        ],
      };
      c.set(items);
      notificationApi.push(
        "integration",
        `${items[idx].name} connected`,
        `Account "${label}" is now connected.`,
      );
      activityApi.log(
        "integration",
        currentUserSync().name,
        "connected integration",
        items[idx].name,
      );
      return items[idx];
    });
  },
  async disconnect(id: string, accountId?: string): Promise<Integration> {
    return tx(() => {
      const c = coll<Integration>(KEYS.integrations);
      const items = c.all();
      const idx = items.findIndex((i) => i.id === id);
      if (idx < 0) throw new ApiError("Integration not found");
      const accounts = accountId
        ? items[idx].accounts.filter((a) => a.id !== accountId)
        : [];
      items[idx] = {
        ...items[idx],
        accounts,
        status: accounts.length ? "connected" : "available",
      };
      c.set(items);
      return items[idx];
    });
  },
};

/* =============================================================== VARIABLES */
export const variableApi = {
  async list(
    params: { search?: string; scope?: string } = {},
  ): Promise<Variable[]> {
    return tx(() => {
      let items = coll<Variable>(KEYS.variables).all();
      if (params.scope && params.scope !== "all")
        items = items.filter((v) => v.scope === params.scope);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter((v) => v.key.toLowerCase().includes(q));
      }
      return sortBy(items, "updatedAt:desc");
    });
  },
  async create(v: Omit<Variable, "id" | "updatedAt">): Promise<Variable> {
    return tx(() => {
      const item: Variable = {
        ...v,
        id: uid("var"),
        updatedAt: new Date().toISOString(),
      };
      const c = coll<Variable>(KEYS.variables);
      c.set([item, ...c.all()]);
      activityApi.log(
        "variable",
        currentUserSync().name,
        "created variable",
        item.key,
      );
      return item;
    });
  },
  async update(id: string, patch: Partial<Variable>): Promise<Variable> {
    return tx(() => {
      const c = coll<Variable>(KEYS.variables);
      const items = c.all();
      const idx = items.findIndex((v) => v.id === id);
      if (idx < 0) throw new ApiError("Variable not found");
      items[idx] = {
        ...items[idx],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      c.set(items);
      return items[idx];
    });
  },
  async remove(id: string): Promise<void> {
    return tx(() => {
      const c = coll<Variable>(KEYS.variables);
      c.set(c.all().filter((v) => v.id !== id));
    });
  },
};

/* =============================================================== NOTIFICATIONS */
export const notificationApi = {
  async list(
    filter: "all" | "unread" | "archived" = "all",
  ): Promise<Notification[]> {
    return tx(() => {
      let items = coll<Notification>(KEYS.notifications).all();
      if (filter === "unread")
        items = items.filter((n) => !n.read && !n.archived);
      else if (filter === "archived") items = items.filter((n) => n.archived);
      else items = items.filter((n) => !n.archived);
      return sortBy(items, "ts:desc");
    });
  },
  async unreadCount(): Promise<number> {
    return tx(
      () =>
        coll<Notification>(KEYS.notifications)
          .all()
          .filter((n) => !n.read && !n.archived).length,
      40,
    );
  },
  push(type: NotificationType, title: string, message: string): Notification {
    const item: Notification = {
      id: uid("ntf"),
      type,
      title,
      message,
      ts: new Date().toISOString(),
      read: false,
      archived: false,
    };
    const c = coll<Notification>(KEYS.notifications);
    c.set([item, ...c.all()]);
    return item;
  },
  async markRead(id: string, read = true): Promise<void> {
    return tx(() => {
      const c = coll<Notification>(KEYS.notifications);
      c.set(c.all().map((n) => (n.id === id ? { ...n, read } : n)));
    });
  },
  async markAllRead(): Promise<void> {
    return tx(() => {
      const c = coll<Notification>(KEYS.notifications);
      c.set(c.all().map((n) => ({ ...n, read: true })));
    });
  },
  async setArchived(id: string, archived: boolean): Promise<void> {
    return tx(() => {
      const c = coll<Notification>(KEYS.notifications);
      c.set(
        c.all().map((n) => (n.id === id ? { ...n, archived, read: true } : n)),
      );
    });
  },
  async remove(id: string): Promise<void> {
    return tx(() => {
      const c = coll<Notification>(KEYS.notifications);
      c.set(c.all().filter((n) => n.id !== id));
    });
  },
};

/* =============================================================== ACTIVITY */
export const activityApi = {
  async list(
    params: { search?: string; category?: string } = {},
  ): Promise<ActivityEntry[]> {
    return tx(() => {
      let items = coll<ActivityEntry>(KEYS.activity).all();
      if (params.category && params.category !== "all")
        items = items.filter((a) => a.category === params.category);
      if (params.search) {
        const q = params.search.toLowerCase();
        items = items.filter(
          (a) =>
            a.actor.toLowerCase().includes(q) ||
            a.action.toLowerCase().includes(q) ||
            a.target.toLowerCase().includes(q),
        );
      }
      return sortBy(items, "ts:desc");
    });
  },
  log(
    category: ActivityCategory,
    actor: string,
    action: string,
    target: string,
  ) {
    const entry: ActivityEntry = {
      id: uid("act"),
      actor,
      action,
      target,
      category,
      ts: new Date().toISOString(),
    };
    const c = coll<ActivityEntry>(KEYS.activity);
    c.set([entry, ...c.all()].slice(0, 200));
  },
  async recent(n = 6): Promise<ActivityEntry[]> {
    return tx(() =>
      sortBy(coll<ActivityEntry>(KEYS.activity).all(), "ts:desc").slice(0, n),
    );
  },
};

/* =============================================================== API KEYS */
export const apiKeyApi = {
  async list(): Promise<ApiKey[]> {
    return tx(() => sortBy(coll<ApiKey>(KEYS.apiKeys).all(), "createdAt:desc"));
  },
  async create(
    name: string,
    scopes: string[],
  ): Promise<{ key: ApiKey; secret: string }> {
    return tx(() => {
      const secret = `ff_live_${uid("")
        .replace(/[^a-z0-9]/gi, "")
        .slice(0, 28)}`;
      const key: ApiKey = {
        id: uid("key"),
        name,
        prefix: "ff_live_",
        token: `${secret.slice(0, 14)}${"•".repeat(12)}${secret.slice(-4)}`,
        scopes,
        createdAt: new Date().toISOString(),
        lastUsedAt: null,
      };
      const c = coll<ApiKey>(KEYS.apiKeys);
      c.set([key, ...c.all()]);
      return { key, secret };
    });
  },
  async revoke(id: string): Promise<void> {
    return tx(() => {
      const c = coll<ApiKey>(KEYS.apiKeys);
      c.set(c.all().filter((k) => k.id !== id));
    });
  },
};

/* =============================================================== SESSIONS */
export const sessionApi = {
  async list(): Promise<LoginSession[]> {
    return tx(() => coll<LoginSession>(KEYS.loginSessions).all());
  },
  async revoke(id: string): Promise<void> {
    return tx(() => {
      const c = coll<LoginSession>(KEYS.loginSessions);
      c.set(c.all().filter((s) => s.id !== id || s.current));
    });
  },
  async revokeOthers(): Promise<void> {
    return tx(() => {
      const c = coll<LoginSession>(KEYS.loginSessions);
      c.set(c.all().filter((s) => s.current));
    });
  },
};

/* =============================================================== SETTINGS / PREFS */
export const settingsApi = {
  async getPreferences(): Promise<Preferences> {
    return tx(
      () =>
        read<Preferences>(KEYS.preferences, {
          theme: "system",
          sidebarCollapsed: false,
          density: "comfortable",
          defaultView: "grid",
          language: "en",
          accentAnimations: true,
        }),
      40,
    );
  },
  async updatePreferences(patch: Partial<Preferences>): Promise<Preferences> {
    return tx(() => {
      const cur = read<Preferences>(KEYS.preferences, {} as Preferences);
      const next = { ...cur, ...patch };
      write(KEYS.preferences, next);
      return next;
    }, 40);
  },
  async getSettings(): Promise<Settings> {
    return tx(() =>
      read<Settings>(KEYS.settings, {
        notifyOnSuccess: true,
        notifyOnFailure: true,
        notifyOnIntegration: true,
        weeklyDigest: false,
        twoFactorEnabled: false,
      }),
    );
  },
  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    return tx(() => {
      const cur = read<Settings>(KEYS.settings, {} as Settings);
      const next = { ...cur, ...patch };
      write(KEYS.settings, next);
      return next;
    });
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
    return tx(() => {
      const workflows = coll<Workflow>(KEYS.workflows)
        .all()
        .filter((w) => w.status !== "archived");
      const executions = coll<Execution>(KEYS.executions).all();
      const integrations = coll<Integration>(KEYS.integrations).all();
      const failed = executions.filter((e) => e.status === "failed").length;
      const succeeded = executions.filter((e) => e.status === "success").length;
      const totalRuns = workflows.reduce((a, w) => a + w.executionCount, 0);
      const dayMs = 86400_000;
      const trend = Array.from({ length: 14 }, (_, i) => {
        const start = Date.now() - (13 - i) * dayMs;
        return (
          executions.filter((e) => {
            const t = +new Date(e.startedAt);
            return t >= start && t < start + dayMs;
          }).length + Math.round(Math.random() * 6)
        );
      });
      const startToday = new Date();
      startToday.setHours(0, 0, 0, 0);
      const execToday = executions.filter(
        (e) => +new Date(e.startedAt) >= +startToday,
      ).length;
      return {
        totalWorkflows: workflows.length,
        activeWorkflows: workflows.filter((w) => w.status === "active").length,
        totalExecutions: totalRuns,
        failedExecutions: failed,
        successRate:
          succeeded + failed === 0
            ? 100
            : Math.round((succeeded / (succeeded + failed)) * 100),
        connectedIntegrations: integrations.filter(
          (i) => i.status === "connected",
        ).length,
        unreadNotifications: coll<Notification>(KEYS.notifications)
          .all()
          .filter((n) => !n.read && !n.archived).length,
        execToday,
        trend,
      };
    });
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
