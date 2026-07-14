using AiWorkflow.Application.Common.Interfaces;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

/// <summary>Revokes the presented refresh token (this device only). Always succeeds.</summary>
public sealed record LogoutCommand(string? RefreshToken) : IRequest;

public sealed class LogoutHandler(IApplicationDbContext db, IRefreshTokenService refreshTokenService, IDateTime clock)
    : IRequestHandler<LogoutCommand>
{
    public async ValueTask<Unit> Handle(LogoutCommand command, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(command.RefreshToken))
        {
            return Unit.Value;
        }

        var tokenHash = refreshTokenService.Hash(command.RefreshToken);
        var token = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == tokenHash, ct);

        if (token is not null)
        {
            token.Revoke(clock.UtcNow);
            await db.SaveChangesAsync(ct);
        }

        return Unit.Value;
    }
}
