using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Infrastructure.Caching;
using AiWorkflow.Infrastructure.Email;
using AiWorkflow.Infrastructure.Executions;
using AiWorkflow.Infrastructure.Executions.Executors;
using AiWorkflow.Infrastructure.Identity;
using AiWorkflow.Infrastructure.Jobs;
using AiWorkflow.Infrastructure.Persistence;
using AiWorkflow.Infrastructure.Persistence.Interceptors;
using AiWorkflow.Infrastructure.Persistence.Repositories;
using AiWorkflow.Infrastructure.Services;
using AiWorkflow.Infrastructure.Storage;

using Hangfire;
using Hangfire.PostgreSql;

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using StackExchange.Redis;

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

        // Google sign-in (§4.5): fail fast on a missing client id (see server/.env.example).
        services.AddOptions<GoogleOptions>()
            .Bind(configuration.GetSection(GoogleOptions.SectionName))
            .ValidateDataAnnotations()
            .ValidateOnStart();
        services.AddSingleton<IGoogleIdTokenValidator, GoogleIdTokenValidator>();

        // Signed reset/verify tokens (§4.3) + the dev email sink (real sender later).
        services.AddDataProtection();
        services.AddSingleton<IAccountTokenService, AccountTokenService>();
        services.AddSingleton<IEmailSender, DevLoggingEmailSender>();
        services.AddSingleton<ICredentialEncryptor, CredentialEncryptor>();

        // Cache (§13): Redis when configured, in-memory fallback for a clean checkout.
        var redisConnectionString = configuration["Redis:ConnectionString"];
        if (!string.IsNullOrEmpty(redisConnectionString))
        {
            services.AddSingleton<IConnectionMultiplexer>(
                _ => ConnectionMultiplexer.Connect(redisConnectionString));
            services.AddSingleton<ICacheService, RedisCacheService>();
        }
        else
        {
            services.AddSingleton<ICacheService, InMemoryCacheService>();
        }

        // File storage (§12): Cloudinary when configured, loud failure otherwise.
        var cloudinaryUrl = configuration["Cloudinary:Url"];
        services.AddSingleton<IFileStorage>(string.IsNullOrEmpty(cloudinaryUrl)
            ? new UnconfiguredFileStorage()
            : new CloudinaryFileStorage(cloudinaryUrl));

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
