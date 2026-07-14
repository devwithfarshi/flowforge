using AiWorkflow.Domain.Common;
using AiWorkflow.Domain.Enums;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// User variable, unique per (owner, key, scope, environment) (§3.4). For secret scope
/// the Application layer stores <see cref="Value"/> encrypted (§15); the entity itself
/// is storage-agnostic.
/// </summary>
public sealed class Variable : AuditableEntity
{
    public Guid OwnerId { get; private set; }

    public string Key { get; private set; } = default!;

    public string Value { get; private set; } = default!;

    public VariableScope Scope { get; private set; }

    public string? Environment { get; private set; }

    public string? Description { get; private set; }

    public bool IsSecret => Scope == VariableScope.Secret;

    private Variable()
    {
    }

    public static Variable Create(
        Guid ownerId, string key, string value, VariableScope scope, string? environment, string? description) => new()
        {
            OwnerId = ownerId,
            Key = key,
            Value = value,
            Scope = scope,
            Environment = scope == VariableScope.Environment ? environment : null,
            Description = description,
        };

    public void Update(string key, string value, VariableScope scope, string? environment, string? description)
    {
        Key = key;
        Value = value;
        Scope = scope;
        Environment = scope == VariableScope.Environment ? environment : null;
        Description = description;
    }
}
