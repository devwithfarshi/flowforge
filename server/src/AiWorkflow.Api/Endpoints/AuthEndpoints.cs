using AiWorkflow.Application.Auth;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class AuthEndpoints
{
    /// <summary>Refresh-token cookie (§4.1): HttpOnly + SameSite=Strict, scoped to /api/v1/auth.</summary>
    private const string RefreshCookieName = "ff_refresh";
    private const string RefreshCookiePath = "/api/v1/auth";

    public sealed record RegisterRequest(string Name, string Email, string Password);

    public sealed record LoginRequest(string Email, string Password, bool RememberMe = false);

    public sealed record ForgotPasswordRequest(string Email);

    public sealed record ResetPasswordRequest(string Token, string Password);

    public sealed record VerifyEmailRequest(string Token);

    /// <summary>`{ accessToken, user }` per the login/refresh sequence (§4.2).</summary>
    public sealed record AuthResponse(string AccessToken, DateTimeOffset AccessTokenExpiresAt, UserDto User);

    public sealed record RefreshResponse(string AccessToken, DateTimeOffset AccessTokenExpiresAt);

    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/auth")
            .WithTags("Auth")
            .RequireRateLimiting("auth");

        group.MapPost("/register", async (RegisterRequest request, HttpContext http, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(
                new RegisterCommand(request.Name, request.Email, request.Password, ResolveClient(http)), ct);
            SetRefreshCookie(http, result);
            return Results.Created("/api/v1/auth/me", new AuthResponse(result.AccessToken, result.AccessTokenExpiresAt, result.User));
        });

        group.MapPost("/login", async (LoginRequest request, HttpContext http, IMediator mediator, CancellationToken ct) =>
        {
            var result = await mediator.Send(
                new LoginCommand(request.Email, request.Password, request.RememberMe, ResolveClient(http)), ct);
            SetRefreshCookie(http, result);
            return Results.Ok(new AuthResponse(result.AccessToken, result.AccessTokenExpiresAt, result.User));
        });

        group.MapPost("/refresh", async (HttpContext http, IMediator mediator, CancellationToken ct) =>
        {
            var refreshToken = http.Request.Cookies[RefreshCookieName] ?? "";
            var result = await mediator.Send(new RefreshSessionCommand(refreshToken, ResolveClient(http)), ct);
            SetRefreshCookie(http, result);
            return Results.Ok(new RefreshResponse(result.AccessToken, result.AccessTokenExpiresAt));
        });

        group.MapPost("/logout", async (HttpContext http, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new LogoutCommand(http.Request.Cookies[RefreshCookieName]), ct);
            http.Response.Cookies.Delete(RefreshCookieName, new CookieOptions { Path = RefreshCookiePath });
            return Results.NoContent();
        });

        group.MapGet("/me", async (IMediator mediator, CancellationToken ct) =>
                Results.Ok(await mediator.Send(new GetCurrentUserQuery(), ct)))
            .RequireAuthorization();

        group.MapPost("/forgot-password", async (ForgotPasswordRequest request, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new ForgotPasswordCommand(request.Email), ct);
            return Results.Accepted(); // uniform response — never leaks account existence (§4.3)
        });

        group.MapPost("/reset-password", async (ResetPasswordRequest request, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new ResetPasswordCommand(request.Token, request.Password), ct);
            return Results.NoContent();
        });

        group.MapPost("/verify-email", async (VerifyEmailRequest request, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new VerifyEmailCommand(request.Token), ct)));

        return app;
    }

    private static void SetRefreshCookie(HttpContext http, AuthResult result)
    {
        http.Response.Cookies.Append(RefreshCookieName, result.RefreshToken, new CookieOptions
        {
            HttpOnly = true,
            Secure = http.Request.IsHttps,
            SameSite = SameSiteMode.Strict,
            Path = RefreshCookiePath,
            // rememberMe → persistent cookie; otherwise session-scoped (token row keeps its own TTL).
            Expires = result.RememberMe ? result.RefreshTokenExpiresAt : null,
        });
    }

    /// <summary>Best-effort device metadata for the sessions UI; geo lookup comes later.</summary>
    private static ClientInfo ResolveClient(HttpContext http)
    {
        var userAgent = http.Request.Headers.UserAgent.ToString();

        var os = userAgent switch
        {
            _ when userAgent.Contains("Windows") => "Windows",
            _ when userAgent.Contains("Android") => "Android",
            _ when userAgent.Contains("iPhone") || userAgent.Contains("iPad") => "iOS",
            _ when userAgent.Contains("Mac") => "macOS",
            _ when userAgent.Contains("Linux") => "Linux",
            _ => "Unknown",
        };

        var browser = userAgent switch
        {
            _ when userAgent.Contains("Edg/") => "Edge",
            _ when userAgent.Contains("OPR/") => "Opera",
            _ when userAgent.Contains("Chrome/") => "Chrome",
            _ when userAgent.Contains("Firefox/") => "Firefox",
            _ when userAgent.Contains("Safari/") => "Safari",
            _ => "Unknown",
        };

        var device = userAgent.Contains("Mobile") ? "Mobile" : "Desktop";
        var ip = http.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        return new ClientInfo(device, browser, os, ip, "Unknown");
    }
}
