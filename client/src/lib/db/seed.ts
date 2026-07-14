import { defaultConfig, getNodeDef } from "@/lib/nodes/catalog";
import type {
  ActivityEntry,
  ApiKey,
  Execution,
  Integration,
  LogEntry,
  LoginSession,
  NodeRun,
  Notification,
  Preferences,
  Settings,
  Template,
  User,
  Variable,
  Workflow,
  WorkflowEdge,
  WorkflowNode,
} from "@/lib/types";
import { uid } from "@/lib/utils";
import { KEYS, read, write } from "./storage";

const now = Date.now();
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const ago = (ms: number) => new Date(now - ms).toISOString();

const AVATAR_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#059669",
  "#d97706",
  "#0891b2",
  "#dc2626",
];

/* ---------------------------------------------------------------- users */
const users: User[] = [
  {
    id: "user_demo",
    name: "Alex Morgan",
    email: "demo@flowforge.app",
    password: "demo1234",
    role: "Owner",
    avatarColor: AVATAR_COLORS[0],
    jobTitle: "Automation Lead",
    company: "Northwind Labs",
    bio: "Building reliable AI automations for the ops team.",
    emailVerified: true,
    createdAt: ago(120 * DAY),
  },
  {
    id: "user_jordan",
    name: "Jordan Lee",
    email: "jordan@flowforge.app",
    password: "x",
    role: "Admin",
    avatarColor: AVATAR_COLORS[1],
    emailVerified: true,
    createdAt: ago(90 * DAY),
  },
  {
    id: "user_sam",
    name: "Sam Rivera",
    email: "sam@flowforge.app",
    password: "x",
    role: "Editor",
    avatarColor: AVATAR_COLORS[2],
    emailVerified: true,
    createdAt: ago(60 * DAY),
  },
  {
    id: "user_priya",
    name: "Priya Nair",
    email: "priya@flowforge.app",
    password: "x",
    role: "Editor",
    avatarColor: AVATAR_COLORS[3],
    emailVerified: true,
    createdAt: ago(45 * DAY),
  },
  {
    id: "user_chen",
    name: "Wei Chen",
    email: "wei@flowforge.app",
    password: "x",
    role: "Viewer",
    avatarColor: AVATAR_COLORS[5],
    emailVerified: true,
    createdAt: ago(30 * DAY),
  },
];

function buildNodes(types: string[]): {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
} {
  const nodes: WorkflowNode[] = types.map((type, i) => {
    const d = getNodeDef(type);
    return {
      id: uid("node"),
      type,
      name: d?.label ?? type,
      position: { x: 120 + i * 240, y: 200 + (i % 2 === 0 ? 0 : 80) },
      config: defaultConfig(type),
      status: "idle",
    };
  });
  const edges: WorkflowEdge[] = [];
  for (let i = 0; i < nodes.length - 1; i++) {
    edges.push({
      id: uid("edge"),
      source: nodes[i].id,
      target: nodes[i + 1].id,
    });
  }
  return { nodes, edges };
}

interface WfSeed {
  name: string;
  description: string;
  status: Workflow["status"];
  trigger: Workflow["triggerType"];
  tags: string[];
  owner: User;
  types: string[];
  favorite?: boolean;
  runs: number;
  failRate: number;
  createdDaysAgo: number;
  lastRunHoursAgo: number | null;
}

