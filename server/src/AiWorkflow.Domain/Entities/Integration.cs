using AiWorkflow.Domain.Common;

namespace AiWorkflow.Domain.Entities;

/// <summary>Global integration catalog row (seeded, §8). Per-user state lives in <see cref="IntegrationAccount"/>.</summary>
public sealed class Integration : Entity
{
    public string Name { get; private set; } = default!;

    public string Category { get; private set; } = default!;

    public string Description { get; private set; } = "";

    public string Color { get; private set; } = default!;

    public string Icon { get; private set; } = default!;

    public bool Popular { get; private set; }

    private Integration()
    {
    }

    public static Integration Create(
        string name, string category, string description, string color, string icon, bool popular) => new()
        {
            Name = name,
            Category = category,
            Description = description,
            Color = color,
            Icon = icon,
            Popular = popular,
        };
}

/// <summary>
/// A user's connection to an integration. Credentials are an encrypted blob (§15) —
/// never returned by the API, decrypted only by node executors.
/// </summary>
public sealed class IntegrationAccount : Entity
{
    public Guid UserId { get; private set; }

    public Guid IntegrationId { get; private set; }

    public string Label { get; private set; } = default!;

    public string? EncryptedCredentials { get; private set; }

    public DateTimeOffset ConnectedAt { get; private set; }

    private IntegrationAccount()
    {
    }

    public static IntegrationAccount Connect(
        Guid userId, Guid integrationId, string label, string? encryptedCredentials, DateTimeOffset now) => new()
        {
            UserId = userId,
            IntegrationId = integrationId,
            Label = label,
            EncryptedCredentials = encryptedCredentials,
            ConnectedAt = now,
        };
}
