namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Generic repository for aggregate write-side access (§9.2). Module-specific
/// repositories (e.g. <c>IWorkflowRepository</c>) extend this with bespoke queries.
/// </summary>
public interface IRepository<T>
    where T : class
{
    Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default);

    /// <summary>For read-side projections (AsNoTracking).</summary>
    IQueryable<T> Query();

    Task AddAsync(T entity, CancellationToken ct = default);

    void Update(T entity);

    void Remove(T entity);
}
