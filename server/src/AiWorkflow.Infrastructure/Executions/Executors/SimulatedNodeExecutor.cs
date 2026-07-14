using System.Text.Json;

using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Executions.Executors;

/// <summary>
/// Fallback for node types without a real executor yet: a short simulated work delay
/// and `{ "ok": true }` output, mirroring the frontend's simulateExecution(). A node
/// with `config.simulateFail = true` throws — deterministic failure for tests/demos.
/// </summary>
public sealed class SimulatedNodeExecutor : INodeExecutor
{
    public string Type => "*";

    public async Task<NodeResult> ExecuteAsync(NodeContext ctx, CancellationToken ct)
    {
        if (ctx.Node.Config.TryGetValue("simulateFail", out var fail)
            && fail.ValueKind == JsonValueKind.True)
        {
            throw new NodeExecutionException($"\"{ctx.Node.Name}\" failed: request timed out");
        }

        await Task.Delay(Random.Shared.Next(20, 120), ct);

        return new NodeResult("""{ "ok": true }""");
    }
}
