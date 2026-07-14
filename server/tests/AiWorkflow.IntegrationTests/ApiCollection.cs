namespace AiWorkflow.IntegrationTests;

/// <summary>
/// All API tests share one app host + Postgres container. Hangfire keeps global static
/// state (JobStorage.Current), so multiple in-process hosts corrupt each other's job
/// processing; a single shared factory is also the fastest Testcontainers setup.
/// Data isolation comes from each test registering its own user.
/// </summary>
[CollectionDefinition(Name)]
public sealed class ApiCollection : ICollectionFixture<ApiFactory>
{
    public const string Name = "api";
}
