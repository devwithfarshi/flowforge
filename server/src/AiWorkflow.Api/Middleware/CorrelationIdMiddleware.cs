using Serilog.Context;

namespace AiWorkflow.Api.Middleware;

/// <summary>
/// Reads (or creates) X-Correlation-Id, pushes it into the Serilog LogContext, and
/// echoes it on the response — one id threads request → handler → jobs → SignalR (§10.3).
/// </summary>
public sealed class CorrelationIdMiddleware(RequestDelegate next)
{
    public const string HeaderName = "X-Correlation-Id";

    public async Task InvokeAsync(HttpContext context)
    {
        var correlationId =
            context.Request.Headers.TryGetValue(HeaderName, out var incoming) && !string.IsNullOrWhiteSpace(incoming)
                ? incoming.ToString()
                : Guid.CreateVersion7().ToString();

        context.Items[HeaderName] = correlationId;
        context.Response.Headers[HeaderName] = correlationId;

        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            await next(context);
        }
    }
}
