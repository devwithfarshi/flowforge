using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Executions.Executors;

/// <summary>Trigger nodes have no work — they emit the run's initial payload instantly.</summary>
public sealed class ManualTriggerExecutor : INodeExecutor
{
    public string Type => "trigger.manual";

    public Task<NodeResult> ExecuteAsync(NodeContext ctx, CancellationToken ct) =>
        Task.FromResult(new NodeResult("""{ "trigger": "manual" }"""));
}
