namespace AiWorkflow.Infrastructure.Executions.Llm;

/// <summary>A single-shot text completion request for an LLM provider.</summary>
public sealed record LlmRequest(string Model, string Prompt, double? Temperature);

/// <summary>
/// One implementation per LLM provider (openai/gemini/anthropic). Each is called
/// with the workflow owner's own API key (bring-your-own-key, §12) and returns the
/// generated text. Real HTTP calls to the provider's public API.
/// </summary>
public interface ILlmProvider
{
    /// <summary>Lower-case provider key: <c>openai</c>, <c>gemini</c>, or <c>anthropic</c>.</summary>
    string Provider { get; }

    Task<string> CompleteAsync(LlmRequest request, string apiKey, CancellationToken ct);
}

internal static class LlmHttp
{
    /// <summary>Trims an error body for a node-failure message (never contains the key).</summary>
    internal static string Truncate(string s, int max = 400) =>
        s.Length <= max ? s : string.Concat(s.AsSpan(0, max), "…");
}
