using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Application.Common.Models;
using AiWorkflow.Application.Workflows;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Executions;

/// <summary>
/// `GET /executions` (§6.2): mock-parity filters (workflowId, status, trigger, search on
/// workflow name), default sort startedAt:desc, default pageSize 15. Scoped to
/// executions of workflows the caller owns (§4.4).
/// </summary>
public sealed record ListExecutionsQuery(
    Guid? WorkflowId,
    string? Status,
    string? Trigger,
    string? Search,
    string? Sort,
    int? Page,
    int? PageSize) : IRequest<PagedResult<ExecutionDto>>;

public sealed class ListExecutionsValidator : AbstractValidator<ListExecutionsQuery>
{
    private static readonly string[] SortFields = ["startedAt", "durationMs", "status", "workflowName"];

    public ListExecutionsValidator()
    {
        RuleFor(x => x.Page).GreaterThanOrEqualTo(1);
        RuleFor(x => x.PageSize).InclusiveBetween(1, 100);
        RuleFor(x => x.Status)
            .Must(v => v == "all" || ExecutionEnums.IsValidStatus(v!))
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

public sealed class ListExecutionsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ListExecutionsQuery, PagedResult<ExecutionDto>>
{
    public async ValueTask<PagedResult<ExecutionDto>> Handle(ListExecutionsQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var executions = db.Executions.AsNoTracking()
            .Where(e => db.Workflows.Any(w => w.Id == e.WorkflowId && w.OwnerId == userId));

        if (query.WorkflowId is not null)
        {
            executions = executions.Where(e => e.WorkflowId == query.WorkflowId);
        }

        if (!string.IsNullOrEmpty(query.Status) && query.Status != "all")
        {
            var status = ExecutionEnums.ParseStatus(query.Status);
            executions = executions.Where(e => e.Status == status);
        }

        if (!string.IsNullOrEmpty(query.Trigger) && query.Trigger != "all")
        {
            var trigger = WorkflowEnums.ParseTrigger(query.Trigger);
            executions = executions.Where(e => e.Trigger == trigger);
        }

        if (!string.IsNullOrEmpty(query.Search))
        {
            var q = query.Search.ToLowerInvariant();
            executions = executions.Where(e => e.WorkflowName.ToLower().Contains(q));
        }

        executions = ApplySort(executions, query.Sort);

        var total = await executions.CountAsync(ct);

        var pageSize = query.PageSize ?? 15;
        var totalPages = Math.Max(1, (int)Math.Ceiling(total / (double)pageSize));
        var page = Math.Min(Math.Max(1, query.Page ?? 1), totalPages);

        var items = await executions
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<ExecutionDto>(
            items.Select(ExecutionDto.From).ToList(), total, page, pageSize);
    }

    private static IQueryable<Execution> ApplySort(IQueryable<Execution> executions, string? sort)
    {
        var (field, descending) = sort?.Split(':') is [var f, var direction]
            ? (f, direction == "desc")
            : ("startedAt", true);

        return (field, descending) switch
        {
            ("startedAt", false) => executions.OrderBy(e => e.StartedAt),
            ("durationMs", false) => executions.OrderBy(e => e.DurationMs),
            ("durationMs", true) => executions.OrderByDescending(e => e.DurationMs),
            ("status", false) => executions.OrderBy(e => e.Status),
            ("status", true) => executions.OrderByDescending(e => e.Status),
            ("workflowName", false) => executions.OrderBy(e => e.WorkflowName),
            ("workflowName", true) => executions.OrderByDescending(e => e.WorkflowName),
            _ => executions.OrderByDescending(e => e.StartedAt),
        };
    }
}
