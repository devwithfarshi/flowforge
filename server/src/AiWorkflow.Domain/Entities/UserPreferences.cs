namespace AiWorkflow.Domain.Entities;

/// <summary>
/// 1:1 with User, keyed by user id. Defaults mirror the frontend seed
/// (client/src/lib/db/seed.ts). Values are UI strings, not enums — the frontend
/// owns their vocabulary (theme, density, view mode).
/// </summary>
public sealed class UserPreferences
{
    public Guid UserId { get; private set; }

    public string Theme { get; private set; } = "system";

    public bool SidebarCollapsed { get; private set; }

    public string Density { get; private set; } = "comfortable";

    public string DefaultView { get; private set; } = "grid";

    public string Language { get; private set; } = "en";

    public bool AccentAnimations { get; private set; } = true;

    private UserPreferences()
    {
    }

    public static UserPreferences CreateDefault(Guid userId) => new() { UserId = userId };

    public void Update(
        string theme,
        bool sidebarCollapsed,
        string density,
        string defaultView,
        string language,
        bool accentAnimations)
    {
        Theme = theme;
        SidebarCollapsed = sidebarCollapsed;
        Density = density;
        DefaultView = defaultView;
        Language = language;
        AccentAnimations = accentAnimations;
    }
}
