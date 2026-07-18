using AiWorkflow.Api.Endpoints;
using AiWorkflow.Api.Extensions;
using AiWorkflow.Api.Hubs;
using AiWorkflow.Api.Middleware;
using AiWorkflow.Api.Realtime;
using AiWorkflow.Application;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Infrastructure;
using AiWorkflow.Infrastructure.Persistence;

using Mediator;

using Microsoft.AspNetCore.Diagnostics.HealthChecks;

using Serilog;

var builder = WebApplication.CreateBuilder(args);

builder.Host.UseSerilog((context, loggerConfiguration) =>
    loggerConfiguration.ReadFrom.Configuration(context.Configuration));

builder.Services
    .AddApplication()
    .AddInfrastructure(builder.Configuration)
    .AddApiServices(builder.Configuration);

builder.Services.AddMediator((MediatorOptions options) =>
{
    options.ServiceLifetime = ServiceLifetime.Scoped;
    options.Assemblies = [typeof(AiWorkflow.Application.DependencyInjection)];
});

builder.Services.AddSignalR();
builder.Services.AddSingleton<IRealtimeNotifier, SignalRRealtimeNotifier>();

var app = builder.Build();

app.UseExceptionHandler();
app.UseMiddleware<CorrelationIdMiddleware>();

// §15: nosniff, DENY framing, referrer policy, strict CSP, permissions policy.
// The API serves JSON only, so the restrictive defaults are safe; Swagger UI (dev)
// gets same-origin relaxations from the library's defaults.
app.UseSecurityHeaders(new HeaderPolicyCollection()
    .AddDefaultApiSecurityHeaders());

if (app.Environment.IsProduction())
{
    app.UseHsts();
    app.UseHttpsRedirection();
}

app.UseSerilogRequestLogging();
app.UseCors("frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

app.MapAuthEndpoints();
app.MapUserEndpoints();
app.MapSessionEndpoints();
app.MapMeEndpoints();
app.MapWorkflowEndpoints();
app.MapExecutionEndpoints();
app.MapTemplateEndpoints();
app.MapIntegrationEndpoints();
app.MapVariableEndpoints();
app.MapNotificationEndpoints();
app.MapActivityEndpoints();
app.MapApiKeyEndpoints();
app.MapDashboardEndpoints();
app.MapHub<ExecutionHub>("/hubs/executions");

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready");

// Serve the OpenAPI document in every environment so the client's Scalar API
// reference (/api-docs) works in production too; keep the built-in Swagger UI to dev.
app.UseSwagger();
if (app.Environment.IsDevelopment())
{
    app.UseSwaggerUI();
}

await app.Services.InitializeDatabaseAsync();

app.Run();

public partial class Program; // for WebApplicationFactory in tests
