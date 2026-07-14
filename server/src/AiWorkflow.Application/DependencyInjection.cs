using AiWorkflow.Application.Common.Behaviors;

using FluentValidation;

using Mapster;

using MapsterMapper;

using Mediator;

using Microsoft.Extensions.DependencyInjection;

namespace AiWorkflow.Application;

public static class DependencyInjection
{
    /// <summary>
    /// Registers Application-layer services: pipeline behaviors, validators, and Mapster.
    /// The mediator itself is source-generated in the composition root — the Api project
    /// references Mediator.SourceGenerator and calls <c>AddMediator()</c> with this
    /// assembly listed in <c>MediatorOptions.Assemblies</c> (§9.4).
    /// </summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        var assembly = typeof(DependencyInjection).Assembly;

        // Open-generic behaviors wrap every request in registration order (§9.3):
        // Validation → Logging → handler. Later behaviors (performance, unit-of-work,
        // caching) slot in here as their tasks land.
        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(ValidationBehavior<,>));
        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(LoggingBehavior<,>));
        services.AddScoped(typeof(IPipelineBehavior<,>), typeof(CachingBehavior<,>));

        services.AddValidatorsFromAssembly(assembly, includeInternalTypes: true);

        var mapsterConfig = TypeAdapterConfig.GlobalSettings;
        mapsterConfig.Scan(assembly);
        services.AddSingleton(mapsterConfig);
        services.AddScoped<IMapper, ServiceMapper>();

        return services;
    }
}
