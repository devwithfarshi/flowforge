using AiWorkflow.Application.Activity;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Executions;

/// <summary>
/// Published by the engine when a run finishes. Decoupled handlers implement the §7
/// cross-cutting flow: counters, a notification honoring UserSettings, and an audit entry.
/// </summary>
public sealed record ExecutionCompleted(Guid ExecutionId, Guid WorkflowId, bool Success) : INotification;

/// <summary>Emits workflow_completed/failed to the owner, honoring their notify flags (§7).</summary>
public sealed class NotifyExecutionCompletedHandler(IApplicationDbContext db, IDateTime clock)
    : INotificationHandler<ExecutionCompleted>
{
    public async ValueTask Handle(ExecutionCompleted notification, CancellationToken ct)
    {
        var workflow = await db.Workflows.AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == notification.WorkflowId, ct);
        if (workflow is null)
        {
            return;
        }

        var settings = await db.UserSettings.AsNoTracking()
            .FirstOrDefaultAsync(s => s.UserId == workflow.OwnerId, ct);

        var wanted = notification.Success
            ? settings?.NotifyOnSuccess ?? true
            : settings?.NotifyOnFailure ?? true;
        if (!wanted)
        {
            return;
        }

        db.Notifications.Add(Domain.Entities.Notification.Push(
            workflow.OwnerId,
            notification.Success ? "workflow_completed" : "workflow_failed",
            notification.Success ? $"{workflow.Name} completed" : $"{workflow.Name} failed",
            notification.Success ? "Run finished successfully." : "Run failed — see execution logs.",
            href: $"/executions/{notification.ExecutionId}",
            clock.UtcNow));

        await db.SaveChangesAsync(ct);
    }
}

/// <summary>Writes the "ran workflow" audit entry attributed to whoever triggered the run.</summary>
public sealed class LogExecutionActivityHandler(IApplicationDbContext db, IDateTime clock)
    : INotificationHandler<ExecutionCompleted>
{
    public async ValueTask Handle(ExecutionCompleted notification, CancellationToken ct)
    {
        var execution = await db.Executions.AsNoTracking()
            .FirstOrDefaultAsync(e => e.Id == notification.ExecutionId, ct);
        if (execution is null)
        {
            return;
        }

        db.ActivityEntries.Add(ActivityEntry.Log(
            execution.TriggeredById,
            execution.TriggeredByName,
            "ran workflow",
            execution.WorkflowName,
            "workflow",
            clock.UtcNow));

        await db.SaveChangesAsync(ct);
    }
}

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
