namespace AiWorkflow.Domain.Common;

/// <summary>
/// Entity with audit timestamps, stamped by the persistence auditing interceptor
/// (never set by handlers). Always UTC (§3.3: timestamptz everywhere).
/// </summary>
public abstract class AuditableEntity : Entity
{
    public DateTimeOffset CreatedAt { get; set; }

    public DateTimeOffset? UpdatedAt { get; set; }
}
