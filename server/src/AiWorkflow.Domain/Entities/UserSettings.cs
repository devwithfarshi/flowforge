namespace AiWorkflow.Domain.Entities;

/// <summary>
/// 1:1 with User, keyed by user id. Notification + security flags; defaults mirror
/// the frontend seed (client/src/lib/db/seed.ts).
/// </summary>
public sealed class UserSettings
{
    public Guid UserId { get; private set; }

    public bool NotifyOnSuccess { get; private set; } = true;

    public bool NotifyOnFailure { get; private set; } = true;

    public bool NotifyOnIntegration { get; private set; } = true;

    public bool WeeklyDigest { get; private set; }

    public bool TwoFactorEnabled { get; private set; }

    private UserSettings()
    {
    }

    public static UserSettings CreateDefault(Guid userId) => new() { UserId = userId };

    public void Update(
        bool notifyOnSuccess,
        bool notifyOnFailure,
        bool notifyOnIntegration,
        bool weeklyDigest,
        bool twoFactorEnabled)
    {
        NotifyOnSuccess = notifyOnSuccess;
        NotifyOnFailure = notifyOnFailure;
        NotifyOnIntegration = notifyOnIntegration;
        WeeklyDigest = weeklyDigest;
        TwoFactorEnabled = twoFactorEnabled;
    }
}
