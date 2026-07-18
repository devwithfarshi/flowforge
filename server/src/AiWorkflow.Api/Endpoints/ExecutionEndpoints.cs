using AiWorkflow.Application.Executions;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class ExecutionEndpoints
{
    public static IEndpointRouteBuilder MapExecutionEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/executions")
            .WithTags("Executions")
            .RequireAuthorization();

        group.MapGet("/", async (
            Guid? workflowId,
            string? status,
            string? trigger,
            string? search,
            string? sort,
            int? page,
            int? pageSize,
            IMediator mediator,
            CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(
                new ListExecutionsQuery(workflowId, status, trigger, search, sort, page, pageSize), ct)));

        // "recent" before "{id:guid}" so it never binds as an id.
        group.MapGet("/recent", async (int? n, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new RecentExecutionsQuery(n), ct)));

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new GetExecutionQuery(id), ct)));

        return app;
    }
}
