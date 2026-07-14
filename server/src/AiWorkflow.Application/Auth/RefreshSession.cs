using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

public sealed record RefreshSessionCommand(string RefreshToken, ClientInfo Client)
    : IRequest<AuthResult>;

public sealed class RefreshSessionValidator : AbstractValidator<RefreshSessionCommand>
{
    public RefreshSessionValidator()
    {
        RuleFor(x => x.RefreshToken).NotEmpty();
    }
}

/// <summary>
/// Rotation + reuse detection (§4.1): a valid token is rotated within its family;
/// presenting an already-rotated token is treated as theft and revokes the family.
/// </summary>
public sealed class RefreshSessionHandler(
    IApplicationDbContext db,
    IJwtTokenService jwtTokenService,
    IRefreshTokenService refreshTokenService,
    IDateTime clock)
    : IRequestHandler<RefreshSessionCommand, AuthResult>
{
    public async ValueTask<AuthResult> Handle(RefreshSessionCommand command, CancellationToken ct)
    {
        var tokenHash = refreshTokenService.Hash(command.RefreshToken);
        var token = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

        if (token is null)
        {
            throw new UnauthorizedException("Invalid refresh token");
        }

        var now = clock.UtcNow;

        if (token.WasRotated)
        {
            // Replay of a rotated token → revoke the whole family (§4.2).
            var family = await db.RefreshTokens
                .Where(t => t.FamilyId == token.FamilyId && t.RevokedAt == null)
                .ToListAsync(ct);
            foreach (var member in family)
            {
                member.Revoke(now);
            }

            await db.SaveChangesAsync(ct);
            throw new UnauthorizedException("Refresh token was already used");
        }

        if (!token.IsActive(now))
        {
            throw new UnauthorizedException("Refresh token is expired or revoked");
        }

        var user = await db.Users.FirstAsync(u => u.Id == token.UserId, ct);

        var (successor, result) = SessionIssuer.Issue(
            user, token.FamilyId, command.Client, rememberMe: true,
            jwtTokenService, refreshTokenService, clock);

        token.MarkReplaced(successor.Id, now);
        token.Touch(now);
        db.RefreshTokens.Add(successor);

        await db.SaveChangesAsync(ct);

        return result;
    }
}
