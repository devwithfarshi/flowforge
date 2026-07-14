using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Task 12 contract tests: seeded marketplace, list filters/sort, detail, and install
/// (creates a draft workflow, bumps installs, flags recently used).
/// </summary>
[Collection(ApiCollection.Name)]
public class TemplatesTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public TemplatesTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> AuthedClient()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Tpl Tester", email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var accessToken = (await ReadJson(response)).GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    [Fact]
    public async Task List_ReturnsSeededMarketplace_WithFrontendShape()
    {
        var client = await AuthedClient();

        var templates = (await ReadJson(await client.GetAsync("/api/v1/templates"))).EnumerateArray().ToList();

        Assert.Equal(12, templates.Count);
        var responder = templates.Single(t => t.GetProperty("name").GetString() == "AI Email Responder");
        Assert.Equal("AI", responder.GetProperty("category").GetString());
        Assert.Equal("Beginner", responder.GetProperty("difficulty").GetString());
        Assert.Equal(4.8, responder.GetProperty("rating").GetDouble());
        Assert.True(responder.GetProperty("featured").GetBoolean());
        Assert.Equal(4, responder.GetProperty("nodeCount").GetInt32());
    }

    [Fact]
    public async Task List_FiltersByCategoryAndSearch_AndSortsByInstalls()
    {
        var client = await AuthedClient();

        var docs = (await ReadJson(await client.GetAsync("/api/v1/templates?category=Documents")))
            .EnumerateArray().ToList();
        Assert.Equal(2, docs.Count);

        var searched = (await ReadJson(await client.GetAsync("/api/v1/templates?search=standup")))
            .EnumerateArray().ToList();
        Assert.Equal("Slack Standup Bot", Assert.Single(searched).GetProperty("name").GetString());

        var byInstalls = (await ReadJson(await client.GetAsync("/api/v1/templates?sort=installs")))
            .EnumerateArray().Select(t => t.GetProperty("installs").GetInt32()).ToList();
        Assert.Equal(byInstalls.OrderByDescending(i => i), byInstalls);
    }

    [Fact]
    public async Task Get_ReturnsTemplate_And404ForUnknown()
    {
        var client = await AuthedClient();
        var first = (await ReadJson(await client.GetAsync("/api/v1/templates"))).EnumerateArray().First();

        var detail = await client.GetAsync($"/api/v1/templates/{first.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);

        var missing = await client.GetAsync($"/api/v1/templates/{Guid.CreateVersion7()}");
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Install_CreatesDraftWorkflow_BumpsInstalls_AndFlagsRecentlyUsed()
    {
        var client = await AuthedClient();
        var template = (await ReadJson(await client.GetAsync("/api/v1/templates")))
            .EnumerateArray()
            .Single(t => t.GetProperty("name").GetString() == "Webhook to Sheets"); // nodeCount 3
        var templateId = template.GetProperty("id").GetString();
        var installsBefore = template.GetProperty("installs").GetInt32();

        var response = await client.PostAsync($"/api/v1/templates/{templateId}/install", content: null);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var workflow = await ReadJson(response);
        Assert.Equal("Webhook to Sheets", workflow.GetProperty("name").GetString());
        Assert.Equal("draft", workflow.GetProperty("status").GetString());

        // Linear chain of up to 3 starter nodes, mock parity.
        var nodes = workflow.GetProperty("nodes").EnumerateArray().ToList();
        Assert.Equal(3, nodes.Count);
        Assert.Equal("trigger.manual", nodes[0].GetProperty("type").GetString());
        Assert.Equal(2, workflow.GetProperty("edges").EnumerateArray().Count());

        var after = await ReadJson(await client.GetAsync($"/api/v1/templates/{templateId}"));
        Assert.Equal(installsBefore + 1, after.GetProperty("installs").GetInt32());
        Assert.True(after.GetProperty("recentlyUsed").GetBoolean());

        // The workflow shows up in the owner's list.
        var list = await ReadJson(await client.GetAsync("/api/v1/workflows?search=webhook to sheets"));
        Assert.Equal(1, list.GetProperty("total").GetInt32());
    }
}
