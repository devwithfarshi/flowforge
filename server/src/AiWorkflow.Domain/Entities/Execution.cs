using AiWorkflow.Domain.Common;
using AiWorkflow.Domain.Enums;
using AiWorkflow.Domain.ValueObjects;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// One workflow run. Name snapshots (`WorkflowName`, `TriggeredByName`) are deliberate
/// audit-immutability denormalization (§3.5); node runs + logs are append-only jsonb.
/// </summary>
public sealed class Execution : Entity
{
    public Guid WorkflowId { get; private set; }

    public string WorkflowName { get; private set; } = default!;

    public Guid TriggeredById { get; private set; }

    public string TriggeredByName { get; private set; } = default!;

    public ExecutionStatus Status { get; private set; }

    public TriggerType Trigger { get; private set; }

    public DateTimeOffset StartedAt { get; private set; }

    public DateTimeOffset? FinishedAt { get; private set; }

    public int? DurationMs { get; private set; }

    public List<NodeRun> NodeRuns { get; private set; } = [];

    public List<LogEntry> Logs { get; private set; } = [];

    public DateTimeOffset CreatedAt { get; private set; }

    private Execution()
    {
    }

    public static Execution Queue(
        Workflow workflow,
        Guid triggeredById,
        string triggeredByName,
        DateTimeOffset now) => new()
        {
            WorkflowId = workflow.Id,
            WorkflowName = workflow.Name,
            TriggeredById = triggeredById,
            TriggeredByName = triggeredByName,
            Status = ExecutionStatus.Queued,
            Trigger = workflow.TriggerType,
            StartedAt = now,
            CreatedAt = now,
        };

    public void Start(DateTimeOffset now)
    {
        Status = ExecutionStatus.Running;
        StartedAt = now;
    }

    public void AppendLog(LogEntry entry) => Logs = [.. Logs, entry];

    public void AppendNodeRun(NodeRun run) => NodeRuns = [.. NodeRuns, run];

    public void Complete(bool success, DateTimeOffset now)
    {
        Status = success ? ExecutionStatus.Success : ExecutionStatus.Failed;
        FinishedAt = now;
        DurationMs = (int)Math.Max(0, (now - StartedAt).TotalMilliseconds);
    }
}
