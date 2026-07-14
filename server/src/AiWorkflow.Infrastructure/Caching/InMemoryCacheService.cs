using System.Collections.Concurrent;

using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Caching;

/// <summary>
/// Fallback when Redis__ConnectionString isn't configured (§13): keeps local dev
/// runnable from a clean checkout. Single-instance only — production uses Redis.
/// </summary>
public sealed class InMemoryCacheService(IDateTime clock) : ICacheService
{
    private readonly ConcurrentDictionary<string, (object Value, DateTimeOffset ExpiresAt)> _entries = new();

    public Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        if (_entries.TryGetValue(key, out var entry) && entry.ExpiresAt > clock.UtcNow)
        {
            return Task.FromResult((T?)entry.Value);
        }

        _entries.TryRemove(key, out _);
        return Task.FromResult(default(T));
    }

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default)
    {
        _entries[key] = (value!, clock.UtcNow.Add(ttl));
        return Task.CompletedTask;
    }

    public Task RemoveAsync(string key, CancellationToken ct = default)
    {
        _entries.TryRemove(key, out _);
        return Task.CompletedTask;
    }
}
