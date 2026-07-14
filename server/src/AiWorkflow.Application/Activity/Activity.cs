using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Activity;

/// <summary>Serializes to the frontend's `ActivityEntry` shape.</summary>
public sealed record ActivityEntryDto(
    Guid Id,
    string Actor,
    string Action,
    string Target,
    string Category,
    DateTimeOffset Ts,
    string? Meta)
{
    public static ActivityEntryDto From(ActivityEntry a) =>
        new(a.Id, a.ActorName, a.Action, a.Target, a.Category, a.CreatedAt, a.Meta);
}

/// <summary>Shared audit writer (§7): sensitive actions append who/what/when rows.</summary>
public static class Audit
{
    public static async Task Log(
        IApplicationDbContext db,
        Guid actorId,
        string action,
        string target,
        string category,
        DateTimeOffset now,
        CancellationToken ct,
        string? actorName = null)
    {
        actorName ??= await db.Users.AsNoTracking()
            .Where(u => u.Id == actorId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync(ct) ?? "Unknown";

        db.ActivityEntries.Add(ActivityEntry.Log(actorId, actorName, action, target, category, now));
    }
}

/// <summary>`GET /activity?search=&category=` (§6.2): actor-scoped, newest first.</summary>
public sealed record ListActivityQuery(string? Search, string? Category) : IRequest<IReadOnlyList<ActivityEntryDto>>;

public sealed class ListActivityValidator : AbstractValidator<ListActivityQuery>
{
    private static readonly string[] Categories = ["workflow", "auth", "integration", "variable", "system", "user"];

    public ListActivityValidator()
    {
        RuleFor(x => x.Category)
            .Must(v => v == "all" || Categories.Contains(v))
            .When(x => !string.IsNullOrEmpty(x.Category))
            .WithMessage("Unknown activity category");
    }
}

public sealed class ListActivityHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ListActivityQuery, IReadOnlyList<ActivityEntryDto>>
{
    public async ValueTask<IReadOnlyList<ActivityEntryDto>> Handle(ListActivityQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var entries = db.ActivityEntries.AsNoTracking().Where(a => a.ActorId == userId);

        if (!string.IsNullOrEmpty(query.Category) && query.Category != "all")
        {
            entries = entries.Where(a => a.Category == query.Category);
        }

        if (!string.IsNullOrEmpty(query.Search))
        {
            var q = query.Search.ToLowerInvariant();
            entries = entries.Where(a =>
                a.ActorName.ToLower().Contains(q)
                || a.Action.ToLower().Contains(q)
                || a.Target.ToLower().Contains(q));
        }

        var items = await entries.OrderByDescending(a => a.CreatedAt).ToListAsync(ct);
        return items.Select(ActivityEntryDto.From).ToList();
    }
}

/// <summary>`GET /activity/recent?n=6` (§6.2).</summary>
public sealed record RecentActivityQuery(int? Count) : IRequest<IReadOnlyList<ActivityEntryDto>>;

public sealed class RecentActivityValidator : AbstractValidator<RecentActivityQuery>
{
    public RecentActivityValidator()
    {
        RuleFor(x => x.Count).InclusiveBetween(1, 50);
    }
}

public sealed class RecentActivityHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<RecentActivityQuery, IReadOnlyList<ActivityEntryDto>>
{
    public async ValueTask<IReadOnlyList<ActivityEntryDto>> Handle(RecentActivityQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var items = await db.ActivityEntries.AsNoTracking()
            .Where(a => a.ActorId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(query.Count ?? 6)
            .ToListAsync(ct);

        return items.Select(ActivityEntryDto.From).ToList();
    }
}
