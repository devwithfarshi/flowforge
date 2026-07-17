namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>The claims Flowforge trusts from a validated Google ID token (§4.5).</summary>
public sealed record GoogleIdentity(string Subject, string Email, bool EmailVerified, string Name);

/// <summary>
/// Validates a Google ID token against Google's JWKS (signature, aud, iss, exp — §4.5).
/// Implementations must throw <see cref="Exceptions.UnauthorizedException"/> on any
/// validation failure — the raw token is never trusted client-side.
/// </summary>
public interface IGoogleIdTokenValidator
{
    Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken ct = default);
}
