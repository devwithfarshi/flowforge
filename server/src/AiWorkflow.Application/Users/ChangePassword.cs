using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Users;

/// <summary>
/// `POST /users/me/password` (§5): verify current → rehash → revoke every other device
/// session. The session this request came from (sid claim) stays alive.
/// </summary>
public sealed record ChangePasswordCommand(string CurrentPassword, string NewPassword) : IRequest;

public sealed class ChangePasswordValidator : AbstractValidator<ChangePasswordCommand>
{
    public ChangePasswordValidator()
    {
        RuleFor(x => x.CurrentPassword).NotEmpty();
        RuleFor(x => x.NewPassword).NotEmpty().MinimumLength(8).MaximumLength(128);
    }
}

public sealed class ChangePasswordHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IPasswordHasher passwordHasher,
    IDateTime clock)
    : IRequestHandler<ChangePasswordCommand>
{
    public async ValueTask<Unit> Handle(ChangePasswordCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedException();

        // Google-only accounts have no password to verify — they must set one via reset.
        if (user.PasswordHash is null || !passwordHasher.Verify(user.PasswordHash, command.CurrentPassword))
        {
            throw new Common.Exceptions.ValidationException(
                nameof(ChangePasswordCommand.CurrentPassword), "Current password is incorrect");
        }

        user.SetPasswordHash(passwordHasher.Hash(command.NewPassword));

        var now = clock.UtcNow;
        var otherSessions = await db.RefreshTokens
            .Where(t => t.UserId == user.Id && t.RevokedAt == null && t.Id != currentUser.SessionId)
            .ToListAsync(ct);
        foreach (var token in otherSessions)
        {
            token.Revoke(now);
        }

        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
