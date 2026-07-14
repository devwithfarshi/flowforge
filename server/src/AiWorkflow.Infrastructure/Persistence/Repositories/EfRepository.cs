using AiWorkflow.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Infrastructure.Persistence.Repositories;

/// <summary>
/// Generic write-side repository (§9.2). Module repositories with bespoke queries
/// derive from this and add their own methods.
/// </summary>
public class EfRepository<T>(ApplicationDbContext context) : IRepository<T>
    where T : class
{
    protected ApplicationDbContext Context { get; } = context;

    protected DbSet<T> Set => Context.Set<T>();

    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await Set.FindAsync([id], ct);

    public IQueryable<T> Query() => Set.AsNoTracking();

    public async Task AddAsync(T entity, CancellationToken ct = default) =>
        await Set.AddAsync(entity, ct);

    public void Update(T entity) => Set.Update(entity);

    public void Remove(T entity) => Set.Remove(entity);
}
