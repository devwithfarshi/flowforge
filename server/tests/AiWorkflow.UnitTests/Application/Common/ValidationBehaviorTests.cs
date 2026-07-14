using AiWorkflow.Application.Common.Behaviors;
using AiWorkflow.Application.Common.Exceptions;

using FluentValidation;

using Mediator;

namespace AiWorkflow.UnitTests.Application.Common;

public class ValidationBehaviorTests
{
    private sealed record CreateThing(string Name) : IRequest<string>;

    private sealed class CreateThingValidator : AbstractValidator<CreateThing>
    {
        public CreateThingValidator()
        {
            RuleFor(x => x.Name).NotEmpty().MaximumLength(10);
        }
    }

    private static ValueTask<string> Next(CreateThing message, CancellationToken ct) =>
        ValueTask.FromResult("handled");

    [Fact]
    public async Task WithNoValidators_PassesThrough()
    {
        var behavior = new ValidationBehavior<CreateThing, string>([]);

        var response = await behavior.Handle(new CreateThing(""), Next, CancellationToken.None);

        Assert.Equal("handled", response);
    }

    [Fact]
    public async Task WithValidMessage_InvokesHandler()
    {
        var behavior = new ValidationBehavior<CreateThing, string>([new CreateThingValidator()]);

        var response = await behavior.Handle(new CreateThing("ok"), Next, CancellationToken.None);

        Assert.Equal("handled", response);
    }

    [Fact]
    public async Task WithInvalidMessage_ThrowsAggregatedValidationException_AndSkipsHandler()
    {
        var behavior = new ValidationBehavior<CreateThing, string>([new CreateThingValidator()]);
        var handlerCalled = false;

        ValueTask<string> Handler(CreateThing message, CancellationToken ct)
        {
            handlerCalled = true;
            return ValueTask.FromResult("handled");
        }

        var ex = await Assert.ThrowsAsync<AiWorkflow.Application.Common.Exceptions.ValidationException>(
            async () => await behavior.Handle(new CreateThing(""), Handler, CancellationToken.None));

        Assert.False(handlerCalled);
        Assert.True(ex.Errors.ContainsKey(nameof(CreateThing.Name)));
        Assert.NotEmpty(ex.Errors[nameof(CreateThing.Name)]);
    }

    [Fact]
    public async Task GroupsFailures_ByPropertyName()
    {
        var behavior = new ValidationBehavior<CreateThing, string>(
            [new CreateThingValidator(), new CreateThingValidator()]);

        var ex = await Assert.ThrowsAsync<AiWorkflow.Application.Common.Exceptions.ValidationException>(
            async () => await behavior.Handle(new CreateThing(""), Next, CancellationToken.None));

        var messages = ex.Errors[nameof(CreateThing.Name)];
        Assert.Equal(2, messages.Length);
    }
}
