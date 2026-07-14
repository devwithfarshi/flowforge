using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;
using AiWorkflow.Domain.ValueObjects;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;


namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class ExecutionConfiguration : IEntityTypeConfiguration<Execution>
{
    public void Configure(EntityTypeBuilder<Execution> builder)
    {
        builder.Ignore(e => e.DomainEvents);

        builder.Property(e => e.WorkflowName).HasMaxLength(200);
        builder.Property(e => e.TriggeredByName).HasMaxLength(120);

        builder.Property(e => e.Status)
            .HasConversion(
                status => status.ToString().ToLowerInvariant(),
                value => Enum.Parse<ExecutionStatus>(value, true))
            .HasMaxLength(20);
        builder.Property(e => e.Trigger)
            .HasConversion(
                trigger => trigger.ToString().ToLowerInvariant(),
                value => Enum.Parse<TriggerType>(value, true))
            .HasMaxLength(20);
        builder.ToTable(t =>
        {
            t.HasCheckConstraint(
                "ck_executions_status",
                "status IN ('queued','running','success','failed','canceled')");
            t.HasCheckConstraint(
                "ck_executions_trigger",
                "trigger IN ('manual','webhook','cron','email','api')");
        });

        builder.Property(e => e.NodeRuns)
            .HasColumnType("jsonb")
            .HasConversion(JsonbConversion.Converter<NodeRun>(), JsonbConversion.Comparer<NodeRun>());
        builder.Property(e => e.Logs)
            .HasColumnType("jsonb")
            .HasConversion(JsonbConversion.Converter<LogEntry>(), JsonbConversion.Comparer<LogEntry>());

        // Detail + history, dashboard/filters (§3.4).
        builder.HasIndex(e => new { e.WorkflowId, e.StartedAt }).IsDescending(false, true);
        builder.HasIndex(e => new { e.TriggeredById, e.StartedAt }).IsDescending(false, true);
        builder.HasIndex(e => e.Status);

        // Runs outlive nothing: deleting a workflow deletes its history (mirrors the mock).
        builder.HasOne<Workflow>()
            .WithMany()
            .HasForeignKey(e => e.WorkflowId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
