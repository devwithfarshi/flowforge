using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Microsoft.AspNetCore.Identity;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>
/// Wraps ASP.NET Core Identity's PasswordHasher (§4.3): PBKDF2 with per-hash salt
/// and a high iteration count, self-describing hash format (safe to re-tune later).
/// </summary>
public sealed class PasswordHasher : IPasswordHasher
{
    private readonly PasswordHasher<User> _inner = new();

    public string Hash(string password) => _inner.HashPassword(user: null!, password);

    public bool Verify(string passwordHash, string providedPassword) =>
        _inner.VerifyHashedPassword(user: null!, passwordHash, providedPassword)
            is PasswordVerificationResult.Success or PasswordVerificationResult.SuccessRehashNeeded;
}
