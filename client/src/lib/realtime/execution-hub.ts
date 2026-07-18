/**
 * Live execution console transport (blueprint §14.3).
 *
 * A single shared SignalR connection to `/hubs/executions`. Callers subscribe to
 * one execution at a time via {@link subscribeToExecution}; the server pushes
 * `executionLog` / `executionNodeRun` / `executionStatus` messages to the
 * `exec-{id}` group the client joins. This replaces the mock's fake streaming.
 *
 * The connection is lazy (built + started on first subscribe), shared across
 * subscribers, and de-multiplexed by execution id so several consoles could run
 * at once. Group membership is re-established after an automatic reconnect.
 */
import * as signalR from "@microsoft/signalr";
import { API_BASE_URL, getAccessToken } from "@/lib/http";
import type { LogEntry, NodeRun } from "@/lib/types";

// The hub is mounted at the API origin, outside the `/api/v1` REST prefix.
const HUB_URL = `${API_BASE_URL.replace(/\/api\/v\d+\/?$/, "")}/hubs/executions`;

export interface ExecutionStreamHandlers {
  onLog?: (entry: LogEntry) => void;
  onNodeRun?: (run: NodeRun) => void;
  /** Raw execution status string from the server (e.g. "running","success","failed"). */
  onStatus?: (status: string) => void;
}

type LogFn = (entry: LogEntry) => void;
type NodeRunFn = (run: NodeRun) => void;
type StatusFn = (status: string) => void;

const logHandlers = new Map<string, Set<LogFn>>();
const nodeRunHandlers = new Map<string, Set<NodeRunFn>>();
const statusHandlers = new Map<string, Set<StatusFn>>();
/** Execution ids we've joined — replayed after a reconnect. */
const joined = new Set<string>();

let connection: signalR.HubConnection | null = null;
let starting: Promise<void> | null = null;

function dispatch<T>(map: Map<string, Set<(v: T) => void>>, id: string, v: T) {
  for (const fn of map.get(String(id)) ?? []) fn(v);
}

function getConnection(): signalR.HubConnection {
  if (connection) return connection;
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL, { accessTokenFactory: () => getAccessToken() ?? "" })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();

  conn.on("executionLog", (id: string, entry: LogEntry) =>
    dispatch(logHandlers, id, entry),
  );
  conn.on("executionNodeRun", (id: string, run: NodeRun) =>
    dispatch(nodeRunHandlers, id, run),
  );
  conn.on("executionStatus", (id: string, status: string) =>
    dispatch(statusHandlers, id, status),
  );

  // Re-join every active group after a dropped connection is restored.
  conn.onreconnected(() => {
    for (const id of joined) conn.invoke("JoinExecution", id).catch(() => {});
  });

  connection = conn;
  return conn;
}

async function ensureStarted(conn: signalR.HubConnection): Promise<void> {
  if (conn.state === signalR.HubConnectionState.Connected) return;
  if (!starting) {
    starting = conn.start().finally(() => {
      starting = null;
    });
  }
  await starting;
}

function addHandler<T>(
  map: Map<string, Set<(v: T) => void>>,
  id: string,
  fn?: (v: T) => void,
) {
  if (!fn) return;
  const key = String(id);
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)?.add(fn);
}

function removeHandler<T>(
  map: Map<string, Set<(v: T) => void>>,
  id: string,
  fn?: (v: T) => void,
) {
  if (!fn) return;
  const key = String(id);
  const set = map.get(key);
  set?.delete(fn);
  if (set && set.size === 0) map.delete(key);
}

/**
 * Subscribe to live updates for one execution. Returns a cleanup function that
 * detaches the handlers and leaves the server group. Safe to call before the
 * connection is up — it starts (or reuses) the shared connection and joins the
 * `exec-{id}` group. Streaming failures are non-fatal (the console just won't
 * live-update); reconcile the final state from `GET /executions/{id}`.
 */
export async function subscribeToExecution(
  executionId: string,
  handlers: ExecutionStreamHandlers,
): Promise<() => void> {
  const id = String(executionId);
  addHandler(logHandlers, id, handlers.onLog);
  addHandler(nodeRunHandlers, id, handlers.onNodeRun);
  addHandler(statusHandlers, id, handlers.onStatus);

  const conn = getConnection();
  try {
    await ensureStarted(conn);
    joined.add(id);
    await conn.invoke("JoinExecution", id);
  } catch {
    // Leave handlers registered so a later reconnect can still deliver.
  }

  let disposed = false;
  return () => {
    if (disposed) return;
    disposed = true;
    removeHandler(logHandlers, id, handlers.onLog);
    removeHandler(nodeRunHandlers, id, handlers.onNodeRun);
    removeHandler(statusHandlers, id, handlers.onStatus);
    joined.delete(id);
    if (conn.state === signalR.HubConnectionState.Connected) {
      conn.invoke("LeaveExecution", id).catch(() => {});
    }
  };
}
