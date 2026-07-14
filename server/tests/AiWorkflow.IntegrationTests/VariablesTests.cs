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
/// Task 14 contract tests: owner-scoped CRUD, (owner,key,scope,env) uniqueness,
/// secret values encrypted at rest but decrypted for the owner.
/// </summary>
[Collection(ApiCollection.Name)]
public class VariablesTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public VariablesTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private async Task<HttpClient> AuthedClient()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Var Tester", email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var accessToken = (await ReadJson(response)).GetProperty("accessToken").GetString()!;
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        return client;
    }

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    [Fact]
    public async Task Create_List_Update_Delete_RoundTrip()
    {
        var client = await AuthedClient();

        var created = await client.PostAsJsonAsync("/api/v1/variables", new
        {
            key = "API_BASE_URL",
            value = "https://api.example.com",
            scope = "global",
            description = "Base URL",
        });
        Assert.Equal(HttpStatusCode.Created, created.StatusCode);
        var variable = await ReadJson(created);
        Assert.Equal("global", variable.GetProperty("scope").GetString());
        Assert.NotEmpty(variable.GetProperty("updatedAt").GetString()!);
        var id = variable.GetProperty("id").GetString();

        var list = (await ReadJson(await client.GetAsync("/api/v1/variables"))).EnumerateArray().ToList();
        Assert.Single(list);

        var updated = await ReadJson(await client.PutAsJsonAsync(
            $"/api/v1/variables/{id}", new { value = "https://api2.example.com" }));
        Assert.Equal("https://api2.example.com", updated.GetProperty("value").GetString());
        Assert.Equal("API_BASE_URL", updated.GetProperty("key").GetString()); // untouched

        Assert.Equal(HttpStatusCode.NoContent, (await client.DeleteAsync($"/api/v1/variables/{id}")).StatusCode);
        Assert.Empty((await ReadJson(await client.GetAsync("/api/v1/variables"))).EnumerateArray());
    }

    [Fact]
    public async Task SecretVariable_IsEncryptedAtRest_ButDecryptedForOwner()
    {
        var client = await AuthedClient();

        var created = await ReadJson(await client.PostAsJsonAsync("/api/v1/variables", new
        {
            key = "OPENAI_KEY",
            value = "sk-super-secret-123",
            scope = "secret",
        }));
        Assert.Equal("sk-super-secret-123", created.GetProperty("value").GetString());

        using var scope = _factory.Services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var stored = await db.Variables.AsNoTracking()
            .FirstAsync(v => v.Id == Guid.Parse(created.GetProperty("id").GetString()!));
        Assert.NotEqual("sk-super-secret-123", stored.Value);
        Assert.DoesNotContain("sk-super-secret", stored.Value);

        // List round-trips the plaintext back to the owner.
        var listed = (await ReadJson(await client.GetAsync("/api/v1/variables?scope=secret")))
            .EnumerateArray().Single();
        Assert.Equal("sk-super-secret-123", listed.GetProperty("value").GetString());
    }

    [Fact]
    public async Task DuplicateKeyInSameScope_Returns409_ButOtherScopeIsFine()
    {
        var client = await AuthedClient();

        await client.PostAsJsonAsync("/api/v1/variables", new { key = "TOKEN", value = "a", scope = "global" });

        var duplicate = await client.PostAsJsonAsync(
            "/api/v1/variables", new { key = "TOKEN", value = "b", scope = "global" });
        Assert.Equal(HttpStatusCode.Conflict, duplicate.StatusCode);

        var otherScope = await client.PostAsJsonAsync(
            "/api/v1/variables", new { key = "TOKEN", value = "c", scope = "secret" });
        Assert.Equal(HttpStatusCode.Created, otherScope.StatusCode);

        // Same key allowed in different environments; blocked in the same one.
        var prod = await client.PostAsJsonAsync(
            "/api/v1/variables",
            new { key = "TOKEN", value = "d", scope = "environment", environment = "production" });
        Assert.Equal(HttpStatusCode.Created, prod.StatusCode);

        var prodAgain = await client.PostAsJsonAsync(
            "/api/v1/variables",
            new { key = "TOKEN", value = "e", scope = "environment", environment = "production" });
        Assert.Equal(HttpStatusCode.Conflict, prodAgain.StatusCode);
    }

    [Fact]
    public async Task Filters_And_OwnerScoping_Work()
    {
        var client = await AuthedClient();
        await client.PostAsJsonAsync("/api/v1/variables", new { key = "SLACK_WEBHOOK", value = "x", scope = "global" });
        await client.PostAsJsonAsync("/api/v1/variables", new { key = "DB_PASSWORD", value = "y", scope = "secret" });

        var secrets = (await ReadJson(await client.GetAsync("/api/v1/variables?scope=secret")))
            .EnumerateArray().ToList();
        Assert.Equal("DB_PASSWORD", Assert.Single(secrets).GetProperty("key").GetString());

        var searched = (await ReadJson(await client.GetAsync("/api/v1/variables?search=slack")))
            .EnumerateArray().ToList();
        Assert.Equal("SLACK_WEBHOOK", Assert.Single(searched).GetProperty("key").GetString());

        // Another user sees nothing.
        var intruder = await AuthedClient();
        Assert.Empty((await ReadJson(await intruder.GetAsync("/api/v1/variables"))).EnumerateArray());
    }
}
