namespace AiWorkflow.Domain.Enums;

/// <summary>
/// Mirrors the frontend `WorkflowStatus` union. Stored/serialized as lowercase text
/// ("draft", "active", …) with a CHECK constraint (§3.3).
/// </summary>
public enum WorkflowStatus
{
    Draft,
    Active,
    Inactive,
    Error,
    Archived,
}
