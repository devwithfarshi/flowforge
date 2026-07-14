namespace AiWorkflow.Domain.Enums;

/// <summary>Mirrors the frontend `VariableScope` union; lowercase text + CHECK (§3.3).</summary>
public enum VariableScope
{
    Global,
    Environment,
    Secret,
}
