using AiWorkflow.Infrastructure.Identity;

namespace AiWorkflow.UnitTests.Infrastructure.Identity;

public class PasswordHasherTests
{
    private readonly PasswordHasher _hasher = new();

    [Fact]
    public void Hash_ThenVerify_Succeeds()
    {
        var hash = _hasher.Hash("correct horse battery staple");

        Assert.True(_hasher.Verify(hash, "correct horse battery staple"));
    }

    [Fact]
    public void Verify_WrongPassword_Fails()
    {
        var hash = _hasher.Hash("correct horse battery staple");

        Assert.False(_hasher.Verify(hash, "wrong password"));
    }

    [Fact]
    public void Hash_IsSalted_SamePasswordDiffersPerHash()
    {
        var first = _hasher.Hash("password");
        var second = _hasher.Hash("password");

        Assert.NotEqual(first, second);
    }

    [Fact]
    public void Hash_NeverStoresPlaintext()
    {
        var hash = _hasher.Hash("password");

        Assert.DoesNotContain("password", hash, StringComparison.OrdinalIgnoreCase);
    }
}
