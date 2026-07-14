namespace AiWorkflow.Application.Common.Models;

/// <summary>
/// Outcome of an operation that can fail in an expected way. Exceptional cases
/// (validation, not-found, forbidden, conflict) still throw and are mapped to
/// ProblemDetails by the API's exception handler (§10.2).
/// </summary>
public class Result
{
    protected Result(bool isSuccess, ApiError? error)
    {
        if (isSuccess != (error is null))
        {
            throw new ArgumentException("A successful result cannot carry an error, and a failed result must.", nameof(error));
        }

        IsSuccess = isSuccess;
        Error = error;
    }

    public bool IsSuccess { get; }

    public bool IsFailure => !IsSuccess;

    public ApiError? Error { get; }

    public static Result Success() => new(true, null);

    public static Result Failure(ApiError error) => new(false, error);

    public static Result<T> Success<T>(T value) => new(value, true, null);

    public static Result<T> Failure<T>(ApiError error) => new(default, false, error);
}

public sealed class Result<T> : Result
{
    private readonly T? _value;

    internal Result(T? value, bool isSuccess, ApiError? error)
        : base(isSuccess, error)
    {
        _value = value;
    }

    public T Value =>
        IsSuccess ? _value! : throw new InvalidOperationException("Cannot access the value of a failed result.");
}
