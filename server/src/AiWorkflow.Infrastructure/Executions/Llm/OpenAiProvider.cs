using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;

using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Executions.Llm;

/// <summary>OpenAI Chat Completions (raw HTTP).</summary>
public sealed class OpenAiProvider : ILlmProvider
{
    private static readonly HttpClient Http = new();

    public string Provider => "openai";

    public async Task<string> CompleteAsync(LlmRequest req, string apiKey, CancellationToken ct)
    {
        var body = new Dictionary<string, object?>
        {
            ["model"] = req.Model,
            ["messages"] = new[] { new { role = "user", content = req.Prompt } },
        };
        if (req.Temperature is { } t) body["temperature"] = t;

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions")
        {
            Content = JsonContent.Create(body),
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);

        using var resp = await Http.SendAsync(request, ct);
        var json = await resp.Content.ReadAsStringAsync(ct);
        if (!resp.IsSuccessStatusCode)
            throw new NodeExecutionException($"OpenAI API error ({(int)resp.StatusCode}): {LlmHttp.Truncate(json)}");

        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.GetProperty("choices")[0]
            .GetProperty("message").GetProperty("content").GetString() ?? "";
    }
}
