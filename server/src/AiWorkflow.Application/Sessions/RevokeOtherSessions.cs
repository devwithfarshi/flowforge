using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Sessions;

/// <summary>`DELETE /sessions/others` (§5): sign out everywhere else.</summary>
public sealed record RevokeOtherSessionsCommand : IRequest;

public sealed class RevokeOtherSessionsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<RevokeOtherSessionsCommand>
{
    public async ValueTask<Unit> Handle(RevokeOtherSessionsCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();
        var now = clock.UtcNow;

        var otherSessions = await db.RefreshTokens
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.Id != currentUser.SessionId)
            .ToListAsync(ct);
        foreach (var token in otherSessions)
        {
            token.Revoke(now);
        }

        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
