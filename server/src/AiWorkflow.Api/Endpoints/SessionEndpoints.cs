using AiWorkflow.Application.Sessions;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/sessions")
            .WithTags("Sessions")
            .RequireAuthorization();

        group.MapGet("/", async (IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new GetSessionsQuery(), ct)));

        // "others" before "{id:guid}" so it never binds as an id.
        group.MapDelete("/others", async (IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new RevokeOtherSessionsCommand(), ct);
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new RevokeSessionCommand(id), ct);
            return Results.NoContent();
        });

        return app;
    }
}
