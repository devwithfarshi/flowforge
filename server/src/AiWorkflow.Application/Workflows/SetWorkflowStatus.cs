using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>`PATCH /workflows/{id}/status` with `{ status }` (§6.2).</summary>
public sealed record SetWorkflowStatusCommand(Guid Id, string Status) : IRequest<WorkflowDto>;

public sealed class SetWorkflowStatusValidator : AbstractValidator<SetWorkflowStatusCommand>
{
    public SetWorkflowStatusValidator()
    {
        RuleFor(x => x.Status)
            .NotEmpty()
            .Must(WorkflowEnums.IsValidStatus)
            .WithMessage("Unknown workflow status");
    }
}

public sealed class SetWorkflowStatusHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<SetWorkflowStatusCommand, WorkflowDto>
{
    public async ValueTask<WorkflowDto> Handle(SetWorkflowStatusCommand command, CancellationToken ct)
    {
        var workflow = await WorkflowStore.GetOwned(db, currentUser, command.Id, ct);

        workflow.SetStatus(WorkflowEnums.ParseStatus(command.Status), clock.UtcNow);
        await db.SaveChangesAsync(ct);

        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);
        return WorkflowDto.From(workflow, ownerName);
    }
}
