namespace AiWorkflow.Application.Common.Exceptions;

/// <summary>Requested resource does not exist (or is not visible to the caller) → 404.</summary>
public class NotFoundException : Exception
{
    public NotFoundException()
        : base("Resource not found.")
    {
    }

    public NotFoundException(string message)
        : base(message)
    {
    }

    public NotFoundException(string message, Exception innerException)
        : base(message, innerException)
    {
    }

    public NotFoundException(string resource, object key)
        : base($"{resource} with id '{key}' was not found.")
    {
    }
}
