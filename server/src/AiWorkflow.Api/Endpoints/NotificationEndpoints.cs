using AiWorkflow.Application.Activity;
using AiWorkflow.Application.Notifications;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class NotificationEndpoints
{
    public sealed record ArchiveNotificationRequest(bool Archived);

    public static IEndpointRouteBuilder MapNotificationEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/notifications")
            .WithTags("Notifications")
            .RequireAuthorization();

        group.MapGet("/", async (string? filter, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new ListNotificationsQuery(filter), ct)));

        group.MapGet("/unread-count", async (IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new UnreadCountQuery(), ct)));

        group.MapPost("/read-all", async (IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new MarkAllNotificationsReadCommand(), ct);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/read", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new MarkNotificationReadCommand(id, Read: true), ct);
            return Results.NoContent();
        });

        group.MapPost("/{id:guid}/archive", async (Guid id, ArchiveNotificationRequest request, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new SetNotificationArchivedCommand(id, request.Archived), ct);
            return Results.NoContent();
        });

        group.MapDelete("/{id:guid}", async (Guid id, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new DeleteNotificationCommand(id), ct);
            return Results.NoContent();
        });

        return app;
    }

    public static IEndpointRouteBuilder MapActivityEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/activity")
            .WithTags("Activity")
            .RequireAuthorization();

        group.MapGet("/", async (string? search, string? category, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new ListActivityQuery(search, category), ct)));

        group.MapGet("/recent", async (int? n, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(new RecentActivityQuery(n), ct)));

        return group;
    }
}
