using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using Google.Apis.Auth;

using Microsoft.Extensions.Options;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>
/// Validates Google ID tokens against Google's JWKS via `Google.Apis.Auth` (§4.5):
/// checks signature, `aud` == our client id, `iss` == accounts.google.com, and expiry.
/// The raw token is never decoded/trusted client-side.
/// </summary>
public sealed class GoogleIdTokenValidator(IOptions<GoogleOptions> options) : IGoogleIdTokenValidator
{
    public async Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken ct = default)
    {
        GoogleJsonWebSignature.Payload payload;
        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(idToken, new GoogleJsonWebSignature.ValidationSettings
            {
                Audience = [options.Value.ClientId],
            });
        }
        catch (InvalidJwtException ex)
        {
            throw new UnauthorizedException("Invalid Google ID token", ex);
        }

        return new GoogleIdentity(payload.Subject, payload.Email, payload.EmailVerified, payload.Name);
    }
}
