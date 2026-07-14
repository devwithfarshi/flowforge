using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Task 11 contract tests: POST /workflows/{id}/run enqueues a real Hangfire job that
/// the engine executes against Postgres; /executions list/detail/recent mirror the mock.
/// Tests poll the execution until it reaches a terminal status.
/// </summary>
public class ExecutionsTests : IClassFixture<ApiFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public ExecutionsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> AuthedClient()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Exec Tester", email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var accessToken = (await ReadJson(response)).GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    private static async Task<string> CreateWorkflow(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/api/v1/workflows", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await ReadJson(response)).GetProperty("id").GetString()!;
    }

    private static async Task<JsonElement> Run(HttpClient client, string workflowId)
    {
        var response = await client.PostAsync($"/api/v1/workflows/{workflowId}/run", content: null);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var execution = await ReadJson(response);
        Assert.Equal("queued", execution.GetProperty("status").GetString());
        return execution;
    }

    /// <summary>Polls the execution until success/failed/canceled (Hangfire runs it in-process).</summary>
    private static async Task<JsonElement> WaitForTerminal(HttpClient client, string executionId)
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(30);

        while (DateTimeOffset.UtcNow < deadline)
        {
            var response = await client.GetAsync($"/api/v1/executions/{executionId}");
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            var execution = await ReadJson(response);
            var status = execution.GetProperty("status").GetString();

            if (status is "success" or "failed" or "canceled")
            {
                return execution;
            }

            await Task.Delay(250);
        }

        throw new TimeoutException($"Execution {executionId} did not finish within 30s.");
    }

    private static object Node(string id, string type, string name, object? config = null) => new
    {
        id,
        type,
        name,
        position = new { x = 0, y = 0 },
        config = config ?? new { },
    };

    [Fact]
    public async Task Run_TwoNodeGraph_SucceedsAndRecordsRunsLogsAndCounters()
    {
        var client = await AuthedClient();
        var workflowId = await CreateWorkflow(client, new
        {
            name = "Pipeline",
            nodes = new[] { Node("n1", "trigger.manual", "Start"), Node("n2", "ai.llm", "LLM") },
            edges = new object[] { new { id = "e1", source = "n1", target = "n2" } },
        });

        var queued = await Run(client, workflowId);
        var execution = await WaitForTerminal(client, queued.GetProperty("id").GetString()!);

        Assert.Equal("success", execution.GetProperty("status").GetString());
        Assert.Equal("Pipeline", execution.GetProperty("workflowName").GetString());
        Assert.Equal("Exec Tester", execution.GetProperty("triggeredBy").GetString());
        Assert.Equal("manual", execution.GetProperty("trigger").GetString());
        Assert.True(execution.GetProperty("durationMs").GetInt32() >= 0);
        Assert.NotEqual(JsonValueKind.Null, execution.GetProperty("finishedAt").ValueKind);

        var runs = execution.GetProperty("nodeRuns").EnumerateArray().ToList();
        Assert.Equal(2, runs.Count);
        Assert.Equal(["n1", "n2"], runs.Select(r => r.GetProperty("nodeId").GetString()!).ToArray());
        Assert.All(runs, r => Assert.Equal("success", r.GetProperty("status").GetString()));

        var logs = execution.GetProperty("logs").EnumerateArray().ToList();
        Assert.Contains(logs, l => l.GetProperty("message").GetString() == "Executing \"LLM\"");
        Assert.Contains(logs, l => l.GetProperty("level").GetString() == "success");

        // ExecutionCompleted handler bumped the materialized counters (§3.5).
        var workflow = await ReadJson(await client.GetAsync($"/api/v1/workflows/{workflowId}"));
        Assert.Equal(1, workflow.GetProperty("executionCount").GetInt32());
        Assert.Equal(1, workflow.GetProperty("successCount").GetInt32());
        Assert.Equal(0, workflow.GetProperty("failureCount").GetInt32());
        Assert.NotEqual(JsonValueKind.Null, workflow.GetProperty("lastRunAt").ValueKind);
    }

    [Fact]
    public async Task Run_FailingNode_MarksRunFailed_AndSkipsDownstream()
    {
        var client = await AuthedClient();
        var workflowId = await CreateWorkflow(client, new
        {
            name = "Flaky",
            nodes = new[]
            {
                Node("n1", "trigger.manual", "Start"),
                Node("n2", "utilities.http", "Broken call", new { simulateFail = true }),
                Node("n3", "communication.slack", "Notify"),
            },
            edges = new object[]
            {
                new { id = "e1", source = "n1", target = "n2" },
                new { id = "e2", source = "n2", target = "n3" },
            },
        });

        var queued = await Run(client, workflowId);
        var execution = await WaitForTerminal(client, queued.GetProperty("id").GetString()!);

        Assert.Equal("failed", execution.GetProperty("status").GetString());

        var runs = execution.GetProperty("nodeRuns").EnumerateArray().ToList();
        Assert.Equal(2, runs.Count); // downstream node never ran (mock parity)
        Assert.Equal("failed", runs[1].GetProperty("status").GetString());

        Assert.Contains(
            execution.GetProperty("logs").EnumerateArray(),
            l => l.GetProperty("level").GetString() == "error"
                && l.GetProperty("message").GetString()!.Contains("Broken call"));

        var workflow = await ReadJson(await client.GetAsync($"/api/v1/workflows/{workflowId}"));
        Assert.Equal(1, workflow.GetProperty("failureCount").GetInt32());
    }

    [Fact]
    public async Task Run_EmptyGraph_StillSucceeds_WithInjectedManualTrigger()
    {
        var client = await AuthedClient();
        var workflowId = await CreateWorkflow(client, new { name = "Empty" });

        var queued = await Run(client, workflowId);
        var execution = await WaitForTerminal(client, queued.GetProperty("id").GetString()!);

        Assert.Equal("success", execution.GetProperty("status").GetString());
        var run = Assert.Single(execution.GetProperty("nodeRuns").EnumerateArray());
        Assert.Equal("trigger.manual", run.GetProperty("nodeType").GetString());
    }

    [Fact]
    public async Task Executions_List_Recent_AndScoping_Work()
    {
        var client = await AuthedClient();
        var workflowId = await CreateWorkflow(client, new { name = "History maker" });

        var first = await Run(client, workflowId);
        await WaitForTerminal(client, first.GetProperty("id").GetString()!);
        var second = await Run(client, workflowId);
        await WaitForTerminal(client, second.GetProperty("id").GetString()!);

        // List: newest first, workflowId + status filters, frontend envelope.
        var list = await ReadJson(await client.GetAsync($"/api/v1/executions?workflowId={workflowId}"));
        Assert.Equal(2, list.GetProperty("total").GetInt32());
        Assert.Equal(15, list.GetProperty("pageSize").GetInt32());

        var successes = await ReadJson(await client.GetAsync(
            $"/api/v1/executions?workflowId={workflowId}&status=success"));
        Assert.Equal(2, successes.GetProperty("total").GetInt32());

        var searched = await ReadJson(await client.GetAsync("/api/v1/executions?search=history"));
        Assert.Equal(2, searched.GetProperty("total").GetInt32());

        // Recent honours n.
        var recent = await ReadJson(await client.GetAsync("/api/v1/executions/recent?n=1"));
        Assert.Single(recent.EnumerateArray());

        // Another user sees nothing of it (§4.4).
        var intruder = await AuthedClient();
        var intruderView = await intruder.GetAsync(
            $"/api/v1/executions/{first.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.NotFound, intruderView.StatusCode);

        var intruderList = await ReadJson(await intruder.GetAsync("/api/v1/executions"));
        Assert.Equal(0, intruderList.GetProperty("total").GetInt32());
    }
}
