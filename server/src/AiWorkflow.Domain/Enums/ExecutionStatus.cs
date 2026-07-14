namespace AiWorkflow.Domain.Enums;

/// <summary>
/// Mirrors the frontend `ExecutionStatus` union. Stored/serialized as lowercase text
/// ("queued", "running", …) with a CHECK constraint (§3.3).
/// </summary>
public enum ExecutionStatus
{
    Queued,
    Running,
    Success,
    Failed,
    Canceled,
}
