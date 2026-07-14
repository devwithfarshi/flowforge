using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Infrastructure.Persistence;
using AiWorkflow.Infrastructure.Persistence.Interceptors;
using AiWorkflow.Infrastructure.Persistence.Repositories;
using AiWorkflow.Infrastructure.Services;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace AiWorkflow.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// Registers Infrastructure services: DbContext (Postgres, snake_case naming,
    /// auditing interceptor), generic repository, and unit of work (§9.4).
    /// Redis, Cloudinary, JWT, Hangfire, email, etc. are added by their modules' tasks.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("Postgres")
            ?? throw new InvalidOperationException(
                "Connection string 'Postgres' is not configured. Set ConnectionStrings__Postgres (see server/.env.example).");

        services.AddSingleton<IDateTime, DateTimeService>();
        services.AddSingleton<AuditableEntityInterceptor>();

        services.AddDbContext<ApplicationDbContext>((sp, options) => options
            .UseNpgsql(connectionString)
            .UseSnakeCaseNamingConvention()
            .AddInterceptors(sp.GetRequiredService<AuditableEntityInterceptor>()));

        services.AddScoped<IApplicationDbContext>(sp => sp.GetRequiredService<ApplicationDbContext>());
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped(typeof(IRepository<>), typeof(EfRepository<>));

        return services;
    }
}
