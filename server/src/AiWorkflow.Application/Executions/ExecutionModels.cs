using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;
using AiWorkflow.Domain.ValueObjects;

namespace AiWorkflow.Application.Executions;

/// <summary>Serializes to the frontend's `Execution` shape (client/src/lib/types.ts).</summary>
public sealed record ExecutionDto(
    Guid Id,
    Guid WorkflowId,
    string WorkflowName,
    string Status,
    string Trigger,
    string TriggeredBy,
    DateTimeOffset StartedAt,
    DateTimeOffset? FinishedAt,
    int? DurationMs,
    List<NodeRun> NodeRuns,
    List<LogEntry> Logs)
{
    public static ExecutionDto From(Execution e) => new(
        e.Id,
        e.WorkflowId,
        e.WorkflowName,
        e.Status.ToString().ToLowerInvariant(),
        e.Trigger.ToString().ToLowerInvariant(),
        e.TriggeredByName,
        e.StartedAt,
        e.FinishedAt,
        e.DurationMs,
        e.NodeRuns,
        e.Logs);
}

internal static class ExecutionEnums
{
    public static bool IsValidStatus(string value) => Enum.TryParse<ExecutionStatus>(value, true, out _);

    public static ExecutionStatus ParseStatus(string value) => Enum.Parse<ExecutionStatus>(value, true);
}
