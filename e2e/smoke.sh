#!/usr/bin/env bash
# Full-stack REST smoke (P8 · task 26). Exercises the exact endpoints the client's
# api.ts calls and asserts the shapes it depends on. Deterministic; no browser.
#
#   e2e/smoke.sh [BASE_URL] [ORIGIN]
#   e2e/smoke.sh http://localhost:8080/api/v1 http://localhost:3000
#
# Exit code = number of failed checks (0 = all passed). Needs: curl, jq.
set -u
BASE="${1:-http://localhost:8080/api/v1}"
ORIGIN="${2:-http://localhost:3000}"
JAR="$(mktemp)"
EMAIL="e2e+$(date +%s)@flowforge.test"
PASS=0
FAIL=0
ok() { echo "  PASS: $1"; PASS=$((PASS + 1)); }
bad() { echo "  FAIL: $1"; FAIL=$((FAIL + 1)); }

echo "== 1. register ($EMAIL) =="
REG=$(curl -s -c "$JAR" -H 'Content-Type: application/json' -H "Origin: $ORIGIN" \
  -d "{\"name\":\"E2E Tester\",\"email\":\"$EMAIL\",\"password\":\"Sup3rSecret!\"}" \
  -w '\n%{http_code}' "$BASE/auth/register")
CODE=$(echo "$REG" | tail -1)
BODY=$(echo "$REG" | sed '$d')
[ "$CODE" = "201" ] && ok "register 201" || bad "register got $CODE"
ACCESS=$(echo "$BODY" | jq -r '.accessToken // empty')
[ -n "$ACCESS" ] && ok "accessToken present" || bad "no accessToken"
echo "$BODY" | jq -e '.user | .id and .email and .role and (.emailVerified!=null)' >/dev/null \
  && ok "user matches PublicUser shape" || bad "user shape mismatch"
grep -qi 'ff_refresh' "$JAR" && ok "ff_refresh cookie set" || bad "no refresh cookie"
UID_=$(echo "$BODY" | jq -r '.user.id')

echo "== 2. GET /auth/me (bearer) =="
ME=$(curl -s -H "Authorization: Bearer $ACCESS" -w '\n%{http_code}' "$BASE/auth/me")
[ "$(echo "$ME" | tail -1)" = "200" ] && ok "me 200" || bad "me $(echo "$ME" | tail -1)"
[ "$(echo "$ME" | sed '$d' | jq -r '.id')" = "$UID_" ] && ok "me is same user" || bad "me user mismatch"

echo "== 3. POST /auth/refresh (cookie rotation) =="
REF=$(curl -s -b "$JAR" -c "$JAR" -X POST -H "Origin: $ORIGIN" -w '\n%{http_code}' "$BASE/auth/refresh")
[ "$(echo "$REF" | tail -1)" = "200" ] && ok "refresh 200" || bad "refresh $(echo "$REF" | tail -1)"
ACCESS=$(echo "$REF" | sed '$d' | jq -r '.accessToken // empty')
[ -n "$ACCESS" ] && ok "rotated accessToken" || bad "no rotated token"
AUTH=(-H "Authorization: Bearer $ACCESS")

echo "== 4. create workflow =="
WF=$(curl -s "${AUTH[@]}" -H 'Content-Type: application/json' \
  -d '{"name":"E2E Flow","description":"created by e2e","triggerType":"manual","tags":["e2e"]}' \
  -w '\n%{http_code}' "$BASE/workflows")
[ "$(echo "$WF" | tail -1)" = "201" ] && ok "workflow 201" || bad "workflow $(echo "$WF" | tail -1)"
WFID=$(echo "$WF" | sed '$d' | jq -r '.id')
[ -n "$WFID" ] && ok "workflow id=$WFID" || bad "no workflow id"

echo "== 5. list workflows (Paginated<T> shape) =="
LIST=$(curl -s "${AUTH[@]}" "$BASE/workflows?page=1&pageSize=12&sort=updatedAt:desc")
echo "$LIST" | jq -e 'has("items") and has("total") and has("page") and has("pageSize") and has("totalPages")' >/dev/null \
  && ok "Paginated<T> envelope" || bad "envelope mismatch"
echo "$LIST" | jq -e --arg id "$WFID" '.items|map(.id)|index($id)!=null' >/dev/null \
  && ok "created workflow in list" || bad "created workflow missing from list"

echo "== 6. run workflow (queued) =="
RUN=$(curl -s "${AUTH[@]}" -X POST -w '\n%{http_code}' "$BASE/workflows/$WFID/run")
RCODE=$(echo "$RUN" | tail -1)
{ [ "$RCODE" = "202" ] || [ "$RCODE" = "200" ]; } && ok "run $RCODE" || bad "run $RCODE"
EXID=$(echo "$RUN" | sed '$d' | jq -r '.id')

echo "== 7. poll execution until terminal =="
FINAL=""
LOGN=0
for _ in $(seq 1 30); do
  EX=$(curl -s "${AUTH[@]}" "$BASE/executions/$EXID")
  FINAL=$(echo "$EX" | jq -r '.status')
  LOGN=$(echo "$EX" | jq -r '.logs|length')
  case "$FINAL" in success | failed) break ;; esac
  sleep 1
done
echo "     terminal status=$FINAL  logs=$LOGN"
case "$FINAL" in success | failed) ok "execution reached terminal ($FINAL)" ;; *) bad "execution stuck at $FINAL" ;; esac
[ "$LOGN" -gt 0 ] && ok "execution produced logs" || bad "no logs"

echo "== 8. dashboard stats =="
DS=$(curl -s "${AUTH[@]}" "$BASE/dashboard/stats")
echo "$DS" | jq -e 'has("totalWorkflows") and has("successRate") and (.trend|type=="array")' >/dev/null \
  && ok "DashboardStats shape" || bad "stats shape mismatch"

echo "== 9. SignalR hub negotiate (CORS + reachability) =="
HUB="${BASE%/api/*}/hubs/executions"
NEG=$(curl -s -X POST -H "Origin: $ORIGIN" -w '\n%{http_code}' "$HUB/negotiate?negotiateVersion=1")
[ "$(echo "$NEG" | tail -1)" = "200" ] && ok "hub negotiate 200" || bad "hub negotiate $(echo "$NEG" | tail -1)"
echo "$NEG" | sed '$d' | jq -e '.connectionId or .connectionToken or .url' >/dev/null 2>&1 \
  && ok "negotiate returned connection info" || bad "negotiate body unexpected"

echo "== 10. problem+json on bad login =="
BCODE=$(curl -s -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -H "Origin: $ORIGIN" \
  -d '{"email":"nope@nope.test","password":"wrong"}' "$BASE/auth/login")
{ [ "$BCODE" = "401" ] || [ "$BCODE" = "400" ]; } && ok "bad login rejected ($BCODE)" || bad "bad login $BCODE"

echo
echo "==================== RESULT: $PASS passed, $FAIL failed ===================="
rm -f "$JAR"
exit "$FAIL"
