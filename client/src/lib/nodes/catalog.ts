import type { IconName } from "@/components/ui/icon";
import type { ConfigField, NodeCategoryKey, NodeDefinition } from "@/lib/types";

export interface CategoryMeta {
  key: NodeCategoryKey;
  label: string;
  icon: IconName;
  color: string;
}

export const NODE_CATEGORIES: CategoryMeta[] = [
  { key: "triggers", label: "Triggers", icon: "zap", color: "#f59e0b" },
  { key: "ai", label: "AI", icon: "sparkles", color: "#8b5cf6" },
  {
    key: "documents",
    label: "Documents",
    icon: "file-stack",
    color: "#3b82f6",
  },
  { key: "speech", label: "Speech", icon: "mic", color: "#ec4899" },
  { key: "vision", label: "Vision", icon: "scan", color: "#14b8a6" },
  {
    key: "communication",
    label: "Communication",
    icon: "message-square",
    color: "#22c55e",
  },
  { key: "databases", label: "Databases", icon: "database", color: "#6366f1" },
  { key: "logic", label: "Logic", icon: "git-branch", color: "#f97316" },
  { key: "utilities", label: "Utilities", icon: "wrench", color: "#64748b" },
];

export const CATEGORY_COLOR: Record<NodeCategoryKey, string> =
  Object.fromEntries(NODE_CATEGORIES.map((c) => [c.key, c.color])) as Record<
    NodeCategoryKey,
    string
  >;

const prompt: ConfigField = {
  key: "prompt",
  label: "Prompt",
  type: "textarea",
  placeholder: "You are a helpful assistant...",
  required: true,
};
const provider: ConfigField = {
  key: "provider",
  label: "Provider",
  type: "select",
  defaultValue: "anthropic",
  options: [
    { label: "Anthropic (Claude)", value: "anthropic" },
    { label: "OpenAI (GPT)", value: "openai" },
    { label: "Google (Gemini)", value: "gemini" },
  ],
};
const model: ConfigField = {
  key: "model",
  label: "Model",
  type: "text",
  defaultValue: "claude-opus-4-8",
  helper: "e.g. claude-opus-4-8, gpt-5, gemini-2.5-flash",
};
const temperature: ConfigField = {
  key: "temperature",
  label: "Temperature",
  type: "number",
  defaultValue: 0.7,
  helper: "0 = deterministic, 1 = creative",
};

function def(
  type: string,
  label: string,
  category: NodeCategoryKey,
  icon: IconName,
  description: string,
  inputs: number,
  outputs: number,
  fields: ConfigField[] = [],
): NodeDefinition {
  return {
    type,
    label,
    category,
    icon,
    description,
    inputs,
    outputs,
    color: CATEGORY_COLOR[category],
    fields,
  };
}

