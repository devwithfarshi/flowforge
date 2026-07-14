using System.Buffers.Text;
using System.Security.Cryptography;

using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>
/// API keys (§15): `ffk_` + 256-bit base64url secret. Stored hashed (SHA-256) with a
/// short display prefix so the UI can identify keys without revealing them.
/// </summary>
public sealed class ApiKeyService : IApiKeyService
{
    private const string KeyPrefix = "ffk_";
    private const int DisplayPrefixLength = 12; // "ffk_" + first 8 chars of the secret

    public GeneratedApiKey Generate()
    {
        var rawKey = KeyPrefix + Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));
        return new GeneratedApiKey(rawKey, rawKey[..DisplayPrefixLength], Hash(rawKey));
    }

    public string Hash(string rawKey) =>
        Convert.ToHexStringLower(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawKey)));
}
