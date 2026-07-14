using AiWorkflow.Application.Common.Interfaces;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Executions;

/// <summary>
/// Published by the engine when a run finishes (§7 cross-cutting flow). Handlers stay
/// decoupled: counters now; activity + notification handlers join in task 15.
/// </summary>
public sealed record ExecutionCompleted(Guid ExecutionId, Guid WorkflowId, bool Success) : INotification;

/// <summary>Materialized counters on the workflow row — cheap dashboard reads (§3.5).</summary>
public sealed class UpdateWorkflowCountersHandler(IApplicationDbContext db, IDateTime clock)
    : INotificationHandler<ExecutionCompleted>
{
    public async ValueTask Handle(ExecutionCompleted notification, CancellationToken ct)
    {
        var workflow = await db.Workflows.FirstOrDefaultAsync(w => w.Id == notification.WorkflowId, ct);
        if (workflow is null)
        {
            return; // workflow deleted while the run was in flight
        }

        workflow.RecordExecution(notification.Success, clock.UtcNow);
        await db.SaveChangesAsync(ct);
    }
}
