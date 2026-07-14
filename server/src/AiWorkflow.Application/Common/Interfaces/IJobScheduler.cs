namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Background-job seam (§14.1): the engine isn't coupled to Hangfire, so a broker can
/// replace it later without touching handlers (§23).
/// </summary>
public interface IJobScheduler
{
    void EnqueueExecution(Guid executionId);
}
