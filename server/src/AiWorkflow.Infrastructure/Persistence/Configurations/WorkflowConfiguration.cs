using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;
using AiWorkflow.Domain.ValueObjects;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class WorkflowConfiguration : IEntityTypeConfiguration<Workflow>
{
    public void Configure(EntityTypeBuilder<Workflow> builder)
    {
        builder.Ignore(w => w.DomainEvents);

        builder.Property(w => w.Name).HasMaxLength(200);
        builder.Property(w => w.Description).HasMaxLength(2000);

        // Enums as lowercase text + CHECK, matching the frontend unions (§3.3).
        builder.Property(w => w.Status)
            .HasConversion(
                status => status.ToString().ToLowerInvariant(),
                value => Enum.Parse<WorkflowStatus>(value, true))
            .HasMaxLength(20);
        builder.Property(w => w.TriggerType)
            .HasConversion(
                trigger => trigger.ToString().ToLowerInvariant(),
                value => Enum.Parse<TriggerType>(value, true))
            .HasMaxLength(20);
        builder.ToTable(t =>
        {
            t.HasCheckConstraint(
                "ck_workflows_status",
                "status IN ('draft','active','inactive','error','archived')");
            t.HasCheckConstraint(
                "ck_workflows_trigger_type",
                "trigger_type IN ('manual','webhook','cron','email','api')");
        });

        // Tags → text[] with a GIN index for tag filtering (§3.4).
        builder.Property(w => w.Tags).HasColumnType("text[]");
        builder.HasIndex(w => w.Tags).HasMethod("gin");

        // Graph documents → jsonb, replaced atomically (§3.1). node_variables per the ERD.
        builder.Property(w => w.Nodes)
            .HasColumnType("jsonb")
            .HasConversion(JsonbConversion.Converter<WorkflowNode>(), JsonbConversion.Comparer<WorkflowNode>());
        builder.Property(w => w.Edges)
            .HasColumnType("jsonb")
            .HasConversion(JsonbConversion.Converter<WorkflowEdge>(), JsonbConversion.Comparer<WorkflowEdge>());
        builder.Property(w => w.Variables)
            .HasColumnName("node_variables")
            .HasColumnType("jsonb")
            .HasConversion(JsonbConversion.Converter<WorkflowVariable>(), JsonbConversion.Comparer<WorkflowVariable>());

        // List-page default sort + filters (§3.4), hot path excludes archived rows.
        builder.HasIndex(w => new { w.OwnerId, w.Status, w.UpdatedAt })
            .IsDescending(false, false, true);
        builder.HasIndex(w => w.OwnerId)
            .HasFilter("archived_at IS NULL")
            .HasDatabaseName("ix_workflows_owner_id_not_archived");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(w => w.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
