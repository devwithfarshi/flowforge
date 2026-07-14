namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Commit boundary for a use-case. The DbContext already is a unit of work;
/// this wraps it so the Application layer never references EF directly (§9.2).
/// </summary>
public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}
