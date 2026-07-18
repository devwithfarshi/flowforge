# Full-stack E2E (P8 · task 26)

Verifies the integrated client ↔ backend contract end-to-end: the client's
`api.ts` and SignalR console talk to the real ASP.NET backend + Postgres + Redis.

## 1. Bring up the backend stack

```bash
docker compose -f e2e/docker-compose.yml up --build -d
# waits for Postgres health, then the API migrates on startup and listens on :8080
curl -s localhost:8080/health          # -> Healthy
```

Postgres/Redis stay on the internal docker network (no host ports), so this
won't collide with a local Postgres already using 5432.

## 2. REST smoke (deterministic, no browser)

Exercises the exact endpoints `client/src/lib/api.ts` calls and asserts the
shapes it depends on (`Paginated<T>`, `PublicUser`, `DashboardStats`, the
`{ accessToken, user }` auth envelope + `ff_refresh` cookie rotation), plus a
real run polled to a terminal status and the SignalR negotiate handshake.

```bash
e2e/smoke.sh                            # defaults to http://localhost:8080/api/v1
# -> RESULT: 19 passed, 0 failed
```

## 3. Live-streaming smoke

Connects with the same `@microsoft/signalr` client the builder console uses and
asserts `executionLog` + a terminal `executionStatus` frame arrive. It lives
under `client/` so Node resolves the client's `@microsoft/signalr`:

```bash
node client/e2e/signalr-smoke.mjs      # run from the repo root
# -> SIGNALR-STREAM: PASS
```

## 4. Run the client against it

```bash
cd client
echo 'NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/api/v1' > .env.local
pnpm dev                                # http://localhost:3000
```

Register → dashboard → build a workflow → **Run** streams live logs into the
console. (Password auth, CRUD, run + live logs, and the dashboard are covered by
the smokes above; Google sign-in needs a real GCP OAuth client id — see below.)

## Tear down

```bash
docker compose -f e2e/docker-compose.yml down -v
```

## Known follow-ups (not blocking)

- **Google sign-in** — `loginWithGoogle(idToken)` is wired on the API, but the
  client's "Continue with Google" button still needs the Google Identity
  Services script + a real `NEXT_PUBLIC` client id to obtain the ID token; it
  throws a clear message until then. Not verifiable with the compose placeholder id.
- **`verify-email`** — the page should read the emailed `?token=` from the URL
  (as `reset-password` now does) and pass it to `verifyEmail(token)`.
