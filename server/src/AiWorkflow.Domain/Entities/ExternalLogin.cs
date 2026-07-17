using AiWorkflow.Domain.Common;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// Links a <see cref="User"/> to a social identity provider (§4.5), e.g. Google.
/// Unique on (Provider, ProviderSubject) — one provider identity maps to exactly one
/// user, but a user may link multiple providers.
/// </summary>
public sealed class ExternalLogin : Entity
{
    public Guid UserId { get; private set; }

    public string Provider { get; private set; } = default!;

    public string ProviderSubject { get; private set; } = default!;

    public string Email { get; private set; } = default!;

    public DateTimeOffset CreatedAt { get; private set; }

    private ExternalLogin()
    {
    }

    public static ExternalLogin Link(Guid userId, string provider, string providerSubject, string email, DateTimeOffset now) => new()
    {
        UserId = userId,
        Provider = provider,
        ProviderSubject = providerSubject,
        Email = email,
        CreatedAt = now,
    };
}
