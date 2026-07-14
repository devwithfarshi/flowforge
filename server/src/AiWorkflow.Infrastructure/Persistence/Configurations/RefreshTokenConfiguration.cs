using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class RefreshTokenConfiguration : IEntityTypeConfiguration<RefreshToken>
{
    public void Configure(EntityTypeBuilder<RefreshToken> builder)
    {
        builder.Ignore(t => t.DomainEvents);

        builder.Property(t => t.TokenHash).HasMaxLength(128);

        // §3.4: unique(token_hash) for O(1) rotation lookup; (user_id, revoked_at)
        // backs the /sessions listing of active devices.
        builder.HasIndex(t => t.TokenHash).IsUnique();
        builder.HasIndex(t => new { t.UserId, t.RevokedAt });

        builder.Property(t => t.Device).HasMaxLength(120);
        builder.Property(t => t.Browser).HasMaxLength(120);
        builder.Property(t => t.Os).HasMaxLength(120);
        builder.Property(t => t.Ip).HasMaxLength(64);
        builder.Property(t => t.Location).HasMaxLength(200);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(t => t.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
