namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// The authenticated principal for the current request (or job), resolved from
/// JWT claims by the Api layer. Null <see cref="Id"/> means anonymous.
/// </summary>
public interface ICurrentUser
{
    Guid? Id { get; }

    string? Email { get; }

    bool IsAuthenticated { get; }
}
