using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Infrastructure.Persistence.Seed;

/// <summary>
/// Idempotent catalog seed (§8): the 12 marketplace templates ported verbatim from the
/// frontend seed (client/src/lib/db/seed.ts). An advisory lock guards N-replica startup.
/// </summary>
public static class TemplateSeeder
{
    public static async Task SeedAsync(ApplicationDbContext db, IDateTime clock, CancellationToken ct = default)
    {
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlRawAsync("SELECT pg_advisory_xact_lock(872634001)", ct);

        if (await db.Templates.AnyAsync(ct))
        {
            await transaction.CommitAsync(ct);
            return;
        }

        var now = clock.UtcNow;
        (string Name, string Description, string Category, string Difficulty, string Author,
            int Installs, decimal Rating, bool Featured, string[] Tags, int NodeCount,
            string Color, string Icon, bool RecentlyUsed)[] rows =
        [
            ("AI Email Responder", "Auto-draft replies to inbound email using your knowledge base.", "AI", "Beginner", "Flowforge", 12400, 4.8m, true, ["email", "ai"], 4, "#8b5cf6", "mail", true),
            ("PDF → Database", "Turn stacks of PDFs into structured database rows.", "Documents", "Intermediate", "Flowforge", 8300, 4.6m, true, ["documents", "database"], 5, "#3b82f6", "file-stack", false),
            ("Slack Standup Bot", "Collect and summarize daily standups in Slack.", "Communication", "Beginner", "Community", 15200, 4.9m, true, ["slack", "ai"], 4, "#22c55e", "message-square", true),
            ("Lead Scoring Engine", "Score and route new leads with an LLM.", "AI", "Advanced", "Flowforge", 5600, 4.5m, false, ["sales", "ai"], 6, "#8b5cf6", "trending-up", false),
            ("Invoice OCR Pipeline", "Scan invoices and extract totals automatically.", "Documents", "Intermediate", "Community", 4100, 4.4m, false, ["ocr", "finance"], 5, "#3b82f6", "scan", false),
            ("Sentiment Dashboard", "Track review sentiment over time.", "AI", "Intermediate", "Flowforge", 3300, 4.3m, false, ["analytics", "ai"], 4, "#8b5cf6", "smile", false),
            ("Webhook to Sheets", "Append incoming webhook data to a spreadsheet.", "Utilities", "Beginner", "Community", 9800, 4.7m, false, ["webhook", "utilities"], 3, "#64748b", "file-spreadsheet", false),
            ("RAG Support Agent", "Answer support questions from your docs.", "AI", "Advanced", "Flowforge", 7200, 4.8m, true, ["rag", "support"], 3, "#8b5cf6", "brain", false),
            ("Meeting Transcriber", "Transcribe and summarize recorded meetings.", "Speech", "Intermediate", "Community", 2900, 4.2m, false, ["speech", "ai"], 4, "#ec4899", "mic", false),
            ("Image Moderation", "Automatically flag inappropriate images.", "Vision", "Advanced", "Flowforge", 3600, 4.4m, false, ["vision", "safety"], 4, "#14b8a6", "image", false),
            ("Daily DB Backup Alert", "Notify when nightly backups complete or fail.", "Utilities", "Beginner", "Community", 5100, 4.6m, false, ["cron", "database"], 3, "#64748b", "database", false),
            ("Multichannel Notifier", "Broadcast alerts to Slack, email, and Telegram.", "Communication", "Beginner", "Flowforge", 6700, 4.5m, false, ["notifications"], 5, "#22c55e", "send", false),
        ];

        db.Templates.AddRange(rows.Select(r => Template.Create(
            r.Name, r.Description, r.Category, r.Difficulty, r.Author, r.Installs, r.Rating,
            r.Featured, [.. r.Tags], r.NodeCount, r.Color, r.Icon, r.RecentlyUsed, now)));

        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
    }
}
