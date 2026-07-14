using AiWorkflow.Application.Common.Interfaces;

using Microsoft.AspNetCore.DataProtection;

namespace AiWorkflow.Infrastructure.Identity;

/// <summary>Data Protection–backed secrets-at-rest encryption (§15, AES-GCM under the hood).</summary>
public sealed class CredentialEncryptor(IDataProtectionProvider provider) : ICredentialEncryptor
{
    private readonly IDataProtector _protector = provider.CreateProtector("Flowforge.Credentials");

    public string Encrypt(string plaintext) => _protector.Protect(plaintext);

    public string Decrypt(string ciphertext) => _protector.Unprotect(ciphertext);
}
