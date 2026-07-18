using AiWorkflow.Application.Settings;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class MeEndpoints
{
    public sealed record UpdatePreferencesRequest(
        string? Theme,
        bool? SidebarCollapsed,
        string? Density,
        string? DefaultView,
        string? Language,
        bool? AccentAnimations);

    public sealed record UpdateSettingsRequest(
        bool? NotifyOnSuccess,
        bool? NotifyOnFailure,
        bool? NotifyOnIntegration,
        bool? WeeklyDigest,
        bool? TwoFactorEnabled);

    public static IEndpointRouteBuilder MapMeEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/me")
            .WithTags("Me")
            .RequireAuthorization();

        group.MapGet("/preferences", async (IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new GetPreferencesQuery(), ct)));

        group.MapPatch("/preferences", async (UpdatePreferencesRequest request, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(
                new UpdatePreferencesCommand(
                    request.Theme,
                    request.SidebarCollapsed,
                    request.Density,
                    request.DefaultView,
                    request.Language,
                    request.AccentAnimations),
                ct)));

        group.MapGet("/settings", async (IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(new GetSettingsQuery(), ct)));

        group.MapPatch("/settings", async (UpdateSettingsRequest request, IMediator mediator, CancellationToken ct) =>
            TypedResults.Ok(await mediator.Send(
                new UpdateSettingsCommand(
                    request.NotifyOnSuccess,
                    request.NotifyOnFailure,
                    request.NotifyOnIntegration,
                    request.WeeklyDigest,
                    request.TwoFactorEnabled),
                ct)));

        return app;
    }
}
