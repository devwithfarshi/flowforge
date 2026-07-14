namespace AiWorkflow.Domain.Exceptions;

/// <summary>
/// Thrown when a domain rule is violated (e.g. publishing an empty workflow).
/// Mapped to a 422 ProblemDetails response by the API's exception handler (§10.2).
/// </summary>
public class DomainException : Exception
{
    public DomainException()
    {
    }

    public DomainException(string message)
        : base(message)
    {
    }

    public DomainException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
