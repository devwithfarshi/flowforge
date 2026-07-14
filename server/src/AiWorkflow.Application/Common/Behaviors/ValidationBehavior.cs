using FluentValidation;

using Mediator;

namespace AiWorkflow.Application.Common.Behaviors;

/// <summary>
/// Runs every registered FluentValidation validator for the message before the handler;
/// aggregated failures throw <see cref="Exceptions.ValidationException"/> → 400 (§10.1).
/// </summary>
public sealed class ValidationBehavior<TMessage, TResponse>(IEnumerable<IValidator<TMessage>> validators)
    : IPipelineBehavior<TMessage, TResponse>
    where TMessage : notnull, IMessage
{
    public async ValueTask<TResponse> Handle(
        TMessage message,
        MessageHandlerDelegate<TMessage, TResponse> next,
        CancellationToken cancellationToken)
    {
        if (validators.Any())
        {
            // One context per validator — a shared context accumulates failures across
            // validators, so each result would report the combined (duplicated) list.
            var results = await Task.WhenAll(
                validators.Select(v =>
                    v.ValidateAsync(new ValidationContext<TMessage>(message), cancellationToken)));

            var failures = results
                .SelectMany(r => r.Errors)
                .Where(f => f is not null)
                .ToList();

            if (failures.Count != 0)
            {
                throw new Exceptions.ValidationException(failures);
            }
        }

        return await next(message, cancellationToken);
    }
}