const wfSeeds: WfSeed[] = [
  {
    name: "Support Ticket Triage",
    description:
      "Classify inbound support emails and route them to the right Slack channel.",
    status: "active",
    trigger: "email",
    tags: ["support", "ai"],
    owner: users[0],
    types: ["trigger.email", "ai.classify", "logic.switch", "comm.slack"],
    favorite: true,
    runs: 1284,
    failRate: 0.04,
    createdDaysAgo: 88,
    lastRunHoursAgo: 2,
  },
  {
    name: "Invoice PDF Extractor",
    description:
      "Extract line items from invoice PDFs and append them to Postgres.",
    status: "active",
    trigger: "webhook",
    tags: ["finance", "documents"],
    owner: users[2],
    types: ["trigger.webhook", "doc.pdf", "ai.summarize", "db.postgres"],
    favorite: true,
    runs: 642,
    failRate: 0.02,
    createdDaysAgo: 64,
    lastRunHoursAgo: 6,
  },
  {
    name: "Daily Standup Digest",
    description:
      "Summarize yesterday's activity and post a digest every morning.",
    status: "active",
    trigger: "cron",
    tags: ["ai", "reporting"],
    owner: users[0],
    types: ["trigger.cron", "db.postgres", "ai.summarize", "comm.slack"],
    runs: 210,
    failRate: 0.0,
    createdDaysAgo: 40,
    lastRunHoursAgo: 20,
  },
  {
    name: "Lead Enrichment Pipeline",
    description: "Enrich new leads via HTTP and score them with an LLM.",
    status: "active",
    trigger: "webhook",
    tags: ["sales", "ai"],
    owner: users[3],
    types: ["trigger.webhook", "util.http", "ai.llm", "db.mongo"],
    favorite: true,
    runs: 3820,
    failRate: 0.07,
    createdDaysAgo: 110,
    lastRunHoursAgo: 1,
  },
  {
    name: "Voicemail Transcriber",
    description: "Transcribe voicemails and notify the on-call engineer.",
    status: "inactive",
    trigger: "webhook",
    tags: ["speech"],
    owner: users[2],
    types: ["trigger.webhook", "speech.stt", "ai.sentiment", "comm.telegram"],
    runs: 95,
    failRate: 0.11,
    createdDaysAgo: 25,
    lastRunHoursAgo: 72,
  },
  {
    name: "Contract Review Assistant",
    description: "Read contracts, flag risky clauses, and email a summary.",
    status: "draft",
    trigger: "manual",
    tags: ["legal", "ai", "documents"],
    owner: users[0],
    types: ["trigger.manual", "doc.docx", "ai.agent", "comm.gmail"],
    runs: 12,
    failRate: 0.0,
    createdDaysAgo: 8,
    lastRunHoursAgo: 48,
  },
  {
    name: "Product Review Sentiment",
    description: "Analyze store reviews and chart sentiment trends.",
    status: "active",
    trigger: "cron",
    tags: ["ai", "analytics"],
    owner: users[3],
    types: ["trigger.cron", "util.http", "ai.sentiment", "db.postgres"],
    runs: 540,
    failRate: 0.03,
    createdDaysAgo: 52,
    lastRunHoursAgo: 12,
  },
  {
    name: "Image Moderation Queue",
    description: "Scan uploaded images and quarantine flagged content.",
    status: "error",
    trigger: "webhook",
    tags: ["vision", "trust-safety"],
    owner: users[2],
    types: ["trigger.webhook", "vision.analyze", "logic.if", "comm.slack"],
    runs: 1760,
    failRate: 0.18,
    createdDaysAgo: 70,
    lastRunHoursAgo: 3,
  },
  {
    name: "Knowledge Base RAG Bot",
    description: "Answer employee questions from the internal wiki.",
    status: "active",
    trigger: "api",
    tags: ["ai", "rag"],
    owner: users[0],
    types: ["trigger.api", "ai.rag", "ai.llm"],
    favorite: true,
    runs: 8930,
    failRate: 0.01,
    createdDaysAgo: 130,
    lastRunHoursAgo: 0.5,
  },
  {
    name: "Weekly Metrics Report",
    description: "Compile weekly KPIs into an Excel file and email leadership.",
    status: "active",
    trigger: "cron",
    tags: ["reporting", "finance"],
    owner: users[3],
    types: ["trigger.cron", "db.mysql", "doc.excel", "comm.outlook"],
    runs: 48,
    failRate: 0.0,
    createdDaysAgo: 20,
    lastRunHoursAgo: 30,
  },
  {
    name: "Onboarding Welcome Flow",
    description: "Greet new signups across email and Slack.",
    status: "inactive",
    trigger: "webhook",
    tags: ["growth"],
    owner: users[2],
    types: ["trigger.webhook", "logic.delay", "comm.gmail", "comm.slack"],
    runs: 305,
    failRate: 0.02,
    createdDaysAgo: 35,
    lastRunHoursAgo: 96,
  },
  {
    name: "Fraud Signal Detector",
    description: "Evaluate transactions and escalate suspicious ones.",
    status: "active",
    trigger: "webhook",
    tags: ["finance", "ai"],
    owner: users[0],
    types: ["trigger.webhook", "ai.classify", "logic.if", "util.http"],
    runs: 12040,
    failRate: 0.05,
    createdDaysAgo: 145,
    lastRunHoursAgo: 0.2,
  },
];

