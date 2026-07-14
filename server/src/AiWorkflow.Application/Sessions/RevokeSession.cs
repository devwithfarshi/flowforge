using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Sessions;

/// <summary>
/// `DELETE /sessions/{id}` (§5). The current session cannot be revoked here — that's
/// what logout is for (mirrors the frontend mock, which always keeps `current`).
/// </summary>
public sealed record RevokeSessionCommand(Guid SessionId) : IRequest;

public sealed class RevokeSessionHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<RevokeSessionCommand>
{
    public async ValueTask<Unit> Handle(RevokeSessionCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        if (command.SessionId == currentUser.SessionId)
        {
            throw new ConflictException("Use logout to end the current session");
        }

        var token = await db.RefreshTokens
            .FirstOrDefaultAsync(t => t.Id == command.SessionId && t.UserId == userId, ct)
            ?? throw new NotFoundException("Session", command.SessionId);

        token.Revoke(clock.UtcNow);
        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
