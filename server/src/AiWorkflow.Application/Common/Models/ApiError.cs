namespace AiWorkflow.Application.Common.Models;

/// <summary>
/// Machine-readable error carried by a failed <see cref="Result"/>.
/// <paramref name="Code"/> is a stable snake_case identifier; <paramref name="Message"/> is human-readable.
/// </summary>
public sealed record ApiError(string Code, string Message);
