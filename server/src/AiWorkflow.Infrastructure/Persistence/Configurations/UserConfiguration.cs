using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.Ignore(u => u.DomainEvents);

        builder.Property(u => u.Name).HasMaxLength(120);

        // citext → case-insensitive uniqueness (§3.3); extension enabled in OnModelCreating.
        builder.Property(u => u.Email).HasColumnType("citext").HasMaxLength(320);
        builder.HasIndex(u => u.Email).IsUnique();

        builder.Property(u => u.PasswordHash).HasMaxLength(500);

        // Enum as text with a CHECK constraint (§3.3).
        builder.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
        builder.ToTable(t => t.HasCheckConstraint(
            "ck_users_role",
            "role IN ('Owner','Admin','Editor','Viewer')"));

        builder.Property(u => u.AvatarColor).HasMaxLength(40);
        builder.Property(u => u.JobTitle).HasMaxLength(120);
        builder.Property(u => u.Company).HasMaxLength(120);
        builder.Property(u => u.Bio).HasMaxLength(2000);
    }
}
