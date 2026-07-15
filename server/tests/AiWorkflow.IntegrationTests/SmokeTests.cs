using Microsoft.AspNetCore.Mvc.Testing;

namespace AiWorkflow.IntegrationTests;

/// <summary>
/// Bootstrap smoke tests: the shared app host starts and the P0 endpoints respond.
/// Uses <see cref="ApiFactory"/> (same collection as other API tests) so Hangfire's
/// process-wide JobStorage isn't torn down by a second in-process host.
/// </summary>
[Collection(ApiCollection.Name)]
public class SmokeTests
{
    private readonly ApiFactory _factory;

    public SmokeTests(ApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task HealthLive_Returns200()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health/live");

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SwaggerDocument_Returns200_InDevelopment()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(System.Net.HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Responses_CarryCorrelationId()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health/live");

        Assert.True(response.Headers.Contains("X-Correlation-Id"));
    }

    [Fact]
    public async Task Responses_CarrySecurityHeaders()
    {
        using var client = _factory.CreateClient();

        var response = await client.GetAsync("/health/live");

        Assert.Equal("nosniff", response.Headers.GetValues("X-Content-Type-Options").Single());
        Assert.True(response.Headers.Contains("Referrer-Policy"));
        Assert.True(response.Headers.Contains("Content-Security-Policy"));
        Assert.False(response.Headers.Contains("Server"));
    }
}
