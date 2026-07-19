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
- Continue with Google (OAuth / OIDC) on sign‑in and sign‑up
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
├─ server/    # ASP.NET Core + PostgreSQL backend (see server/docs/backend-architecture.md)
└─ e2e/       # full-stack docker compose + smoke tests
```

---

## Getting started

The frontend talks to the real backend, so you need **both** sides running. Pick one of the two
setups below — Docker for the backend (fastest) or a local `dotnet run` (best for backend work).

### Prerequisites

| Tool | Version | Needed for |
|---|---|---|
| **Node.js** | 20+ (24 tested) | frontend |
| **pnpm** | 10+ | frontend (`corepack enable pnpm`) |
| **.NET SDK** | 10.0 | backend |
| **Docker** + Compose | any recent | Postgres, Redis, integration tests |

PostgreSQL 16 and Redis 7 are used via Docker in both setups; you never install them by hand.

### Option A — backend in Docker (recommended)

Brings up the API, Postgres, and Redis. Migrations are applied and demo templates/integrations are
seeded automatically on startup. Postgres and Redis stay on the internal Docker network, so they
won't collide with anything already using ports 5432/6379.

```bash
# 1. from the repo root — API on http://localhost:8080
docker compose -f e2e/docker-compose.yml up --build -d
curl -s localhost:8080/health          # -> Healthy

# 2. frontend
cd client
pnpm install
cp .env.example .env.local
# then edit .env.local — point it at the compose API (port 8080, not 5289):
#   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1
pnpm dev                               # -> http://localhost:3000
```

Open <http://localhost:3000>, **register an account**, and you're in. (There is no seeded demo
login — user accounts are created through the register page.)

Tear down with `docker compose -f e2e/docker-compose.yml down -v` (`-v` also drops the database).

### Option B — backend from source

```bash
cd server

# 1. Postgres + Redis only (the compose file also builds the API; skip it with --scale)
docker compose -f docker/docker-compose.yml up -d postgres redis

# 2. configuration — copy the template and fill in real values
cp .env.example .env

# 3. .NET does NOT read .env on its own; export it into the environment first
set -a && source .env && set +a       # zsh/bash — values must stay quoted, as in
                                      # the template, or `;` truncates them
dotnet run --project src/AiWorkflow.Api    # -> http://localhost:5289
```

The API applies EF migrations at startup when `Database__MigrateOnStartup=true` (the default in
`.env.example`). To run them manually instead:

```bash
dotnet tool restore                              # installs dotnet-ef 10.0.9
dotnet ef database update -p src/AiWorkflow.Infrastructure -s src/AiWorkflow.Api
```

Then start the frontend with the default base URL (`http://localhost:5289/api/v1`):

```bash
cd client && pnpm install && cp .env.example .env.local && pnpm dev
```

### Configuration

Every environment value is documented with a placeholder in the committed templates — copy them,
never commit the filled-in versions.

| File | Copy to | Key settings |
|---|---|---|
| `server/.env.example` | `server/.env` | `ConnectionStrings__Postgres`, `Jwt__SigningKey` (≥ 32 bytes), `Cors__AllowedOrigins__0`, `Google__ClientId`, `Redis__ConnectionString`, `Cloudinary__Url` |
| `client/.env.example` | `client/.env.local` | `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` |

Redis and Cloudinary are optional: without Redis the API uses an in-memory cache (single instance
only), and file endpoints fail loudly until Cloudinary is configured. `NEXT_PUBLIC_*` values are
inlined at **build** time, so set them before `pnpm build` for each environment.

### Where things are

| URL | What |
|---|---|
| http://localhost:3000 | the app |
| http://localhost:3000/api-docs | Scalar API reference (proxies the backend's live OpenAPI doc) |
| http://localhost:8080/health | health check (`/health/live`, `/health/ready` too) |
| http://localhost:8080/swagger | Swagger UI — **Development environment only** |
| `/hubs/executions` | SignalR hub streaming live execution logs |

## Commands

**Frontend** (from `client/`):

```bash
pnpm dev            # dev server
pnpm build          # production build
pnpm start          # serve the production build
pnpm lint           # Biome check
pnpm format         # Biome format --write
```

**Backend** (from `server/`):

```bash
dotnet build                        # whole solution
dotnet run --project src/AiWorkflow.Api
dotnet test                         # unit + architecture + integration tests
```

Integration tests spin up throwaway Postgres/Redis containers via Testcontainers, so **Docker must
be running** for `dotnet test`.

### End-to-end checks

With the `e2e` stack up (Option A):

```bash
e2e/smoke.sh                        # REST contract smoke -> 19 passed, 0 failed
node client/e2e/signalr-smoke.mjs   # live log streaming -> SIGNALR-STREAM: PASS
```

See `e2e/README.md` for details.

## Troubleshooting

- **`Connection string 'Postgres' is not configured`** — the API can't see your `.env`. Export it
  (`set -a && source .env && set +a`) before `dotnet run`; .NET does not auto-load `.env` files.
- **Connects to the wrong database / host** — an unquoted connection string in `.env` gets truncated
  at the first `;` when sourced. Wrap values containing `;` or spaces in double quotes.
- **Frontend loads but every request fails** — `NEXT_PUBLIC_API_BASE_URL` must include the version
  prefix (`…/api/v1`) and match the port your backend is on (5289 local, 8080 compose). Restart
  `pnpm dev` after changing it.
- **CORS errors** — add your frontend origin to `Cors__AllowedOrigins__0` in `server/.env`.
- **Port 5432 already in use** — use the `e2e` compose file (Option A), which keeps Postgres off the
  host network.
- **"Continue with Google" throws** — it needs a real Google Cloud OAuth client id in both
  `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `Google__ClientId`; the compose placeholders don't work.

## Development notes

- Backend progress and the remaining build order live in **`server/docs/PROGRESS.md`**; the full
  design blueprint is **`server/docs/backend-architecture.md`**.
- Commits follow **Conventional Commits** (`feat(...)`, `fix(...)`, `chore(...)`).
- Frontend linting/formatting is **Biome**, not ESLint/Prettier.
