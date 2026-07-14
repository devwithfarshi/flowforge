using AiWorkflow.Application.Common.Interfaces;

using CloudinaryDotNet;
using CloudinaryDotNet.Actions;

namespace AiWorkflow.Infrastructure.Storage;

/// <summary>
/// Cloudinary-backed IFileStorage (§12). Signing is a local HMAC over the upload
/// parameters — no network round-trip; uploads/deletes call the Cloudinary API.
/// </summary>
public sealed class CloudinaryFileStorage(string cloudinaryUrl) : IFileStorage
{
    private readonly Cloudinary _cloudinary = new(cloudinaryUrl);

    public async Task<StoredFile> UploadAsync(
        Stream content, string fileName, string folder, CancellationToken ct = default)
    {
        var result = await _cloudinary.UploadAsync(new RawUploadParams
        {
            File = new FileDescription(fileName, content),
            Folder = folder,
            UseFilename = true,
            UniqueFilename = true,
        }, "auto", ct);

        if (result.Error is not null)
        {
            throw new InvalidOperationException($"Cloudinary upload failed: {result.Error.Message}");
        }

        return new StoredFile(result.PublicId, result.SecureUrl.ToString());
    }

    public SignedUpload CreateSignedUpload(string folder, string publicId)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds();

        var parameters = new SortedDictionary<string, object>
        {
            ["folder"] = folder,
            ["public_id"] = publicId,
            ["timestamp"] = timestamp,
        };

        var signature = _cloudinary.Api.SignParameters(parameters);
        var uploadUrl = $"https://api.cloudinary.com/v1_1/{_cloudinary.Api.Account.Cloud}/auto/upload";

        return new SignedUpload(
            uploadUrl,
            _cloudinary.Api.Account.ApiKey,
            timestamp,
            signature,
            folder,
            publicId);
    }

    public async Task DeleteAsync(string publicId, CancellationToken ct = default)
    {
        var result = await _cloudinary.DestroyAsync(new DeletionParams(publicId));

        if (result.Error is not null)
        {
            throw new InvalidOperationException($"Cloudinary delete failed: {result.Error.Message}");
        }
    }
}

/// <summary>Registered when Cloudinary__Url is unset — fails loudly instead of silently.</summary>
public sealed class UnconfiguredFileStorage : IFileStorage
{
    private const string Message =
        "File storage is not configured. Set Cloudinary__Url (see server/.env.example).";

    public Task<StoredFile> UploadAsync(Stream content, string fileName, string folder, CancellationToken ct = default) =>
        throw new InvalidOperationException(Message);

    public SignedUpload CreateSignedUpload(string folder, string publicId) =>
        throw new InvalidOperationException(Message);

    public Task DeleteAsync(string publicId, CancellationToken ct = default) =>
        throw new InvalidOperationException(Message);
}
