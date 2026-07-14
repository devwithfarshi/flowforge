using AiWorkflow.Domain.Entities;

namespace AiWorkflow.Application.Templates;

/// <summary>Serializes to the frontend's `Template` shape (client/src/lib/types.ts).</summary>
public sealed record TemplateDto(
    Guid Id,
    string Name,
    string Description,
    string Category,
    string Difficulty,
    string Author,
    int Installs,
    decimal Rating,
    bool Featured,
    List<string> Tags,
    int NodeCount,
    string Color,
    string Icon,
    bool RecentlyUsed)
{
    public static TemplateDto From(Template t) => new(
        t.Id, t.Name, t.Description, t.Category, t.Difficulty, t.Author, t.Installs,
        t.Rating, t.Featured, t.Tags, t.NodeCount, t.Color, t.Icon, t.RecentlyUsed);
}
