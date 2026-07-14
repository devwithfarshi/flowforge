using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Infrastructure.Executions.Executors;

namespace AiWorkflow.Infrastructure.Executions;

/// <summary>
/// Resolves an executor by `node.type` (§14.3). Unregistered types fall back to the
/// simulated executor, so all ~44 catalog nodes run today; real executors are additive.
/// </summary>
public sealed class NodeExecutorRegistry
{
    private readonly Dictionary<string, INodeExecutor> _executors;
    private readonly SimulatedNodeExecutor _fallback;

    public NodeExecutorRegistry(IEnumerable<INodeExecutor> executors, SimulatedNodeExecutor fallback)
    {
        _executors = executors.ToDictionary(e => e.Type, StringComparer.OrdinalIgnoreCase);
        _fallback = fallback;
    }

    public INodeExecutor Resolve(string nodeType) =>
        _executors.GetValueOrDefault(nodeType, _fallback);
}
