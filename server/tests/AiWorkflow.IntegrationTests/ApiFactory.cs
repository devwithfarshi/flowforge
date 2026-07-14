using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Infrastructure.Persistence;

using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

using Testcontainers.PostgreSql;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Boots the real app against a throwaway Postgres 16 (Testcontainers, §18) with
/// migrations applied. Emails are captured in-memory so token flows are testable.
/// </summary>
public sealed class ApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:16").Build();

    public CapturingEmailSender Emails { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseSetting("ConnectionStrings:Postgres", _postgres.GetConnectionString());

        // Auth tests fire many requests from one IP — don't trip the brute-force limits.
        builder.UseSetting("RateLimiting:GlobalPermitPerMinute", "10000");
        builder.UseSetting("RateLimiting:AuthPermitPerMinute", "10000");

        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Emails);
        });
    }

    public async Task InitializeAsync()
    {
        await _postgres.StartAsync();

        using var scope = Services.CreateScope();
        await scope.ServiceProvider.GetRequiredService<ApplicationDbContext>().Database.MigrateAsync();
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        await _postgres.DisposeAsync();
    }
}

/// <summary>Records the last token sent per (kind, email) instead of sending mail.</summary>
public sealed class CapturingEmailSender : IEmailSender
{
    private readonly Dictionary<string, string> _resetTokens = [];
    private readonly Dictionary<string, string> _verifyTokens = [];

    public Task SendPasswordResetAsync(string email, string token, CancellationToken ct = default)
    {
        lock (_resetTokens)
        {
            _resetTokens[email] = token;
        }

        return Task.CompletedTask;
    }

    public Task SendEmailVerificationAsync(string email, string token, CancellationToken ct = default)
    {
        lock (_verifyTokens)
        {
            _verifyTokens[email] = token;
        }

        return Task.CompletedTask;
    }

    public string? LastResetTokenFor(string email)
    {
        lock (_resetTokens)
        {
            return _resetTokens.GetValueOrDefault(email);
        }
    }

    public string? LastVerifyTokenFor(string email)
    {
        lock (_verifyTokens)
        {
            return _verifyTokens.GetValueOrDefault(email);
        }
    }
}
