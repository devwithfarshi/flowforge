using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Infrastructure.Persistence.Seed;

/// <summary>
/// Idempotent integration catalog (§8), ported from the frontend seed. Per-user demo
/// accounts/status from the mock are not seeded — status derives from real connections.
/// </summary>
public static class IntegrationSeeder
{
    public static async Task SeedAsync(ApplicationDbContext db, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(872634002)", ct);

        if (await db.Integrations.AnyAsync(ct))
        {
            await transaction.CommitAsync(ct);
            return;
        }

        (string Name, string Category, string Description, string Color, string Icon, bool Popular)[] rows =
        [
            ("Slack", "Communication", "Send messages and alerts to channels.", "#4a154b", "message-square", true),
            ("Gmail", "Communication", "Send and read email from Gmail.", "#ea4335", "mail", true),
            ("PostgreSQL", "Databases", "Run queries against Postgres.", "#336791", "database", false),
            ("OpenAI", "AI", "Access GPT models and embeddings.", "#10a37f", "sparkles", true),
            ("Anthropic", "AI", "Access Claude models.", "#d97757", "sparkles", true),
            ("Notion", "Productivity", "Read and write Notion pages.", "#000000", "file-text", true),
            ("MongoDB", "Databases", "Query MongoDB collections.", "#00684a", "database", false),
            ("Discord", "Communication", "Post to Discord channels.", "#5865f2", "message-square", false),
            ("Telegram", "Communication", "Send Telegram messages.", "#26a5e4", "send", false),
            ("Outlook", "Communication", "Send and read Outlook mail.", "#0078d4", "mail", false),
            ("Google Sheets", "Productivity", "Read and write spreadsheets.", "#0f9d58", "file-spreadsheet", false),
            ("Stripe", "Finance", "React to payment events.", "#635bff", "credit-card", true),
            ("Redis", "Databases", "Cache and read keys.", "#dc382d", "database", false),
            ("MySQL", "Databases", "Query MySQL databases.", "#00758f", "database", false),
            ("WhatsApp", "Communication", "Send WhatsApp messages.", "#25d366", "message-square", false),
            ("AWS S3", "Storage", "Read and write objects to buckets.", "#ff9900", "database", false),
        ];

        db.Integrations.AddRange(rows.Select(r =>
            Integration.Create(r.Name, r.Category, r.Description, r.Color, r.Icon, r.Popular)));

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
