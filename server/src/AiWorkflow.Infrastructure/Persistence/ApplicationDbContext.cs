using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

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
    public DbSet<User> Users => Set<User>();

    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();

    public DbSet<UserPreferences> UserPreferences => Set<UserPreferences>();

    public DbSet<UserSettings> UserSettings => Set<UserSettings>();

    public DbSet<Workflow> Workflows => Set<Workflow>();

    public DbSet<Execution> Executions => Set<Execution>();

    public DbSet<Template> Templates => Set<Template>();

    public DbSet<Integration> Integrations => Set<Integration>();

    public DbSet<IntegrationAccount> IntegrationAccounts => Set<IntegrationAccount>();

    public DbSet<Variable> Variables => Set<Variable>();

    public DbSet<Notification> Notifications => Set<Notification>();

    public DbSet<ActivityEntry> ActivityEntries => Set<ActivityEntry>();

    public DbSet<ApiKey> ApiKeys => Set<ApiKey>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasPostgresExtension("citext");

        modelBuilder.ApplyConfigurationsFromAssembly(typeof(ApplicationDbContext).Assembly);

        base.OnModelCreating(modelBuilder);
    }
}
