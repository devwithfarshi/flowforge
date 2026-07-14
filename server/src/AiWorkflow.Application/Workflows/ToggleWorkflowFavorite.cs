using AiWorkflow.Application.Common.Interfaces;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>`POST /workflows/{id}/favorite` — toggle, mirroring the mock's `toggleFavorite()`.</summary>
public sealed record ToggleWorkflowFavoriteCommand(Guid Id) : IRequest<WorkflowDto>;

public sealed class ToggleWorkflowFavoriteHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ToggleWorkflowFavoriteCommand, WorkflowDto>
{
    public async ValueTask<WorkflowDto> Handle(ToggleWorkflowFavoriteCommand command, CancellationToken ct)
    {
        var workflow = await WorkflowStore.GetOwned(db, currentUser, command.Id, ct);

        workflow.ToggleFavorite();
        await db.SaveChangesAsync(ct);

        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);
        return WorkflowDto.From(workflow, ownerName);
    }
}
