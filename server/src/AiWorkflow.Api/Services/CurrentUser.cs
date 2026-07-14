using System.Security.Claims;

using AiWorkflow.Application.Common.Interfaces;

namespace AiWorkflow.Api.Services;

/// <summary>
/// Resolves the authenticated principal from the JWT claims of the current request
/// (§4.4). Inbound claim mapping is disabled, so claim types are the raw
/// sub/email/role the token was minted with.
/// </summary>
public sealed class CurrentUser(IHttpContextAccessor httpContextAccessor) : ICurrentUser
{
    private ClaimsPrincipal? Principal => httpContextAccessor.HttpContext?.User;

    public Guid? Id =>
        Guid.TryParse(Principal?.FindFirstValue("sub"), out var id) ? id : null;

    public string? Email => Principal?.FindFirstValue("email");

    public Guid? SessionId =>
        Guid.TryParse(Principal?.FindFirstValue("sid"), out var sid) ? sid : null;

    public bool IsAuthenticated => Principal?.Identity?.IsAuthenticated is true;
}
