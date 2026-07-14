using AiWorkflow.Infrastructure.Identity;

namespace AiWorkflow.UnitTests.Infrastructure.Identity;

public class ApiKeyServiceTests
{
    private readonly ApiKeyService _service = new();

    [Fact]
    public void Generate_RawKey_HasFlowforgePrefix()
    {
        var generated = _service.Generate();

        Assert.StartsWith("ffk_", generated.RawKey, StringComparison.Ordinal);
    }

    [Fact]
    public void Generate_DisplayPrefix_IsShortAndMatchesRawKey()
    {
        var generated = _service.Generate();

        Assert.Equal(12, generated.Prefix.Length);
        Assert.StartsWith(generated.Prefix, generated.RawKey, StringComparison.Ordinal);
    }

    [Fact]
    public void Generate_HashMatchesRawKey_AndKeysAreUnique()
    {
        var first = _service.Generate();
        var second = _service.Generate();

        Assert.Equal(first.KeyHash, _service.Hash(first.RawKey));
        Assert.NotEqual(first.RawKey, second.RawKey);
        Assert.NotEqual(first.KeyHash, second.KeyHash);
    }
}
