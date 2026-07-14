namespace AiWorkflow.Domain.Enums;

/// <summary>
/// Mirrors the frontend `UserRole` union ("Owner" | "Admin" | "Editor" | "Viewer").
/// Stored as text with a CHECK constraint (§3.3).
/// </summary>
public enum UserRole
{
    Owner,
    Admin,
    Editor,
    Viewer,
}
