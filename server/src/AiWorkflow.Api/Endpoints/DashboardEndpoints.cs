using AiWorkflow.Application.Dashboard;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class DashboardEndpoints
{
    public static IEndpointRouteBuilder MapDashboardEndpoints(this IEndpointRouteBuilder app)
    {
        app.MapGet("/api/v1/dashboard/stats", async (IMediator mediator, CancellationToken ct) =>
                TypedResults.Ok(await mediator.Send(new DashboardStatsQuery(), ct)))
            .WithTags("Dashboard")
            .RequireAuthorization();

        return app;
    }
}
