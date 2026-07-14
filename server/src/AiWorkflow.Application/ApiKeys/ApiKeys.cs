using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.ApiKeys;

/// <summary>Serializes to the frontend's `ApiKey` shape — `token` is the masked display value.</summary>
public sealed record ApiKeyDto(
    Guid Id,
    string Name,
    string Prefix,
    string Token,
    List<string> Scopes,
    DateTimeOffset CreatedAt,
    DateTimeOffset? LastUsedAt)
{
    public static ApiKeyDto From(ApiKey k) =>
        new(k.Id, k.Name, k.Prefix, k.MaskedToken, k.Scopes, k.CreatedAt, k.LastUsedAt);
}

/// <summary>`POST /api-keys` response: the raw secret leaves the API exactly once (§15).</summary>
public sealed record CreatedApiKey(ApiKeyDto Key, string Secret);

/// <summary>`GET /api-keys` (§6.2): active keys, newest first (revoked keys vanish, mock parity).</summary>
public sealed record ListApiKeysQuery : IRequest<IReadOnlyList<ApiKeyDto>>;

public sealed class ListApiKeysHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ListApiKeysQuery, IReadOnlyList<ApiKeyDto>>
{
    public async ValueTask<IReadOnlyList<ApiKeyDto>> Handle(ListApiKeysQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var keys = await db.ApiKeys.AsNoTracking()
            .Where(k => k.UserId == userId && k.RevokedAt == null)
            .OrderByDescending(k => k.CreatedAt)
            .ToListAsync(ct);

        return keys.Select(ApiKeyDto.From).ToList();
    }
}

/// <summary>`POST /api-keys` (§6.2).</summary>
public sealed record CreateApiKeyCommand(string Name, List<string> Scopes) : IRequest<CreatedApiKey>;

public sealed class CreateApiKeyValidator : AbstractValidator<CreateApiKeyCommand>
{
    public CreateApiKeyValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Scopes).NotEmpty();
        RuleForEach(x => x.Scopes).NotEmpty().MaximumLength(50);
    }
}

public sealed class CreateApiKeyHandler(
    IApplicationDbContext db, ICurrentUser currentUser, IApiKeyService apiKeyService, IDateTime clock)
    : IRequestHandler<CreateApiKeyCommand, CreatedApiKey>
{
    public async ValueTask<CreatedApiKey> Handle(CreateApiKeyCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var generated = apiKeyService.Generate();

        // Masked display: first 14 + •••• + last 4, mirroring the mock's token field.
        var masked = $"{generated.RawKey[..14]}{new string('•', 12)}{generated.RawKey[^4..]}";

        var apiKey = ApiKey.Issue(
            userId, command.Name, generated.Prefix, masked, generated.KeyHash,
            command.Scopes, clock.UtcNow);

        db.ApiKeys.Add(apiKey);
        await db.SaveChangesAsync(ct);

        return new CreatedApiKey(ApiKeyDto.From(apiKey), generated.RawKey);
    }
}

/// <summary>`DELETE /api-keys/{id}` (§6.2): soft revoke — the key stops authenticating immediately.</summary>
public sealed record RevokeApiKeyCommand(Guid Id) : IRequest;

public sealed class RevokeApiKeyHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<RevokeApiKeyCommand>
{
    public async ValueTask<Unit> Handle(RevokeApiKeyCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var apiKey = await db.ApiKeys.FirstOrDefaultAsync(
            k => k.Id == command.Id && k.UserId == userId, ct)
            ?? throw new NotFoundException("API key", command.Id);

        apiKey.Revoke(clock.UtcNow);
        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
