using AiWorkflow.Application.Templates;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class TemplateEndpoints
{
    public static IEndpointRouteBuilder MapTemplateEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/templates")
            .WithTags("Templates")
            .RequireAuthorization();

        group.MapGet("/", async (string? search, string? category, string? sort, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new ListTemplatesQuery(search, category, sort), ct)));

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new GetTemplateQuery(id), ct)));

        group.MapPost("/{id:guid}/install", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var workflow = await mediator.Send(new InstallTemplateCommand(id), ct);
            return Results.Created($"/api/v1/workflows/{workflow.Id}", workflow);
        });

        return app;
    }
}