const workflows: Workflow[] = wfSeeds.map((s) => {
  const { nodes, edges } = buildNodes(s.types);
  const failures = Math.round(s.runs * s.failRate);
  return {
    id: uid("wf"),
    name: s.name,
    description: s.description,
    status: s.status,
    triggerType: s.trigger,
    tags: s.tags,
    ownerId: s.owner.id,
    ownerName: s.owner.name,
    favorite: !!s.favorite,
    nodes,
    edges,
    variables: [],
    executionCount: s.runs,
    successCount: s.runs - failures,
    failureCount: failures,
    lastRunAt: s.lastRunHoursAgo == null ? null : ago(s.lastRunHoursAgo * HOUR),
    createdAt: ago(s.createdDaysAgo * DAY),
    updatedAt: ago(Math.floor(s.createdDaysAgo / 2) * DAY),
    archivedAt: null,
  };
});

/* ---------------------------------------------------------------- executions */
const execStatuses: Execution["status"][] = [
  "success",
  "success",
  "success",
  "success",
  "failed",
  "running",
];
function makeLogs(
  wf: Workflow,
  status: Execution["status"],
): { logs: LogEntry[]; runs: NodeRun[] } {
  const logs: LogEntry[] = [];
  const runs: NodeRun[] = [];
  const start = now - Math.random() * 6 * DAY;
  let t = start;
  const failAt =
    status === "failed" ? Math.floor(Math.random() * wf.nodes.length) : -1;
  wf.nodes.forEach((node, i) => {
    const dur = 120 + Math.round(Math.random() * 1800);
    const nodeStatus: NodeRun["status"] =
      i === failAt
        ? "failed"
        : i === failAt + 1 && failAt >= 0
          ? "canceled"
          : status === "running" && i === wf.nodes.length - 1
            ? "running"
            : "success";
    logs.push({
      id: uid("log"),
      ts: new Date(t).toISOString(),
      level: "info",
      message: `Executing node "${node.name}"`,
      nodeId: node.id,
      nodeName: node.name,
    });
    if (nodeStatus === "success")
      logs.push({
        id: uid("log"),
        ts: new Date(t + dur).toISOString(),
        level: "success",
        message: `"${node.name}" completed in ${dur}ms`,
        nodeId: node.id,
        nodeName: node.name,
      });
    if (nodeStatus === "failed")
      logs.push({
        id: uid("log"),
        ts: new Date(t + dur).toISOString(),
        level: "error",
        message: `"${node.name}" failed: upstream timeout after 3 retries`,
        nodeId: node.id,
        nodeName: node.name,
      });
    runs.push({
      nodeId: node.id,
      nodeName: node.name,
      nodeType: node.type,
      status: nodeStatus,
      durationMs: dur,
      startedAt: new Date(t).toISOString(),
      output:
        nodeStatus === "success"
          ? `{ "ok": true, "items": ${Math.round(Math.random() * 40)} }`
          : undefined,
    });
    t += dur;
    if (nodeStatus === "failed") return;
  });
  return { logs, runs };
}

