namespace AiWorkflow.Application.Common.Models;

/// <summary>
/// Page of results. Serializes to the exact shape the frontend's mock layer returns
/// (client/src/lib/api.ts `Paginated&lt;T&gt;`): items, total, page, pageSize, totalPages.
/// </summary>
public sealed record PagedResult<T>(IReadOnlyList<T> Items, int Total, int Page, int PageSize)
{
    public int TotalPages => Math.Max(1, (int)Math.Ceiling(Total / (double)Math.Max(1, PageSize)));
}
