namespace AiWorkflow.Domain.Common;

/// <summary>
/// Marker base for aggregate roots — the only entities repositories load and save
/// directly. Everything inside an aggregate changes through its root, which is
/// also where domain events for the aggregate are raised.
/// </summary>
public abstract class AggregateRoot : AuditableEntity;
