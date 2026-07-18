using System.Text.Json;

using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Infrastructure.Executions.Llm;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace AiWorkflow.Infrastructure.Executions.Executors;

/// <summary>
/// Real executor for <c>ai.llm</c> nodes (§14.3). Reads the node's provider/model/
/// prompt/temperature, resolves the workflow owner's bring-your-own-key credential
/// for that provider (decrypted only here, at run time), then calls OpenAI / Gemini
/// / Anthropic. <c>{{input}}</c> in the prompt is replaced with the upstream node
/// outputs; with no prompt the node just forwards its input to the model.
/// </summary>
public sealed class LlmNodeExecutor(
    IServiceScopeFactory scopeFactory,
    ICredentialEncryptor encryptor,
    IEnumerable<ILlmProvider> providers) : INodeExecutor
{
    private readonly IReadOnlyDictionary<string, ILlmProvider> _providers =
        providers.ToDictionary(p => p.Provider, StringComparer.OrdinalIgnoreCase);

    public string Type => "ai.llm";

    public async Task<NodeResult> ExecuteAsync(NodeContext ctx, CancellationToken ct)
    {
        var model = GetString(ctx, "model") ?? "claude-opus-4-8";
        var providerKey = GetString(ctx, "provider");
        if (string.IsNullOrWhiteSpace(providerKey)) providerKey = InferProvider(model);
        providerKey = providerKey.ToLowerInvariant();

        var upstream = string.Join(
            "\n\n", ctx.UpstreamOutputs.Values.Where(v => !string.IsNullOrWhiteSpace(v)));
        var prompt = (GetString(ctx, "prompt") ?? string.Empty).Replace("{{input}}", upstream);
        if (string.IsNullOrWhiteSpace(prompt)) prompt = upstream;
        if (string.IsNullOrWhiteSpace(prompt))
            throw new NodeExecutionException($"\"{ctx.Node.Name}\" has no prompt or input.");

        if (!_providers.TryGetValue(providerKey, out var provider))
            throw new NodeExecutionException($"\"{ctx.Node.Name}\": unknown AI provider \"{providerKey}\".");

        string apiKey;
        using (var scope = scopeFactory.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<IApplicationDbContext>();
            var cred = await db.AiProviderCredentials.AsNoTracking()
                .FirstOrDefaultAsync(c => c.UserId == ctx.OwnerId && c.Provider == providerKey, ct);
            if (cred is null)
                throw new NodeExecutionException(
                    $"No {providerKey} API key configured. Add one in Settings → AI providers.");
            apiKey = encryptor.Decrypt(cred.EncryptedApiKey);
        }

        try
        {
            var output = await provider.CompleteAsync(
                new LlmRequest(model, prompt, GetDouble(ctx, "temperature")), apiKey, ct);
            return new NodeResult(output);
        }
        catch (NodeExecutionException)
        {
            throw;
        }
        catch (Exception ex)
        {
            throw new NodeExecutionException($"\"{ctx.Node.Name}\" ({providerKey}) failed: {ex.Message}");
        }
    }

    private static string? GetString(NodeContext ctx, string key) =>
        ctx.Node.Config.TryGetValue(key, out var el) && el.ValueKind == JsonValueKind.String
            ? el.GetString()
            : null;

    private static double? GetDouble(NodeContext ctx, string key) =>
        ctx.Node.Config.TryGetValue(key, out var el) && el.ValueKind == JsonValueKind.Number
            ? el.GetDouble()
            : null;

    private static string InferProvider(string model)
    {
        var m = model.ToLowerInvariant();
        if (m.StartsWith("gpt") || m.StartsWith("o1") || m.StartsWith("o3") || m.StartsWith("o4"))
            return "openai";
        if (m.StartsWith("gemini")) return "gemini";
        return "anthropic";
    }
}
