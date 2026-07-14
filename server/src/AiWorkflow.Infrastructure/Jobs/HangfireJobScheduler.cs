using AiWorkflow.Application.Common.Interfaces;

using Hangfire;

namespace AiWorkflow.Infrastructure.Jobs;

/// <summary>Hangfire-backed IJobScheduler (§14.1): durable enqueue in Postgres, retries for free.</summary>
public sealed class HangfireJobScheduler(IBackgroundJobClient client) : IJobScheduler
{
    public void EnqueueExecution(Guid executionId) =>
        client.Enqueue<IExecutionEngine>(engine => engine.RunAsync(executionId, CancellationToken.None));
}
