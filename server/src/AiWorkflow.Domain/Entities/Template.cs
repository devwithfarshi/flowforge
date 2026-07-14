using AiWorkflow.Domain.Common;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// Marketplace template (catalog data, seeded per §8). `Installs` is a materialized
/// counter (§3.5); `RecentlyUsed` mirrors the mock's install-side flag.
/// </summary>
public sealed class Template : Entity
{
    public string Name { get; private set; } = default!;

    public string Description { get; private set; } = "";

    public string Category { get; private set; } = default!;

    public string Difficulty { get; private set; } = default!;

    public string Author { get; private set; } = default!;

    public int Installs { get; private set; }

    public decimal Rating { get; private set; }

    public bool Featured { get; private set; }

    public List<string> Tags { get; private set; } = [];

    public int NodeCount { get; private set; }

    public string Color { get; private set; } = default!;

    public string Icon { get; private set; } = default!;

    public bool RecentlyUsed { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    private Template()
    {
    }

    public static Template Create(
        string name,
        string description,
        string category,
        string difficulty,
        string author,
        int installs,
        decimal rating,
        bool featured,
        List<string> tags,
        int nodeCount,
        string color,
        string icon,
        bool recentlyUsed,
        DateTimeOffset now) => new()
        {
            Name = name,
            Description = description,
            Category = category,
            Difficulty = difficulty,
            Author = author,
            Installs = installs,
            Rating = rating,
            Featured = featured,
            Tags = tags,
            NodeCount = nodeCount,
            Color = color,
            Icon = icon,
            RecentlyUsed = recentlyUsed,
            CreatedAt = now,
        };

    public void RecordInstall()
    {
        Installs++;
        RecentlyUsed = true;
    }
}
