using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mapster;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

public sealed record VerifyEmailCommand(string Token) : IRequest<UserDto>;

public sealed class VerifyEmailValidator : AbstractValidator<VerifyEmailCommand>
{
    public VerifyEmailValidator()
    {
        RuleFor(x => x.Token).NotEmpty();
    }
}

public sealed class VerifyEmailHandler(IApplicationDbContext db, IAccountTokenService accountTokenService)
    : IRequestHandler<VerifyEmailCommand, UserDto>
{
    public async ValueTask<UserDto> Handle(VerifyEmailCommand command, CancellationToken ct)
    {
        var userId = accountTokenService.ValidateEmailVerificationToken(command.Token)
            ?? throw new UnauthorizedException("Invalid or expired verification token");

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedException("Invalid or expired verification token");

        user.VerifyEmail();
        await db.SaveChangesAsync(ct);

        return user.Adapt<UserDto>();
    }
}
