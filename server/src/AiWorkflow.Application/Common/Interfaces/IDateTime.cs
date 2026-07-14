namespace AiWorkflow.Application.Common.Interfaces;

/// <summary>
/// Testable clock. The app stores UTC only (§3.3: timestamptz everywhere).
/// </summary>
public interface IDateTime
{
    DateTimeOffset UtcNow { get; }
}
