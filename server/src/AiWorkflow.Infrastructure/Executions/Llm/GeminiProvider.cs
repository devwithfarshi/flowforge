using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Executions.Llm;

/// <summary>Google Gemini <c>generateContent</c> (raw HTTP).</summary>
public sealed class GeminiProvider : ILlmProvider
{
    private static readonly HttpClient Http = new();

    public string Provider => "gemini";

    public async Task<string> CompleteAsync(LlmRequest req, string apiKey, CancellationToken ct)
    {
        var body = new Dictionary<string, object?>
        {
            ["contents"] = new[] { new { parts = new[] { new { text = req.Prompt } } } },
        };
        if (req.Temperature is { } t) body["generationConfig"] = new { temperature = t };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{req.Model}:generateContent";
        using var request = new HttpRequestMessage(HttpMethod.Post, url) { Content = JsonContent.Create(body) };
        request.Headers.Add("x-goog-api-key", apiKey);

        using var resp = await Http.SendAsync(request, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            throw new NodeExecutionException($"Gemini API error ({(int)resp.StatusCode}): {LlmHttp.Truncate(json)}");

        using var doc = JsonDocument.Parse(json);
        var sb = new StringBuilder();
        foreach (var part in doc.RootElement.GetProperty("candidates")[0]
                     .GetProperty("content").GetProperty("parts").EnumerateArray())
            if (part.TryGetProperty("text", out var txt)) sb.Append(txt.GetString());
        return sb.ToString();
    }
}
