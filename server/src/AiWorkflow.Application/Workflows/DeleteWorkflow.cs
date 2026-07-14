using AiWorkflow.Application.Common.Interfaces;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>`DELETE /workflows/{id}` — hard delete, mirroring the mock's `remove()`.</summary>
public sealed record DeleteWorkflowCommand(Guid Id) : IRequest;

public sealed class DeleteWorkflowHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<DeleteWorkflowCommand>
{
    public async ValueTask<Unit> Handle(DeleteWorkflowCommand command, CancellationToken ct)
    {
        var workflow = await WorkflowStore.GetOwned(db, currentUser, command.Id, ct);

        db.Workflows.Remove(workflow);
        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
