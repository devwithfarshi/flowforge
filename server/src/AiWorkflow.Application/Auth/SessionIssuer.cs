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
    public static (RefreshToken Entity, AuthResult Result) Issue(
        User user,
        Guid familyId,
        ClientInfo client,
        bool rememberMe,
        IJwtTokenService jwtTokenService,
        IRefreshTokenService refreshTokenService,
        IDateTime clock)
    {
        var accessToken = jwtTokenService.CreateAccessToken(user);
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