export const NODE_DEFINITIONS: NodeDefinition[] = [
  /* Triggers */
  def(
    "trigger.webhook",
    "Webhook",
    "triggers",
    "webhook",
    "Start on an incoming HTTP request",
    0,
    1,
    [
      {
        key: "method",
        label: "Method",
        type: "select",
        defaultValue: "POST",
        options: ["GET", "POST", "PUT", "DELETE"].map((m) => ({
          label: m,
          value: m,
        })),
      },
      {
        key: "path",
        label: "Path",
        type: "text",
        placeholder: "/hooks/order-created",
        required: true,
      },
    ],
  ),
  def(
    "trigger.cron",
    "Schedule",
    "triggers",
    "clock",
    "Run on a recurring schedule",
    0,
    1,
    [
      {
        key: "cron",
        label: "Cron expression",
        type: "text",
        placeholder: "0 9 * * 1-5",
        required: true,
        helper: "Runs at 9am on weekdays",
      },
      { key: "timezone", label: "Timezone", type: "text", defaultValue: "UTC" },
    ],
  ),
  def(
    "trigger.manual",
    "Manual",
    "triggers",
    "play",
    "Trigger the workflow manually",
    0,
    1,
    [],
  ),
  def(
    "trigger.email",
    "Email",
    "triggers",
    "mail",
    "Start when an email arrives",
    0,
    1,
    [
      {
        key: "address",
        label: "Inbox address",
        type: "text",
        placeholder: "flow@inbox.flowforge.app",
      },
    ],
  ),
  def(
    "trigger.api",
    "API",
    "triggers",
    "code",
    "Trigger via the platform API",
    0,
    1,
    [],
  ),

  /* AI */
  def(
    "ai.llm",
    "LLM",
    "ai",
    "sparkles",
    "Generate text with a large language model",
    1,
    1,
    [provider, model, prompt, temperature],
  ),
  def(
    "ai.prompt",
    "Prompt Template",
    "ai",
    "type",
    "Compose a reusable prompt template",
    1,
    1,
    [
      {
        key: "template",
        label: "Template",
        type: "textarea",
        placeholder: "Summarize: {{input}}",
        required: true,
      },
    ],
  ),
  def(
    "ai.agent",
    "AI Agent",
    "ai",
    "bot",
    "Autonomous agent with tools",
    1,
    1,
    [
      model,
      {
        key: "instructions",
        label: "Instructions",
        type: "textarea",
        required: true,
      },
      {
        key: "tools",
        label: "Tools",
        type: "text",
        placeholder: "search, calculator",
      },
    ],
  ),
  def("ai.rag", "RAG", "ai", "brain", "Retrieval-augmented generation", 1, 1, [
    {
      key: "collection",
      label: "Vector collection",
      type: "text",
      required: true,
    },
    { key: "topK", label: "Top K", type: "number", defaultValue: 5 },
  ]),
  def(
    "ai.summarize",
    "Summarization",
    "ai",
    "file-text",
    "Summarize long text",
    1,
    1,
    [
      {
        key: "length",
        label: "Target length",
        type: "select",
        options: ["Short", "Medium", "Detailed"].map((v) => ({
          label: v,
          value: v.toLowerCase(),
        })),
      },
    ],
  ),
  def(
    "ai.translate",
    "Translation",
    "ai",
    "languages",
    "Translate between languages",
    1,
    1,
    [
      {
        key: "target",
        label: "Target language",
        type: "text",
        defaultValue: "Spanish",
        required: true,
      },
    ],
  ),
  def(
    "ai.sentiment",
    "Sentiment Analysis",
    "ai",
    "smile",
    "Detect sentiment in text",
    1,
    1,
    [],
  ),
  def(
    "ai.classify",
    "Classification",
    "ai",
    "tags",
    "Classify text into categories",
    1,
    1,
    [
      {
        key: "labels",
        label: "Labels",
        type: "text",
        placeholder: "billing, support, sales",
        required: true,
      },
    ],
  ),

  /* Documents */
  def(
    "doc.pdf",
    "PDF",
    "documents",
    "file-text",
    "Extract text & data from PDF",
    1,
    1,
    [],
  ),
  def(
    "doc.docx",
    "DOCX",
    "documents",
    "file-text",
    "Read Microsoft Word documents",
    1,
    1,
    [],
  ),
  def(
    "doc.csv",
    "CSV",
    "documents",
    "file-spreadsheet",
    "Parse CSV files into rows",
    1,
    1,
    [
      { key: "delimiter", label: "Delimiter", type: "text", defaultValue: "," },
      {
        key: "header",
        label: "First row is header",
        type: "toggle",
        defaultValue: true,
      },
    ],
  ),
  def(
    "doc.excel",
    "Excel",
    "documents",
    "file-spreadsheet",
    "Read Excel spreadsheets",
    1,
    1,
    [
      {
        key: "sheet",
        label: "Sheet name",
        type: "text",
        placeholder: "Sheet1",
      },
    ],
  ),
  def(
    "doc.ocr",
    "OCR",
    "documents",
    "scan",
    "Extract text from scanned documents",
    1,
    1,
    [],
  ),

  /* Speech */
  def(
    "speech.stt",
    "Speech-to-Text",
    "speech",
    "mic",
    "Transcribe audio to text",
    1,
    1,
    [{ key: "language", label: "Language", type: "text", defaultValue: "en" }],
  ),
  def(
    "speech.tts",
    "Text-to-Speech",
    "speech",
    "volume",
    "Synthesize speech from text",
    1,
    1,
    [
      {
        key: "voice",
        label: "Voice",
        type: "select",
        options: ["Aria", "Orion", "Nova"].map((v) => ({
          label: v,
          value: v.toLowerCase(),
        })),
      },
    ],
  ),

  /* Vision */
  def(
    "vision.analyze",
    "Image Analysis",
    "vision",
    "image",
    "Describe & analyze images",
    1,
    1,
    [],
  ),
  def(
    "vision.ocr",
    "Vision OCR",
    "vision",
    "scan",
    "Read text within images",
    1,
    1,
    [],
  ),
  def(
    "vision.qr",
    "QR Scanner",
    "vision",
    "qr-code",
    "Decode QR codes & barcodes",
    1,
    1,
    [],
  ),

  /* Communication */
  def(
    "comm.gmail",
    "Gmail",
    "communication",
    "mail",
    "Send & read Gmail messages",
    1,
    1,
    [
      { key: "to", label: "To", type: "text", placeholder: "user@example.com" },
      { key: "subject", label: "Subject", type: "text" },
      { key: "body", label: "Body", type: "textarea" },
    ],
  ),
  def(
    "comm.outlook",
    "Outlook",
    "communication",
    "mail",
    "Send & read Outlook mail",
    1,
    1,
    [],
  ),
  def(
    "comm.slack",
    "Slack",
    "communication",
    "message-square",
    "Post messages to Slack",
    1,
    1,
    [
      {
        key: "channel",
        label: "Channel",
        type: "text",
        placeholder: "#general",
        required: true,
      },
      { key: "message", label: "Message", type: "textarea", required: true },
    ],
  ),
  def(
    "comm.discord",
    "Discord",
    "communication",
    "message-square",
    "Send Discord messages",
    1,
    1,
    [],
  ),
  def(
    "comm.telegram",
    "Telegram",
    "communication",
    "send",
    "Send Telegram messages",
    1,
    1,
    [],
  ),
  def(
    "comm.whatsapp",
    "WhatsApp",
    "communication",
    "message-square",
    "Send WhatsApp messages",
    1,
    1,
    [],
  ),

  /* Databases */
  def(
    "db.postgres",
    "PostgreSQL",
    "databases",
    "database",
    "Query a PostgreSQL database",
    1,
    1,
    [
      {
        key: "query",
        label: "SQL query",
        type: "code",
        placeholder: "SELECT * FROM users LIMIT 10;",
        required: true,
      },
    ],
  ),
  def(
    "db.mongo",
    "MongoDB",
    "databases",
    "database",
    "Query a MongoDB collection",
    1,
    1,
    [
      { key: "collection", label: "Collection", type: "text", required: true },
      {
        key: "filter",
        label: "Filter (JSON)",
        type: "json",
        placeholder: '{ "active": true }',
      },
    ],
  ),
  def(
    "db.mysql",
    "MySQL",
    "databases",
    "database",
    "Query a MySQL database",
    1,
    1,
    [{ key: "query", label: "SQL query", type: "code", required: true }],
  ),
  def(
    "db.redis",
    "Redis",
    "databases",
    "database",
    "Read & write Redis keys",
    1,
    1,
    [
      {
        key: "command",
        label: "Command",
        type: "text",
        placeholder: "GET session:123",
      },
    ],
  ),

  /* Logic */
  def("logic.if", "If", "logic", "split", "Branch on a condition", 1, 2, [
    {
      key: "condition",
      label: "Condition",
      type: "text",
      placeholder: "{{status}} == 'paid'",
      required: true,
    },
  ]),
  def(
    "logic.switch",
    "Switch",
    "logic",
    "split",
    "Route to multiple branches",
    1,
    3,
    [{ key: "expression", label: "Expression", type: "text", required: true }],
  ),
  def(
    "logic.loop",
    "Loop",
    "logic",
    "repeat",
    "Iterate over a collection",
    1,
    1,
    [{ key: "items", label: "Items", type: "text", placeholder: "{{orders}}" }],
  ),
  def(
    "logic.merge",
    "Merge",
    "logic",
    "merge",
    "Merge multiple branches",
    2,
    1,
    [],
  ),
  def("logic.delay", "Delay", "logic", "clock", "Wait for a duration", 1, 1, [
    {
      key: "duration",
      label: "Duration (seconds)",
      type: "number",
      defaultValue: 30,
    },
  ]),
  def("logic.retry", "Retry", "logic", "refresh-cw", "Retry on failure", 1, 1, [
    { key: "attempts", label: "Max attempts", type: "number", defaultValue: 3 },
  ]),

  /* Utilities */
  def(
    "util.http",
    "HTTP Request",
    "utilities",
    "globe",
    "Make an HTTP request",
    1,
    1,
    [
      {
        key: "method",
        label: "Method",
        type: "select",
        defaultValue: "GET",
        options: ["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => ({
          label: m,
          value: m,
        })),
      },
      {
        key: "url",
        label: "URL",
        type: "text",
        placeholder: "https://api.example.com",
        required: true,
      },
      { key: "headers", label: "Headers (JSON)", type: "json" },
    ],
  ),
  def(
    "util.json",
    "JSON",
    "utilities",
    "code-json",
    "Parse & transform JSON",
    1,
    1,
    [
      {
        key: "expression",
        label: "JSONPath / expression",
        type: "text",
        placeholder: "$.data.items",
      },
    ],
  ),
  def(
    "util.formatter",
    "Formatter",
    "utilities",
    "type",
    "Format & template strings",
    1,
    1,
    [
      {
        key: "template",
        label: "Template",
        type: "textarea",
        placeholder: "Hello {{name}}",
      },
    ],
  ),
  def(
    "util.regex",
    "Regex",
    "utilities",
    "hash",
    "Match & extract with regex",
    1,
    1,
    [
      {
        key: "pattern",
        label: "Pattern",
        type: "text",
        placeholder: "\\d{3}-\\d{4}",
        required: true,
      },
    ],
  ),
  def(
    "util.date",
    "Date Formatter",
    "utilities",
    "calendar",
    "Parse & format dates",
    1,
    1,
    [
      {
        key: "format",
        label: "Format",
        type: "text",
        defaultValue: "YYYY-MM-DD",
      },
    ],
  ),
];

export const NODE_MAP: Record<string, NodeDefinition> = Object.fromEntries(
  NODE_DEFINITIONS.map((n) => [n.type, n]),
);

export function getNodeDef(type: string): NodeDefinition | undefined {
  return NODE_MAP[type];
}

export function defaultConfig(type: string): Record<string, unknown> {
  const d = getNodeDef(type);
  if (!d) return {};
  const cfg: Record<string, unknown> = {};
  for (const f of d.fields)
    if (f.defaultValue !== undefined) cfg[f.key] = f.defaultValue;
  return cfg;
}
