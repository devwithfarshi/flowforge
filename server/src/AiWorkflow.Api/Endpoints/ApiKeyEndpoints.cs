using AiWorkflow.Application.ApiKeys;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class ApiKeyEndpoints
{
    public sealed record CreateApiKeyRequest(string Name, List<string> Scopes);

    public static IEndpointRouteBuilder MapApiKeyEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/api-keys")
            .WithTags("ApiKeys")
            .RequireAuthorization();

        group.MapGet("/", async (IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new ListApiKeysQuery(), ct)));

        group.MapPost("/", async (CreateApiKeyRequest request, IMediator mediator, CancellationToken ct) =>
        {
            var created = await mediator.Send(new CreateApiKeyCommand(request.Name, request.Scopes), ct);
            return Results.Created($"/api/v1/api-keys/{created.Key.Id}", created);
        });

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new RevokeApiKeyCommand(id), ct);
            return Results.NoContent();
        });

        return app;
    }
}
