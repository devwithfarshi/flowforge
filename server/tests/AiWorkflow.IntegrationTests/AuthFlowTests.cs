using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// End-to-end auth contract tests (§18): real HTTP through the pipeline against a
/// real Postgres. Cookies are managed manually so rotation/replay can be exercised.
/// </summary>
public class AuthFlowTests : IClassFixture<ApiFactory>
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public AuthFlowTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private static string UniqueEmail() => $"user-{Guid.NewGuid():N}@example.com";

    private static string? ExtractRefreshCookie(HttpResponseMessage response) =>
        response.Headers.TryGetValues("Set-Cookie", out var cookies)
            ? cookies
                .Where(c => c.StartsWith("ff_refresh=", StringComparison.Ordinal))
                .Select(c => c.Split(';')[0]["ff_refresh=".Length..])
                .FirstOrDefault(v => v.Length > 0)
            : null;

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    private async Task<(string Email, string AccessToken, string RefreshCookie)> RegisterUser(HttpClient client)
    {
        var email = UniqueEmail();
        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Test User", email, password = "s3cure-Pass!" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJson(response);
        var cookie = ExtractRefreshCookie(response);
        Assert.NotNull(cookie);

        return (email, body.GetProperty("accessToken").GetString()!, cookie!);
    }

    private static HttpRequestMessage WithRefreshCookie(HttpMethod method, string url, string refreshCookie)
    {
        var request = new HttpRequestMessage(method, url);
        request.Headers.Add("Cookie", $"ff_refresh={refreshCookie}");
        return request;
    }

    [Fact]
    public async Task Register_ReturnsUser_AccessToken_And_RefreshCookie()
    {
        var client = CreateClient();
        var email = UniqueEmail();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Ada Lovelace", email, password = "s3cure-Pass!" });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var body = await ReadJson(response);
        Assert.NotEmpty(body.GetProperty("accessToken").GetString()!);

        var user = body.GetProperty("user");
        Assert.Equal("Ada Lovelace", user.GetProperty("name").GetString());
        Assert.Equal(email, user.GetProperty("email").GetString());
        Assert.Equal("Owner", user.GetProperty("role").GetString());
        Assert.False(user.GetProperty("emailVerified").GetBoolean());
        Assert.NotEmpty(user.GetProperty("avatarColor").GetString()!);

        var setCookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("ff_refresh="));
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", setCookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/api/v1/auth", setCookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Register_DuplicateEmail_Returns409ProblemDetails()
    {
        var client = CreateClient();
        var (email, _, _) = await RegisterUser(client);

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "Someone Else", email, password = "s3cure-Pass!" });

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var problem = await ReadJson(response);
        Assert.Equal("An account with this email already exists", problem.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task Register_InvalidPayload_Returns400WithFieldErrors()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new { name = "", email = "not-an-email", password = "short" });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var problem = await ReadJson(response);
        var errors = problem.GetProperty("errors");
        Assert.True(errors.TryGetProperty("Name", out _));
        Assert.True(errors.TryGetProperty("Email", out _));
        Assert.True(errors.TryGetProperty("Password", out _));
    }

    [Fact]
    public async Task Login_WrongPassword_Returns401()
    {
        var client = CreateClient();
        var (email, _, _) = await RegisterUser(client);

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { email, password = "wrong-password" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Login_Succeeds_And_MeReturnsUser_WithBearer()
    {
        var client = CreateClient();
        var (email, _, _) = await RegisterUser(client);

        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { email, password = "s3cure-Pass!", rememberMe = true });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var accessToken = (await ReadJson(login)).GetProperty("accessToken").GetString()!;

        var me = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        me.Headers.Authorization = new AuthenticationHeaderValue("Bearer", accessToken);
        var meResponse = await client.SendAsync(me);

        Assert.Equal(HttpStatusCode.OK, meResponse.StatusCode);
        Assert.Equal(email, (await ReadJson(meResponse)).GetProperty("email").GetString());
    }

    [Fact]
    public async Task Me_WithoutToken_Returns401()
    {
        var client = CreateClient();

        var response = await client.GetAsync("/api/v1/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Refresh_RotatesToken_And_ReplayRevokesFamily()
    {
        var client = CreateClient();
        var (_, _, firstCookie) = await RegisterUser(client);

        // Legitimate refresh: new access token + rotated cookie.
        var refresh = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/refresh", firstCookie));
        Assert.Equal(HttpStatusCode.OK, refresh.StatusCode);
        Assert.NotEmpty((await ReadJson(refresh)).GetProperty("accessToken").GetString()!);
        var secondCookie = ExtractRefreshCookie(refresh);
        Assert.NotNull(secondCookie);
        Assert.NotEqual(firstCookie, secondCookie);

        // Replaying the rotated token is theft → 401 and the whole family dies (§4.2).
        var replay = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/refresh", firstCookie));
        Assert.Equal(HttpStatusCode.Unauthorized, replay.StatusCode);

        var successorAfterReplay = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/refresh", secondCookie!));
        Assert.Equal(HttpStatusCode.Unauthorized, successorAfterReplay.StatusCode);
    }

    [Fact]
    public async Task Refresh_WithoutCookie_Returns400()
    {
        var client = CreateClient();

        var response = await client.PostAsync("/api/v1/auth/refresh", content: null);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Logout_RevokesRefreshToken()
    {
        var client = CreateClient();
        var (_, _, cookie) = await RegisterUser(client);

        var logout = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/logout", cookie));
        Assert.Equal(HttpStatusCode.NoContent, logout.StatusCode);

        var refresh = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/refresh", cookie));
        Assert.Equal(HttpStatusCode.Unauthorized, refresh.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_ThenReset_AllowsLoginWithNewPassword_AndRevokesSessions()
    {
        var client = CreateClient();
        var (email, _, cookie) = await RegisterUser(client);

        var forgot = await client.PostAsJsonAsync("/api/v1/auth/forgot-password", new { email });
        Assert.Equal(HttpStatusCode.Accepted, forgot.StatusCode);

        var token = _factory.Emails.LastResetTokenFor(email);
        Assert.NotNull(token);

        var reset = await client.PostAsJsonAsync(
            "/api/v1/auth/reset-password",
            new { token, password = "brand-new-Pass1!" });
        Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);

        // Old password no longer works; new one does; old sessions are revoked.
        var oldLogin = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.Unauthorized, oldLogin.StatusCode);

        var newLogin = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "brand-new-Pass1!" });
        Assert.Equal(HttpStatusCode.OK, newLogin.StatusCode);

        var refreshOldSession = await client.SendAsync(WithRefreshCookie(HttpMethod.Post, "/api/v1/auth/refresh", cookie));
        Assert.Equal(HttpStatusCode.Unauthorized, refreshOldSession.StatusCode);
    }

    [Fact]
    public async Task ForgotPassword_UnknownEmail_StillReturns202()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/v1/auth/forgot-password",
            new { email = "nobody@example.com" });

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Fact]
    public async Task VerifyEmail_WithEmailedToken_MarksUserVerified()
    {
        var client = CreateClient();
        var (email, _, _) = await RegisterUser(client);

        var token = _factory.Emails.LastVerifyTokenFor(email);
        Assert.NotNull(token);

        var response = await client.PostAsJsonAsync("/api/v1/auth/verify-email", new { token });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True((await ReadJson(response)).GetProperty("emailVerified").GetBoolean());
    }

    [Fact]
    public async Task VerifyEmail_WithGarbageToken_Returns401()
    {
        var client = CreateClient();

        var response = await client.PostAsJsonAsync("/api/v1/auth/verify-email", new { token = "garbage" });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
