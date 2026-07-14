using AiWorkflow.Infrastructure.Identity;

using Microsoft.Extensions.Options;

namespace AiWorkflow.UnitTests.Infrastructure.Identity;

public class RefreshTokenServiceTests
{
    private static RefreshTokenService CreateService(int refreshTokenDays = 30) => new(
        Options.Create(new JwtOptions
        {
            Issuer = "test",
            Audience = "test",
            SigningKey = new string('k', 32),
            RefreshTokenDays = refreshTokenDays,
        }));

    [Fact]
    public void Generate_ReturnsRawToken_WithMatchingHash()
    {
        var service = CreateService();

        var generated = service.Generate();

        Assert.NotEqual(generated.RawToken, generated.TokenHash);
        Assert.Equal(generated.TokenHash, service.Hash(generated.RawToken));
    }

    [Fact]
    public void Generate_ProducesUniqueTokens()
    {
        var service = CreateService();

        Assert.NotEqual(service.Generate().RawToken, service.Generate().RawToken);
    }

    [Fact]
    public void Hash_IsDeterministic_AndHexSha256()
    {
        var service = CreateService();

        var hash = service.Hash("some-token");

        Assert.Equal(service.Hash("some-token"), hash);
        Assert.Equal(64, hash.Length);
        Assert.Matches("^[0-9a-f]+$", hash);
    }

    [Fact]
    public void Lifetime_ComesFromConfiguration()
    {
        Assert.Equal(TimeSpan.FromDays(7), CreateService(refreshTokenDays: 7).Lifetime);
    }
}
