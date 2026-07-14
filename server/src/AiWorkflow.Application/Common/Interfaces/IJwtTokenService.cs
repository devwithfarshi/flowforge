using AiWorkflow.Domain.Entities;

namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>Result of minting an access token: the JWT plus its expiry instant.</summary>
public sealed record AccessToken(string Token, DateTimeOffset ExpiresAt);

/// <summary>
/// Mints short-lived JWT access tokens (§4.1): claims sub, email, role, jti, sid, iat, exp.
/// `sid` is the refresh-token row id — the device session this access token belongs to,
/// used for "current session" detection on /sessions and change-password (§5).
/// Validation is handled by the JWT bearer middleware, not this service.
/// </summary>
public interface IJwtTokenService
{
    AccessToken CreateAccessToken(User user, Guid sessionId);
}
