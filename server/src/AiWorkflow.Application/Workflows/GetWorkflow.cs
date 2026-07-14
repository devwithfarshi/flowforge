using AiWorkflow.Application.Common.Interfaces;

using Mediator;

namespace AiWorkflow.Application.Workflows;

/// <summary>`GET /workflows/{id}` — full workflow including the graph.</summary>
public sealed record GetWorkflowQuery(Guid Id) : IRequest<WorkflowDto>;

public sealed class GetWorkflowHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetWorkflowQuery, WorkflowDto>
{
    public async ValueTask<WorkflowDto> Handle(GetWorkflowQuery query, CancellationToken ct)
    {
        var workflow = await WorkflowStore.GetOwned(db, currentUser, query.Id, ct);
        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);

        return WorkflowDto.From(workflow, ownerName);
    }
}
