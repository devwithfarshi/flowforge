using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Application.Common.Models;
using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Workflows;

/// <summary>
/// `GET /workflows` (§6.2): filters/sort/pagination mirror the mock's `list()` —
/// archived rows are excluded unless includeArchived, "all" disables a filter, page is
/// clamped into range, default sort updatedAt:desc, default pageSize 12.
/// </summary>
public sealed record ListWorkflowsQuery(
    string? Search,
    string? Status,
    string? Trigger,
    string? Tag,
    string? Sort,
    int? Page,
    int? PageSize,
    bool IncludeArchived) : IRequest<PagedResult<WorkflowDto>>;

public sealed class ListWorkflowsValidator : AbstractValidator<ListWorkflowsQuery>
{
    private static readonly string[] SortFields =
        ["name", "status", "createdAt", "updatedAt", "executionCount", "lastRunAt"];

    public ListWorkflowsValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Status)
            .Must(v => v == "all" || WorkflowEnums.IsValidStatus(v!))
            .When(x => !string.IsNullOrEmpty(x.Status))
            .WithMessage("Unknown status filter");
        RuleFor(x => x.Trigger)
            .Must(v => v == "all" || WorkflowEnums.IsValidTrigger(v!))
            .When(x => !string.IsNullOrEmpty(x.Trigger))
            .WithMessage("Unknown trigger filter");
        RuleFor(x => x.Sort)
            .Must(v => v!.Split(':') is [var field, "asc" or "desc"] && SortFields.Contains(field))
            .When(x => !string.IsNullOrEmpty(x.Sort))
            .WithMessage($"Sort must be one of [{string.Join(", ", SortFields)}]:asc|desc");
    }
}

public sealed class ListWorkflowsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ListWorkflowsQuery, PagedResult<WorkflowDto>>
{
    public async ValueTask<PagedResult<WorkflowDto>> Handle(ListWorkflowsQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var workflows = db.Workflows.AsNoTracking().Where(w => w.OwnerId == userId);

        if (!query.IncludeArchived)
        {
            workflows = workflows.Where(w => w.Status != WorkflowStatus.Archived);
        }

        if (!string.IsNullOrEmpty(query.Status) && query.Status != "all")
        {
            var status = WorkflowEnums.ParseStatus(query.Status);
            workflows = workflows.Where(w => w.Status == status);
        }

        if (!string.IsNullOrEmpty(query.Trigger) && query.Trigger != "all")
        {
            var trigger = WorkflowEnums.ParseTrigger(query.Trigger);
            workflows = workflows.Where(w => w.TriggerType == trigger);
        }

        if (!string.IsNullOrEmpty(query.Tag) && query.Tag != "all")
        {
            workflows = workflows.Where(w => w.Tags.Contains(query.Tag));
        }

        if (!string.IsNullOrEmpty(query.Search))
        {
            // Mock semantics: case-insensitive substring on name/description. Tags match
            // exactly (array contains) — substring-in-array doesn't translate to SQL.
            var q = query.Search.ToLowerInvariant();
            workflows = workflows.Where(w =>
                w.Name.ToLower().Contains(q)
                || w.Description.ToLower().Contains(q)
                || w.Tags.Contains(q));
        }

        workflows = ApplySort(workflows, query.Sort);

        var total = await workflows.CountAsync(ct);

        // Clamp the page into range, exactly like the mock's paginate().
        var pageSize = query.PageSize ?? 12;
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var page = Math.Min(Math.Max(1, query.Page ?? 1), totalPages);

        var items = await workflows
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);

        return new PagedResult<WorkflowDto>(
            items.Select(w => WorkflowDto.From(w, ownerName)).ToList(),
            total,
            page,
            pageSize);
    }

    private static IQueryable<Workflow> ApplySort(IQueryable<Workflow> workflows, string? sort)
    {
        var (field, descending) = sort?.Split(':') is [var f, var direction]
            ? (f, direction == "desc")
            : ("updatedAt", true);

        return (field, descending) switch
        {
            ("name", false) => workflows.OrderBy(w => w.Name),
            ("name", true) => workflows.OrderByDescending(w => w.Name),
            ("status", false) => workflows.OrderBy(w => w.Status),
            ("status", true) => workflows.OrderByDescending(w => w.Status),
            ("createdAt", false) => workflows.OrderBy(w => w.CreatedAt),
            ("createdAt", true) => workflows.OrderByDescending(w => w.CreatedAt),
            ("executionCount", false) => workflows.OrderBy(w => w.ExecutionCount),
            ("executionCount", true) => workflows.OrderByDescending(w => w.ExecutionCount),
            ("lastRunAt", false) => workflows.OrderBy(w => w.LastRunAt),
            ("lastRunAt", true) => workflows.OrderByDescending(w => w.LastRunAt),
            ("updatedAt", false) => workflows.OrderBy(w => w.UpdatedAt ?? w.CreatedAt),
            _ => workflows.OrderByDescending(w => w.UpdatedAt ?? w.CreatedAt),
        };
    }
}
