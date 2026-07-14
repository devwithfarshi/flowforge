using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Domain.Exceptions;

using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace AiWorkflow.Api.Middleware;

/// <summary>
/// One place maps exception types → status + RFC 9457 problem+json (§10.2).
/// Stack traces never leak; 500 details are hidden in production.
/// </summary>
public sealed class GlobalExceptionHandler(IProblemDetailsService problemDetailsService, IHostEnvironment environment)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (status, title) = exception switch
        {
            ValidationException => (StatusCodes.Status400BadRequest, "Validation failed"),
            UnauthorizedException => (StatusCodes.Status401Unauthorized, "Unauthorized"),
            NotFoundException => (StatusCodes.Status404NotFound, "Resource not found"),
            ForbiddenException => (StatusCodes.Status403Forbidden, "Forbidden"),
            ConflictException => (StatusCodes.Status409Conflict, "Conflict"),
            DomainException => (StatusCodes.Status422UnprocessableEntity, "Domain rule violated"),
            _ => (StatusCodes.Status500InternalServerError, "Server error"),
        };

        httpContext.Response.StatusCode = status;

        // Validation failures use the ValidationProblemDetails shape the frontend
        // forms expect: { errors: { field: [messages] } } (§10.1).
        ProblemDetails problemDetails = exception is ValidationException validationException
            ? new ValidationProblemDetails(validationException.Errors)
            : new ProblemDetails();

        problemDetails.Status = status;
        problemDetails.Title = title;
        problemDetails.Detail =
            environment.IsProduction() && status == StatusCodes.Status500InternalServerError
                ? "An unexpected error occurred."
                : exception.Message;

        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = problemDetails,
        });
    }
}
