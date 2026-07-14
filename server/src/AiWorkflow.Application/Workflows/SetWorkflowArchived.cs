using AiWorkflow.Application.Common.Interfaces;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>
/// `POST /workflows/{id}/archive` with `{ archived }` — archive or restore (restore
/// lands on "inactive"), mirroring the mock's `setArchived()`.
/// </summary>
public sealed record SetWorkflowArchivedCommand(Guid Id, bool Archived) : IRequest<WorkflowDto>;

public sealed class SetWorkflowArchivedHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<SetWorkflowArchivedCommand, WorkflowDto>
{
    public async ValueTask<WorkflowDto> Handle(SetWorkflowArchivedCommand command, CancellationToken ct)
    {
        var workflow = await WorkflowStore.GetOwned(db, currentUser, command.Id, ct);

        if (command.Archived)
        {
            workflow.Archive(clock.UtcNow);
        }
        else
        {
            workflow.Unarchive();
        }

        await db.SaveChangesAsync(ct);

        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);
        return WorkflowDto.From(workflow, ownerName);
    }
}
