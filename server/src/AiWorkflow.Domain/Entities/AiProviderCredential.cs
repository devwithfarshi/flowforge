using AiWorkflow.Domain.Common;

namespace AiWorkflow.Domain.Entities;

/// <summary>
/// A user's bring-your-own-key API credential for an LLM provider
/// (<c>openai</c> / <c>gemini</c> / <c>anthropic</c>). The key is stored encrypted
/// (§15) — never returned by the API, decrypted only by the <c>ai.llm</c> node
/// executor at run time. One row per (user, provider).
/// </summary>
public sealed class AiProviderCredential : AuditableEntity
{
    public Guid UserId { get; private set; }

    /// <summary>Lower-case provider key: <c>openai</c>, <c>gemini</c>, or <c>anthropic</c>.</summary>
    public string Provider { get; private set; } = default!;

    public string EncryptedApiKey { get; private set; } = default!;

    /// <summary>Last 4 characters of the raw key, for masked display (never the full key).</summary>
    public string Last4 { get; private set; } = default!;

    private AiProviderCredential() { }

    public static AiProviderCredential Create(
        Guid userId, string provider, string encryptedApiKey, string last4) => new()
        {
            UserId = userId,
            Provider = provider,
            EncryptedApiKey = encryptedApiKey,
            Last4 = last4,
        };

    public void Update(string encryptedApiKey, string last4)
    {
        EncryptedApiKey = encryptedApiKey;
        Last4 = last4;
    }
}
