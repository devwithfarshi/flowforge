using AiWorkflow.Api.Hubs;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.ValueObjects;

using Microsoft.AspNetCore.SignalR;

namespace AiWorkflow.Api.Realtime;

/// <summary>
/// IRealtimeNotifier over SignalR. Lives in the Api layer (not Infrastructure) because
/// the hub type and IHubContext are ASP.NET Core framework concerns — the composition
/// root implements the Application seam (§2.2 note).
/// </summary>
public sealed class SignalRRealtimeNotifier(IHubContext<ExecutionHub> hubContext) : IRealtimeNotifier
{
    public Task ExecutionLog(Guid executionId, LogEntry entry, CancellationToken ct = default) =>
        hubContext.Clients.Group(ExecutionHub.GroupName(executionId))
            .SendAsync("executionLog", executionId, entry, ct);

    public Task ExecutionNodeRun(Guid executionId, NodeRun run, CancellationToken ct = default) =>
        hubContext.Clients.Group(ExecutionHub.GroupName(executionId))
            .SendAsync("executionNodeRun", executionId, run, ct);

    public Task ExecutionStatus(Guid executionId, string status, CancellationToken ct = default) =>
        hubContext.Clients.Group(ExecutionHub.GroupName(executionId))
            .SendAsync("executionStatus", executionId, status, ct);
}
