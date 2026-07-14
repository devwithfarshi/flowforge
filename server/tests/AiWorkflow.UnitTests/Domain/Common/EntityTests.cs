using AiWorkflow.Domain.Common;

namespace AiWorkflow.UnitTests.Domain.Common;

public class EntityTests
{
    private sealed class TestEntity : Entity
    {
        public void RaiseEvent(DomainEvent e) => Raise(e);

        public void SetId(Guid id) => Id = id;
    }

    private sealed class OtherEntity : Entity
    {
        public void SetId(Guid id) => Id = id;
    }

    private sealed record TestEvent : DomainEvent;

    [Fact]
    public void NewEntity_GetsNonEmptyId()
    {
        var entity = new TestEntity();

        Assert.NotEqual(Guid.Empty, entity.Id);
    }

    [Fact]
    public void NewEntities_GetDistinctIds()
    {
        Assert.NotEqual(new TestEntity().Id, new TestEntity().Id);
    }

    [Fact]
    public void Raise_CollectsEvents_AndClearEvents_EmptiesThem()
    {
        var entity = new TestEntity();
        var domainEvent = new TestEvent();

        entity.RaiseEvent(domainEvent);

        var collected = Assert.Single(entity.DomainEvents);
        Assert.Same(domainEvent, collected);

        entity.ClearEvents();

        Assert.Empty(entity.DomainEvents);
    }

    [Fact]
    public void Entities_WithSameTypeAndId_AreEqual()
    {
        var id = Guid.CreateVersion7();
        var left = new TestEntity();
        var right = new TestEntity();
        left.SetId(id);
        right.SetId(id);

        Assert.Equal(left, right);
        Assert.Equal(left.GetHashCode(), right.GetHashCode());
    }

    [Fact]
    public void Entities_WithSameId_ButDifferentTypes_AreNotEqual()
    {
        var id = Guid.CreateVersion7();
        var left = new TestEntity();
        var right = new OtherEntity();
        left.SetId(id);
        right.SetId(id);

        Assert.False(left.Equals(right));
    }

    [Fact]
    public void Entities_WithDifferentIds_AreNotEqual()
    {
        Assert.NotEqual(new TestEntity(), new TestEntity());
    }
}
