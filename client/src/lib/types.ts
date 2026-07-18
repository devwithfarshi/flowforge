/* =========================================================================
   Domain model — every entity persisted in LocalStorage.
   ========================================================================= */

export type ID = string;
export type ISODate = string;

/* ---- Users & auth ---- */
export type UserRole = "Owner" | "Admin" | "Editor" | "Viewer";

export interface User {
  id: ID;
  name: string;
  email: string;
  password: string; // mock only — never do this in a real app
  role: UserRole;
  avatarColor: string;
  jobTitle?: string;
  company?: string;
  bio?: string;
  emailVerified: boolean;
  createdAt: ISODate;
}

export type PublicUser = Omit<User, "password">;

export interface Session {
  userId: ID;
  token: string;
  createdAt: ISODate;
  rememberMe: boolean;
}

export interface LoginSession {
  id: ID;
  device: string;
  browser: string;
  os: string;
  location: string;
  ip: string;
  lastActive: ISODate;
  current: boolean;
}

/* ---- Workflows ---- */
export type WorkflowStatus =
  | "active"
  | "inactive"
  | "draft"
  | "error"
  | "archived";
export type TriggerType = "webhook" | "cron" | "manual" | "email" | "api";

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: ID;
  type: string; // matches NodeDefinition.type
  name: string;
  description?: string;
  position: NodePosition;
  config: Record<string, unknown>;
  status?: "idle" | "running" | "success" | "error" | "warning";
}

export interface WorkflowEdge {
  id: ID;
  source: ID;
  target: ID;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface WorkflowVariable {
  id: ID;
  key: string;
  value: string;
  secret?: boolean;
}

export interface Workflow {
  id: ID;
  name: string;
  description: string;
  status: WorkflowStatus;
  triggerType: TriggerType;
  tags: string[];
  ownerId: ID;
  ownerName: string;
  favorite: boolean;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  variables: WorkflowVariable[];
  executionCount: number;
  successCount: number;
  failureCount: number;
  lastRunAt: ISODate | null;
  createdAt: ISODate;
  updatedAt: ISODate;
  archivedAt?: ISODate | null;
}

/* ---- Executions ---- */
export type ExecutionStatus =
  | "success"
  | "failed"
  | "running"
  | "queued"
  | "canceled";
export type LogLevel = "info" | "warn" | "error" | "success" | "debug";

export interface LogEntry {
  id: ID;
  ts: ISODate;
  level: LogLevel;
  message: string;
  nodeId?: ID;
  nodeName?: string;
}

export interface NodeRun {
  nodeId: ID;
  nodeName: string;
  nodeType: string;
  status: ExecutionStatus;
  durationMs: number;
  startedAt: ISODate;
  output?: string;
}

export interface Execution {
  id: ID;
  workflowId: ID;
  workflowName: string;
  status: ExecutionStatus;
  trigger: TriggerType;
  triggeredBy: string;
  startedAt: ISODate;
  finishedAt: ISODate | null;
  durationMs: number | null;
  nodeRuns: NodeRun[];
  logs: LogEntry[];
}

/* ---- Templates ---- */
export type Difficulty = "Beginner" | "Intermediate" | "Advanced";

export interface Template {
  id: ID;
  name: string;
  description: string;
  category: string;
  difficulty: Difficulty;
  author: string;
  installs: number;
  rating: number;
  featured: boolean;
  tags: string[];
  nodeCount: number;
  color: string;
  icon: string;
  recentlyUsed?: boolean;
}

/* ---- Integrations ---- */
export type IntegrationStatus = "connected" | "available" | "error";

export interface ConnectedAccount {
  id: ID;
  label: string;
  connectedAt: ISODate;
}

export interface Integration {
  id: ID;
  name: string;
  category: string;
  description: string;
  status: IntegrationStatus;
  color: string;
  icon: string;
  accounts: ConnectedAccount[];
  popular?: boolean;
}

/* ---- Variables ---- */
export type VariableScope = "global" | "environment" | "secret";

export interface Variable {
  id: ID;
  key: string;
  value: string;
  scope: VariableScope;
  environment?: "production" | "staging" | "development";
  description?: string;
  updatedAt: ISODate;
}

/* ---- Notifications ---- */
export type NotificationType =
  | "workflow_completed"
  | "workflow_failed"
  | "integration"
  | "system"
  | "info";

export interface Notification {
  id: ID;
  type: NotificationType;
  title: string;
  message: string;
  ts: ISODate;
  read: boolean;
  archived: boolean;
  href?: string;
}

/* ---- Activity ---- */
export type ActivityCategory =
  | "workflow"
  | "auth"
  | "integration"
  | "variable"
  | "system"
  | "user";

export interface ActivityEntry {
  id: ID;
  actor: string;
  action: string;
  target: string;
  category: ActivityCategory;
  ts: ISODate;
  meta?: string;
}

/* ---- API keys ---- */
export interface ApiKey {
  id: ID;
  name: string;
  prefix: string;
  token: string;
  scopes: string[];
  createdAt: ISODate;
  lastUsedAt: ISODate | null;
}

/* ---- AI providers (bring-your-own-key) ---- */
export type AiProvider = "openai" | "gemini" | "anthropic";

export interface AiProviderInfo {
  provider: AiProvider;
  configured: boolean;
  /** Last 4 chars of the stored key, for masked display. Null when not configured. */
  last4: string | null;
  updatedAt: ISODate | null;
}

/* ---- Settings / preferences ---- */
export type ThemePref = "light" | "dark" | "system";
export type TableDensity = "comfortable" | "compact";
export type ViewMode = "grid" | "list";

export interface Preferences {
  theme: ThemePref;
  sidebarCollapsed: boolean;
  density: TableDensity;
  defaultView: ViewMode;
  language: string;
  accentAnimations: boolean;
}

export interface Settings {
  notifyOnSuccess: boolean;
  notifyOnFailure: boolean;
  notifyOnIntegration: boolean;
  weeklyDigest: boolean;
  twoFactorEnabled: boolean;
}

/* ---- Node catalog (static-ish, but stored so it's extensible) ---- */
export type NodeCategoryKey =
  | "triggers"
  | "ai"
  | "documents"
  | "speech"
  | "vision"
  | "communication"
  | "databases"
  | "logic"
  | "utilities";

export type ConfigFieldType =
  | "text"
  | "textarea"
  | "number"
  | "select"
  | "toggle"
  | "password"
  | "code"
  | "json";

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  options?: { label: string; value: string }[];
  defaultValue?: string | number | boolean;
}

export interface NodeDefinition {
  type: string;
  label: string;
  category: NodeCategoryKey;
  description: string;
  icon: string;
  color: string;
  inputs: number;
  outputs: number;
  fields: ConfigField[];
}

/* ---- Recent searches / misc ---- */
export interface RecentSearch {
  query: string;
  ts: ISODate;
}
