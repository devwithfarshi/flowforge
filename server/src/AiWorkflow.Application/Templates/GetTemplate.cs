using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Templates;

/// <summary>`GET /templates/{id}` (§6.2).</summary>
public sealed record GetTemplateQuery(Guid Id) : IRequest<TemplateDto>;

public sealed class GetTemplateHandler(IApplicationDbContext db)
    : IRequestHandler<GetTemplateQuery, TemplateDto>
{
    public async ValueTask<TemplateDto> Handle(GetTemplateQuery query, CancellationToken ct)
    {
        var template = await db.Templates.AsNoTracking().FirstOrDefaultAsync(t => t.Id == query.Id, ct)
            ?? throw new NotFoundException("Template", query.Id);

        return TemplateDto.From(template);
    }
}
