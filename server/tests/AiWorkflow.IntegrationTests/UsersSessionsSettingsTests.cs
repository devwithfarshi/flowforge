using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Task 9 contract tests: PATCH /users/me, POST /users/me/password, /sessions
/// list/revoke/revoke-others, and /me/preferences + /me/settings.
/// </summary>
[Collection(ApiCollection.Name)]
public class UsersSessionsSettingsTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public UsersSessionsSettingsTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private static string UniqueEmail() => $"user-{Guid.NewGuid():N}@example.com";

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    private static string? ExtractRefreshCookie(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Set-Cookie", out var cookies)
            ? cookies
                .Where(c => c.StartsWith("ff_refresh=", StringComparison.Ordinal))
                .Select(c => c.Split(';')[0]["ff_refresh=".Length..])
                .FirstOrDefault(v => v.Length > 0)
            : null;

    private static void UseBearer(HttpClient client, string accessToken) =>
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);

    /// <summary>Registers a fresh user; the client's default headers carry its bearer token.</summary>
    private async Task<(string Email, string Password, string RefreshCookie)> RegisterAndAuth(HttpClient client)
    {
        var email = UniqueEmail();
        const string password = "s3cure-Pass!";

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Test User", email, password });
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await ReadJson(response);
        UseBearer(client, body.GetProperty("accessToken").GetString()!);

        return (email, password, ExtractRefreshCookie(response)!);
    }

    private async Task<(string AccessToken, string RefreshCookie)> Login(
        HttpClient client, string email, string password)
    {
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { email, password, rememberMe = true });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await ReadJson(response);
        return (body.GetProperty("accessToken").GetString()!, ExtractRefreshCookie(response)!);
    }

    private static HttpRequestMessage WithRefreshCookie(HttpMethod method, string url, string refreshCookie)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("Cookie", $"ff_refresh={refreshCookie}");
        return request;
    }

    /* ---------------------------------------------------------------- users/me */

    [Fact]
    public async Task PatchProfile_UpdatesOnlyProvidedFields()
    {
        var client = CreateClient();
        var (email, _, _) = await RegisterAndAuth(client);

        var response = await client.PatchAsJsonAsync(
            "/api/v1/users/me",
            new { jobTitle = "Engineer", company = "Analytical Engines", bio = "First programmer" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = await ReadJson(response);
        Assert.Equal("Test User", user.GetProperty("name").GetString()); // unchanged
        Assert.Equal(email, user.GetProperty("email").GetString());
        Assert.Equal("Engineer", user.GetProperty("jobTitle").GetString());
        Assert.Equal("Analytical Engines", user.GetProperty("company").GetString());
        Assert.Equal("First programmer", user.GetProperty("bio").GetString());
    }

    [Fact]
    public async Task PatchProfile_WithoutToken_Returns401()
    {
        var client = CreateClient();

        var response = await client.PatchAsJsonAsync("/api/v1/users/me", new { name = "X" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ChangePassword_WrongCurrent_Returns400WithFieldError()
    {
        var client = CreateClient();
        await RegisterAndAuth(client);

        var response = await client.PostAsJsonAsync(
            "/api/v1/users/me/password",
            new { currentPassword = "wrong!", newPassword = "brand-new-Pass1!" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadJson(response);
        Assert.True(problem.GetProperty("errors").TryGetProperty("CurrentPassword", out _));
    }

    [Fact]
    public async Task ChangePassword_RevokesOtherSessions_ButKeepsCurrent()
    {
        var client = CreateClient();
        var (email, password, _) = await RegisterAndAuth(client);

        // Second device signs in; first device (register session) changes the password.
        var (_, otherCookie) = await Login(CreateClient(), email, password);
        var (currentToken, currentCookie) = await Login(client, email, password);
        UseBearer(client, currentToken);

        var response = await client.PostAsJsonAsync(
            "/api/v1/users/me/password",
            new { currentPassword = password, newPassword = "brand-new-Pass1!" });
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        // Other device's refresh token is dead; the current session's still works.
        var otherRefresh = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/refresh", otherCookie));
        Assert.Equal(HttpStatusCode.Unauthorized, otherRefresh.StatusCode);

        var currentRefresh = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/refresh", currentCookie));
        Assert.Equal(HttpStatusCode.OK, currentRefresh.StatusCode);

        // And the new password is live.
        await Login(CreateClient(), email, "brand-new-Pass1!");
    }

    /* ---------------------------------------------------------------- sessions */

    [Fact]
    public async Task Sessions_ListsActiveDevices_MarkingCurrent()
    {
        var client = CreateClient();
        var (email, password, _) = await RegisterAndAuth(client);

        var (accessToken, _) = await Login(client, email, password);
        UseBearer(client, accessToken);

        var response = await client.GetAsync("/api/v1/sessions");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var sessions = (await ReadJson(response)).EnumerateArray().ToList();
        Assert.Equal(2, sessions.Count); // register session + this login
        Assert.Equal(1, sessions.Count(s => s.GetProperty("current").GetBoolean()));
        Assert.True(sessions[0].GetProperty("current").GetBoolean()); // current sorts first
        Assert.NotEmpty(sessions[0].GetProperty("device").GetString()!);
    }

    [Fact]
    public async Task RevokeSession_KillsThatDevice()
    {
        var client = CreateClient();
        var (email, password, registerCookie) = await RegisterAndAuth(client);

        var (accessToken, _) = await Login(client, email, password);
        UseBearer(client, accessToken);

        var sessions = (await ReadJson(await client.GetAsync("/api/v1/sessions"))).EnumerateArray().ToList();
        var other = sessions.Single(s => !s.GetProperty("current").GetBoolean());

        var revoke = await client.DeleteAsync($"/api/v1/sessions/{other.GetProperty("id").GetString()}");
        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);

        // The register session's cookie was the revoked device.
        var refresh = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/refresh", registerCookie));
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task RevokeCurrentSession_Returns409()
    {
        var client = CreateClient();
        await RegisterAndAuth(client);

        var sessions = (await ReadJson(await client.GetAsync("/api/v1/sessions"))).EnumerateArray().ToList();
        var current = sessions.Single(s => s.GetProperty("current").GetBoolean());

        var response = await client.DeleteAsync($"/api/v1/sessions/{current.GetProperty("id").GetString()}");

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task RevokeOthers_LeavesOnlyCurrentSession()
    {
        var client = CreateClient();
        var (email, password, _) = await RegisterAndAuth(client);

        await Login(CreateClient(), email, password);
        var (accessToken, _) = await Login(client, email, password);
        UseBearer(client, accessToken);

        var revoke = await client.DeleteAsync("/api/v1/sessions/others");
        Assert.Equal(HttpStatusCode.NoContent, revoke.StatusCode);

        var sessions = (await ReadJson(await client.GetAsync("/api/v1/sessions"))).EnumerateArray().ToList();
        var session = Assert.Single(sessions);
        Assert.True(session.GetProperty("current").GetBoolean());
    }

    /* ---------------------------------------------------------------- me/preferences + me/settings */

    [Fact]
    public async Task Preferences_DefaultsMatchFrontendSeed_AndPatchMerges()
    {
        var client = CreateClient();
        await RegisterAndAuth(client);

        var defaults = await ReadJson(await client.GetAsync("/api/v1/me/preferences"));
        Assert.Equal("system", defaults.GetProperty("theme").GetString());
        Assert.False(defaults.GetProperty("sidebarCollapsed").GetBoolean());
        Assert.Equal("comfortable", defaults.GetProperty("density").GetString());
        Assert.Equal("grid", defaults.GetProperty("defaultView").GetString());
        Assert.Equal("en", defaults.GetProperty("language").GetString());
        Assert.True(defaults.GetProperty("accentAnimations").GetBoolean());

        var patched = await ReadJson(await client.PatchAsJsonAsync(
            "/api/v1/me/preferences", new { theme = "dark", density = "compact" }));
        Assert.Equal("dark", patched.GetProperty("theme").GetString());
        Assert.Equal("compact", patched.GetProperty("density").GetString());
        Assert.Equal("grid", patched.GetProperty("defaultView").GetString()); // untouched

        var persisted = await ReadJson(await client.GetAsync("/api/v1/me/preferences"));
        Assert.Equal("dark", persisted.GetProperty("theme").GetString());
    }

    [Fact]
    public async Task Preferences_RejectsUnknownTheme()
    {
        var client = CreateClient();
        await RegisterAndAuth(client);

        var response = await client.PatchAsJsonAsync("/api/v1/me/preferences", new { theme = "solarized" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Settings_DefaultsMatchFrontendSeed_AndPatchMerges()
    {
        var client = CreateClient();
        await RegisterAndAuth(client);

        var defaults = await ReadJson(await client.GetAsync("/api/v1/me/settings"));
        Assert.True(defaults.GetProperty("notifyOnSuccess").GetBoolean());
        Assert.True(defaults.GetProperty("notifyOnFailure").GetBoolean());
        Assert.True(defaults.GetProperty("notifyOnIntegration").GetBoolean());
        Assert.False(defaults.GetProperty("weeklyDigest").GetBoolean());
        Assert.False(defaults.GetProperty("twoFactorEnabled").GetBoolean());

        var patched = await ReadJson(await client.PatchAsJsonAsync(
            "/api/v1/me/settings", new { weeklyDigest = true, notifyOnSuccess = false }));
        Assert.True(patched.GetProperty("weeklyDigest").GetBoolean());
        Assert.False(patched.GetProperty("notifyOnSuccess").GetBoolean());
        Assert.True(patched.GetProperty("notifyOnFailure").GetBoolean()); // untouched

        var persisted = await ReadJson(await client.GetAsync("/api/v1/me/settings"));
        Assert.True(persisted.GetProperty("weeklyDigest").GetBoolean());
    }
}
