using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;
using AiWorkflow.Domain.Exceptions;

namespace AiWorkflow.UnitTests.Domain.Entities;

public class UserTests
{
    [Fact]
    public void Register_CreatesOwner_WithUnverifiedEmail()
    {
        var user = User.Register("Ada Lovelace", "ada@example.com", "hash", "#7c3aed");

        Assert.Equal(UserRole.Owner, user.Role);
        Assert.False(user.EmailVerified);
        Assert.Equal("hash", user.PasswordHash);
    }

    [Fact]
    public void RegisterExternal_HasNoPassword_AndVerifiedEmail()
    {
        var user = User.RegisterExternal("Ada Lovelace", "ada@example.com", "#7c3aed");

        Assert.Null(user.PasswordHash);
        Assert.True(user.EmailVerified);
        Assert.Equal(UserRole.Owner, user.Role);
    }

    [Fact]
    public void UpdateProfile_ChangesProfileFields_Only()
    {
        var user = User.Register("Ada", "ada@example.com", "hash", "#7c3aed");

        user.UpdateProfile("Ada Lovelace", "Engineer", "Analytical Engines", "First programmer");

        Assert.Equal("Ada Lovelace", user.Name);
        Assert.Equal("Engineer", user.JobTitle);
        Assert.Equal("Analytical Engines", user.Company);
        Assert.Equal("First programmer", user.Bio);
        Assert.Equal("ada@example.com", user.Email);
    }

    [Fact]
    public void SetPasswordHash_RejectsEmptyHash()
    {
        var user = User.Register("Ada", "ada@example.com", "hash", "#7c3aed");

        Assert.Throws<DomainException>(() => user.SetPasswordHash(""));
    }

    [Fact]
    public void VerifyEmail_SetsFlag()
    {
        var user = User.Register("Ada", "ada@example.com", "hash", "#7c3aed");

        user.VerifyEmail();

        Assert.True(user.EmailVerified);
    }
}
