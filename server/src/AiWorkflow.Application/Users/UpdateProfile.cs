using AiWorkflow.Application.Auth;
using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;

using FluentValidation;

using Mapster;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Users;

/// <summary>
/// `PATCH /users/me` (§5): partial update — null means "leave unchanged", empty string
/// clears an optional field. Email changes are deliberately excluded (re-verification
/// flow comes with the files/avatar work).
/// </summary>
public sealed record UpdateProfileCommand(string? Name, string? JobTitle, string? Company, string? Bio)
    : IRequest<UserDto>;

public sealed class UpdateProfileValidator : AbstractValidator<UpdateProfileCommand>
{
    public UpdateProfileValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(120).When(x => x.Name is not null);
        RuleFor(x => x.JobTitle).MaximumLength(120);
        RuleFor(x => x.Company).MaximumLength(120);
        RuleFor(x => x.Bio).MaximumLength(2000);
    }
}

public sealed class UpdateProfileHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdateProfileCommand, UserDto>
{
    public async ValueTask<UserDto> Handle(UpdateProfileCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedException();

        user.UpdateProfile(
            command.Name ?? user.Name,
            command.JobTitle ?? user.JobTitle,
            command.Company ?? user.Company,
            command.Bio ?? user.Bio);

        await db.SaveChangesAsync(ct);

        return user.Adapt<UserDto>();
    }
}
