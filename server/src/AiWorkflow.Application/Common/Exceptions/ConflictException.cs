namespace AiWorkflow.Application.Common.Exceptions;

/// <summary>Request conflicts with current state (e.g. duplicate email) → 409.</summary>
public class ConflictException : Exception
{
    public ConflictException()
        : base("The request conflicts with the current state of the resource.")
    {
    }

    public ConflictException(string message)
        : base(message)
    {
    }

    public ConflictException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
