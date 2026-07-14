using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Slim DbContext abstraction for read-side queries/projections (§9.2 trade-off note).
/// Typed <c>DbSet</c> properties are added here as each module's entities land.
/// Write-side aggregates go through repositories + <see cref="IUnitOfWork"/>.
/// </summary>
public interface IApplicationDbContext
{
    DbSet<User> Users { get; }

    DbSet<RefreshToken> RefreshTokens { get; }

    DbSet<UserPreferences> UserPreferences { get; }

    DbSet<UserSettings> UserSettings { get; }

    DbSet<TEntity> Set<TEntity>()
        where TEntity : class;

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
