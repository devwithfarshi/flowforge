using AiWorkflow.Domain.Common;
using AiWorkflow.Domain.Enums;
using AiWorkflow.Domain.Exceptions;
using AiWorkflow.Domain.ValueObjects;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// Workflow aggregate (Appendix B): reportable facts are real columns; the builder
/// graph (nodes/edges/variables) lives in jsonb and is replaced atomically (§3.1).
/// Counters are materialized aggregates updated when an execution finishes (§3.5).
/// </summary>
public sealed class Workflow : AggregateRoot
{
    public Guid OwnerId { get; private set; }

    public string Name { get; private set; } = default!;

    public string Description { get; private set; } = "";

    public WorkflowStatus Status { get; private set; }

    public TriggerType TriggerType { get; private set; }

    public bool Favorite { get; private set; }

    public List<string> Tags { get; private set; } = [];

    public List<WorkflowNode> Nodes { get; private set; } = [];

    public List<WorkflowEdge> Edges { get; private set; } = [];

    public List<WorkflowVariable> Variables { get; private set; } = [];

    public int ExecutionCount { get; private set; }

    public int SuccessCount { get; private set; }

    public int FailureCount { get; private set; }

    public DateTimeOffset? LastRunAt { get; private set; }

    public DateTimeOffset? ArchivedAt { get; private set; }

    private Workflow()
    {
    }

    /// <summary>Defaults mirror the frontend's `newWorkflow()` (client/src/lib/api.ts).</summary>
    public static Workflow CreateDraft(Guid ownerId, string? name, string? description) => new()
    {
        OwnerId = ownerId,
        Name = string.IsNullOrWhiteSpace(name) ? "Untitled workflow" : name,
        Description = description ?? "",
        Status = WorkflowStatus.Draft,
        TriggerType = TriggerType.Manual,
    };

    /// <summary>Duplicate: same details + graph, fresh identity/counters, draft, unfavorited.</summary>
    public static Workflow DuplicateFrom(Workflow source)
    {
        var copy = CreateDraft(source.OwnerId, $"{source.Name} (copy)", source.Description);
        copy.Tags = [.. source.Tags];
        copy.TriggerType = source.TriggerType;
        copy.Nodes = [.. source.Nodes];
        copy.Edges = [.. source.Edges];
        copy.Variables = [.. source.Variables];
        return copy;
    }

    public void UpdateDetails(string name, string description, List<string> tags)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new DomainException("Workflow name cannot be empty.");
        }

        Name = name;
        Description = description;
        Tags = tags;
    }

    /// <summary>
    /// Replaces the graph atomically. Edges must reference existing node ids — the
    /// deeper DAG validation happens in the Application layer before save/run (§3.1).
    /// </summary>
    public void UpdateGraph(List<WorkflowNode> nodes, List<WorkflowEdge> edges, List<WorkflowVariable> variables)
    {
        var nodeIds = nodes.Select(n => n.Id).ToHashSet();

        if (nodeIds.Count != nodes.Count)
        {
            throw new DomainException("Workflow nodes must have unique ids.");
        }

        if (edges.Any(e => !nodeIds.Contains(e.Source) || !nodeIds.Contains(e.Target)))
        {
            throw new DomainException("Workflow edges must connect existing nodes.");
        }

        Nodes = nodes;
        Edges = edges;
        Variables = variables;
    }

    public void SetTriggerType(TriggerType triggerType) => TriggerType = triggerType;

    public void SetStatus(WorkflowStatus status, DateTimeOffset now)
    {
        if (status == WorkflowStatus.Archived)
        {
            Archive(now);
            return;
        }

        Status = status;
        ArchivedAt = null;
    }

    public void Archive(DateTimeOffset now)
    {
        Status = WorkflowStatus.Archived;
        ArchivedAt = now;
    }

    /// <summary>Restore lands on "inactive", mirroring the frontend's setArchived(false).</summary>
    public void Unarchive()
    {
        Status = WorkflowStatus.Inactive;
        ArchivedAt = null;
    }

    public void ToggleFavorite() => Favorite = !Favorite;

    public void RecordExecution(bool success, DateTimeOffset now)
    {
        ExecutionCount++;
        if (success)
        {
            SuccessCount++;
        }
        else
        {
            FailureCount++;
        }

        LastRunAt = now;
    }
}
