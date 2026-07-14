using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

public sealed record LoginCommand(string Email, string Password, bool RememberMe, ClientInfo Client)
    : IRequest<AuthResult>;

public sealed class LoginValidator : AbstractValidator<LoginCommand>
{
    public LoginValidator()
    {
        RuleFor(x => x.Email).NotEmpty().EmailAddress();
        RuleFor(x => x.Password).NotEmpty();
    }
}

public sealed class LoginHandler(
    IApplicationDbContext db,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService,
    IRefreshTokenService refreshTokenService,
    IDateTime clock)
    : IRequestHandler<LoginCommand, AuthResult>
{
    public async ValueTask<AuthResult> Handle(LoginCommand command, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == command.Email, ct);

        // One message for both failure modes — never reveal whether the email exists.
        // PasswordHash is null for Google-only accounts: password login is not valid there.
        if (user?.PasswordHash is null || !passwordHasher.Verify(user.PasswordHash, command.Password))
        {
            throw new UnauthorizedException("Invalid email or password");
        }

        var (refreshToken, result) = SessionIssuer.Issue(
            user, familyId: Guid.CreateVersion7(), command.Client, command.RememberMe,
            jwtTokenService, refreshTokenService, clock);
        db.RefreshTokens.Add(refreshToken);

        await Activity.Audit.Log(
            db, user.Id, "signed in", "from this device", "auth", clock.UtcNow, ct, user.Name);
        await db.SaveChangesAsync(ct);

        return result;
    }
}
