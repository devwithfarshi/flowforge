using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>"Continue with Google" contract tests (§4.5, follow-up to task 8).</summary>
[Collection(ApiCollection.Name)]
public class GoogleAuthTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private readonly ApiFactory _factory;

    public GoogleAuthTests(ApiFactory factory)
    {
        _factory = factory;
    }

    private HttpClient CreateClient() =>
        _factory.CreateClient(new WebApplicationFactoryClientOptions { HandleCookies = false });

    private static string UniqueEmail() => $"user-{Guid.NewGuid():N}@example.com";

    private static async Task<JsonElement> ReadJson(HttpResponseMessage response) =>
        (await response.Content.ReadFromJsonAsync<JsonElement>(Json))!;

    private static Task<HttpResponseMessage> PostGoogle(HttpClient client, string idToken) =>
        client.PostAsJsonAsync("/api/v1/auth/google", new { idToken });

    [Fact]
    public async Task NewGoogleIdentity_CreatesVerifiedAccount()
    {
        var client = CreateClient();
        var email = UniqueEmail();
        var token = FakeGoogleIdTokenValidator.Token(Guid.NewGuid().ToString(), email, emailVerified: true, "Ada Lovelace");

        var response = await PostGoogle(client, token);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var user = (await ReadJson(response)).GetProperty("user");
        Assert.Equal(email, user.GetProperty("email").GetString());
        Assert.Equal("Ada Lovelace", user.GetProperty("name").GetString());
        Assert.True(user.GetProperty("emailVerified").GetBoolean());

        var setCookie = response.Headers.GetValues("Set-Cookie").Single(c => c.StartsWith("ff_refresh="));
        Assert.Contains("httponly", setCookie, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task SameGoogleSubject_SignsIntoTheSameAccount()
    {
        var client = CreateClient();
        var sub = Guid.NewGuid().ToString();
        var token = FakeGoogleIdTokenValidator.Token(sub, UniqueEmail(), emailVerified: true, "Grace Hopper");

        var first = await ReadJson(await PostGoogle(client, token));
        var second = await ReadJson(await PostGoogle(client, token));

        Assert.Equal(
            first.GetProperty("user").GetProperty("id").GetString(),
            second.GetProperty("user").GetProperty("id").GetString());
    }

    [Fact]
    public async Task VerifiedGoogleEmail_LinksToExistingAccount_InsteadOfDuplicating()
    {
        var client = CreateClient();
        var email = UniqueEmail();

        var register = await client.PostAsJsonAsync(
            "/api/v1/auth/register", new { name = "Existing User", email, password = "s3cure-Pass!" });
        var existingUserId = (await ReadJson(register)).GetProperty("user").GetProperty("id").GetString();

        var token = FakeGoogleIdTokenValidator.Token(Guid.NewGuid().ToString(), email, emailVerified: true, "Existing User");
        var google = await PostGoogle(client, token);

        Assert.Equal(HttpStatusCode.OK, google.StatusCode);
        var googleUser = (await ReadJson(google)).GetProperty("user");
        Assert.Equal(existingUserId, googleUser.GetProperty("id").GetString());

        // The password login still works — Google linked into the account, it didn't replace it.
        var login = await client.PostAsJsonAsync("/api/v1/auth/login", new { email, password = "s3cure-Pass!" });
        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
    }

    [Fact]
    public async Task UnverifiedGoogleEmail_MatchingExistingAccount_Returns409()
    {
        var client = CreateClient();
        var email = UniqueEmail();

        await client.PostAsJsonAsync(
            "/api/v1/auth/register", new { name = "Existing User", email, password = "s3cure-Pass!" });

        var token = FakeGoogleIdTokenValidator.Token(Guid.NewGuid().ToString(), email, emailVerified: false, "Impersonator");
        var response = await PostGoogle(client, token);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task MalformedToken_Returns401()
    {
        var client = CreateClient();

        var response = await PostGoogle(client, "not-a-real-token");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task EmptyToken_Returns400()
    {
        var client = CreateClient();

        var response = await PostGoogle(client, "");

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
