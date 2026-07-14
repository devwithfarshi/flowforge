using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Settings;

/// <summary>Serializes to the frontend's `Settings` shape (client/src/lib/types.ts).</summary>
public sealed record SettingsDto(
    bool NotifyOnSuccess,
    bool NotifyOnFailure,
    bool NotifyOnIntegration,
    bool WeeklyDigest,
    bool TwoFactorEnabled)
{
    public static SettingsDto From(UserSettings s) => new(
        s.NotifyOnSuccess, s.NotifyOnFailure, s.NotifyOnIntegration, s.WeeklyDigest, s.TwoFactorEnabled);
}

/// <summary>`GET /me/settings` (§5). Creates the default row if it doesn't exist yet.</summary>
public sealed record GetSettingsQuery : IRequest<SettingsDto>;

/// <summary>`PATCH /me/settings` (§5): partial — null fields stay unchanged.</summary>
public sealed record UpdateSettingsCommand(
    bool? NotifyOnSuccess,
    bool? NotifyOnFailure,
    bool? NotifyOnIntegration,
    bool? WeeklyDigest,
    bool? TwoFactorEnabled) : IRequest<SettingsDto>;

public sealed class GetSettingsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<GetSettingsQuery, SettingsDto>
{
    public async ValueTask<SettingsDto> Handle(GetSettingsQuery query, CancellationToken ct)
    {
        var settings = await SettingsStore.GetOrCreate(db, currentUser, ct);
        return SettingsDto.From(settings);
    }
}

public sealed class UpdateSettingsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UpdateSettingsCommand, SettingsDto>
{
    public async ValueTask<SettingsDto> Handle(UpdateSettingsCommand command, CancellationToken ct)
    {
        var settings = await SettingsStore.GetOrCreate(db, currentUser, ct);

        settings.Update(
            command.NotifyOnSuccess ?? settings.NotifyOnSuccess,
            command.NotifyOnFailure ?? settings.NotifyOnFailure,
            command.NotifyOnIntegration ?? settings.NotifyOnIntegration,
            command.WeeklyDigest ?? settings.WeeklyDigest,
            command.TwoFactorEnabled ?? settings.TwoFactorEnabled);

        await db.SaveChangesAsync(ct);

        return SettingsDto.From(settings);
    }
}

internal static class SettingsStore
{
    /// <summary>Rows exist from register, but self-heal for accounts created out-of-band.</summary>
    public static async Task<UserSettings> GetOrCreate(
        IApplicationDbContext db, ICurrentUser currentUser, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var settings = await db.UserSettings.FirstOrDefaultAsync(s => s.UserId == userId, ct);
        if (settings is null)
        {
            settings = UserSettings.CreateDefault(userId);
            db.UserSettings.Add(settings);
            await db.SaveChangesAsync(ct);
        }

        return settings;
    }
}
