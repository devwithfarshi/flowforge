using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class VariableConfiguration : IEntityTypeConfiguration<Variable>
{
    public void Configure(EntityTypeBuilder<Variable> builder)
    {
        builder.Ignore(v => v.DomainEvents);
        builder.Ignore(v => v.IsSecret); // derived from scope

        builder.Property(v => v.Key).HasMaxLength(120);
        builder.Property(v => v.Value).HasMaxLength(10_000);
        builder.Property(v => v.Description).HasMaxLength(500);

        builder.Property(v => v.Scope)
            .HasConversion(
                scope => scope.ToString().ToLowerInvariant(),
                value => Enum.Parse<VariableScope>(value, true))
            .HasMaxLength(20);
        builder.Property(v => v.Environment).HasMaxLength(20);
        builder.ToTable(t =>
        {
            t.HasCheckConstraint("ck_variables_scope", "scope IN ('global','environment','secret')");
            t.HasCheckConstraint(
                "ck_variables_environment",
                "environment IS NULL OR environment IN ('production','staging','development')");
        });

        // §3.4: no duplicate keys per scope. NULLS NOT DISTINCT so two global
        // variables with the same key (environment NULL) still collide.
        builder.HasIndex(v => new { v.OwnerId, v.Key, v.Scope, v.Environment })
            .IsUnique()
            .AreNullsDistinct(false);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(v => v.OwnerId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