const executions: Execution[] = [];
for (let i = 0; i < 60; i++) {
  const wf = workflows[Math.floor(Math.random() * workflows.length)];
  const status = execStatuses[Math.floor(Math.random() * execStatuses.length)];
  const { logs, runs } = makeLogs(wf, status);
  const startedAt = ago(Math.random() * 7 * DAY);
  const duration = runs.reduce((a, r) => a + r.durationMs, 0);
  executions.push({
    id: uid("exec"),
    workflowId: wf.id,
    workflowName: wf.name,
    status,
    trigger: wf.triggerType,
    triggeredBy:
      status === "running"
        ? "System"
        : users[Math.floor(Math.random() * users.length)].name,
    startedAt,
    finishedAt:
      status === "running"
        ? null
        : new Date(new Date(startedAt).getTime() + duration).toISOString(),
    durationMs: status === "running" ? null : duration,
    nodeRuns: runs,
    logs,
  });
}
executions.sort((a, b) => +new Date(b.startedAt) - +new Date(a.startedAt));

/* ---------------------------------------------------------------- templates */
const templates: Template[] = [
  {
    id: uid("tpl"),
    name: "AI Email Responder",
    description:
      "Auto-draft replies to inbound email using your knowledge base.",
    category: "AI",
    difficulty: "Beginner",
    author: "Flowforge",
    installs: 12400,
    rating: 4.8,
    featured: true,
    tags: ["email", "ai"],
    nodeCount: 4,
    color: "#8b5cf6",
    icon: "mail",
    recentlyUsed: true,
  },
  {
    id: uid("tpl"),
    name: "PDF → Database",
    description: "Turn stacks of PDFs into structured database rows.",
    category: "Documents",
    difficulty: "Intermediate",
    author: "Flowforge",
    installs: 8300,
    rating: 4.6,
    featured: true,
    tags: ["documents", "database"],
    nodeCount: 5,
    color: "#3b82f6",
    icon: "file-stack",
  },
  {
    id: uid("tpl"),
    name: "Slack Standup Bot",
    description: "Collect and summarize daily standups in Slack.",
    category: "Communication",
    difficulty: "Beginner",
    author: "Community",
    installs: 15200,
    rating: 4.9,
    featured: true,
    tags: ["slack", "ai"],
    nodeCount: 4,
    color: "#22c55e",
    icon: "message-square",
    recentlyUsed: true,
  },
  {
    id: uid("tpl"),
    name: "Lead Scoring Engine",
    description: "Score and route new leads with an LLM.",
    category: "AI",
    difficulty: "Advanced",
    author: "Flowforge",
    installs: 5600,
    rating: 4.5,
    featured: false,
    tags: ["sales", "ai"],
    nodeCount: 6,
    color: "#8b5cf6",
    icon: "trending-up",
  },
  {
    id: uid("tpl"),
    name: "Invoice OCR Pipeline",
    description: "Scan invoices and extract totals automatically.",
    category: "Documents",
    difficulty: "Intermediate",
    author: "Community",
    installs: 4100,
    rating: 4.4,
    featured: false,
    tags: ["ocr", "finance"],
    nodeCount: 5,
    color: "#3b82f6",
    icon: "scan",
  },
  {
    id: uid("tpl"),
    name: "Sentiment Dashboard",
    description: "Track review sentiment over time.",
    category: "AI",
    difficulty: "Intermediate",
    author: "Flowforge",
    installs: 3300,
    rating: 4.3,
    featured: false,
    tags: ["analytics", "ai"],
    nodeCount: 4,
    color: "#8b5cf6",
    icon: "smile",
  },
  {
    id: uid("tpl"),
    name: "Webhook to Sheets",
    description: "Append incoming webhook data to a spreadsheet.",
    category: "Utilities",
    difficulty: "Beginner",
    author: "Community",
    installs: 9800,
    rating: 4.7,
    featured: false,
    tags: ["webhook", "utilities"],
    nodeCount: 3,
    color: "#64748b",
    icon: "file-spreadsheet",
  },
  {
    id: uid("tpl"),
    name: "RAG Support Agent",
    description: "Answer support questions from your docs.",
    category: "AI",
    difficulty: "Advanced",
    author: "Flowforge",
    installs: 7200,
    rating: 4.8,
    featured: true,
    tags: ["rag", "support"],
    nodeCount: 3,
    color: "#8b5cf6",
    icon: "brain",
  },
  {
    id: uid("tpl"),
    name: "Meeting Transcriber",
    description: "Transcribe and summarize recorded meetings.",
    category: "Speech",
    difficulty: "Intermediate",
    author: "Community",
    installs: 2900,
    rating: 4.2,
    featured: false,
    tags: ["speech", "ai"],
    nodeCount: 4,
    color: "#ec4899",
    icon: "mic",
  },
  {
    id: uid("tpl"),
    name: "Image Moderation",
    description: "Automatically flag inappropriate images.",
    category: "Vision",
    difficulty: "Advanced",
    author: "Flowforge",
    installs: 3600,
    rating: 4.4,
    featured: false,
    tags: ["vision", "safety"],
    nodeCount: 4,
    color: "#14b8a6",
    icon: "image",
  },
  {
    id: uid("tpl"),
    name: "Daily DB Backup Alert",
    description: "Notify when nightly backups complete or fail.",
    category: "Utilities",
    difficulty: "Beginner",
    author: "Community",
    installs: 5100,
    rating: 4.6,
    featured: false,
    tags: ["cron", "database"],
    nodeCount: 3,
    color: "#64748b",
    icon: "database",
  },
  {
    id: uid("tpl"),
    name: "Multichannel Notifier",
    description: "Broadcast alerts to Slack, email, and Telegram.",
    category: "Communication",
    difficulty: "Beginner",
    author: "Flowforge",
    installs: 6700,
    rating: 4.5,
    featured: false,
    tags: ["notifications"],
    nodeCount: 5,
    color: "#22c55e",
    icon: "send",
  },
];

