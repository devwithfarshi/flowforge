using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

/// <summary>"Continue with Google" (§4.5): the SPA exchanges a Google ID token for our own session.</summary>
public sealed record GoogleAuthCommand(string IdToken, ClientInfo Client) : IRequest<AuthResult>;

public sealed class GoogleAuthValidator : AbstractValidator<GoogleAuthCommand>
{
    public GoogleAuthValidator()
    {
        RuleFor(x => x.IdToken).NotEmpty();
    }
}

public sealed class GoogleAuthHandler(
    IApplicationDbContext db,
    IGoogleIdTokenValidator googleValidator,
    IJwtTokenService jwtTokenService,
    IRefreshTokenService refreshTokenService,
    IDateTime clock)
    : IRequestHandler<GoogleAuthCommand, AuthResult>
{
    private const string Provider = "google";

    public async ValueTask<AuthResult> Handle(GoogleAuthCommand command, CancellationToken ct)
    {
        var identity = await googleValidator.ValidateAsync(command.IdToken, ct);
        var now = clock.UtcNow;

        var link = await db.ExternalLogins.FirstOrDefaultAsync(
            l => l.Provider == Provider && l.ProviderSubject == identity.Subject, ct);

        var user = link is not null
            ? await db.Users.FirstAsync(u => u.Id == link.UserId, ct)
            : await FindOrCreateUser(identity, ct);

        if (link is null)
        {
            db.ExternalLogins.Add(ExternalLogin.Link(user.Id, Provider, identity.Subject, identity.Email, now));
        }

        var (refreshToken, result) = SessionIssuer.Issue(
            user, familyId: Guid.CreateVersion7(), command.Client, rememberMe: true,
            jwtTokenService, refreshTokenService, clock);
        db.RefreshTokens.Add(refreshToken);

        await Activity.Audit.Log(db, user.Id, "signed in", "with Google", "auth", now, ct, user.Name);
        await db.SaveChangesAsync(ct);

        return result;
    }

    private async Task<User> FindOrCreateUser(GoogleIdentity identity, CancellationToken ct)
    {
        var existing = await db.Users.FirstOrDefaultAsync(u => u.Email == identity.Email, ct);

        if (existing is not null)
        {
            // Only link into an existing account when Google itself has verified the email —
            // otherwise an attacker could claim someone else's account with an unverified
            // Google identity carrying the victim's address (§4.5). A bare "create new" here
            // would also collide with the unique email index.
            if (!identity.EmailVerified)
            {
                throw new ConflictException(
                    "An account with this email already exists. Sign in with your password instead.");
            }

            // Google has now independently proven ownership of this address.
            existing.VerifyEmail();
            return existing;
        }

        var userCount = await db.Users.CountAsync(ct);
        var user = User.RegisterExternal(identity.Name, identity.Email, SessionIssuer.NextAvatarColor(userCount));
        db.Users.Add(user);
        db.UserPreferences.Add(UserPreferences.CreateDefault(user.Id));
        db.UserSettings.Add(UserSettings.CreateDefault(user.Id));

        return user;
    }
}
