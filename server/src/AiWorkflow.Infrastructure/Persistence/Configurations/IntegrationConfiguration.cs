using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class IntegrationConfiguration : IEntityTypeConfiguration<Integration>
{
    public void Configure(EntityTypeBuilder<Integration> builder)
    {
        builder.Ignore(i => i.DomainEvents);

        builder.Property(i => i.Name).HasMaxLength(120);
        builder.Property(i => i.Category).HasMaxLength(50);
        builder.Property(i => i.Description).HasMaxLength(500);
        builder.Property(i => i.Color).HasMaxLength(40);
        builder.Property(i => i.Icon).HasMaxLength(50);

        builder.HasIndex(i => i.Name).IsUnique();
    }
}

public sealed class IntegrationAccountConfiguration : IEntityTypeConfiguration<IntegrationAccount>
{
    public void Configure(EntityTypeBuilder<IntegrationAccount> builder)
    {
        builder.Ignore(a => a.DomainEvents);

        builder.Property(a => a.Label).HasMaxLength(120);
        builder.Property(a => a.EncryptedCredentials).HasColumnName("credentials");

        builder.HasIndex(a => new { a.UserId, a.IntegrationId });

        builder.HasOne<User>().WithMany().HasForeignKey(a => a.UserId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Integration>().WithMany().HasForeignKey(a => a.IntegrationId).OnDelete(DeleteBehavior.Cascade);
    }
}
