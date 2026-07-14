using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Executions;

/// <summary>`GET /executions/{id}` — full run detail including node runs + logs.</summary>
public sealed record GetExecutionQuery(Guid Id) : IRequest<ExecutionDto>;

public sealed class GetExecutionHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetExecutionQuery, ExecutionDto>
{
    public async ValueTask<ExecutionDto> Handle(GetExecutionQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var execution = await db.Executions.AsNoTracking()
            .Where(e => e.Id == query.Id
                && db.Workflows.Any(w => w.Id == e.WorkflowId && w.OwnerId == userId))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Execution", query.Id);

        return ExecutionDto.From(execution);
    }
}
