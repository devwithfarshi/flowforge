using AiWorkflow.Domain.ValueObjects;

namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Live execution streaming (§14.3): pushes to the SignalR group `exec-{executionId}`;
/// the builder console subscribes. Implemented by the Api layer.
/// </summary>
public interface IRealtimeNotifier
{
    Task ExecutionLog(Guid executionId, LogEntry entry, CancellationToken ct = default);

    Task ExecutionNodeRun(Guid executionId, NodeRun run, CancellationToken ct = default);

    Task ExecutionStatus(Guid executionId, string status, CancellationToken ct = default);
}
