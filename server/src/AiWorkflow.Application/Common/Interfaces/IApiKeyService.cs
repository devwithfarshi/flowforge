namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// A freshly issued API key: the raw key is shown once; only <see cref="KeyHash"/> is
/// stored, with <see cref="Prefix"/> kept for display in the UI (§15).
/// </summary>
public sealed record GeneratedApiKey(string RawKey, string Prefix, string KeyHash);

public interface IApiKeyService
{
    GeneratedApiKey Generate();

    /// <summary>Hash a presented raw key for O(1) lookup against api_keys.key_hash.</summary>
    string Hash(string rawKey);
}
