namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>A freshly generated refresh token: the raw value leaves the API exactly once (§4.1).</summary>
public sealed record GeneratedRefreshToken(string RawToken, string TokenHash);

/// <summary>
/// Refresh-token primitives (§4.1): opaque 256-bit random values; only the SHA-256
/// hash is stored. Rotation/reuse-detection flows live in the Auth handlers.
/// </summary>
public interface IRefreshTokenService
{
    GeneratedRefreshToken Generate();

    /// <summary>Hash a presented raw token for storage lookup.</summary>
    string Hash(string rawToken);

    /// <summary>Refresh-token lifetime from configuration (Jwt__RefreshTokenDays).</summary>
    TimeSpan Lifetime { get; }
}
