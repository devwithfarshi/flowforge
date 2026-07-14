using AiWorkflow.Application.Executions;
using AiWorkflow.Application.Workflows;
using AiWorkflow.Domain.ValueObjects;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class WorkflowEndpoints
{
    /// <summary>Create/update bodies mirror the mock's `Partial&lt;Workflow&gt;` — everything optional.</summary>
    public sealed record WorkflowRequest(
        string? Name,
        string? Description,
        List<string>? Tags,
        string? Status,
        string? TriggerType,
        List<WorkflowNode>? Nodes,
        List<WorkflowEdge>? Edges,
        List<WorkflowVariable>? Variables);

    public sealed record SetArchivedRequest(bool Archived);

    public sealed record SetStatusRequest(string Status);

    public static IEndpointRouteBuilder MapWorkflowEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/workflows")
            .WithTags("Workflows")
            .RequireAuthorization();

        group.MapGet("/", async (
            string? search,
            string? status,
            string? trigger,
            string? tag,
            string? sort,
            int? page,
            int? pageSize,
            bool? includeArchived,
            IMediator mediator,
            CancellationToken ct) =>
            Results.Ok(await mediator.Send(
                new ListWorkflowsQuery(search, status, trigger, tag, sort, page, pageSize, includeArchived ?? false), ct)));

        group.MapGet("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new GetWorkflowQuery(id), ct)));

        group.MapPost("/", async (WorkflowRequest request, IMediator mediator, CancellationToken ct) =>
        {
            var workflow = await mediator.Send(
                new CreateWorkflowCommand(
                    request.Name, request.Description, request.Tags, request.Status,
                    request.TriggerType, request.Nodes, request.Edges, request.Variables),
                ct);
            return Results.Created($"/api/v1/workflows/{workflow.Id}", workflow);
        });

        group.MapPut("/{id:guid}", async (Guid id, WorkflowRequest request, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(
                new UpdateWorkflowCommand(
                    id, request.Name, request.Description, request.Tags, request.Status,
                    request.TriggerType, request.Nodes, request.Edges, request.Variables),
                ct)));

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new DeleteWorkflowCommand(id), ct);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/duplicate", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var copy = await mediator.Send(new DuplicateWorkflowCommand(id), ct);
            return Results.Created($"/api/v1/workflows/{copy.Id}", copy);
        });

        group.MapPost("/{id:guid}/archive", async (Guid id, SetArchivedRequest request, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new SetWorkflowArchivedCommand(id, request.Archived), ct)));

        group.MapPost("/{id:guid}/favorite", async (Guid id, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new ToggleWorkflowFavoriteCommand(id), ct)));

        group.MapPatch("/{id:guid}/status", async (Guid id, SetStatusRequest request, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new SetWorkflowStatusCommand(id, request.Status), ct)));

        // §14.2: enqueue + return the queued execution; progress streams over SignalR.
        group.MapPost("/{id:guid}/run", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            var execution = await mediator.Send(new RunWorkflowCommand(id), ct);
            return Results.Accepted($"/api/v1/executions/{execution.Id}", execution);
        });

        return app;
    }
}
