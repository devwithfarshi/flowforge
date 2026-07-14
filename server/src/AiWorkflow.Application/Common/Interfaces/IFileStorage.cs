namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>A stored file reference — keep the PublicId, not just the URL (§12).</summary>
public sealed record StoredFile(string PublicId, string Url);

/// <summary>
/// Signed direct-upload ticket (§12): the browser uploads straight to the provider
/// with these parameters, then posts the resulting reference back to the API.
/// </summary>
public sealed record SignedUpload(
    string UploadUrl,
    string ApiKey,
    long Timestamp,
    string Signature,
    string Folder,
    string PublicId);

/// <summary>File storage seam (§12): Cloudinary today, S3/MinIO swappable later.</summary>
public interface IFileStorage
{
    Task<StoredFile> UploadAsync(Stream content, string fileName, string folder, CancellationToken ct = default);

    SignedUpload CreateSignedUpload(string folder, string publicId);

    Task DeleteAsync(string publicId, CancellationToken ct = default);
}
