namespace AiWorkflow.Application.Common.Exceptions;

/// <summary>Missing/invalid credentials or token → 401.</summary>
public class UnauthorizedException : Exception
{
    public UnauthorizedException()
        : base("Authentication is required.")
    {
    }

    public UnauthorizedException(string message)
        : base(message)
    {
    }

    public UnauthorizedException(string message, Exception innerException)
        : base(message, innerException)
    {
    }
}
