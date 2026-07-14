using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Persistence.Repositories;

/// <summary>
/// Thin wrapper over the DbContext's save (§9.2) — the context already is a unit of
/// work; this keeps the Application layer free of EF.
/// </summary>
public sealed class UnitOfWork(ApplicationDbContext context) : IUnitOfWork
{
    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        context.SaveChangesAsync(ct);
}
