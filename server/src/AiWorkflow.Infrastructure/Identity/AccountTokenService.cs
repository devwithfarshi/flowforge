using System.Security.Cryptography;

using AiWorkflow.Application.Common.Interfaces;

using Microsoft.AspNetCore.DataProtection;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>
/// Signed, time-limited account tokens via Data Protection (§4.3). Purpose strings
/// isolate the two token kinds; lifetimes are deliberately short.
/// </summary>
public sealed class AccountTokenService(IDataProtectionProvider provider) : IAccountTokenService
{
    private static readonly TimeSpan ResetTokenLifetime = TimeSpan.FromHours(1);
    private static readonly TimeSpan VerifyTokenLifetime = TimeSpan.FromDays(3);

    private readonly ITimeLimitedDataProtector _resetProtector =
        provider.CreateProtector("Flowforge.Auth.PasswordReset").ToTimeLimitedDataProtector();

    private readonly ITimeLimitedDataProtector _verifyProtector =
        provider.CreateProtector("Flowforge.Auth.EmailVerification").ToTimeLimitedDataProtector();

    public string CreatePasswordResetToken(Guid userId) =>
        _resetProtector.Protect(userId.ToString(), ResetTokenLifetime);

    public Guid? ValidatePasswordResetToken(string token) => Unprotect(_resetProtector, token);

    public string CreateEmailVerificationToken(Guid userId) =>
        _verifyProtector.Protect(userId.ToString(), VerifyTokenLifetime);

    public Guid? ValidateEmailVerificationToken(string token) => Unprotect(_verifyProtector, token);

    private static Guid? Unprotect(ITimeLimitedDataProtector protector, string token)
    {
        try
        {
            return Guid.Parse(protector.Unprotect(token));
        }
        catch (Exception e) when (e is CryptographicException or FormatException)
        {
            return null; // invalid, tampered, or expired — callers respond uniformly (§4.3)
        }
    }
}
