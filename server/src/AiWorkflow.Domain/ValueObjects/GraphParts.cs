using System.Text.Json;

namespace AiWorkflow.Domain.ValueObjects;

/// <summary>
/// The builder graph's document shapes (§3.1): stored as whole jsonb columns, mirroring
/// client/src/lib/types.ts exactly (camelCase in JSON). Records give value semantics;
/// the graph is replaced atomically, never mutated element-wise.
/// </summary>
public sealed record NodePosition(double X, double Y);

public sealed record WorkflowNode(
    string Id,
    string Type,
    string Name,
    string? Description,
    NodePosition Position,
    Dictionary<string, JsonElement> Config,
    string? Status);

public sealed record WorkflowEdge(
    string Id,
    string Source,
    string Target,
    string? SourceHandle,
    string? TargetHandle);

public sealed record WorkflowVariable(
    string Id,
    string Key,
    string Value,
    bool? Secret);
