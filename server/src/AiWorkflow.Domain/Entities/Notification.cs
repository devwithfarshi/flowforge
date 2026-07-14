using AiWorkflow.Domain.Common;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// System-emitted user notification (§7). Types mirror the frontend union
/// (workflow_completed, workflow_failed, integration, system, info).
/// </summary>
public sealed class Notification : Entity
{
    public Guid UserId { get; private set; }

    public string Type { get; private set; } = default!;

    public string Title { get; private set; } = default!;

    public string Message { get; private set; } = default!;

    public string? Href { get; private set; }

    public bool IsRead { get; private set; }

    public bool IsArchived { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    private Notification()
    {
    }

    public static Notification Push(
        Guid userId, string type, string title, string message, string? href, DateTimeOffset now) => new()
        {
            UserId = userId,
            Type = type,
            Title = title,
            Message = message,
            Href = href,
            CreatedAt = now,
        };

    public void MarkRead(bool read = true) => IsRead = read;

    /// <summary>Archiving also marks as read, mirroring the mock.</summary>
    public void SetArchived(bool archived)
    {
        IsArchived = archived;
        if (archived)
        {
            IsRead = true;
        }
    }
}

/// <summary>
/// Audit trail entry (§7): who/what/when snapshots — immutable once written.
/// Categories mirror the frontend union (workflow, auth, integration, variable, system, user).
/// </summary>
public sealed class ActivityEntry : Entity
{
    public Guid ActorId { get; private set; }

    public string ActorName { get; private set; } = default!;

    public string Action { get; private set; } = default!;

    public string Target { get; private set; } = default!;

    public string Category { get; private set; } = default!;

    public string? Meta { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    private ActivityEntry()
    {
    }

    public static ActivityEntry Log(
        Guid actorId, string actorName, string action, string target, string category, DateTimeOffset now) => new()
        {
            ActorId = actorId,
            ActorName = actorName,
            Action = action,
            Target = target,
            Category = category,
            CreatedAt = now,
        };
}