/* ---------------------------------------------------------------- integrations */
const integrations: Integration[] = [
  {
    id: uid("int"),
    name: "Slack",
    category: "Communication",
    description: "Send messages and alerts to channels.",
    status: "connected",
    color: "#4a154b",
    icon: "message-square",
    accounts: [
      {
        id: uid("acc"),
        label: "Northwind Workspace",
        connectedAt: ago(50 * DAY),
      },
    ],
    popular: true,
  },
  {
    id: uid("int"),
    name: "Gmail",
    category: "Communication",
    description: "Send and read email from Gmail.",
    status: "connected",
    color: "#ea4335",
    icon: "mail",
    accounts: [
      {
        id: uid("acc"),
        label: "alex@northwind.co",
        connectedAt: ago(80 * DAY),
      },
    ],
    popular: true,
  },
  {
    id: uid("int"),
    name: "PostgreSQL",
    category: "Databases",
    description: "Run queries against Postgres.",
    status: "connected",
    color: "#336791",
    icon: "database",
    accounts: [
      {
        id: uid("acc"),
        label: "prod-db (read replica)",
        connectedAt: ago(70 * DAY),
      },
    ],
  },
  {
    id: uid("int"),
    name: "OpenAI",
    category: "AI",
    description: "Access GPT models and embeddings.",
    status: "error",
    color: "#10a37f",
    icon: "sparkles",
    accounts: [
      {
        id: uid("acc"),
        label: "Org key (expired)",
        connectedAt: ago(90 * DAY),
      },
    ],
    popular: true,
  },
  {
    id: uid("int"),
    name: "Anthropic",
    category: "AI",
    description: "Access Claude models.",
    status: "connected",
    color: "#d97757",
    icon: "sparkles",
    accounts: [
      { id: uid("acc"), label: "Northwind org", connectedAt: ago(40 * DAY) },
    ],
    popular: true,
  },
  {
    id: uid("int"),
    name: "Notion",
    category: "Productivity",
    description: "Read and write Notion pages.",
    status: "available",
    color: "#000000",
    icon: "file-text",
    accounts: [],
    popular: true,
  },
  {
    id: uid("int"),
    name: "MongoDB",
    category: "Databases",
    description: "Query MongoDB collections.",
    status: "available",
    color: "#00684a",
    icon: "database",
    accounts: [],
  },
  {
    id: uid("int"),
    name: "Discord",
    category: "Communication",
    description: "Post to Discord channels.",
    status: "available",
    color: "#5865f2",
    icon: "message-square",
    accounts: [],
  },
  {
    id: uid("int"),
    name: "Telegram",
    category: "Communication",
    description: "Send Telegram messages.",
    status: "connected",
    color: "#26a5e4",
    icon: "send",
    accounts: [
      {
        id: uid("acc"),
        label: "@northwind_ops_bot",
        connectedAt: ago(20 * DAY),
      },
    ],
  },
  {
    id: uid("int"),
    name: "Outlook",
    category: "Communication",
    description: "Send and read Outlook mail.",
    status: "available",
    color: "#0078d4",
    icon: "mail",
    accounts: [],
  },
  {
    id: uid("int"),
    name: "Google Sheets",
    category: "Productivity",
    description: "Read and write spreadsheets.",
    status: "available",
    color: "#0f9d58",
    icon: "file-spreadsheet",
    accounts: [],
  },
  {
    id: uid("int"),
    name: "Stripe",
    category: "Finance",
    description: "React to payment events.",
    status: "available",
    color: "#635bff",
    icon: "credit-card",
    accounts: [],
    popular: true,
  },
  {
    id: uid("int"),
    name: "Redis",
    category: "Databases",
    description: "Cache and read keys.",
    status: "available",
    color: "#dc382d",
    icon: "database",
    accounts: [],
  },
  {
    id: uid("int"),
    name: "MySQL",
    category: "Databases",
    description: "Query MySQL databases.",
    status: "connected",
    color: "#00758f",
    icon: "database",
    accounts: [
      { id: uid("acc"), label: "analytics-db", connectedAt: ago(35 * DAY) },
    ],
  },
  {
    id: uid("int"),
    name: "WhatsApp",
    category: "Communication",
    description: "Send WhatsApp messages.",
    status: "available",
    color: "#25d366",
    icon: "message-square",
    accounts: [],
  },
  {
    id: uid("int"),
    name: "AWS S3",
    category: "Storage",
    description: "Read and write objects to buckets.",
    status: "available",
    color: "#ff9900",
    icon: "database",
    accounts: [],
  },
];

