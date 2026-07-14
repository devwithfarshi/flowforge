using System.Threading.RateLimiting;

using AiWorkflow.Api.Middleware;

using Asp.Versioning;

using Microsoft.AspNetCore.RateLimiting;
using Microsoft.OpenApi;

namespace AiWorkflow.Api.Extensions;

public static class ApiServiceExtensions
{
    /// <summary>
    /// API-layer services (§9.4): ProblemDetails + exception handler, Swagger,
    /// versioning, CORS, rate-limiter skeleton, health checks, authN/Z shells.
    /// </summary>
    public static IServiceCollection AddApiServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddProblemDetails(options => options.CustomizeProblemDetails = context =>
        {
            context.ProblemDetails.Extensions.TryAdd("traceId", context.HttpContext.TraceIdentifier);
            if (context.HttpContext.Items[CorrelationIdMiddleware.HeaderName] is string correlationId)
            {
                context.ProblemDetails.Extensions.TryAdd("correlationId", correlationId);
            }
        });
        services.AddExceptionHandler<GlobalExceptionHandler>();

        services.AddEndpointsApiExplorer();
        services.AddSwaggerGen(options =>
        {
            options.SwaggerDoc("v1", new OpenApiInfo { Title = "Flowforge API", Version = "v1" });

            // JWT scheme so the UI "Authorize" button works once auth lands (task 8).
            options.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
            {
                Type = SecuritySchemeType.Http,
                Scheme = "bearer",
                BearerFormat = "JWT",
                Description = "Paste the JWT access token (without the 'Bearer ' prefix).",
            });
            options.AddSecurityRequirement(document => new OpenApiSecurityRequirement
            {
                [new OpenApiSecuritySchemeReference("Bearer", document)] = [],
            });
        });

        services.AddApiVersioning(options =>
        {
            options.DefaultApiVersion = new ApiVersion(1);
            options.AssumeDefaultVersionWhenUnspecified = true;
            options.ReportApiVersions = true;
        });

        var allowedOrigins = configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? [];
        services.AddCors(options => options.AddPolicy("frontend", policy => policy
            .WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod()
            .AllowCredentials()));

        // Rate-limit skeleton (§15): global sliding window per user-or-IP, plus a stricter
        // fixed window that /auth/* endpoints opt into via RequireRateLimiting("auth").
        // Numbers are provisional; the security pass (task 20) finalizes them.
        services.AddRateLimiter(options =>
        {
            options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
            options.OnRejected = (context, _) =>
            {
                context.HttpContext.Response.Headers.RetryAfter = "60";
                return ValueTask.CompletedTask;
            };

            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    context.User.Identity?.Name
                        ?? context.Connection.RemoteIpAddress?.ToString()
                        ?? "anonymous",
                    _ => new SlidingWindowRateLimiterOptions
                    {
                        PermitLimit = 100,
                        Window = TimeSpan.FromMinutes(1),
                        SegmentsPerWindow = 6,
                        QueueLimit = 0,
                    }));

            options.AddFixedWindowLimiter("auth", limiter =>
            {
                limiter.PermitLimit = 10;
                limiter.Window = TimeSpan.FromMinutes(1);
                limiter.QueueLimit = 0;
            });
        });

        services.AddHealthChecks()
            .AddNpgSql(
                sp => configuration.GetConnectionString("Postgres")!,
                name: "postgres",
                tags: ["ready"]);

        // Shells only — JWT bearer + policies are wired in the auth task (8).
        services.AddAuthentication();
        services.AddAuthorization();

        return services;
    }
}
