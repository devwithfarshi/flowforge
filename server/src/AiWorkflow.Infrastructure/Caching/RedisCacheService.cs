using System.Text.Json;

using AiWorkflow.Application.Common.Interfaces;

using StackExchange.Redis;

namespace AiWorkflow.Infrastructure.Caching;

/// <summary>Redis-backed ICacheService (§13): JSON values with per-key TTLs.</summary>
public sealed class RedisCacheService(IConnectionMultiplexer redis) : ICacheService
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private IDatabase Db => redis.GetDatabase();

    public async Task<T?> GetAsync<T>(string key, CancellationToken ct = default)
    {
        var value = await Db.StringGetAsync(key);
        return value.IsNullOrEmpty ? default : JsonSerializer.Deserialize<T>(value.ToString(), Json);
    }

    public Task SetAsync<T>(string key, T value, TimeSpan ttl, CancellationToken ct = default) =>
        Db.StringSetAsync(key, JsonSerializer.Serialize(value, Json), ttl);

    public Task RemoveAsync(string key, CancellationToken ct = default) =>
        Db.KeyDeleteAsync(key);
}