/* ---------------------------------------------------------------- variables */
const variables: Variable[] = [
  {
    id: uid("var"),
    key: "SLACK_ALERTS_CHANNEL",
    value: "#ops-alerts",
    scope: "global",
    description: "Default channel for alerts",
    updatedAt: ago(10 * DAY),
  },
  {
    id: uid("var"),
    key: "DEFAULT_MODEL",
    value: "claude-opus-4-8",
    scope: "global",
    description: "LLM used when unspecified",
    updatedAt: ago(5 * DAY),
  },
  {
    id: uid("var"),
    key: "API_BASE_URL",
    value: "https://api.northwind.co",
    scope: "environment",
    environment: "production",
    updatedAt: ago(12 * DAY),
  },
  {
    id: uid("var"),
    key: "API_BASE_URL",
    value: "https://staging.northwind.co",
    scope: "environment",
    environment: "staging",
    updatedAt: ago(12 * DAY),
  },
  {
    id: uid("var"),
    key: "OPENAI_API_KEY",
    value: "sk-live-9f2c8a1b7e4d6f3a0c5b",
    scope: "secret",
    description: "OpenAI production key",
    updatedAt: ago(90 * DAY),
  },
  {
    id: uid("var"),
    key: "ANTHROPIC_API_KEY",
    value: "sk-ant-a1b2c3d4e5f6g7h8i9j0",
    scope: "secret",
    updatedAt: ago(40 * DAY),
  },
  {
    id: uid("var"),
    key: "POSTGRES_URL",
    value: "postgres://prod:••••@db.northwind.co:5432/main",
    scope: "secret",
    updatedAt: ago(70 * DAY),
  },
  {
    id: uid("var"),
    key: "MAX_RETRIES",
    value: "3",
    scope: "global",
    updatedAt: ago(3 * DAY),
  },
  {
    id: uid("var"),
    key: "TIMEZONE",
    value: "America/New_York",
    scope: "environment",
    environment: "production",
    updatedAt: ago(20 * DAY),
  },
];

