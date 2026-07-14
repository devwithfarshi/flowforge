using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Executions;

/// <summary>`GET /executions/recent?n=5` — newest runs for the dashboard (§6.2).</summary>
public sealed record RecentExecutionsQuery(int? Count) : IRequest<IReadOnlyList<ExecutionDto>>;

public sealed class RecentExecutionsValidator : AbstractValidator<RecentExecutionsQuery>
{
    public RecentExecutionsValidator()
    {
        RuleFor(x => x.Count).InclusiveBetween(1, 50);
    }
}

public sealed class RecentExecutionsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RecentExecutionsQuery, IReadOnlyList<ExecutionDto>>
{
    public async ValueTask<IReadOnlyList<ExecutionDto>> Handle(RecentExecutionsQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var executions = await db.Executions.AsNoTracking()
            .Where(e => db.Workflows.Any(w => w.Id == e.WorkflowId && w.OwnerId == userId))
            .OrderByDescending(e => e.StartedAt)
            .Take(query.Count ?? 5)
            .ToListAsync(ct);

        return executions.Select(ExecutionDto.From).ToList();
    }
}
