namespace AiWorkflow.Domain.Enums;

/// <summary>
/// Mirrors the frontend `TriggerType` union. Stored/serialized as lowercase text
/// ("manual", "webhook", …) with a CHECK constraint (§3.3).
/// </summary>
public enum TriggerType
{
    Manual,
    Webhook,
    Cron,
    Email,
    Api,
}
