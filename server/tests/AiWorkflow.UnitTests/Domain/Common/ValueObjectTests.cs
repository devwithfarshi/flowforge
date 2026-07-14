using AiWorkflow.Domain.Common;

namespace AiWorkflow.UnitTests.Domain.Common;

public class ValueObjectTests
{
    private sealed class Address(string street, string city) : ValueObject
    {
        public string Street { get; } = street;

        public string City { get; } = city;

        protected override IEnumerable<object?> GetEqualityComponents()
        {
            yield return Street;
            yield return City;
        }
    }

    private sealed class Label(string value) : ValueObject
    {
        public string Value { get; } = value;

        protected override IEnumerable<object?> GetEqualityComponents()
        {
            yield return Value;
        }
    }

    [Fact]
    public void ValueObjects_WithSameComponents_AreEqual()
    {
        var left = new Address("1 Main St", "Dhaka");
        var right = new Address("1 Main St", "Dhaka");

        Assert.Equal(left, right);
        Assert.True(left == right);
        Assert.False(left != right);
        Assert.Equal(left.GetHashCode(), right.GetHashCode());
    }

    [Fact]
    public void ValueObjects_WithDifferentComponents_AreNotEqual()
    {
        var left = new Address("1 Main St", "Dhaka");
        var right = new Address("2 Main St", "Dhaka");

        Assert.NotEqual(left, right);
        Assert.True(left != right);
    }

    [Fact]
    public void ValueObjects_OfDifferentTypes_AreNotEqual_EvenWithSameComponents()
    {
        var address = new Label("x");
        var other = new Address("x", "x");

        Assert.False(address.Equals(other));
    }

    [Fact]
    public void NullComparisons_BehaveCorrectly()
    {
        var value = new Label("x");

        Assert.False(value == null);
        Assert.False(null == value);
        Assert.True((Label?)null == (Label?)null);
        Assert.False(value.Equals(null));
    }
}
