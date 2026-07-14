using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Application.Workflows;
using AiWorkflow.Domain.Entities;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Executions;

/// <summary>
/// `POST /workflows/{id}/run` (§14.2): persist a queued execution snapshot, enqueue the
/// engine job, return immediately — live progress streams over SignalR.
/// </summary>
public sealed record RunWorkflowCommand(Guid WorkflowId) : IRequest<ExecutionDto>;

public sealed class RunWorkflowHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    IJobScheduler jobScheduler,
    IDateTime clock)
    : IRequestHandler<RunWorkflowCommand, ExecutionDto>
{
    public async ValueTask<ExecutionDto> Handle(RunWorkflowCommand command, CancellationToken ct)
    {
        var workflow = await WorkflowStore.GetOwned(db, currentUser, command.WorkflowId, ct);

        var triggeredByName = await db.Users.AsNoTracking()
            .Where(u => u.Id == currentUser.Id)
            .Select(u => u.Name)
            .FirstAsync(ct);

        var execution = Execution.Queue(workflow, currentUser.Id!.Value, triggeredByName, clock.UtcNow);
        db.Executions.Add(execution);
        await db.SaveChangesAsync(ct);

        jobScheduler.EnqueueExecution(execution.Id);

        return ExecutionDto.From(execution);
    }
}
