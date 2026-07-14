using AiWorkflow.Application.Users;

using Mediator;

namespace AiWorkflow.Api.Endpoints;

public static class UserEndpoints
{
    public sealed record UpdateProfileRequest(string? Name, string? JobTitle, string? Company, string? Bio);

    public sealed record ChangePasswordRequest(string CurrentPassword, string NewPassword);

    public static IEndpointRouteBuilder MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/v1/users")
            .WithTags("Users")
            .RequireAuthorization();

        group.MapPatch("/me", async (UpdateProfileRequest request, IMediator mediator, CancellationToken ct) =>
            Results.Ok(await mediator.Send(
                new UpdateProfileCommand(request.Name, request.JobTitle, request.Company, request.Bio), ct)));

        group.MapPost("/me/password", async (ChangePasswordRequest request, IMediator mediator, CancellationToken ct) =>
        {
            await mediator.Send(new ChangePasswordCommand(request.CurrentPassword, request.NewPassword), ct);
            return Results.NoContent();
        });

        return app;
    }
}
