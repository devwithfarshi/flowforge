using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>
/// `POST /workflows/{id}/duplicate` — copy of details + graph as a fresh draft with
/// zeroed counters, mirroring the mock's `duplicate()`.
/// </summary>
public sealed record DuplicateWorkflowCommand(Guid Id) : IRequest<WorkflowDto>;

public sealed class DuplicateWorkflowHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<DuplicateWorkflowCommand, WorkflowDto>
{
    public async ValueTask<WorkflowDto> Handle(DuplicateWorkflowCommand command, CancellationToken ct)
    {
        var source = await WorkflowStore.GetOwned(db, currentUser, command.Id, ct);

        var copy = Workflow.DuplicateFrom(source);
        db.Workflows.Add(copy);
        await db.SaveChangesAsync(ct);

        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);
        return WorkflowDto.From(copy, ownerName);
    }
}
