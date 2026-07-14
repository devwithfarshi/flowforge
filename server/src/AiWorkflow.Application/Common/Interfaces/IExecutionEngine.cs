namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>The engine a background job invokes to run a queued execution (§14.2).</summary>
public interface IExecutionEngine
{
    Task RunAsync(Guid executionId, CancellationToken ct);
}
