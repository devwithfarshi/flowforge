using System.Security.Claims;
using System.Text.Encodings.Web;

using AiWorkflow.Application.Common.Interfaces;

using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace AiWorkflow.Api.Authentication;

/// <summary>
/// Second authentication scheme (§4.4): X-Api-Key → hash → api_keys lookup → principal
/// carrying the key's scopes. Revoked keys stop authenticating immediately.
/// </summary>
public sealed class ApiKeyAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IServiceScopeFactory scopeFactory)
    : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    public const string SchemeName = "ApiKey";
    public const string HeaderName = "X-Api-Key";
    public const string SchemeClaim = "auth_scheme";
    public const string ScopeClaim = "scope";

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!Request.Headers.TryGetValue(HeaderName, out var header) || string.IsNullOrWhiteSpace(header))
        {
            return AuthenticateResult.NoResult();
        }

        // The handler outlives a request scope — resolve scoped services explicitly.
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
        var apiKeyService = scope.ServiceProvider.GetRequiredService<IApiKeyService>();
        var clock = scope.ServiceProvider.GetRequiredService<IDateTime>();

        var keyHash = apiKeyService.Hash(header.ToString());
        var apiKey = await db.ApiKeys.FirstOrDefaultAsync(
            k => k.KeyHash == keyHash && k.RevokedAt == null, Context.RequestAborted);

        if (apiKey is null)
        {
            return AuthenticateResult.Fail("Invalid API key");
        }

        // Throttled usage stamp: at most one write per minute per key.
        var now = clock.UtcNow;
        if (apiKey.LastUsedAt is null || now - apiKey.LastUsedAt > TimeSpan.FromMinutes(1))
        {
            apiKey.Touch(now);
            await db.SaveChangesAsync(Context.RequestAborted);
        }

        var claims = new List<Claim>
        {
            new("sub", apiKey.UserId.ToString()),
            new(SchemeClaim, "apikey"),
        };
        claims.AddRange(apiKey.Scopes.Select(s => new Claim(ScopeClaim, s)));

        var identity = new ClaimsIdentity(claims, SchemeName, nameType: "sub", roleType: "role");
        var ticket = new AuthenticationTicket(new ClaimsPrincipal(identity), SchemeName);

        return AuthenticateResult.Success(ticket);
    }
}
