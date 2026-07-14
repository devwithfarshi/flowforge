using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;
using AiWorkflow.Domain.ValueObjects;

namespace AiWorkflow.Application.Workflows;

/// <summary>
/// Serializes to the frontend's `Workflow` shape (client/src/lib/types.ts): enum fields
/// as lowercase strings, graph documents verbatim. `updatedAt` is always present.
/// </summary>
public sealed record WorkflowDto(
    Guid Id,
    string Name,
    string Description,
    string Status,
    string TriggerType,
    List<string> Tags,
    Guid OwnerId,
    string OwnerName,
    bool Favorite,
    List<WorkflowNode> Nodes,
    List<WorkflowEdge> Edges,
    List<WorkflowVariable> Variables,
    int ExecutionCount,
    int SuccessCount,
    int FailureCount,
    DateTimeOffset? LastRunAt,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt,
    DateTimeOffset? ArchivedAt)
{
    public static WorkflowDto From(Workflow w, string ownerName) => new(
        w.Id,
        w.Name,
        w.Description,
        w.Status.ToString().ToLowerInvariant(),
        w.TriggerType.ToString().ToLowerInvariant(),
        w.Tags,
        w.OwnerId,
        ownerName,
        w.Favorite,
        w.Nodes,
        w.Edges,
        w.Variables,
        w.ExecutionCount,
        w.SuccessCount,
        w.FailureCount,
        w.LastRunAt,
        w.CreatedAt,
        w.UpdatedAt ?? w.CreatedAt,
        w.ArchivedAt);
}

internal static class WorkflowEnums
{
    public static bool IsValidStatus(string value) => Enum.TryParse<WorkflowStatus>(value, true, out _);

    public static bool IsValidTrigger(string value) => Enum.TryParse<TriggerType>(value, true, out _);

    public static WorkflowStatus ParseStatus(string value) => Enum.Parse<WorkflowStatus>(value, true);

    public static TriggerType ParseTrigger(string value) => Enum.Parse<TriggerType>(value, true);
}