/* ---------------------------------------------------------------- notifications */
const notifications: Notification[] = [
  {
    id: uid("ntf"),
    type: "workflow_failed",
    title: "Image Moderation Queue failed",
    message: "3 consecutive runs failed with an upstream timeout.",
    ts: ago(2 * HOUR),
    read: false,
    archived: false,
  },
  {
    id: uid("ntf"),
    type: "workflow_completed",
    title: "Weekly Metrics Report completed",
    message: "Report generated and emailed to leadership.",
    ts: ago(6 * HOUR),
    read: false,
    archived: false,
  },
  {
    id: uid("ntf"),
    type: "integration",
    title: "OpenAI connection error",
    message: "Your OpenAI API key appears to have expired.",
    ts: ago(9 * HOUR),
    read: false,
    archived: false,
  },
  {
    id: uid("ntf"),
    type: "workflow_completed",
    title: "Lead Enrichment Pipeline completed",
    message: "Processed 214 new leads.",
    ts: ago(14 * HOUR),
    read: true,
    archived: false,
  },
  {
    id: uid("ntf"),
    type: "system",
    title: "Scheduled maintenance",
    message: "Platform maintenance window on Sunday 02:00–03:00 UTC.",
    ts: ago(1 * DAY),
    read: true,
    archived: false,
  },
  {
    id: uid("ntf"),
    type: "workflow_completed",
    title: "Daily Standup Digest completed",
    message: "Digest posted to #standup.",
    ts: ago(1 * DAY - 4 * HOUR),
    read: true,
    archived: false,
  },
  {
    id: uid("ntf"),
    type: "integration",
    title: "Telegram connected",
    message: "@northwind_ops_bot is now connected.",
    ts: ago(2 * DAY),
    read: true,
    archived: false,
  },
  {
    id: uid("ntf"),
    type: "workflow_failed",
    title: "Voicemail Transcriber failed",
    message: "Speech-to-Text node returned an error.",
    ts: ago(3 * DAY),
    read: true,
    archived: false,
  },
  {
    id: uid("ntf"),
    type: "info",
    title: "New template available",
    message: "Check out the new RAG Support Agent template.",
    ts: ago(4 * DAY),
    read: true,
    archived: false,
  },
];

/* ---------------------------------------------------------------- activity */
const activityActions = [
  {
    actor: "Alex Morgan",
    action: "published workflow",
    target: "Knowledge Base RAG Bot",
    category: "workflow" as const,
  },
  {
    actor: "Sam Rivera",
    action: "edited workflow",
    target: "Invoice PDF Extractor",
    category: "workflow" as const,
  },
  {
    actor: "Priya Nair",
    action: "connected integration",
    target: "MySQL",
    category: "integration" as const,
  },
  {
    actor: "Alex Morgan",
    action: "created variable",
    target: "DEFAULT_MODEL",
    category: "variable" as const,
  },
  {
    actor: "Jordan Lee",
    action: "invited member",
    target: "wei@flowforge.app",
    category: "user" as const,
  },
  {
    actor: "Sam Rivera",
    action: "archived workflow",
    target: "Legacy Import",
    category: "workflow" as const,
  },
  {
    actor: "Alex Morgan",
    action: "signed in",
    target: "from Chrome on macOS",
    category: "auth" as const,
  },
  {
    actor: "Priya Nair",
    action: "ran workflow",
    target: "Weekly Metrics Report",
    category: "workflow" as const,
  },
  {
    actor: "System",
    action: "rotated secret",
    target: "POSTGRES_URL",
    category: "system" as const,
  },
  {
    actor: "Wei Chen",
    action: "viewed execution",
    target: "exec #48213",
    category: "workflow" as const,
  },
  {
    actor: "Alex Morgan",
    action: "duplicated workflow",
    target: "Fraud Signal Detector",
    category: "workflow" as const,
  },
  {
    actor: "Jordan Lee",
    action: "updated settings",
    target: "Notification preferences",
    category: "system" as const,
  },
];
const activity: ActivityEntry[] = activityActions.map((a, i) => ({
  id: uid("act"),
  ...a,
  ts: ago(i * 7 * HOUR + Math.random() * HOUR),
  meta: undefined,
}));

