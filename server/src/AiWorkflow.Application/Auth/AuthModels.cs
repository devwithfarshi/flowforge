using AiWorkflow.Domain.Entities;

using Mapster;

namespace AiWorkflow.Application.Auth;

/// <summary>Serializes to the frontend's `PublicUser` shape (client/src/lib/types.ts).</summary>
public sealed record UserDto(
    Guid Id,
    string Name,
    string Email,
    string Role,
    string AvatarColor,
    string? JobTitle,
    string? Company,
    string? Bio,
    bool EmailVerified,
    DateTimeOffset CreatedAt);

/// <summary>Device metadata captured per session, resolved by the Api layer (§3.2 refresh_tokens).</summary>
public sealed record ClientInfo(string Device, string Browser, string Os, string Ip, string Location);

/// <summary>
/// Everything a signed-in session needs: the endpoint returns the access token + user
/// and delivers <see cref="RefreshToken"/> via an HttpOnly cookie (§4.1) — the raw
/// refresh value never appears in a response body.
/// </summary>
public sealed record AuthResult(
    UserDto User,
    string AccessToken,
    DateTimeOffset AccessTokenExpiresAt,
    string RefreshToken,
    DateTimeOffset RefreshTokenExpiresAt,
    bool RememberMe);

public sealed class AuthMappings : IRegister
{
    public void Register(TypeAdapterConfig config) =>
        config.NewConfig<User, UserDto>()
            .Map(dest => dest.Role, src => src.Role.ToString());
}
