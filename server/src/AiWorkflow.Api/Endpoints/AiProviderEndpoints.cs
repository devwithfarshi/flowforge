using AiWorkflow.Application.AiProviders;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class AiProviderEndpoints
{
    public sealed record SetKeyRequest(string ApiKey);

    public static IEndpointRouteBuilder MapAiProviderEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/me/ai-providers")
            .WithTags("AI Providers")
            .RequireAuthorization();

        group.MapGet("/", async (IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new ListAiProvidersQuery(), ct)));

        group.MapPut("/{provider}", async (
            string provider, SetKeyRequest request, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new SetAiProviderKeyCommand(provider, request.ApiKey), ct)));

        group.MapDelete("/{provider}", async (string provider, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new RemoveAiProviderKeyCommand(provider), ct);
            return Results.NoContent();
        });

        return app;
    }
}
