// Live execution-streaming smoke (P8 · task 26). Connects to /hubs/executions
// with the SAME @microsoft/signalr client the browser uses, runs a workflow, and
// asserts executionLog + a terminal executionStatus frame arrive.
//
// Run from the client workspace so Node resolves @microsoft/signalr:
//   (cd client && node ../e2e/signalr-smoke.mjs [BASE_URL])
//
// Exit code 0 = frames streamed; 1 = no stream; 2 = error.
import * as signalR from "@microsoft/signalr";

const BASE = process.argv[2] || "http://localhost:8080/api/v1";
const HUB = `${BASE.replace(/\/api\/v\d+\/?$/, "")}/hubs/executions`;
const json = (r) => r.json();

async function main() {
  const email = `sig+${Date.now()}@flowforge.test`;
  const { accessToken } = await fetch(`${BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ name: "Sig Tester", email, password: "Sup3rSecret!" }),
  }).then(json);

  const wf = await fetch(`${BASE}/workflows`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ name: "Sig Flow", triggerType: "manual" }),
  }).then(json);

  // Connect before running so we don't miss frames.
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(HUB, { accessTokenFactory: () => accessToken })
    .configureLogging(signalR.LogLevel.Error)
    .build();
  const got = { logs: [], nodeRuns: [], status: [] };
  conn.on("executionLog", (_id, entry) => void got.logs.push(entry));
  conn.on("executionNodeRun", (_id, run) => void got.nodeRuns.push(run));
  conn.on("executionStatus", (_id, s) => void got.status.push(s));
  await conn.start();

  const exec = await fetch(`${BASE}/workflows/${wf.id}/run`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).then(json);
  await conn.invoke("JoinExecution", exec.id);

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline && !got.status.some((s) => s === "success" || s === "failed")) {
    await new Promise((r) => setTimeout(r, 150));
  }
  await conn.stop();

  console.log("execId:", exec.id, "| initial:", exec.status);
  console.log("executionLog frames:   ", got.logs.length);
  console.log("executionStatus frames:", JSON.stringify(got.status));
  const pass = got.logs.length > 0 && got.status.some((s) => s === "success" || s === "failed");
  console.log(pass ? "SIGNALR-STREAM: PASS" : "SIGNALR-STREAM: FAIL");
  process.exit(pass ? 0 : 1);
}
main().catch((e) => {
  console.error("ERROR:", e.message || e);
  process.exit(2);
});
