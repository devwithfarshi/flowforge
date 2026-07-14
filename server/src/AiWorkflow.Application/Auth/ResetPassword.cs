using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

public sealed record ResetPasswordCommand(string Token, string Password) : IRequest;

public sealed class ResetPasswordValidator : AbstractValidator<ResetPasswordCommand>
{
    public ResetPasswordValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
    }
}

public sealed class ResetPasswordHandler(
    IApplicationDbContext db,
    IAccountTokenService accountTokenService,
    IPasswordHasher passwordHasher,
    IDateTime clock)
    : IRequestHandler<ResetPasswordCommand>
{
    public async ValueTask<Unit> Handle(ResetPasswordCommand command, CancellationToken ct)
    {
        var userId = accountTokenService.ValidatePasswordResetToken(command.Token)
            ?? throw new UnauthorizedException("Invalid or expired reset token");

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedException("Invalid or expired reset token");

        user.SetPasswordHash(passwordHasher.Hash(command.Password));

        // Credential change invalidates every device session (§5: revoke other sessions).
        var now = clock.UtcNow;
        var activeTokens = await db.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null)
            .ToListAsync(ct);
        foreach (var token in activeTokens)
        {
            token.Revoke(now);
        }

        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
