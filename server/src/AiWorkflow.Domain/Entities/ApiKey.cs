using AiWorkflow.Domain.Common;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// Machine-access key (§4.4/§15): only the SHA-256 hash is stored; the display prefix
/// and a masked token identify the key in the UI. Revocation is soft (revoked_at).
/// </summary>
public sealed class ApiKey : Entity
{
    public Guid UserId { get; private set; }

    public string Name { get; private set; } = default!;

    public string Prefix { get; private set; } = default!;

    public string MaskedToken { get; private set; } = default!;

    public string KeyHash { get; private set; } = default!;

    public List<string> Scopes { get; private set; } = [];

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset? LastUsedAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public bool IsActive => RevokedAt is null;

    private ApiKey()
    {
    }

    public static ApiKey Issue(
        Guid userId,
        string name,
        string prefix,
        string maskedToken,
        string keyHash,
        List<string> scopes,
        DateTimeOffset now) => new()
        {
            UserId = userId,
            Name = name,
            Prefix = prefix,
            MaskedToken = maskedToken,
            KeyHash = keyHash,
            Scopes = scopes,
            CreatedAt = now,
        };

    public void Touch(DateTimeOffset now) => LastUsedAt = now;

    public void Revoke(DateTimeOffset now) => RevokedAt ??= now;
}
