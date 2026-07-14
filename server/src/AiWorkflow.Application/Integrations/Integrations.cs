using System.Text.Json;

using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Integrations;

/// <summary>
/// Serializes to the frontend's `Integration` shape: catalog fields + the caller's
/// accounts, with status derived per user (connected ⇔ has accounts). Credentials
/// never appear in any response (§15).
/// </summary>
public sealed record ConnectedAccountDto(Guid Id, string Label, DateTimeOffset ConnectedAt);

public sealed record IntegrationDto(
    Guid Id,
    string Name,
    string Category,
    string Description,
    string Status,
    string Color,
    string Icon,
    List<ConnectedAccountDto> Accounts,
    bool Popular)
{
    public static IntegrationDto From(Integration i, IEnumerable<IntegrationAccount> accounts)
    {
        var connected = accounts
            .OrderBy(a => a.ConnectedAt)
            .Select(a => new ConnectedAccountDto(a.Id, a.Label, a.ConnectedAt))
            .ToList();

        return new IntegrationDto(
            i.Id, i.Name, i.Category, i.Description,
            connected.Count > 0 ? "connected" : "available",
            i.Color, i.Icon, connected, i.Popular);
    }
}

/// <summary>`GET /integrations` (§6.2): full catalog with the caller's connections.</summary>
public sealed record ListIntegrationsQuery : IRequest<IReadOnlyList<IntegrationDto>>;

public sealed class ListIntegrationsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ListIntegrationsQuery, IReadOnlyList<IntegrationDto>>
{
    public async ValueTask<IReadOnlyList<IntegrationDto>> Handle(ListIntegrationsQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var catalog = await db.Integrations.AsNoTracking().OrderBy(i => i.Name).ToListAsync(ct);
        var accounts = await db.IntegrationAccounts.AsNoTracking()
            .Where(a => a.UserId == userId)
            .ToListAsync(ct);

        return catalog
            .Select(i => IntegrationDto.From(i, accounts.Where(a => a.IntegrationId == i.Id)))
            .ToList();
    }
}

/// <summary>`POST /integrations/{id}/connect` (§6.2): credentials are encrypted at rest.</summary>
public sealed record ConnectIntegrationCommand(Guid IntegrationId, string Label, JsonElement? Credentials)
    : IRequest<IntegrationDto>;

public sealed class ConnectIntegrationValidator : AbstractValidator<ConnectIntegrationCommand>
{
    public ConnectIntegrationValidator()
    {
        RuleFor(x => x.Label).NotEmpty().MaximumLength(120);
    }
}

public sealed class ConnectIntegrationHandler(
    IApplicationDbContext db,
    ICurrentUser currentUser,
    ICredentialEncryptor encryptor,
    IDateTime clock)
    : IRequestHandler<ConnectIntegrationCommand, IntegrationDto>
{
    public async ValueTask<IntegrationDto> Handle(ConnectIntegrationCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var integration = await db.Integrations.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == command.IntegrationId, ct)
            ?? throw new NotFoundException("Integration", command.IntegrationId);

        var encrypted = command.Credentials is { } credentials
            ? encryptor.Encrypt(credentials.GetRawText())
            : null;

        db.IntegrationAccounts.Add(IntegrationAccount.Connect(
            userId, integration.Id, command.Label, encrypted, clock.UtcNow));
        await db.SaveChangesAsync(ct);

        var accounts = await db.IntegrationAccounts.AsNoTracking()
            .Where(a => a.UserId == userId && a.IntegrationId == integration.Id)
            .ToListAsync(ct);

        return IntegrationDto.From(integration, accounts);
    }
}

/// <summary>`DELETE /integrations/{id}/accounts/{accountId}` (§6.2).</summary>
public sealed record DisconnectIntegrationCommand(Guid IntegrationId, Guid AccountId) : IRequest<IntegrationDto>;

public sealed class DisconnectIntegrationHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<DisconnectIntegrationCommand, IntegrationDto>
{
    public async ValueTask<IntegrationDto> Handle(DisconnectIntegrationCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var integration = await db.Integrations.AsNoTracking()
            .FirstOrDefaultAsync(i => i.Id == command.IntegrationId, ct)
            ?? throw new NotFoundException("Integration", command.IntegrationId);

        var account = await db.IntegrationAccounts.FirstOrDefaultAsync(
            a => a.Id == command.AccountId && a.IntegrationId == integration.Id && a.UserId == userId, ct)
            ?? throw new NotFoundException("Integration account", command.AccountId);

        db.IntegrationAccounts.Remove(account);
        await db.SaveChangesAsync(ct);

        var accounts = await db.IntegrationAccounts.AsNoTracking()
            .Where(a => a.UserId == userId && a.IntegrationId == integration.Id)
            .ToListAsync(ct);

        return IntegrationDto.From(integration, accounts);
    }
}
