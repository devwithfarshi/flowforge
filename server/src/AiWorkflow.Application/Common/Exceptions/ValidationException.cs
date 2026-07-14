using FluentValidation.Results;

namespace AiWorkflow.Application.Common.Exceptions;

/// <summary>
/// Aggregated FluentValidation failures, thrown by the ValidationBehavior before the
/// handler runs. Mapped to 400 ValidationProblemDetails `{ errors: { field: [msgs] } }`
/// — exactly what the frontend forms expect (§10.1).
/// </summary>
public class ValidationException : Exception
{
    public ValidationException()
        : base("One or more validation failures have occurred.")
    {
        Errors = new Dictionary<string, string[]>();
    }

    public ValidationException(IEnumerable<ValidationFailure> failures)
        : base("One or more validation failures have occurred.")
    {
        Errors = failures
            .GroupBy(f => f.PropertyName, f => f.ErrorMessage)
            .ToDictionary(g => g.Key, g => g.ToArray());
    }

    public ValidationException(string propertyName, string message)
        : this([new ValidationFailure(propertyName, message)])
    {
    }

    public IDictionary<string, string[]> Errors { get; }
}
