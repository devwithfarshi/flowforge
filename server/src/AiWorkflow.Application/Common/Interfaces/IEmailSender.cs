namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Outbound email seam. Tokens are embedded in links by the frontend route
/// conventions; the sender only ever sees (recipient, token).
/// </summary>
public interface IEmailSender
{
    Task SendPasswordResetAsync(string email, string token, CancellationToken ct = default);

    Task SendEmailVerificationAsync(string email, string token, CancellationToken ct = default);
}
