using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.AiProviders;

/// <summary>The LLM providers Flowforge can call (bring-your-own-key). Lower-case keys.</summary>
public static class AiProviderCatalog
{
    public const string OpenAi = "openai";
    public const string Gemini = "gemini";
    public const string Anthropic = "anthropic";

    public static readonly IReadOnlyList<string> Supported = [OpenAi, Gemini, Anthropic];

    public static bool IsSupported(string provider) => Supported.Contains(provider);
}

/// <summary>A provider's BYOK status — never the key, only whether it's set + a masked hint.</summary>
public sealed record AiProviderDto(string Provider, bool Configured, string? Last4, DateTimeOffset? UpdatedAt);

/// <summary>`GET /me/ai-providers`: the fixed provider list with each user's configured status.</summary>
public sealed record ListAiProvidersQuery : IRequest<IReadOnlyList<AiProviderDto>>;

public sealed class ListAiProvidersHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ListAiProvidersQuery, IReadOnlyList<AiProviderDto>>
{
    public async ValueTask<IReadOnlyList<AiProviderDto>> Handle(ListAiProvidersQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var configured = await db.AiProviderCredentials.AsNoTracking()
            .Where(c => c.UserId == userId)
            .ToDictionaryAsync(c => c.Provider, ct);

        return AiProviderCatalog.Supported
            .Select(p => configured.TryGetValue(p, out var c)
                ? new AiProviderDto(p, true, c.Last4, c.UpdatedAt ?? c.CreatedAt)
                : new AiProviderDto(p, false, null, null))
            .ToList();
    }
}

/// <summary>`PUT /me/ai-providers/{provider}`: set or replace the encrypted key for a provider.</summary>
public sealed record SetAiProviderKeyCommand(string Provider, string ApiKey) : IRequest<AiProviderDto>;

public sealed class SetAiProviderKeyValidator : AbstractValidator<SetAiProviderKeyCommand>
{
    public SetAiProviderKeyValidator()
    {
        RuleFor(x => x.Provider).Must(AiProviderCatalog.IsSupported).WithMessage("Unknown provider.");
        RuleFor(x => x.ApiKey).NotEmpty().MinimumLength(8).MaximumLength(400);
    }
}

public sealed class SetAiProviderKeyHandler(
    IApplicationDbContext db, ICurrentUser currentUser, ICredentialEncryptor encryptor)
    : IRequestHandler<SetAiProviderKeyCommand, AiProviderDto>
{
    public async ValueTask<AiProviderDto> Handle(SetAiProviderKeyCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();
        var key = command.ApiKey.Trim();
        var last4 = key.Length >= 4 ? key[^4..] : key;
        var encrypted = encryptor.Encrypt(key);

        var existing = await db.AiProviderCredentials
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Provider == command.Provider, ct);

        if (existing is null)
        {
            existing = AiProviderCredential.Create(userId, command.Provider, encrypted, last4);
            db.AiProviderCredentials.Add(existing);
        }
        else
        {
            existing.Update(encrypted, last4);
        }

        await db.SaveChangesAsync(ct);
        return new AiProviderDto(command.Provider, true, last4, existing.UpdatedAt ?? existing.CreatedAt);
    }
}

/// <summary>`DELETE /me/ai-providers/{provider}`: remove the stored key.</summary>
public sealed record RemoveAiProviderKeyCommand(string Provider) : IRequest;

public sealed class RemoveAiProviderKeyHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RemoveAiProviderKeyCommand>
{
    public async ValueTask<Unit> Handle(RemoveAiProviderKeyCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var existing = await db.AiProviderCredentials
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Provider == command.Provider, ct);

        if (existing is not null)
        {
            db.AiProviderCredentials.Remove(existing);
            await db.SaveChangesAsync(ct);
        }

        return Unit.Value;
    }
}
