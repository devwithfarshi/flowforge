using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Settings;

/// <summary>Serializes to the frontend's `Preferences` shape (client/src/lib/types.ts).</summary>
public sealed record PreferencesDto(
    string Theme,
    bool SidebarCollapsed,
    string Density,
    string DefaultView,
    string Language,
    bool AccentAnimations)
{
    public static PreferencesDto From(UserPreferences p) => new(
        p.Theme, p.SidebarCollapsed, p.Density, p.DefaultView, p.Language, p.AccentAnimations);
}

/// <summary>`GET /me/preferences` (§5). Creates the default row if it doesn't exist yet.</summary>
public sealed record GetPreferencesQuery : IRequest<PreferencesDto>;

/// <summary>`PATCH /me/preferences` (§5): partial — null fields stay unchanged.</summary>
public sealed record UpdatePreferencesCommand(
    string? Theme,
    bool? SidebarCollapsed,
    string? Density,
    string? DefaultView,
    string? Language,
    bool? AccentAnimations) : IRequest<PreferencesDto>;

public sealed class UpdatePreferencesValidator : AbstractValidator<UpdatePreferencesCommand>
{
    // The frontend owns these vocabularies (ThemePref/TableDensity/ViewMode unions).
    public UpdatePreferencesValidator()
    {
        RuleFor(x => x.Theme).Must(v => v is "light" or "dark" or "system")
            .When(x => x.Theme is not null)
            .WithMessage("Theme must be light, dark, or system");
        RuleFor(x => x.Density).Must(v => v is "comfortable" or "compact")
            .When(x => x.Density is not null)
            .WithMessage("Density must be comfortable or compact");
        RuleFor(x => x.DefaultView).Must(v => v is "grid" or "list")
            .When(x => x.DefaultView is not null)
            .WithMessage("DefaultView must be grid or list");
        RuleFor(x => x.Language).NotEmpty().MaximumLength(20).When(x => x.Language is not null);
    }
}

public sealed class GetPreferencesHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetPreferencesQuery, PreferencesDto>
{
    public async ValueTask<PreferencesDto> Handle(GetPreferencesQuery query, CancellationToken ct)
    {
        var preferences = await PreferencesStore.GetOrCreate(db, currentUser, ct);
        return PreferencesDto.From(preferences);
    }
}

public sealed class UpdatePreferencesHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdatePreferencesCommand, PreferencesDto>
{
    public async ValueTask<PreferencesDto> Handle(UpdatePreferencesCommand command, CancellationToken ct)
    {
        var preferences = await PreferencesStore.GetOrCreate(db, currentUser, ct);

        preferences.Update(
            command.Theme ?? preferences.Theme,
            command.SidebarCollapsed ?? preferences.SidebarCollapsed,
            command.Density ?? preferences.Density,
            command.DefaultView ?? preferences.DefaultView,
            command.Language ?? preferences.Language,
            command.AccentAnimations ?? preferences.AccentAnimations);

        await db.SaveChangesAsync(ct);

        return PreferencesDto.From(preferences);
    }
}

internal static class PreferencesStore
{
    /// <summary>Rows exist from register, but self-heal for accounts created out-of-band.</summary>
    public static async Task<UserPreferences> GetOrCreate(
        IApplicationDbContext db, ICurrentUser currentUser, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var preferences = await db.UserPreferences.FirstOrDefaultAsync(p => p.UserId == userId, ct);
        if (preferences is null)
        {
            preferences = UserPreferences.CreateDefault(userId);
            db.UserPreferences.Add(preferences);
            await db.SaveChangesAsync(ct);
        }

        return preferences;
    }
}
