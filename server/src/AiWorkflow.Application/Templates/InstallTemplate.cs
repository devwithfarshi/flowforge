using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Application.Workflows;
using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.ValueObjects;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Templates;

/// <summary>
/// `POST /templates/{id}/install` (§6.2): bump installs + recently-used, then create a
/// draft workflow from the template. Mock parity: the graph is a linear chain of up to
/// three starter nodes (manual trigger → LLM → Slack), capped by nodeCount.
/// </summary>
public sealed record InstallTemplateCommand(Guid TemplateId) : IRequest<WorkflowDto>;

public sealed class InstallTemplateHandler(IApplicationDbContext db, ICurrentUser currentUser, IDateTime clock)
    : IRequestHandler<InstallTemplateCommand, WorkflowDto>
{
    private static readonly (string Type, string Label)[] StarterNodes =
        [("trigger.manual", "Manual"), ("ai.llm", "LLM"), ("comm.slack", "Slack")];

    public async ValueTask<WorkflowDto> Handle(InstallTemplateCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var template = await db.Templates.FirstOrDefaultAsync(t => t.Id == command.TemplateId, ct)
            ?? throw new NotFoundException("Template", command.TemplateId);

        template.RecordInstall();

        var nodes = StarterNodes
            .Take(Math.Max(1, template.NodeCount))
            .Select((n, i) => new WorkflowNode(
                Guid.CreateVersion7().ToString(),
                n.Type,
                n.Label,
                null,
                new NodePosition(120 + (i * 240), 220),
                [],
                "idle"))
            .ToList();

        var edges = nodes.Skip(1)
            .Select((node, i) => new WorkflowEdge(
                Guid.CreateVersion7().ToString(), nodes[i].Id, node.Id, null, null))
            .ToList();

        var workflow = Workflow.CreateDraft(userId, template.Name, template.Description);
        workflow.UpdateDetails(workflow.Name, workflow.Description, template.Tags);
        workflow.UpdateGraph(nodes, edges, []);

        db.Workflows.Add(workflow);
        var ownerName = await WorkflowStore.OwnerName(db, currentUser, ct);
        await Activity.Audit.Log(
            db, userId, "installed template", template.Name, "workflow", clock.UtcNow, ct, ownerName);
        await db.SaveChangesAsync(ct);

        return WorkflowDto.From(workflow, ownerName);
    }
}
