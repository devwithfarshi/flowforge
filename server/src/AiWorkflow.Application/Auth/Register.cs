using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

public sealed record RegisterCommand(string Name, string Email, string Password, ClientInfo Client)
    : IRequest<AuthResult>;

public sealed class RegisterValidator : AbstractValidator<RegisterCommand>
{
    public RegisterValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Email).NotEmpty().EmailAddress().MaximumLength(320);
        RuleFor(x => x.Password).NotEmpty().MinimumLength(8).MaximumLength(128);
    }
}

public sealed class RegisterHandler(
    IApplicationDbContext db,
    IPasswordHasher passwordHasher,
    IJwtTokenService jwtTokenService,
    IRefreshTokenService refreshTokenService,
    IAccountTokenService accountTokenService,
    IEmailSender emailSender,
    IDateTime clock)
    : IRequestHandler<RegisterCommand, AuthResult>
{
    public async ValueTask<AuthResult> Handle(RegisterCommand command, CancellationToken ct)
    {
        if (await db.Users.AnyAsync(u => u.Email == command.Email, ct))
        {
            throw new ConflictException("An account with this email already exists");
        }

        var userCount = await db.Users.CountAsync(ct);
        var user = User.Register(
            command.Name,
            command.Email,
            passwordHasher.Hash(command.Password),
            SessionIssuer.NextAvatarColor(userCount));

        db.Users.Add(user);
        db.UserPreferences.Add(UserPreferences.CreateDefault(user.Id));
        db.UserSettings.Add(UserSettings.CreateDefault(user.Id));

        var (refreshToken, result) = SessionIssuer.Issue(
            user, familyId: Guid.CreateVersion7(), command.Client, rememberMe: true,
            jwtTokenService, refreshTokenService, clock);
        db.RefreshTokens.Add(refreshToken);

        await db.SaveChangesAsync(ct);

        await emailSender.SendEmailVerificationAsync(
            user.Email, accountTokenService.CreateEmailVerificationToken(user.Id), ct);

        return result;
    }
}
