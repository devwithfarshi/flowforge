using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;
using AiWorkflow.Infrastructure.Identity;

using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;

namespace AiWorkflow.UnitTests.Infrastructure.Identity;

public class JwtTokenServiceTests
{
    private sealed class FixedClock(DateTimeOffset now) : IDateTime
    {
        public DateTimeOffset UtcNow { get; } = now;
    }

    private static readonly DateTimeOffset Now = new(2026, 7, 14, 12, 0, 0, TimeSpan.Zero);

    private static JwtTokenService CreateService(int accessTokenMinutes = 15) => new(
        Options.Create(new JwtOptions
        {
            Issuer = "flowforge-api",
            Audience = "flowforge-client",
            SigningKey = new string('k', 32),
            AccessTokenMinutes = accessTokenMinutes,
        }),
        new FixedClock(Now));

    [Fact]
    public void CreateAccessToken_CarriesExpectedClaims()
    {
        var user = User.Register("Ada", "ada@example.com", "hash", "#7c3aed");

        var accessToken = CreateService().CreateAccessToken(user);

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(accessToken.Token);
        Assert.Equal(user.Id.ToString(), jwt.Subject);
        Assert.Equal("ada@example.com", jwt.GetClaim("email").Value);
        Assert.Equal("Owner", jwt.GetClaim("role").Value);
        Assert.NotEmpty(jwt.GetClaim("jti").Value);
        Assert.Equal("flowforge-api", jwt.Issuer);
        Assert.Contains("flowforge-client", jwt.Audiences);
    }

    [Fact]
    public void CreateAccessToken_ExpiresPerConfiguration()
    {
        var user = User.Register("Ada", "ada@example.com", "hash", "#7c3aed");

        var accessToken = CreateService(accessTokenMinutes: 15).CreateAccessToken(user);

        Assert.Equal(Now.AddMinutes(15), accessToken.ExpiresAt);

        var jwt = new JsonWebTokenHandler().ReadJsonWebToken(accessToken.Token);
        Assert.Equal(Now.AddMinutes(15).UtcDateTime, jwt.ValidTo, TimeSpan.FromSeconds(1));
    }

    [Fact]
    public void CreateAccessToken_JtiIsUniquePerToken()
    {
        var user = User.Register("Ada", "ada@example.com", "hash", "#7c3aed");
        var service = CreateService();
        var handler = new JsonWebTokenHandler();

        var first = handler.ReadJsonWebToken(service.CreateAccessToken(user).Token);
        var second = handler.ReadJsonWebToken(service.CreateAccessToken(user).Token);

        Assert.NotEqual(first.GetClaim("jti").Value, second.GetClaim("jti").Value);
    }
}
