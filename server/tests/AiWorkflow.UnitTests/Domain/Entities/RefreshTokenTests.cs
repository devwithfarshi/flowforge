using AiWorkflow.Domain.Entities;

namespace AiWorkflow.UnitTests.Domain.Entities;

public class RefreshTokenTests
{
    private static readonly DateTimeOffset Now = new(2026, 7, 14, 12, 0, 0, TimeSpan.Zero);

    private static RefreshToken IssueToken() => RefreshToken.Issue(
        userId: Guid.CreateVersion7(),
        tokenHash: "hash",
        familyId: Guid.CreateVersion7(),
        device: "Desktop",
        browser: "Firefox",
        os: "Linux",
        ip: "127.0.0.1",
        location: "Dhaka, BD",
        expiresAt: Now.AddDays(30),
        now: Now);

    [Fact]
    public void FreshToken_IsActive()
    {
        var token = IssueToken();

        Assert.True(token.IsActive(Now));
        Assert.False(token.WasRotated);
    }

    [Fact]
    public void ExpiredToken_IsNotActive()
    {
        var token = IssueToken();

        Assert.False(token.IsActive(Now.AddDays(31)));
    }

    [Fact]
    public void RevokedToken_IsNotActive()
    {
        var token = IssueToken();

        token.Revoke(Now);

        Assert.False(token.IsActive(Now));
        Assert.Equal(Now, token.RevokedAt);
    }

    [Fact]
    public void Revoke_IsIdempotent_KeepsFirstTimestamp()
    {
        var token = IssueToken();

        token.Revoke(Now);
        token.Revoke(Now.AddHours(1));

        Assert.Equal(Now, token.RevokedAt);
    }

    [Fact]
    public void MarkReplaced_RevokesAndLinksSuccessor()
    {
        var token = IssueToken();
        var successorId = Guid.CreateVersion7();

        token.MarkReplaced(successorId, Now);

        Assert.True(token.WasRotated);
        Assert.Equal(successorId, token.ReplacedBy);
        Assert.False(token.IsActive(Now));
    }
}
