using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class UserPreferencesConfiguration : IEntityTypeConfiguration<UserPreferences>
{
    public void Configure(EntityTypeBuilder<UserPreferences> builder)
    {
        builder.HasKey(p => p.UserId);

        builder.Property(p => p.Theme).HasMaxLength(20);
        builder.Property(p => p.Density).HasMaxLength(20);
        builder.Property(p => p.DefaultView).HasMaxLength(20);
        builder.Property(p => p.Language).HasMaxLength(20);

        builder.HasOne<User>()
            .WithOne()
            .HasForeignKey<UserPreferences>(p => p.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
