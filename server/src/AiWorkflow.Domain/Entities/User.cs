using AiWorkflow.Domain.Common;
using AiWorkflow.Domain.Enums;
using AiWorkflow.Domain.Exceptions;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// Account aggregate. <see cref="PasswordHash"/> is nullable — Google-only users
/// have no password (§4.5). Email uniqueness is case-insensitive (citext, §3.3).
/// </summary>
public sealed class User : AggregateRoot
{
    public string Name { get; private set; } = default!;

    public string Email { get; private set; } = default!;

    public string? PasswordHash { get; private set; }

    public UserRole Role { get; private set; }

    public string AvatarColor { get; private set; } = default!;

    public string? JobTitle { get; private set; }

    public string? Company { get; private set; }

    public string? Bio { get; private set; }

    public bool EmailVerified { get; private set; }

    private User()
    {
    }

    public static User Register(string name, string email, string? passwordHash, string avatarColor) => new()
    {
        Name = name,
        Email = email,
        PasswordHash = passwordHash,
        Role = UserRole.Owner,
        AvatarColor = avatarColor,
        EmailVerified = false,
    };

    /// <summary>Google-verified sign-up: no password, email already verified (§4.5).</summary>
    public static User RegisterExternal(string name, string email, string avatarColor)
    {
        var user = Register(name, email, passwordHash: null, avatarColor);
        user.EmailVerified = true;
        return user;
    }

    public void UpdateProfile(string name, string? jobTitle, string? company, string? bio)
    {
        Name = name;
        JobTitle = jobTitle;
        Company = company;
        Bio = bio;
    }

    public void SetPasswordHash(string passwordHash)
    {
        if (string.IsNullOrWhiteSpace(passwordHash))
        {
            throw new DomainException("Password hash cannot be empty.");
        }

        PasswordHash = passwordHash;
    }

    public void VerifyEmail() => EmailVerified = true;

    public void SetRole(UserRole role) => Role = role;
}
