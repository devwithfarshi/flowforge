using Mediator;

using Microsoft.Extensions.Logging;

namespace AiWorkflow.Application.Common.Behaviors;

/// <summary>
/// Structured log line per mediator request: name + elapsed on success, error on failure.
/// Message contents are never logged (§10.3: no secrets/tokens in logs).
/// </summary>
public sealed class LoggingBehavior<TMessage, TResponse>(ILogger<LoggingBehavior<TMessage, TResponse>> logger)
    : IPipelineBehavior<TMessage, TResponse>
    where TMessage : notnull, IMessage
{
    public async ValueTask<TResponse> Handle(
        TMessage message,
        MessageHandlerDelegate<TMessage, TResponse> next,
        CancellationToken cancellationToken)
    {
        var requestName = typeof(TMessage).Name;
        var startedAt = System.Diagnostics.Stopwatch.GetTimestamp();

        try
        {
            var response = await next(message, cancellationToken);

            logger.LogInformation(
                "Handled {RequestName} in {ElapsedMs}ms",
                requestName,
                System.Diagnostics.Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds);

            return response;
        }
        catch (Exception ex)
        {
            logger.LogError(
                ex,
                "Error handling {RequestName} after {ElapsedMs}ms",
                requestName,
                System.Diagnostics.Stopwatch.GetElapsedTime(startedAt).TotalMilliseconds);

            throw;
        }
    }
}
