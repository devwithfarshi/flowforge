using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class ApiKeyConfiguration : IEntityTypeConfiguration<ApiKey>
{
    public void Configure(EntityTypeBuilder<ApiKey> builder)
    {
        builder.Ignore(k => k.DomainEvents);
        builder.Ignore(k => k.IsActive);

        builder.Property(k => k.Name).HasMaxLength(120);
        builder.Property(k => k.Prefix).HasMaxLength(20);
        builder.Property(k => k.MaskedToken).HasMaxLength(60);
        builder.Property(k => k.KeyHash).HasMaxLength(128);
        builder.Property(k => k.Scopes).HasColumnType("text[]");

        // O(1) auth lookup (§3.4).
        builder.HasIndex(k => k.KeyHash).IsUnique();
        builder.HasIndex(k => new { k.UserId, k.RevokedAt });

        builder.HasOne<User>().WithMany().HasForeignKey(k => k.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
