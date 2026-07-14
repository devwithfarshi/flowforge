using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Infrastructure.Persistence.Seed;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AiWorkflow.Infrastructure.Persistence;

/// <summary>
/// Startup database preparation (§8): migrations apply automatically only where
/// `Database:MigrateOnStartup` is true (dev/tests/compose — prod uses a migration job),
/// then the idempotent catalog seeders run.
/// </summary>
public static class DatabaseInitializer
{
    public static async Task InitializeDatabaseAsync(this IServiceProvider services, CancellationToken ct = default)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var configuration = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var clock = scope.ServiceProvider.GetRequiredService<IDateTime>();

        if (configuration.GetValue("Database:MigrateOnStartup", false))
        {
            await db.Database.MigrateAsync(ct);
        }

        // Unreachable DB (e.g. API booted without one) → skip seeding; readiness
        // checks surface the real problem.
        if (!await db.Database.CanConnectAsync(ct))
        {
            return;
        }

        await TemplateSeeder.SeedAsync(db, clock, ct);
        await IntegrationSeeder.SeedAsync(db, ct);
    }
}
