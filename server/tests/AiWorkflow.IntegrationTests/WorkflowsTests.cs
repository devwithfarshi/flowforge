using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Task 10 contract tests: /workflows CRUD, duplicate/archive/favorite/status, and
/// list filters/sort/pagination — mirroring the mock workflowApi semantics.
/// Each test registers its own user, so data is naturally isolated by ownership.
/// </summary>
public class WorkflowsTests : IClassFixture<ApiFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public WorkflowsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> AuthedClient()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Wf Tester", email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var accessToken = (await ReadJson(response)).GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    private static async Task<JsonElement> Create(HttpClient client, object body)
    {
        var response = await client.PostAsJsonAsync("/api/v1/workflows", body);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return await ReadJson(response);
    }

    [Fact]
    public async Task Create_Defaults_MirrorMockNewWorkflow()
    {
        var client = await AuthedClient();

        var workflow = await Create(client, new { });

        Assert.Equal("Untitled workflow", workflow.GetProperty("name").GetString());
        Assert.Equal("", workflow.GetProperty("description").GetString());
        Assert.Equal("draft", workflow.GetProperty("status").GetString());
        Assert.Equal("manual", workflow.GetProperty("triggerType").GetString());
        Assert.False(workflow.GetProperty("favorite").GetBoolean());
        Assert.Empty(workflow.GetProperty("nodes").EnumerateArray());
        Assert.Empty(workflow.GetProperty("edges").EnumerateArray());
        Assert.Empty(workflow.GetProperty("variables").EnumerateArray());
        Assert.Equal(0, workflow.GetProperty("executionCount").GetInt32());
        Assert.Equal(JsonValueKind.Null, workflow.GetProperty("lastRunAt").ValueKind);
        Assert.Equal("Wf Tester", workflow.GetProperty("ownerName").GetString());
        Assert.NotEmpty(workflow.GetProperty("updatedAt").GetString()!);
    }

    [Fact]
    public async Task Create_WithGraph_RoundTripsThroughJsonb()
    {
        var client = await AuthedClient();

        var created = await Create(client, new
        {
            name = "AI pipeline",
            description = "Summarize incoming email",
            tags = new[] { "ai", "email" },
            triggerType = "webhook",
            nodes = new object[]
            {
                new
                {
                    id = "n1",
                    type = "trigger.webhook",
                    name = "Webhook",
                    position = new { x = 40.5, y = 120.0 },
                    config = new { method = "POST", path = "/hook" },
                },
                new
                {
                    id = "n2",
                    type = "ai.llm",
                    name = "LLM",
                    description = "Summarize",
                    position = new { x = 320.0, y = 120.0 },
                    config = new { model = "gpt", temperature = 0.2, maxTokens = 512 },
                },
            },
            edges = new object[] { new { id = "e1", source = "n1", target = "n2" } },
            variables = new object[] { new { id = "v1", key = "API_KEY", value = "secret", secret = true } },
        });

        var response = await client.GetAsync($"/api/v1/workflows/{created.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var fetched = await ReadJson(response);

        Assert.Equal("webhook", fetched.GetProperty("triggerType").GetString());

        var nodes = fetched.GetProperty("nodes").EnumerateArray().ToList();
        Assert.Equal(2, nodes.Count);
        var llm = nodes.Single(n => n.GetProperty("id").GetString() == "n2");
        Assert.Equal("ai.llm", llm.GetProperty("type").GetString());
        Assert.Equal(320.0, llm.GetProperty("position").GetProperty("x").GetDouble());
        Assert.Equal(0.2, llm.GetProperty("config").GetProperty("temperature").GetDouble());
        Assert.Equal(512, llm.GetProperty("config").GetProperty("maxTokens").GetInt32());

        var edge = Assert.Single(fetched.GetProperty("edges").EnumerateArray());
        Assert.Equal("n1", edge.GetProperty("source").GetString());

        var variable = Assert.Single(fetched.GetProperty("variables").EnumerateArray());
        Assert.Equal("API_KEY", variable.GetProperty("key").GetString());
        Assert.True(variable.GetProperty("secret").GetBoolean());
    }

    [Fact]
    public async Task Create_WithDanglingEdge_Returns422()
    {
        var client = await AuthedClient();

        var response = await client.PostAsJsonAsync("/api/v1/workflows", new
        {
            nodes = new object[]
            {
                new { id = "n1", type = "trigger.manual", name = "Start", position = new { x = 0, y = 0 }, config = new { } },
            },
            edges = new object[] { new { id = "e1", source = "n1", target = "missing" } },
        });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
    }

    [Fact]
    public async Task Get_SomeoneElsesWorkflow_Returns404()
    {
        var owner = await AuthedClient();
        var intruder = await AuthedClient();

        var workflow = await Create(owner, new { name = "Private" });

        var response = await intruder.GetAsync($"/api/v1/workflows/{workflow.GetProperty("id").GetString()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task List_Filters_Sorts_Paginates_AndExcludesArchived()
    {
        var client = await AuthedClient();

        await Create(client, new { name = "Alpha", status = "active", triggerType = "webhook", tags = new[] { "ai" } });
        await Create(client, new { name = "Beta", status = "inactive", triggerType = "cron" });
        await Create(client, new { name = "Gamma", status = "active", triggerType = "manual", tags = new[] { "ai", "ops" } });
        var archived = await Create(client, new { name = "Old thing" });
        await client.PostAsJsonAsync(
            $"/api/v1/workflows/{archived.GetProperty("id").GetString()}/archive", new { archived = true });

        // Default list: archived excluded.
        var all = await ReadJson(await client.GetAsync("/api/v1/workflows"));
        Assert.Equal(3, all.GetProperty("total").GetInt32());
        Assert.Equal(1, all.GetProperty("page").GetInt32());
        Assert.Equal(12, all.GetProperty("pageSize").GetInt32());

        // includeArchived + status filter finds it.
        var archivedList = await ReadJson(await client.GetAsync(
            "/api/v1/workflows?includeArchived=true&status=archived"));
        Assert.Equal(1, archivedList.GetProperty("total").GetInt32());
        Assert.Equal("Old thing",
            archivedList.GetProperty("items").EnumerateArray().Single().GetProperty("name").GetString());

        // Status / trigger / tag filters.
        var active = await ReadJson(await client.GetAsync("/api/v1/workflows?status=active"));
        Assert.Equal(2, active.GetProperty("total").GetInt32());

        var cron = await ReadJson(await client.GetAsync("/api/v1/workflows?trigger=cron"));
        Assert.Equal("Beta", cron.GetProperty("items").EnumerateArray().Single().GetProperty("name").GetString());

        var tagged = await ReadJson(await client.GetAsync("/api/v1/workflows?tag=ops"));
        Assert.Equal("Gamma", tagged.GetProperty("items").EnumerateArray().Single().GetProperty("name").GetString());

        // Search (name substring, case-insensitive) and sort.
        var searched = await ReadJson(await client.GetAsync("/api/v1/workflows?search=alp"));
        Assert.Equal("Alpha", searched.GetProperty("items").EnumerateArray().Single().GetProperty("name").GetString());

        var sorted = await ReadJson(await client.GetAsync("/api/v1/workflows?sort=name:asc"));
        Assert.Equal(
            new[] { "Alpha", "Beta", "Gamma" },
            sorted.GetProperty("items").EnumerateArray().Select(w => w.GetProperty("name").GetString()).ToArray());

        // Pagination with clamped page: pageSize 2 → totalPages 2; page 9 clamps to 2.
        var page2 = await ReadJson(await client.GetAsync("/api/v1/workflows?sort=name:asc&pageSize=2&page=9"));
        Assert.Equal(2, page2.GetProperty("page").GetInt32());
        Assert.Equal(2, page2.GetProperty("totalPages").GetInt32());
        Assert.Equal("Gamma", page2.GetProperty("items").EnumerateArray().Single().GetProperty("name").GetString());
    }

    [Fact]
    public async Task Update_IsPartial_AndBumpsUpdatedAt()
    {
        var client = await AuthedClient();
        var created = await Create(client, new
        {
            name = "Before",
            description = "Keep me",
            nodes = new object[]
            {
                new { id = "n1", type = "trigger.manual", name = "Start", position = new { x = 0, y = 0 }, config = new { } },
            },
        });
        var id = created.GetProperty("id").GetString();

        var response = await client.PutAsJsonAsync($"/api/v1/workflows/{id}", new { name = "After" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await ReadJson(response);
        Assert.Equal("After", updated.GetProperty("name").GetString());
        Assert.Equal("Keep me", updated.GetProperty("description").GetString());
        Assert.Single(updated.GetProperty("nodes").EnumerateArray()); // graph untouched
    }

    [Fact]
    public async Task Duplicate_CopiesGraph_ResetsStateAndCounters()
    {
        var client = await AuthedClient();
        var created = await Create(client, new
        {
            name = "Original",
            status = "active",
            tags = new[] { "ai" },
            nodes = new object[]
            {
                new { id = "n1", type = "trigger.manual", name = "Start", position = new { x = 0, y = 0 }, config = new { } },
            },
        });

        var response = await client.PostAsync(
            $"/api/v1/workflows/{created.GetProperty("id").GetString()}/duplicate", content: null);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var copy = await ReadJson(response);
        Assert.Equal("Original (copy)", copy.GetProperty("name").GetString());
        Assert.Equal("draft", copy.GetProperty("status").GetString());
        Assert.False(copy.GetProperty("favorite").GetBoolean());
        Assert.Equal(0, copy.GetProperty("executionCount").GetInt32());
        Assert.Single(copy.GetProperty("nodes").EnumerateArray());
        Assert.NotEqual(created.GetProperty("id").GetString(), copy.GetProperty("id").GetString());
    }

    [Fact]
    public async Task Favorite_Toggles()
    {
        var client = await AuthedClient();
        var id = (await Create(client, new { })).GetProperty("id").GetString();

        var on = await ReadJson(await client.PostAsync($"/api/v1/workflows/{id}/favorite", content: null));
        Assert.True(on.GetProperty("favorite").GetBoolean());

        var off = await ReadJson(await client.PostAsync($"/api/v1/workflows/{id}/favorite", content: null));
        Assert.False(off.GetProperty("favorite").GetBoolean());
    }

    [Fact]
    public async Task SetStatus_Patches()
    {
        var client = await AuthedClient();
        var id = (await Create(client, new { })).GetProperty("id").GetString();

        var response = await client.PatchAsJsonAsync($"/api/v1/workflows/{id}/status", new { status = "active" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("active", (await ReadJson(response)).GetProperty("status").GetString());
    }

    [Fact]
    public async Task Archive_ThenRestore_LandsOnInactive()
    {
        var client = await AuthedClient();
        var id = (await Create(client, new { status = "active" })).GetProperty("id").GetString();

        var archived = await ReadJson(await client.PostAsJsonAsync(
            $"/api/v1/workflows/{id}/archive", new { archived = true }));
        Assert.Equal("archived", archived.GetProperty("status").GetString());
        Assert.NotEqual(JsonValueKind.Null, archived.GetProperty("archivedAt").ValueKind);

        var restored = await ReadJson(await client.PostAsJsonAsync(
            $"/api/v1/workflows/{id}/archive", new { archived = false }));
        Assert.Equal("inactive", restored.GetProperty("status").GetString());
        Assert.Equal(JsonValueKind.Null, restored.GetProperty("archivedAt").ValueKind);
    }

    [Fact]
    public async Task Delete_RemovesWorkflow()
    {
        var client = await AuthedClient();
        var id = (await Create(client, new { })).GetProperty("id").GetString();

        var deleted = await client.DeleteAsync($"/api/v1/workflows/{id}");
        Assert.Equal(HttpStatusCode.NoContent, deleted.StatusCode);

        var lookup = await client.GetAsync($"/api/v1/workflows/{id}");
        Assert.Equal(HttpStatusCode.NotFound, lookup.StatusCode);
    }
}
