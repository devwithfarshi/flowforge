namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Signed, single-purpose, time-limited account tokens (§4.3) for password reset and
/// email verification. Validate methods return the user id, or null when the token is
/// invalid/expired — never throw, so responses can't leak account existence.
/// </summary>
public interface IAccountTokenService
{
    string CreatePasswordResetToken(Guid userId);

    Guid? ValidatePasswordResetToken(string token);

    string CreateEmailVerificationToken(Guid userId);

    Guid? ValidateEmailVerificationToken(string token);
}
