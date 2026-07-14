using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.ValueObjects;

using FluentValidation;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>
/// `PUT /workflows/{id}` (§6.2): partial like the mock's `update()` — null means
/// "leave unchanged". The graph replaces atomically when any graph field is present.
/// </summary>
public sealed record UpdateWorkflowCommand(
    Guid Id,
    string? Name,
    string? Description,
    List<string>? Tags,
    string? Status,
    string? TriggerType,
    List<WorkflowNode>? Nodes,
    List<WorkflowEdge>? Edges,
    List<WorkflowVariable>? Variables) : IRequest<WorkflowDto>;

public sealed class UpdateWorkflowValidator : AbstractValidator<UpdateWorkflowCommand>
{
    public UpdateWorkflowValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200).When(x => x.Name is not null);
        RuleFor(x => x.Description).MaximumLength(2000);
        RuleForEach(x => x.Tags).NotEmpty().MaximumLength(50);
        RuleFor(x => x.Status)
            .Must(v => WorkflowEnums.IsValidStatus(v!))
            .When(x => x.Status is not null)
            .WithMessage("Unknown workflow status");
        RuleFor(x => x.TriggerType)
            .Must(v => WorkflowEnums.IsValidTrigger(v!))
            .When(x => x.TriggerType is not null)
            .WithMessage("Unknown trigger type");
    }
}

public sealed class UpdateWorkflowHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<UpdateWorkflowCommand, WorkflowDto>
{
    public async ValueTask<WorkflowDto> Handle(UpdateWorkflowCommand command, CancellationToken ct)
    {
        var workflow = await WorkflowStore.GetOwned(db, currentUser, command.Id, ct);

        workflow.UpdateDetails(
            command.Name ?? workflow.Name,
            command.Description ?? workflow.Description,
            command.Tags ?? workflow.Tags);

        if (command.Nodes is not null || command.Edges is not null || command.Variables is not null)
        {
            workflow.UpdateGraph(
                command.Nodes ?? workflow.Nodes,
                command.Edges ?? workflow.Edges,
                command.Variables ?? workflow.Variables);
        }

        if (command.TriggerType is not null)
        {
            workflow.SetTriggerType(WorkflowEnums.ParseTrigger(command.TriggerType));
        }

        if (command.Status is not null)
        {
            workflow.SetStatus(WorkflowEnums.ParseStatus(command.Status), clock.UtcNow);
        }

        await db.SaveChangesAsync(ct);

        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);
        return WorkflowDto.From(workflow, ownerName);
    }
}
