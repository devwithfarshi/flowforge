using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Workflows;

/// <summary>
/// Shared lookups with resource-ownership scoping (§4.4): a workflow that isn't yours
/// is indistinguishable from one that doesn't exist.
/// </summary>
internal static class WorkflowStore
{
    public static async Task<Workflow> GetOwned(
        IApplicationDbContext db, ICurrentUser currentUser, Guid workflowId, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        return await db.Workflows
            .FirstOrDefaultAsync(w => w.Id == workflowId && w.OwnerId == userId, ct)
            ?? throw new NotFoundException("Workflow", workflowId);
    }

    public static async Task<string> OwnerName(
        IApplicationDbContext db, ICurrentUser currentUser, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        return await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.Name)
            .FirstOrDefaultAsync(ct) ?? "";
    }
}
