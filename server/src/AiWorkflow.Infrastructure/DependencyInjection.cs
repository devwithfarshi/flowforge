using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Infrastructure.Email;
using AiWorkflow.Infrastructure.Executions;
using AiWorkflow.Infrastructure.Executions.Executors;
using AiWorkflow.Infrastructure.Identity;
using AiWorkflow.Infrastructure.Jobs;
using AiWorkflow.Infrastructure.Persistence;
using AiWorkflow.Infrastructure.Persistence.Interceptors;
using AiWorkflow.Infrastructure.Persistence.Repositories;
using AiWorkflow.Infrastructure.Services;

using Hangfire;
using Hangfire.PostgreSql;

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

        // Identity primitives (§4.1/§4.3): fail fast on misconfigured Jwt section (§11).
        services.AddOptions<JwtOptions>()
            .Bind(configuration.GetSection(JwtOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();

        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IRefreshTokenService, RefreshTokenService>();
        services.AddSingleton<IApiKeyService, ApiKeyService>();

        // Signed reset/verify tokens (§4.3) + the dev email sink (real sender later).
        services.AddDataProtection();
        services.AddSingleton<IAccountTokenService, AccountTokenService>();
        services.AddSingleton<IEmailSender, DevLoggingEmailSender>();

        // Execution engine (§14): Hangfire on the same Postgres, executor registry with
        // a simulated fallback so every catalog node type runs today.
        services.AddHangfire(config => config
            .SetDataCompatibilityLevel(CompatibilityLevel.Version_180)
            .UseSimpleAssemblyNameTypeSerializer()
            .UseRecommendedSerializerSettings()
            .UsePostgreSqlStorage(
                options => options.UseNpgsqlConnection(connectionString),
                new PostgreSqlStorageOptions
                {
                    // Default 15s makes manual runs feel dead; runs should start ~instantly.
                    QueuePollInterval = TimeSpan.FromMilliseconds(500),
                }));
        services.AddHangfireServer(options =>
            options.SchedulePollingInterval = TimeSpan.FromSeconds(1));

        services.AddSingleton<IJobScheduler, HangfireJobScheduler>();
        services.AddSingleton<SimulatedNodeExecutor>();
        services.AddSingleton<INodeExecutor, ManualTriggerExecutor>();
        services.AddSingleton<NodeExecutorRegistry>();
        services.AddScoped<IExecutionEngine, WorkflowExecutionEngine>();

        return services;
    }
}