/* ---------------------------------------------------------------- api keys */
const apiKeys: ApiKey[] = [
  {
    id: uid("key"),
    name: "Production API",
    prefix: "ff_live_",
    token: "ff_live_8x2Kd9•••••••••••••••4mQ1",
    scopes: ["workflows:read", "workflows:write", "executions:read"],
    createdAt: ago(60 * DAY),
    lastUsedAt: ago(2 * HOUR),
  },
  {
    id: uid("key"),
    name: "CI Pipeline",
    prefix: "ff_live_",
    token: "ff_live_p0Lz3v•••••••••••••••9nT7",
    scopes: ["workflows:read", "executions:write"],
    createdAt: ago(30 * DAY),
    lastUsedAt: ago(1 * DAY),
  },
  {
    id: uid("key"),
    name: "Local Dev",
    prefix: "ff_test_",
    token: "ff_test_a1B2c3•••••••••••••••Z9y8",
    scopes: ["workflows:read"],
    createdAt: ago(10 * DAY),
    lastUsedAt: null,
  },
];

/* ---------------------------------------------------------------- login sessions */
const loginSessions: LoginSession[] = [
  {
    id: uid("sess"),
    device: "MacBook Pro",
    browser: "Chrome 141",
    os: "macOS 15",
    location: "San Francisco, US",
    ip: "72.14.201.6",
    lastActive: ago(2 * 60_000),
    current: true,
  },
  {
    id: uid("sess"),
    device: "iPhone 16",
    browser: "Safari",
    os: "iOS 19",
    location: "San Francisco, US",
    ip: "72.14.201.9",
    lastActive: ago(5 * HOUR),
    current: false,
  },
  {
    id: uid("sess"),
    device: "Windows PC",
    browser: "Edge 141",
    os: "Windows 11",
    location: "Austin, US",
    ip: "104.28.12.44",
    lastActive: ago(3 * DAY),
    current: false,
  },
];

const preferences: Preferences = {
  theme: "system",
  sidebarCollapsed: false,
  density: "comfortable",
  defaultView: "grid",
  language: "en",
  accentAnimations: true,
};

const settings: Settings = {
  notifyOnSuccess: true,
  notifyOnFailure: true,
  notifyOnIntegration: true,
  weeklyDigest: false,
  twoFactorEnabled: false,
};

/** Seed LocalStorage on first launch (idempotent). */
export function seedDatabase(force = false): void {
  if (!force && read(KEYS.seeded, false)) return;
  write(KEYS.users, users);
  write(KEYS.workflows, workflows);
  write(KEYS.executions, executions);
  write(KEYS.templates, templates);
  write(KEYS.integrations, integrations);
  write(KEYS.variables, variables);
  write(KEYS.notifications, notifications);
  write(KEYS.activity, activity);
  write(KEYS.apiKeys, apiKeys);
  write(KEYS.loginSessions, loginSessions);
  write(KEYS.preferences, preferences);
  write(KEYS.settings, settings);
  write(
    KEYS.favorites,
    workflows.filter((w) => w.favorite).map((w) => w.id),
  );
  write(KEYS.recentSearches, []);
  write(
    KEYS.recentWorkflows,
    workflows.slice(0, 4).map((w) => w.id),
  );
  write(KEYS.seeded, true);
}
