using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Test double for <see cref="IGoogleIdTokenValidator"/>: rather than a real signed JWT,
/// tests pass a delimited "token" of the identity they want back, so the Google auth
/// flow can be exercised end-to-end without hitting Google's JWKS.
/// </summary>
public sealed class FakeGoogleIdTokenValidator : IGoogleIdTokenValidator
{
    public static string Token(string subject, string email, bool emailVerified, string name) =>
        $"{subject}|{email}|{emailVerified}|{name}";

    public Task<GoogleIdentity> ValidateAsync(string idToken, CancellationToken ct = default)
    {
        var parts = idToken.Split('|');
        if (parts.Length != 4 || !bool.TryParse(parts[2], out var emailVerified))
        {
            throw new UnauthorizedException("Invalid Google ID token");
        }

        return Task.FromResult(new GoogleIdentity(parts[0], parts[1], emailVerified, parts[3]));
    }
}
