using System.ComponentModel.DataAnnotations;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>
/// Bound from the `Google` section (§11), validated on start. The client ID is the
/// only value the ID-token flow needs (§4.5) — see server/.env.example.
/// </summary>
public sealed class GoogleOptions
{
    public const string SectionName = "Google";

    /// <summary>Expected `aud` claim on incoming ID tokens (Google Cloud Console OAuth client ID).</summary>
    [Required]
    public string ClientId { get; init; } = default!;
}
