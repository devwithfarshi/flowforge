namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>Secrets-at-rest encryption (§15) for integration credentials and secret variables.</summary>
public interface ICredentialEncryptor
{
    string Encrypt(string plaintext);

    string Decrypt(string ciphertext);
}
