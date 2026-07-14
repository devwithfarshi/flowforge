using AiWorkflow.Application.Common.Interfaces;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Infrastructure.Persistence;

/// <summary>
/// EF Core context for the whole app. Entity mapping lives in
/// <c>Persistence/Configurations</c> (one IEntityTypeConfiguration per aggregate, §2.2);
/// snake_case table/column names come from the naming-convention plugin configured
/// in <c>AddInfrastructure()</c>.
/// </summary>
public class ApplicationDbContext(DbContextOptions<ApplicationDbContext> options)
    : DbContext(options), IApplicationDbContext
{
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}
