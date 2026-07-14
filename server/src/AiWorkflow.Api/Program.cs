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
app.MapHub<ExecutionHub>("/hubs/executions");

app.MapHealthChecks("/health");
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false });
app.MapHealthChecks("/health/ready");

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

await app.Services.InitializeDatabaseAsync();

app.Run();

public partial class Program; // for WebApplicationFactory in tests
