using System.Text.Json;

using Microsoft.EntityFrameworkCore.ChangeTracking;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

/// <summary>
/// Explicit jsonb mapping for document-shaped lists (§3.1): serialize with web (camelCase)
/// JSON so stored documents match the frontend shapes byte-for-byte. The comparer keeps
/// the change tracker honest for atomically-replaced lists.
/// </summary>
internal static class JsonbConversion
{
    private static readonly JsonSerializerOptions Options = new(JsonSerializerDefaults.Web);

    public static ValueConverter<List<T>, string> Converter<T>() => new(
        list => JsonSerializer.Serialize(list, Options),
        json => JsonSerializer.Deserialize<List<T>>(json, Options) ?? new List<T>());

    public static ValueComparer<List<T>> Comparer<T>() => new(
        (left, right) => JsonSerializer.Serialize(left, Options) == JsonSerializer.Serialize(right, Options),
        list => JsonSerializer.Serialize(list, Options).GetHashCode(),
        list => JsonSerializer.Deserialize<List<T>>(JsonSerializer.Serialize(list, Options), Options)!);
}
