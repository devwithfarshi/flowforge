using Microsoft.AspNetCore.SignalR;

namespace AiWorkflow.Api.Hubs;

/// <summary>
/// Live execution console (§14.3): clients join `exec-{id}` groups and receive
/// `executionLog` / `executionNodeRun` / `executionStatus` messages.
/// </summary>
public sealed class ExecutionHub : Hub
{
    public static string GroupName(Guid executionId) => $"exec-{executionId}";

    public Task JoinExecution(Guid executionId) =>
        Groups.AddToGroupAsync(Context.ConnectionId, GroupName(executionId));

    public Task LeaveExecution(Guid executionId) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, GroupName(executionId));
}
