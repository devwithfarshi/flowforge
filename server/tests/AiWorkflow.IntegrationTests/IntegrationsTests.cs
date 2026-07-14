using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using AiWorkflow.Infrastructure.Persistence;

using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Task 13 contract tests: seeded catalog, connect/disconnect with per-user derived
/// status, and credentials encrypted at rest + never echoed by the API.
/// </summary>
[Collection(ApiCollection.Name)]
public class IntegrationsTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public IntegrationsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> AuthedClient()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Int Tester", email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var accessToken = (await ReadJson(response)).GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    private async Task<List<JsonElement>> List(HttpClient client) =>
        (await ReadJson(await client.GetAsync("/api/v1/integrations"))).EnumerateArray().ToList();

    [Fact]
    public async Task List_ReturnsSeededCatalog_AllAvailableForFreshUser()
    {
        var client = await AuthedClient();

        var integrations = await List(client);

        Assert.Equal(16, integrations.Count);
        Assert.All(integrations, i => Assert.Equal("available", i.GetProperty("status").GetString()));
        Assert.All(integrations, i => Assert.Empty(i.GetProperty("accounts").EnumerateArray()));

        var slack = integrations.Single(i => i.GetProperty("name").GetString() == "Slack");
        Assert.Equal("Communication", slack.GetProperty("category").GetString());
        Assert.True(slack.GetProperty("popular").GetBoolean());
    }

    [Fact]
    public async Task Connect_AddsAccount_DerivesConnected_AndNeverEchoesCredentials()
    {
        var client = await AuthedClient();
        var slackId = (await List(client))
            .Single(i => i.GetProperty("name").GetString() == "Slack")
            .GetProperty("id").GetString();

        var response = await client.PostAsJsonAsync(
            $"/api/v1/integrations/{slackId}/connect",
            new { label = "Northwind Workspace", credentials = new { apiKey = "xoxb-super-secret" } });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var integration = await ReadJson(response);
        Assert.Equal("connected", integration.GetProperty("status").GetString());

        var account = Assert.Single(integration.GetProperty("accounts").EnumerateArray());
        Assert.Equal("Northwind Workspace", account.GetProperty("label").GetString());
        Assert.False(account.TryGetProperty("credentials", out _));

        // The raw secret must not appear anywhere in the payload…
        Assert.DoesNotContain("xoxb-super-secret", await response.Content.ReadAsStringAsync());

        // …and it is stored encrypted, not as plaintext (§15).
        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var accountId = Guid.Parse(account.GetProperty("id").GetString()!);
        var stored = await db.IntegrationAccounts.AsNoTracking().FirstAsync(a => a.Id == accountId);
        Assert.NotNull(stored.EncryptedCredentials);
        Assert.DoesNotContain("xoxb-super-secret", stored.EncryptedCredentials);
    }

    [Fact]
    public async Task Disconnect_RemovesAccount_AndFallsBackToAvailable()
    {
        var client = await AuthedClient();
        var gmailId = (await List(client))
            .Single(i => i.GetProperty("name").GetString() == "Gmail")
            .GetProperty("id").GetString();

        var connected = await ReadJson(await client.PostAsJsonAsync(
            $"/api/v1/integrations/{gmailId}/connect", new { label = "Work" }));
        var accountId = connected.GetProperty("accounts").EnumerateArray().Single()
            .GetProperty("id").GetString();

        var response = await client.DeleteAsync($"/api/v1/integrations/{gmailId}/accounts/{accountId}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var integration = await ReadJson(response);
        Assert.Equal("available", integration.GetProperty("status").GetString());
        Assert.Empty(integration.GetProperty("accounts").EnumerateArray());
    }

    [Fact]
    public async Task Connections_AreScopedPerUser()
    {
        var alice = await AuthedClient();
        var bob = await AuthedClient();
        var notionId = (await List(alice))
            .Single(i => i.GetProperty("name").GetString() == "Notion")
            .GetProperty("id").GetString();

        var connected = await ReadJson(await alice.PostAsJsonAsync(
            $"/api/v1/integrations/{notionId}/connect", new { label = "Alice's workspace" }));
        var accountId = connected.GetProperty("accounts").EnumerateArray().Single()
            .GetProperty("id").GetString();

        // Bob sees Notion as available and cannot disconnect Alice's account.
        var bobNotion = (await List(bob)).Single(i => i.GetProperty("name").GetString() == "Notion");
        Assert.Equal("available", bobNotion.GetProperty("status").GetString());

        var bobDisconnect = await bob.DeleteAsync($"/api/v1/integrations/{notionId}/accounts/{accountId}");
        Assert.Equal(HttpStatusCode.NotFound, bobDisconnect.StatusCode);
    }
}
