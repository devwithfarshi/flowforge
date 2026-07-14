namespace AiWorkflow.Domain.Common;

/// <summary>
/// Base entity: uuid v7 identity (time-ordered for index locality, §3.3) plus
/// domain-event collection. Identity-based equality — two entities are equal
/// iff they are the same type with the same Id.
/// </summary>
public abstract class Entity : IEquatable<Entity>
{
    private readonly List<DomainEvent> _events = [];

    public Guid Id { get; protected set; } = Guid.CreateVersion7();

    public IReadOnlyList<DomainEvent> DomainEvents => _events;

    protected void Raise(DomainEvent e) => _events.Add(e);

    public void ClearEvents() => _events.Clear();

    public bool Equals(Entity? other) =>
        other is not null
        && (ReferenceEquals(this, other) || (other.GetType() == GetType() && other.Id == Id));

    public override bool Equals(object? obj) => Equals(obj as Entity);

    public override int GetHashCode() => Id.GetHashCode();
}
