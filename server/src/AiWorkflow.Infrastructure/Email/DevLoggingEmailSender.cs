using AiWorkflow.Application.Common.Interfaces;

using Microsoft.Extensions.Logging;

namespace AiWorkflow.Infrastructure.Email;

/// <summary>
/// Development stand-in until a real SMTP/SendGrid sender is wired (§2.2 Email/):
/// logs the token instead of sending mail so local flows are testable end-to-end.
/// Never use in production — tokens must not reach logs there (§10.3).
/// </summary>
public sealed class DevLoggingEmailSender(ILogger<DevLoggingEmailSender> logger) : IEmailSender
{
    public Task SendPasswordResetAsync(string email, string token, CancellationToken ct = default)
    {
        logger.LogWarning("DEV EMAIL — password reset for {Email}. Token: {Token}", email, token);
        return Task.CompletedTask;
    }

    public Task SendEmailVerificationAsync(string email, string token, CancellationToken ct = default)
    {
        logger.LogWarning("DEV EMAIL — verify email for {Email}. Token: {Token}", email, token);
        return Task.CompletedTask;
    }
}
