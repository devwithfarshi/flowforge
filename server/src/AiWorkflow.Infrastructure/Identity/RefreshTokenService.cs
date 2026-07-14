using System.Buffers.Text;
using System.Security.Cryptography;

using AiWorkflow.Application.Common.Interfaces;

using Microsoft.Extensions.Options;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>
/// Opaque 256-bit refresh tokens (§4.1). Base64url raw value; SHA-256 hex hash is the
/// only thing persisted (refresh_tokens.token_hash, unique).
/// </summary>
public sealed class RefreshTokenService(IOptions<JwtOptions> options) : IRefreshTokenService
{
    public TimeSpan Lifetime { get; } = TimeSpan.FromDays(options.Value.RefreshTokenDays);

    public GeneratedRefreshToken Generate()
    {
        var rawToken = Base64Url.EncodeToString(RandomNumberGenerator.GetBytes(32));
        return new GeneratedRefreshToken(rawToken, Hash(rawToken));
    }

    public string Hash(string rawToken) =>
        Convert.ToHexStringLower(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(rawToken)));
}
