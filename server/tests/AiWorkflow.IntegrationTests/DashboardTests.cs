using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>Task 17 contract tests: GET /dashboard/stats aggregates + 14-day trend.</summary>
[Collection(ApiCollection.Name)]
public class DashboardTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public DashboardTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> AuthedClient()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Dash Tester", email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var accessToken = (await ReadJson(response)).GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    [Fact]
    public async Task Stats_AreCachedInRedis_AndInvalidatedWhenARunCompletes()
    {
        var client = await AuthedClient();

        // Prime the per-user cache (zero workflows), then create one: the cached
        // snapshot keeps serving until something invalidates it.
        var first = await ReadJson(await client.GetAsync("/api/v1/dashboard/stats"));
        Assert.Equal(0, first.GetProperty("totalWorkflows").GetInt32());

        var wfId = (await ReadJson(await client.PostAsJsonAsync(
            "/api/v1/workflows", new { name = "Cache buster" }))).GetProperty("id").GetString();

        var cached = await ReadJson(await client.GetAsync("/api/v1/dashboard/stats"));
        Assert.Equal(0, cached.GetProperty("totalWorkflows").GetInt32());

        // A completed run busts the cache (§7 step 4) → fresh numbers.
        var run = await client.PostAsync($"/api/v1/workflows/{wfId}/run", content: null);
        var executionId = (await ReadJson(run)).GetProperty("id").GetString();
        var deadline = DateTimeOffset.UtcNow.AddSeconds(30);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var status = (await ReadJson(await client.GetAsync($"/api/v1/executions/{executionId}")))
                .GetProperty("status").GetString();
            if (status is "success" or "failed")
            {
                break;
            }

            await Task.Delay(250);
        }

        await Task.Delay(500); // completion handlers run post-publish

        var fresh = await ReadJson(await client.GetAsync("/api/v1/dashboard/stats"));
        Assert.Equal(1, fresh.GetProperty("totalWorkflows").GetInt32());
        Assert.Equal(1, fresh.GetProperty("totalExecutions").GetInt32());
    }

    [Fact]
    public async Task FreshUser_GetsZeroedStats_With100SuccessRate()
    {
        var client = await AuthedClient();

        var stats = await ReadJson(await client.GetAsync("/api/v1/dashboard/stats"));

        Assert.Equal(0, stats.GetProperty("totalWorkflows").GetInt32());
        Assert.Equal(0, stats.GetProperty("totalExecutions").GetInt32());
        Assert.Equal(100, stats.GetProperty("successRate").GetInt32());
        Assert.Equal(0, stats.GetProperty("connectedIntegrations").GetInt32());
        Assert.Equal(14, stats.GetProperty("trend").EnumerateArray().Count());
        Assert.All(stats.GetProperty("trend").EnumerateArray(), d => Assert.Equal(0, d.GetInt32()));
    }

    [Fact]
    public async Task Stats_ReflectWorkflowsRunsIntegrationsAndNotifications()
    {
        var client = await AuthedClient();

        // 2 workflows (1 active), one run to completion, one connected integration.
        var wfId = (await ReadJson(await client.PostAsJsonAsync(
            "/api/v1/workflows", new { name = "Stats wf", status = "active" }))).GetProperty("id").GetString();
        await client.PostAsJsonAsync("/api/v1/workflows", new { name = "Draft wf" });

        var run = await client.PostAsync($"/api/v1/workflows/{wfId}/run", content: null);
        var executionId = (await ReadJson(run)).GetProperty("id").GetString();
        var deadline = DateTimeOffset.UtcNow.AddSeconds(30);
        while (DateTimeOffset.UtcNow < deadline)
        {
            var status = (await ReadJson(await client.GetAsync($"/api/v1/executions/{executionId}")))
                .GetProperty("status").GetString();
            if (status is "success" or "failed")
            {
                break;
            }

            await Task.Delay(250);
        }

        await Task.Delay(500); // completion event handlers (counters/notification)

        var integrations = (await ReadJson(await client.GetAsync("/api/v1/integrations"))).EnumerateArray();
        var slackId = integrations.First().GetProperty("id").GetString();
        await client.PostAsJsonAsync($"/api/v1/integrations/{slackId}/connect", new { label = "T" });

        var stats = await ReadJson(await client.GetAsync("/api/v1/dashboard/stats"));

        Assert.Equal(2, stats.GetProperty("totalWorkflows").GetInt32());
        Assert.Equal(1, stats.GetProperty("activeWorkflows").GetInt32());
        Assert.Equal(1, stats.GetProperty("totalExecutions").GetInt32());
        Assert.Equal(100, stats.GetProperty("successRate").GetInt32());
        Assert.Equal(1, stats.GetProperty("connectedIntegrations").GetInt32());
        Assert.True(stats.GetProperty("unreadNotifications").GetInt32() >= 1);
        Assert.Equal(1, stats.GetProperty("execToday").GetInt32());

        var trend = stats.GetProperty("trend").EnumerateArray().Select(d => d.GetInt32()).ToArray();
        Assert.Equal(14, trend.Length);
        Assert.Equal(1, trend[^1]); // today's bucket is last
        Assert.Equal(1, trend.Sum());
    }
}
