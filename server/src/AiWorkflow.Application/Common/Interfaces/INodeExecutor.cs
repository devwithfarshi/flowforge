using AiWorkflow.Domain.ValueObjects;

namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>What a node hands to its downstream neighbours.</summary>
public sealed record NodeResult(string? Output);

/// <summary>Everything a node needs to run (§14.3): its definition, upstream outputs by node id, workflow variables, and the workflow owner (for per-user secrets like BYOK provider keys).</summary>
public sealed record NodeContext(
    WorkflowNode Node,
    IReadOnlyDictionary<string, string?> UpstreamOutputs,
    IReadOnlyList<WorkflowVariable> Variables,
    Guid OwnerId);

/// <summary>A node failure: the engine marks the run failed and stops traversal (§14.3).</summary>
public sealed class NodeExecutionException(string message) : Exception(message);

/// <summary>
/// One executor per node type (§14.3), resolved from a registry by `node.type`
/// (e.g. "ai.llm", "trigger.manual"). New node types are additive.
/// </summary>
public interface INodeExecutor
{
    string Type { get; }

    Task<NodeResult> ExecuteAsync(NodeContext ctx, CancellationToken ct);
}
