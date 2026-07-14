using System.Security.Claims;
using System.Text;

using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>
/// Mints HS256 access tokens (§4.1): TTL from config (default 15 min), claims
/// sub / email / role / jti (iat + exp are added by the handler).
/// </summary>
public sealed class JwtTokenService(IOptions<JwtOptions> options, IDateTime clock) : IJwtTokenService
{
    private static readonly JsonWebTokenHandler Handler = new();

    private readonly JwtOptions _options = options.Value;

    public AccessToken CreateAccessToken(User user)
    {
        var now = clock.UtcNow;
        var expiresAt = now.AddMinutes(_options.AccessTokenMinutes);

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));

        var descriptor = new SecurityTokenDescriptor
        {
            Issuer = _options.Issuer,
            Audience = _options.Audience,
            IssuedAt = now.UtcDateTime,
            NotBefore = now.UtcDateTime,
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256),
            Subject = new ClaimsIdentity(
            [
                new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Email, user.Email),
                new Claim("role", user.Role.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.CreateVersion7().ToString()),
            ]),
        };

        return new AccessToken(Handler.CreateToken(descriptor), expiresAt);
    }
}
