using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Enums;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Dashboard;

/// <summary>Serializes to the frontend's `DashboardStats` shape (client/src/lib/api.ts).</summary>
public sealed record DashboardStatsDto(
    int TotalWorkflows,
    int ActiveWorkflows,
    int TotalExecutions,
    int FailedExecutions,
    int SuccessRate,
    int ConnectedIntegrations,
    int UnreadNotifications,
    int ExecToday,
    int[] Trend);

/// <summary>
/// `GET /dashboard/stats` (§6.2): owner-scoped aggregates + a 14-day run trend
/// (oldest day first, UTC buckets). Redis caching joins in the caching task (§13).
/// </summary>
public sealed record DashboardStatsQuery : IRequest<DashboardStatsDto>;

public sealed class DashboardStatsHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<DashboardStatsQuery, DashboardStatsDto>
{
    public async ValueTask<DashboardStatsDto> Handle(DashboardStatsQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var workflows = db.Workflows.AsNoTracking()
            .Where(w => w.OwnerId == userId && w.Status != WorkflowStatus.Archived);

        var totalWorkflows = await workflows.CountAsync(ct);
        var activeWorkflows = await workflows.CountAsync(w => w.Status == WorkflowStatus.Active, ct);
        var totalExecutions = await workflows.SumAsync(w => w.ExecutionCount, ct);

        var executions = db.Executions.AsNoTracking()
            .Where(e => db.Workflows.Any(w => w.Id == e.WorkflowId && w.OwnerId == userId));

        var failed = await executions.CountAsync(e => e.Status == ExecutionStatus.Failed, ct);
        var succeeded = await executions.CountAsync(e => e.Status == ExecutionStatus.Success, ct);

        var connectedIntegrations = await db.IntegrationAccounts.AsNoTracking()
            .Where(a => a.UserId == userId)
            .Select(a => a.IntegrationId)
            .Distinct()
            .CountAsync(ct);

        var unreadNotifications = await db.Notifications.AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead && !n.IsArchived, ct);

        // Trend: one UTC-day bucket per day, oldest first (mock parity, minus its noise).
        var today = clock.UtcNow.UtcDateTime.Date;
        var windowStart = new DateTimeOffset(today.AddDays(-13), TimeSpan.Zero);

        var recentStarts = await executions
            .Where(e => e.StartedAt >= windowStart)
            .Select(e => e.StartedAt)
            .ToListAsync(ct);

        var trend = new int[14];
        foreach (var startedAt in recentStarts)
        {
            var dayIndex = (int)(startedAt.UtcDateTime.Date - windowStart.UtcDateTime.Date).TotalDays;
            if (dayIndex is >= 0 and < 14)
            {
                trend[dayIndex]++;
            }
        }

        return new DashboardStatsDto(
            totalWorkflows,
            activeWorkflows,
            totalExecutions,
            failed,
            succeeded + failed == 0 ? 100 : (int)Math.Round(succeeded / (double)(succeeded + failed) * 100),
            connectedIntegrations,
            unreadNotifications,
            trend[13],
            trend);
    }
}
