using System.Reflection;

using NetArchTest.Rules;

namespace AiWorkflow.ArchitectureTests;

/// <summary>
/// Enforces the Clean Architecture dependency rule (§2.1) as a test:
/// arrows point inward, inner layers know nothing about outer ones.
/// </summary>
public class DependencyRuleTests
{
    private static readonly Assembly Domain = typeof(AiWorkflow.Domain.Common.Entity).Assembly;
    private static readonly Assembly Application = typeof(AiWorkflow.Application.DependencyInjection).Assembly;
    private static readonly Assembly Infrastructure = typeof(AiWorkflow.Infrastructure.DependencyInjection).Assembly;

    [Fact]
    public void Domain_DependsOn_Nothing()
    {
        var result = Types.InAssembly(Domain)
            .ShouldNot()
            .HaveDependencyOnAny("AiWorkflow.Application", "AiWorkflow.Infrastructure", "AiWorkflow.Api")
            .GetResult();

        Assert.True(result.IsSuccessful, FailingTypes(result));
    }

    [Fact]
    public void Application_DoesNotDependOn_InfrastructureOrApi()
    {
        var result = Types.InAssembly(Application)
            .ShouldNot()
            .HaveDependencyOnAny("AiWorkflow.Infrastructure", "AiWorkflow.Api")
            .GetResult();

        Assert.True(result.IsSuccessful, FailingTypes(result));
    }

    [Fact]
    public void Infrastructure_DoesNotDependOn_Api()
    {
        var result = Types.InAssembly(Infrastructure)
            .ShouldNot()
            .HaveDependencyOnAny("AiWorkflow.Api")
            .GetResult();

        Assert.True(result.IsSuccessful, FailingTypes(result));
    }

    private static string FailingTypes(TestResult result) =>
        result.IsSuccessful
            ? string.Empty
            : "Offending types: " + string.Join(", ", result.FailingTypes.Select(t => t.FullName));
}
