using AiWorkflow.Application.Common.Interfaces;

using Mediator;

namespace AiWorkflow.Application.Common.Behaviors;

/// <summary>
/// Read-through cache for queries marked <see cref="ICacheableQuery"/> (§9.3/§13),
/// keyed per user. Sits innermost in the pipeline, just before the handler.
/// </summary>
public sealed class CachingBehavior<TMessage, TResponse>(ICacheService cache, ICurrentUser currentUser)
    : IPipelineBehavior<TMessage, TResponse>
    where TMessage : notnull, IMessage, ICacheableQuery
{
    public async ValueTask<TResponse> Handle(
        TMessage message,
        MessageHandlerDelegate<TMessage, TResponse> next,
        CancellationToken cancellationToken)
    {
        var key = $"{message.CacheKeyPrefix}:{currentUser.Id}";

        var cached = await cache.GetAsync<TResponse>(key, cancellationToken);
        if (cached is not null)
        {
            return cached;
        }

        var response = await next(message, cancellationToken);
        await cache.SetAsync(key, response, message.CacheTtl, cancellationToken);

        return response;
    }
}
