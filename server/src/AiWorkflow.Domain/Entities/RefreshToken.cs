using AiWorkflow.Domain.Common;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// One rotating refresh token (§4.1): only the SHA-256 hash is stored; tokens issued
/// by refreshing share a <see cref="FamilyId"/> so replay of a rotated token revokes
/// the whole family. An active token doubles as a device session (§3.2 note).
/// </summary>
public sealed class RefreshToken : Entity
{
    public Guid UserId { get; private set; }

    public string TokenHash { get; private set; } = default!;

    public Guid FamilyId { get; private set; }

    public string Device { get; private set; } = default!;

    public string Browser { get; private set; } = default!;

    public string Os { get; private set; } = default!;

    public string Ip { get; private set; } = default!;

    public string Location { get; private set; } = default!;

    public DateTimeOffset ExpiresAt { get; private set; }

    public DateTimeOffset? RevokedAt { get; private set; }

    public Guid? ReplacedBy { get; private set; }

    public DateTimeOffset? LastUsedAt { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    private RefreshToken()
    {
    }

    public static RefreshToken Issue(
        Guid userId,
        string tokenHash,
        Guid familyId,
        string device,
        string browser,
        string os,
        string ip,
        string location,
        DateTimeOffset expiresAt,
        DateTimeOffset now) => new()
        {
            UserId = userId,
            TokenHash = tokenHash,
            FamilyId = familyId,
            Device = device,
            Browser = browser,
            Os = os,
            Ip = ip,
            Location = location,
            ExpiresAt = expiresAt,
            CreatedAt = now,
            LastUsedAt = now,
        };

    public bool IsActive(DateTimeOffset now) => RevokedAt is null && ExpiresAt > now;

    /// <summary>True when this token was already rotated — presenting it again is replay (§4.1).</summary>
    public bool WasRotated => ReplacedBy is not null;

    public void Revoke(DateTimeOffset now) => RevokedAt ??= now;

    public void MarkReplaced(Guid successorId, DateTimeOffset now)
    {
        ReplacedBy = successorId;
        Revoke(now);
    }

    public void Touch(DateTimeOffset now) => LastUsedAt = now;
}
