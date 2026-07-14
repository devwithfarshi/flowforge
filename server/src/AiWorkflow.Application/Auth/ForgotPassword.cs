using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

/// <summary>
/// Always succeeds without revealing whether the email exists (§4.3); when it does,
/// a time-limited reset token is emailed.
/// </summary>
public sealed record ForgotPasswordCommand(string Email) : IRequest;

public sealed class ForgotPasswordValidator : AbstractValidator<ForgotPasswordCommand>
{
    public ForgotPasswordValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
    }
}

public sealed class ForgotPasswordHandler(
    IApplicationDbContext db,
    IAccountTokenService accountTokenService,
    IEmailSender emailSender)
    : IRequestHandler<ForgotPasswordCommand>
{
    public async ValueTask<Unit> Handle(ForgotPasswordCommand command, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == command.Email, ct);

        if (user is not null)
        {
            await emailSender.SendPasswordResetAsync(
                user.Email, accountTokenService.CreatePasswordResetToken(user.Id), ct);
        }

        return Unit.Value;
    }
}
