using System.Net.Http.Json;
using System.Text;
using System.Text.Json;

using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Executions.Llm;

/// <summary>
/// Anthropic Messages API (raw HTTP). `max_tokens` is required. `temperature` is
/// intentionally omitted — current Claude models (Opus 4.8, Sonnet 5) reject it
/// with a 400. Response text is concatenated from the `content` text blocks.
/// </summary>
public sealed class AnthropicProvider : ILlmProvider
{
    private static readonly HttpClient Http = new();

    public string Provider => "anthropic";

    public async Task<string> CompleteAsync(LlmRequest req, string apiKey, CancellationToken ct)
    {
        var body = new Dictionary<string, object?>
        {
            ["model"] = req.Model,
            ["max_tokens"] = 1024,
            ["messages"] = new[] { new { role = "user", content = req.Prompt } },
        };

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", "2023-06-01");

        using var resp = await Http.SendAsync(request, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            throw new NodeExecutionException($"Anthropic API error ({(int)resp.StatusCode}): {LlmHttp.Truncate(json)}");

        using var doc = JsonDocument.Parse(json);
        var sb = new StringBuilder();
        foreach (var block in doc.RootElement.GetProperty("content").EnumerateArray())
            if (block.TryGetProperty("type", out var ty) && ty.GetString() == "text"
                && block.TryGetProperty("text", out var txt))
                sb.Append(txt.GetString());
        return sb.ToString();
    }
}
