namespace AiWorkflow.Domain.Common;

/// <summary>
/// Base for all domain events. Events are raised by entities via <see cref="Entity.Raise"/>,
/// collected on the entity, and dispatched after the unit of work commits.
/// </summary>
public abstract record DomainEvent
{
    public DateTimeOffset OccurredAt { get; init; } = DateTimeOffset.UtcNow;
}
