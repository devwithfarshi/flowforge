using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Task 16 contract tests: issue (secret shown once, masked list), revoke, and the
/// X-Api-Key authentication scheme with scope-gated policies (§4.4).
/// </summary>
[Collection(ApiCollection.Name)]
public class ApiKeysTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public ApiKeysTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private HttpClient PlainClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private async Task<HttpClient> AuthedClient()
    {
        var client = PlainClient();
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Key Tester", email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var accessToken = (await ReadJson(response)).GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    private async Task<(JsonElement Key, string Secret)> CreateKey(HttpClient client, params string[] scopes)
    {
        var response = await client.PostAsJsonAsync("/api/v1/api-keys", new { name = "CI key", scopes });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJson(response);
        return (body.GetProperty("key"), body.GetProperty("secret").GetString()!);
    }

    [Fact]
    public async Task Create_ReturnsSecretOnce_AndListShowsMaskedTokenOnly()
    {
        var client = await AuthedClient();

        var (key, secret) = await CreateKey(client, "workflows:read");

        Assert.StartsWith("ffk_", secret, StringComparison.Ordinal);
        Assert.Equal("CI key", key.GetProperty("name").GetString());
        Assert.Contains("•", key.GetProperty("token").GetString());
        Assert.Equal(JsonValueKind.Null, key.GetProperty("lastUsedAt").ValueKind);

        var list = (await ReadJson(await client.GetAsync("/api/v1/api-keys"))).EnumerateArray().ToList();
        var listed = Assert.Single(list);
        Assert.DoesNotContain(secret, listed.GetRawText());
        Assert.Equal(key.GetProperty("token").GetString(), listed.GetProperty("token").GetString());
    }

    [Fact]
    public async Task ApiKeyScheme_AuthenticatesRequests_WithinItsScopes()
    {
        var owner = await AuthedClient();
        await owner.PostAsJsonAsync("/api/v1/workflows", new { name = "Visible to key" });
        var (_, secret) = await CreateKey(owner, "workflows:read");

        var machine = PlainClient();
        machine.DefaultRequestHeaders.Add("X-Api-Key", secret);

        // Read scope: list works and sees the owner's data.
        var list = await machine.GetAsync("/api/v1/workflows");
        Assert.Equal(HttpStatusCode.OK, list.StatusCode);
        Assert.Equal(1, (await ReadJson(list)).GetProperty("total").GetInt32());

        // Write is out of scope → 403.
        var create = await machine.PostAsJsonAsync("/api/v1/workflows", new { name = "Nope" });
        Assert.Equal(HttpStatusCode.Forbidden, create.StatusCode);

        // Usage is stamped.
        var keys = (await ReadJson(await owner.GetAsync("/api/v1/api-keys"))).EnumerateArray().ToList();
        Assert.NotEqual(JsonValueKind.Null, keys[0].GetProperty("lastUsedAt").ValueKind);
    }

    [Fact]
    public async Task WriteScope_AllowsMutations()
    {
        var owner = await AuthedClient();
        var (_, secret) = await CreateKey(owner, "workflows:read", "workflows:write");

        var machine = PlainClient();
        machine.DefaultRequestHeaders.Add("X-Api-Key", secret);

        var create = await machine.PostAsJsonAsync("/api/v1/workflows", new { name = "Machine made" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        Assert.Equal("Machine made", (await ReadJson(create)).GetProperty("name").GetString());
    }

    [Fact]
    public async Task InvalidKey_Returns401_AndRevokedKeyStopsWorking()
    {
        var owner = await AuthedClient();
        var (key, secret) = await CreateKey(owner, "workflows:read");

        var machine = PlainClient();
        machine.DefaultRequestHeaders.Add("X-Api-Key", "ffk_totally-wrong");
        Assert.Equal(HttpStatusCode.Unauthorized, (await machine.GetAsync("/api/v1/workflows")).StatusCode);

        // Revoke → key disappears from the list and stops authenticating.
        var revoke = await owner.DeleteAsync($"/api/v1/api-keys/{key.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);
        Assert.Empty((await ReadJson(await owner.GetAsync("/api/v1/api-keys"))).EnumerateArray());

        var revokedClient = PlainClient();
        revokedClient.DefaultRequestHeaders.Add("X-Api-Key", secret);
        Assert.Equal(HttpStatusCode.Unauthorized, (await revokedClient.GetAsync("/api/v1/workflows")).StatusCode);
    }
}
