# Flowforge — AI Workflow Automation Platform

Flowforge is an enterprise-grade platform for building, running, and monitoring AI‑powered automations — an n8n/Zapier/Make‑style workflow builder with a visual node editor, an execution engine, and a full operations suite (templates, integrations, secrets, analytics, and audit).

---

## Features

### Visual Workflow Builder
- Infinite, pannable, zoomable canvas with a dot‑grid background
- Drag‑and‑drop nodes from the library onto the canvas
- Click‑to‑connect input/output ports with smooth bezier connection lines
- Move, multi‑select (marquee + shift‑click), copy/paste, and duplicate nodes
- Delete nodes and remove connections
- Undo / redo history and keyboard shortcuts
- Snap‑to‑grid alignment
- Zoom in/out, zoom‑to‑fit, and live zoom percentage
- Auto‑save plus manual save, with a live "saved / saving / unsaved" indicator
- Inline workflow rename and status control
- Per‑node **properties panel**: node name, description, and type‑aware configuration fields with validation
- **Workflow settings** panel: description, trigger type, status, and tags
- **Execution console** docked at the bottom with filterable, streaming logs (all / errors / warnings / success), status, and run duration
- Import / export workflows as JSON

### Node Library (45+ nodes across 9 categories)
| Category | Nodes |
|---|---|
| **Triggers** | Webhook · Schedule (Cron) · Manual · Email · API |
| **AI** | LLM · Prompt Template · AI Agent · RAG · Summarization · Translation · Sentiment Analysis · Classification |
| **Documents** | PDF · DOCX · CSV · Excel · OCR |
| **Speech** | Speech‑to‑Text · Text‑to‑Speech |
| **Vision** | Image Analysis · Vision OCR · QR Scanner |
| **Communication** | Gmail · Outlook · Slack · Discord · Telegram · WhatsApp |
| **Databases** | PostgreSQL · MongoDB · MySQL · Redis |
| **Logic** | If · Switch · Loop · Merge · Delay · Retry |
| **Utilities** | HTTP Request · JSON · Formatter · Regex · Date Formatter |

- Searchable, collapsible categories
- Each node carries an icon, label, description, typed configuration schema, and input/output ports

### Workflow Execution & Monitoring
- Run workflows on demand or via triggers (webhook, cron schedule, manual, email, API)
- Graph‑order execution with per‑node status (idle / running / success / error)
- Extensible node executors with per‑node retries, timeouts, and resilience
- Real‑time log streaming to the builder console during a run
- Node‑by‑node run results with per‑node timing and output

### Workflow Management
- List and grid views with a per‑user default
- Search, filter (status, trigger, tag, owner), and multi‑field sorting
- Pagination
- Bulk actions: archive, delete, export
- Create, duplicate, archive/restore, favorite/unfavorite, and delete
- Rich workflow cards (name, description, status, trigger, tags, owner, run count, last run)
- Workflow **details** page: stats, node overview, recent executions, metadata, and tags
- Import / export

### Executions
- Full execution history with search and filters (status, trigger, workflow)
- Sortable, paginated table (workflow, status, started/finished, duration, trigger, user)
- Execution **detail** page: node timeline, per‑node results and output, and full logs with error highlighting
- Re‑run a previous execution

### Templates Marketplace
- Featured, recently used, and popular templates
- Category filter, search, and sorting (most popular / top rated)
- Template cards with difficulty, rating, install count, node count, and tags
- One‑click **install** that creates a ready‑to‑edit workflow

### Integrations
- App catalog with categories and search
- Filter by All / Connected / Available
- Connect and disconnect accounts, with multiple accounts per integration
- Connection status indicators and "popular" highlights

### Variables & Secrets
- Global, environment‑scoped, and secret variables
- Per‑environment values (production / staging / development)
- Secret masking with reveal toggle and copy‑to‑clipboard
- Create, edit, delete, search, and scope filtering
- Uniqueness per key + scope + environment

### Dashboard & Analytics
- Personalized welcome with time‑aware greeting
- Live statistic cards (total workflows, executions, success rate, failed runs) with sparklines
- Recent workflows and recent executions
- Activity feed, favorites, and quick actions

### Notifications
- Notification center with All / Unread / Archived views
- Types: workflow completed, workflow failed, integration, system, and info
- Mark as read/unread, mark all read, archive/unarchive, and delete
- Unread counter and a topbar notifications menu

### Activity & Audit
- Chronological, grouped audit trail (Today / Yesterday / date)
- Category filters (workflows, integrations, auth, system, user)
- Actor, action, target, and timestamp for every event

### Authentication & User Management
- Login, registration, logout, and "remember me"
- Forgot password, reset password, and email verification
- JWT access tokens with rotating refresh tokens and reuse detection
- Session persistence and protected routes
- Roles (Owner / Admin / Editor / Viewer) and resource‑scoped access

### Settings & Preferences
- **Profile**: name, email, job title, company, bio, and avatar
- **Account**: account info, plan, and workspace data controls
- **Appearance**: light / dark / system theme, table density, default view, and interface animations
- **API keys**: create scoped keys, reveal‑once secret, list, and revoke
- **Security**: change password and two‑factor authentication toggle
- **Sessions**: view active devices, revoke a session, or sign out everywhere else

### API & Platform
- RESTful API (versioned) covering every module, following REST best practices
- API keys with granular scopes for machine‑to‑machine access
- Background jobs and scheduled (cron) triggers
- Real‑time updates via WebSockets for live execution logs
- Redis caching, distributed rate limiting, and idempotency
- Cloudinary‑backed media storage (avatars, exports, node artifacts)
- Structured logging, request correlation, and standardized error responses
- OpenAPI / Swagger documentation
- Health checks and observability (tracing, metrics, logs)

### Design & Experience
- Clean, minimalist, enterprise design system with a neutral palette and single accent
- Full light and dark mode with system preference support
- Global command palette (⌘K / Ctrl‑K) for search and quick navigation
- Collapsible sidebar, breadcrumbs, and responsive layout (desktop, laptop, tablet)
- Reusable component library: buttons, inputs, selects, checkboxes, toggles, tables, cards, modals, drawers, tabs, tooltips, badges, toasts, progress bars, skeleton loaders, pagination, and empty states
- Toast notifications, confirmation dialogs, and inline validation
- Loading, empty, and error states throughout
- Persisted preferences (theme, sidebar state, table density, view mode, recent items, favorites)

---

## Tech stack

- **Frontend** — Next.js 16 (App Router) · React 19 · Tailwind CSS v4 · TypeScript · Biome
- **Backend** — ASP.NET Core (.NET 10) · PostgreSQL · EF Core · Redis · Hangfire · SignalR
- **Media / infra** — Cloudinary · Docker · OpenAPI/Swagger

## Repository structure

```
ai-workflow/
├─ client/    # Next.js frontend (the product UI)
└─ server/    # ASP.NET Core + PostgreSQL backend (see server/docs/backend-architecture.md)
```
