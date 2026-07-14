using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.ValueObjects;

using FluentValidation;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>
/// `POST /workflows` (§6.2): everything is optional — defaults mirror the mock's
/// `newWorkflow()`. Templates install (task 12) reuses this with a full graph.
/// </summary>
public sealed record CreateWorkflowCommand(
    string? Name,
    string? Description,
    List<string>? Tags,
    string? Status,
    string? TriggerType,
    List<WorkflowNode>? Nodes,
    List<WorkflowEdge>? Edges,
    List<WorkflowVariable>? Variables) : IRequest<WorkflowDto>;

public sealed class CreateWorkflowValidator : AbstractValidator<CreateWorkflowCommand>
{
    public CreateWorkflowValidator()
    {
        RuleFor(x => x.Name).MaximumLength(200);
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

public sealed class CreateWorkflowHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<CreateWorkflowCommand, WorkflowDto>
{
    public async ValueTask<WorkflowDto> Handle(CreateWorkflowCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var workflow = Workflow.CreateDraft(userId, command.Name, command.Description);

        if (command.Tags is not null)
        {
            workflow.UpdateDetails(workflow.Name, workflow.Description, command.Tags);
        }

        if (command.Nodes is not null || command.Edges is not null || command.Variables is not null)
        {
            workflow.UpdateGraph(command.Nodes ?? [], command.Edges ?? [], command.Variables ?? []);
        }

        if (command.TriggerType is not null)
        {
            workflow.SetTriggerType(WorkflowEnums.ParseTrigger(command.TriggerType));
        }

        if (command.Status is not null)
        {
            workflow.SetStatus(WorkflowEnums.ParseStatus(command.Status), clock.UtcNow);
        }

        db.Workflows.Add(workflow);
        await db.SaveChangesAsync(ct);

        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);
        return WorkflowDto.From(workflow, ownerName);
    }
}
