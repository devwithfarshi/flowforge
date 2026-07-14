using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Sessions;

/// <summary>Serializes to the frontend's `LoginSession` shape (client/src/lib/types.ts).</summary>
public sealed record LoginSessionDto(
    Guid Id,
    string Device,
    string Browser,
    string Os,
    string Location,
    string Ip,
    DateTimeOffset LastActive,
    bool Current);

/// <summary>
/// `GET /sessions` (§5): an active device session *is* a live refresh token (§3.2 note);
/// "current" is the token whose id matches the access token's sid claim.
/// </summary>
public sealed record GetSessionsQuery : IRequest<IReadOnlyList<LoginSessionDto>>;

public sealed class GetSessionsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<GetSessionsQuery, IReadOnlyList<LoginSessionDto>>
{
    public async ValueTask<IReadOnlyList<LoginSessionDto>> Handle(GetSessionsQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();
        var now = clock.UtcNow;

        var sessions = await db.RefreshTokens.AsNoTracking()
            .Where(t => t.UserId == userId && t.RevokedAt == null && t.ExpiresAt > now)
            .Select(t => new LoginSessionDto(
                t.Id,
                t.Device,
                t.Browser,
                t.Os,
                t.Location,
                t.Ip,
                t.LastUsedAt ?? t.CreatedAt,
                t.Id == currentUser.SessionId))
            .ToListAsync(ct);

        return sessions
            .OrderByDescending(s => s.Current)
            .ThenByDescending(s => s.LastActive)
            .ToList();
    }
}
