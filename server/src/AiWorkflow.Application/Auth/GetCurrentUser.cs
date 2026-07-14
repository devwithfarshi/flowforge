using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using Mapster;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Auth;

/// <summary>`GET /auth/me` — the principal from the access token (§6.2).</summary>
public sealed record GetCurrentUserQuery : IRequest<UserDto>;

public sealed class GetCurrentUserHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetCurrentUserQuery, UserDto>
{
    public async ValueTask<UserDto> Handle(GetCurrentUserQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedException();

        return user.Adapt<UserDto>();
    }
}
