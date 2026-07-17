using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Mapster;

namespace AiWorkflow.Application.Auth;

/// <summary>
/// Shared by register/login/refresh: mints an access token, generates a refresh token
/// (storing only its hash, §4.1), and packages the <see cref="AuthResult"/>.
/// </summary>
internal static class SessionIssuer
{
    // Mirrors the frontend AVATAR palette (client/src/lib/api.ts).
    private static readonly string[] AvatarPalette =
        ["#2563eb", "#7c3aed", "#db2777", "#059669", "#d97706", "#0891b2"];

    /// <summary>Deterministic avatar color assignment for new accounts, by registration order.</summary>
    public static string NextAvatarColor(int userCount) => AvatarPalette[userCount % AvatarPalette.Length];

    public static (RefreshToken Entity, AuthResult Result) Issue(
        User user,
        Guid familyId,
        ClientInfo client,
        bool rememberMe,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IDateTime clock)
    {
        var generated = refreshTokenService.Generate();
        var now = clock.UtcNow;
        var expiresAt = now.Add(refreshTokenService.Lifetime);

        var entity = RefreshToken.Issue(
            user.Id,
            generated.TokenHash,
            familyId,
            client.Device,
            client.Browser,
            client.Os,
            client.Ip,
            client.Location,
            expiresAt,
            now);

        // Access token carries sid = this session's row id (current-session detection, §5).
        var accessToken = jwtTokenService.CreateAccessToken(user, entity.Id);

        var result = new AuthResult(
            user.Adapt<UserDto>(),
            accessToken.Token,
            accessToken.ExpiresAt,
            generated.RawToken,
            expiresAt,
            rememberMe);

        return (entity, result);
    }
}
