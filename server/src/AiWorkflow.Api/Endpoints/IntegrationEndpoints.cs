using System.Text.Json;

using AiWorkflow.Application.Integrations;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class IntegrationEndpoints
{
    public sealed record ConnectRequest(string Label, JsonElement? Credentials);

    public static IEndpointRouteBuilder MapIntegrationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/integrations")
            .WithTags("Integrations")
            .RequireAuthorization();

        group.MapGet("/", async (IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new ListIntegrationsQuery(), ct)));

        group.MapPost("/{id:guid}/connect", async (Guid id, ConnectRequest request, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(
                new ConnectIntegrationCommand(id, request.Label, request.Credentials), ct)));

        group.MapDelete("/{id:guid}/accounts/{accountId:guid}", async (Guid id, Guid accountId, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new DisconnectIntegrationCommand(id, accountId), ct)));

        return app;
    }
}
