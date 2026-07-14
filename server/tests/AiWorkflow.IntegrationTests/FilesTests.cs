using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>Task 19 contract tests: signed direct-upload tickets, scoped per user (§12).</summary>
[Collection(ApiCollection.Name)]
public class FilesTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public FilesTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task AvatarSign_ReturnsUserScopedSignedUpload()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });
        var register = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "File Tester", email = $"user-{Guid.NewGuid():N}@example.com", password = "s3cure-Pass!" });
        var registered = (await register.Content.ReadFromJsonAsync<JsonElement>(Json))!;
        var userId = registered.GetProperty("user").GetProperty("id").GetString();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", registered.GetProperty("accessToken").GetString());

        var response = await client.PostAsync("/api/v1/users/me/avatar/sign", content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var ticket = (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;
        Assert.Equal($"users/{userId}/avatars", ticket.GetProperty("folder").GetString());
        Assert.StartsWith("avatar-", ticket.GetProperty("publicId").GetString(), StringComparison.Ordinal);
        Assert.Equal("test-key", ticket.GetProperty("apiKey").GetString());
        Assert.Contains("test-cloud", ticket.GetProperty("uploadUrl").GetString());
        Assert.NotEmpty(ticket.GetProperty("signature").GetString()!);
        Assert.True(ticket.GetProperty("timestamp").GetInt64() > 0);
    }

    [Fact]
    public async Task AvatarSign_RequiresAuthentication()
    {
        var client = _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

        var response = await client.PostAsync("/api/v1/users/me/avatar/sign", content: null);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
