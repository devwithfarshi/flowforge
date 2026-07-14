using System.ComponentModel.DataAnnotations;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>
/// Bound from the `Jwt` section (§11), validated on start. All values come from the
/// environment in production — see server/.env.example.
/// </summary>
public sealed class JwtOptions
{
    public const string SectionName = "Jwt";

    [Required]
    public string Issuer { get; init; } = default!;

    [Required]
    public string Audience { get; init; } = default!;

    /// <summary>HS256 signing key; must be at least 32 bytes (§11). Rotate periodically.</summary>
    [Required]
    [MinLength(32)]
    public string SigningKey { get; init; } = default!;

    [Range(1, 24 * 60)]
    public int AccessTokenMinutes { get; init; } = 15;

    [Range(1, 365)]
    public int RefreshTokenDays { get; init; } = 30;
}
