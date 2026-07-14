using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Infrastructure.Services;

public sealed class DateTimeService : IDateTime
{
    public DateTimeOffset UtcNow => DateTimeOffset.UtcNow;
}
