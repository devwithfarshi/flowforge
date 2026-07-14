namespace AiWorkflow.Domain.ValueObjects;

/// <summary>
/// Append-only run artifacts (§3.1): whole jsonb documents mirroring the frontend's
/// `LogEntry` / `NodeRun` shapes. Level/status are the frontend's lowercase strings.
/// </summary>
public sealed record LogEntry(
    string Id,
    DateTimeOffset Ts,
    string Level,
    string Message,
    string? NodeId,
    string? NodeName);

public sealed record NodeRun(
    string NodeId,
    string NodeName,
    string NodeType,
    string Status,
    int DurationMs,
    DateTimeOffset StartedAt,
    string? Output);
