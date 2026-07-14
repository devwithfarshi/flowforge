using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>
/// `POST /workflows/{id}/duplicate` — copy of details + graph as a fresh draft with
/// zeroed counters, mirroring the mock's `duplicate()`.
/// </summary>
public sealed record DuplicateWorkflowCommand(Guid Id) : IRequest<WorkflowDto>;

public sealed class DuplicateWorkflowHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<DuplicateWorkflowCommand, WorkflowDto>
{
    public async ValueTask<WorkflowDto> Handle(DuplicateWorkflowCommand command, CancellationToken ct)
    {
        var source = await WorkflowStore.GetOwned(db, currentUser, command.Id, ct);

        var copy = Workflow.DuplicateFrom(source);
        db.Workflows.Add(copy);
        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);
        await Activity.Audit.Log(
            db, source.OwnerId, "duplicated workflow", source.Name, "workflow", clock.UtcNow, ct, ownerName);
        await db.SaveChangesAsync(ct);

        return WorkflowDto.From(copy, ownerName);
    }
}
