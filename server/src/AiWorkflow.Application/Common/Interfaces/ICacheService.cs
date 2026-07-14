namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>Distributed cache seam (§13): Redis in production, in-memory when unconfigured.</summary>
public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken ct = default);

    Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default);

    Task RemoveAsync(string key, CancellationToken ct = default);
}

/// <summary>
/// Marker for cacheable mediator queries (§13): the CachingBehavior stores the response
/// under <c>{CacheKeyPrefix}:{userId}</c> for <see cref="CacheTtl"/>. Invalidate by
/// removing that key when the underlying data changes.
/// </summary>
public interface ICacheableQuery
{
    string CacheKeyPrefix { get; }

    TimeSpan CacheTtl { get; }
}
