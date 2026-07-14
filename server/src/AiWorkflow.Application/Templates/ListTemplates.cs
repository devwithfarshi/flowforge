using AiWorkflow.Application.Common.Interfaces;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Templates;

/// <summary>
/// `GET /templates` (§6.2): mock parity — category/search filters, optional
/// installs|rating sort, plain array (the marketplace isn't paginated).
/// </summary>
public sealed record ListTemplatesQuery(string? Search, string? Category, string? Sort)
    : IRequest<IReadOnlyList<TemplateDto>>;

public sealed class ListTemplatesHandler(IApplicationDbContext db)
    : IRequestHandler<ListTemplatesQuery, IReadOnlyList<TemplateDto>>
{
    public async ValueTask<IReadOnlyList<TemplateDto>> Handle(ListTemplatesQuery query, CancellationToken ct)
    {
        var templates = db.Templates.AsNoTracking();

        if (!string.IsNullOrEmpty(query.Category) && query.Category != "all")
        {
            templates = templates.Where(t => t.Category == query.Category);
        }

        if (!string.IsNullOrEmpty(query.Search))
        {
            var q = query.Search.ToLowerInvariant();
            templates = templates.Where(t =>
                t.Name.ToLower().Contains(q)
                || t.Description.ToLower().Contains(q)
                || t.Tags.Contains(q));
        }

        templates = query.Sort switch
        {
            "installs" => templates.OrderByDescending(t => t.Installs),
            "rating" => templates.OrderByDescending(t => t.Rating),
            _ => templates.OrderBy(t => t.CreatedAt),
        };

        return (await templates.ToListAsync(ct)).Select(TemplateDto.From).ToList();
    }
}
