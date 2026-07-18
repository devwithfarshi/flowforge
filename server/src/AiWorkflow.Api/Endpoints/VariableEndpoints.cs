using AiWorkflow.Application.Variables;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class VariableEndpoints
{
    public sealed record CreateVariableRequest(
        string Key, string Value, string Scope, string? Environment, string? Description);

    public sealed record UpdateVariableRequest(
        string? Key, string? Value, string? Scope, string? Environment, string? Description);

    public static IEndpointRouteBuilder MapVariableEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/variables")
            .WithTags("Variables")
            .RequireAuthorization();

        group.MapGet("/", async (string? search, string? scope, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new ListVariablesQuery(search, scope), ct)));

        group.MapPost("/", async (CreateVariableRequest request, IMediator mediator, CancellationToken ct) =>
        {
            var variable = await mediator.Send(new CreateVariableCommand(
                request.Key, request.Value, request.Scope, request.Environment, request.Description), ct);
            return Results.Created($"/api/v1/variables/{variable.Id}", variable);
        });

        group.MapPut("/{id:guid}", async (Guid id, UpdateVariableRequest request, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new UpdateVariableCommand(
                id, request.Key, request.Value, request.Scope, request.Environment, request.Description), ct)));

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new DeleteVariableCommand(id), ct);
            return Results.NoContent();
        });

        return app;
    }
}
