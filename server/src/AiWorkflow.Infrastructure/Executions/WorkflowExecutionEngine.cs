using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Application.Executions;
using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.ValueObjects;

using Mediator;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;


namespace AiWorkflow.Infrastructure.Executions;

/// <summary>
/// The engine (§14.2): topological sort → per-node executor with timeout → append
/// log + node run, persist and push after every node → final status + ExecutionCompleted.
/// A node failure marks the run failed and stops traversal (mock parity: no downstream runs).
/// </summary>
public sealed class WorkflowExecutionEngine(
    IApplicationDbContext db,
    NodeExecutorRegistry registry,
    IRealtimeNotifier notifier,
    IPublisher publisher,
    IDateTime clock,
    ILogger<WorkflowExecutionEngine> logger) : IExecutionEngine
{
    private static readonly TimeSpan NodeTimeout = TimeSpan.FromSeconds(60);

    public async Task RunAsync(Guid executionId, CancellationToken ct)
    {
        var execution = await db.Executions.FirstOrDefaultAsync(e => e.Id == executionId, ct);
        if (execution is null)
        {
            logger.LogWarning("Execution {ExecutionId} vanished before it could run", executionId);
            return;
        }

        var workflow = await db.Workflows.AsNoTracking()
            .FirstOrDefaultAsync(w => w.Id == execution.WorkflowId, ct);
        if (workflow is null)
        {
            execution.Complete(success: false, clock.UtcNow);
            await db.SaveChangesAsync(ct);
            return;
        }

        execution.Start(clock.UtcNow);
        await db.SaveChangesAsync(ct);
        await notifier.ExecutionStatus(execution.Id, "running", ct);

        // Empty graphs still "run" — the mock injects a manual trigger node.
        var nodes = workflow.Nodes.Count > 0
            ? TopologicalSort(workflow.Nodes, workflow.Edges)
            : [new WorkflowNode(Guid.CreateVersion7().ToString(), "trigger.manual", "Manual", null, new NodePosition(0, 0), [], null)];

        var success = true;

        if (nodes is null)
        {
            await Log(execution, "error", "Workflow graph contains a cycle — cannot execute", null, null, ct);
            success = false;
        }
        else
        {
            var outputs = new Dictionary<string, string?>();

            foreach (var node in nodes)
            {
                var startedAt = clock.UtcNow;
                await Log(execution, "info", $"Executing \"{node.Name}\"", node.Id, node.Name, ct);

                try
                {
                    using var timeout = CancellationTokenSource.CreateLinkedTokenSource(ct);
                    timeout.CancelAfter(NodeTimeout);

                    var upstream = workflow.Edges
                        .Where(e => e.Target == node.Id)
                        .ToDictionary(e => e.Source, e => outputs.GetValueOrDefault(e.Source));

                    var result = await registry.Resolve(node.Type)
                        .ExecuteAsync(new NodeContext(node, upstream, workflow.Variables), timeout.Token);
                    outputs[node.Id] = result.Output;

                    var duration = DurationMs(startedAt);
                    execution.AppendNodeRun(new NodeRun(
                        node.Id, node.Name, node.Type, "success", duration, startedAt, result.Output));
                    await Log(execution, "success", $"\"{node.Name}\" completed ({duration}ms)", node.Id, node.Name, ct);
                }
                catch (Exception ex) when (ex is not OperationCanceledException || !ct.IsCancellationRequested)
                {
                    var duration = DurationMs(startedAt);
                    var message = ex is NodeExecutionException
                        ? ex.Message
                        : $"\"{node.Name}\" failed: {ex.Message}";

                    execution.AppendNodeRun(new NodeRun(
                        node.Id, node.Name, node.Type, "failed", duration, startedAt, null));
                    await Log(execution, "error", message, node.Id, node.Name, ct);

                    success = false;
                    break;
                }
            }
        }

        execution.Complete(success, clock.UtcNow);
        await db.SaveChangesAsync(ct);
        await notifier.ExecutionStatus(execution.Id, success ? "success" : "failed", ct);

        await publisher.Publish(new ExecutionCompleted(execution.Id, execution.WorkflowId, success), ct);
    }

    private int DurationMs(DateTimeOffset startedAt) =>
        (int)Math.Max(0, (clock.UtcNow - startedAt).TotalMilliseconds);

    /// <summary>Appends to the execution, persists, and pushes to the live console (§14.2).</summary>
    private async Task Log(
        Execution execution, string level, string message, string? nodeId, string? nodeName, CancellationToken ct)
    {
        var entry = new LogEntry(Guid.CreateVersion7().ToString(), clock.UtcNow, level, message, nodeId, nodeName);
        execution.AppendLog(entry);
        await db.SaveChangesAsync(ct);
        await notifier.ExecutionLog(execution.Id, entry, ct);
    }

    /// <summary>Kahn's algorithm; null when the graph has a cycle (§14.2 validate DAG).</summary>
    private static List<WorkflowNode>? TopologicalSort(List<WorkflowNode> nodes, List<WorkflowEdge> edges)
    {
        var indegree = nodes.ToDictionary(n => n.Id, _ => 0);
        foreach (var edge in edges)
        {
            indegree[edge.Target]++;
        }

        // Seed with roots in original order — keeps mock-like traversal for linear graphs.
        var queue = new Queue<WorkflowNode>(nodes.Where(n => indegree[n.Id] == 0));
        var byId = nodes.ToDictionary(n => n.Id);
        var ordered = new List<WorkflowNode>(nodes.Count);

        while (queue.Count > 0)
        {
            var node = queue.Dequeue();
            ordered.Add(node);

            foreach (var edge in edges.Where(e => e.Source == node.Id))
            {
                if (--indegree[edge.Target] == 0)
                {
                    queue.Enqueue(byId[edge.Target]);
                }
            }
        }

        return ordered.Count == nodes.Count ? ordered : null;
    }
}
