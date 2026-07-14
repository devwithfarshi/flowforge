namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Password hashing (§4.3): PBKDF2 with per-hash salt and a high work factor.
/// Plaintext is never stored or logged.
/// </summary>
public interface IPasswordHasher
{
    string Hash(string password);

    bool Verify(string passwordHash, string providedPassword);
}
