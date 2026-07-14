using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class NotificationConfiguration : IEntityTypeConfiguration<Notification>
{
    public void Configure(EntityTypeBuilder<Notification> builder)
    {
        builder.Ignore(n => n.DomainEvents);

        builder.Property(n => n.Type).HasMaxLength(30);
        builder.Property(n => n.Title).HasMaxLength(200);
        builder.Property(n => n.Message).HasMaxLength(1000);
        builder.Property(n => n.Href).HasMaxLength(500);

        builder.ToTable(t => t.HasCheckConstraint(
            "ck_notifications_type",
            "type IN ('workflow_completed','workflow_failed','integration','system','info')"));

        // Notification center + unread badge (§3.4); partial index on the hot path.
        builder.HasIndex(n => new { n.UserId, n.IsArchived, n.IsRead, n.CreatedAt })
            .IsDescending(false, false, false, true);
        builder.HasIndex(n => n.UserId)
            .HasFilter("is_archived = false")
            .HasDatabaseName("ix_notifications_user_id_not_archived");

        builder.HasOne<User>().WithMany().HasForeignKey(n => n.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class ActivityEntryConfiguration : IEntityTypeConfiguration<ActivityEntry>
{
    public void Configure(EntityTypeBuilder<ActivityEntry> builder)
    {
        builder.Ignore(a => a.DomainEvents);

        builder.Property(a => a.ActorName).HasMaxLength(120);
        builder.Property(a => a.Action).HasMaxLength(120);
        builder.Property(a => a.Target).HasMaxLength(200);
        builder.Property(a => a.Category).HasMaxLength(20);
        builder.Property(a => a.Meta).HasMaxLength(500);

        builder.ToTable(t => t.HasCheckConstraint(
            "ck_activity_entries_category",
            "category IN ('workflow','auth','integration','variable','system','user')"));

        // Audit feed (§3.4).
        builder.HasIndex(a => new { a.ActorId, a.CreatedAt }).IsDescending(false, true);

        builder.HasOne<User>().WithMany().HasForeignKey(a => a.ActorId).OnDelete(DeleteBehavior.Cascade);
    }
}
