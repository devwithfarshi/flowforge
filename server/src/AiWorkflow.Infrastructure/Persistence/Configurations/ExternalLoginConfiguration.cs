using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class ExternalLoginConfiguration : IEntityTypeConfiguration<ExternalLogin>
{
    public void Configure(EntityTypeBuilder<ExternalLogin> builder)
    {
        builder.Ignore(l => l.DomainEvents);

        builder.Property(l => l.Provider).HasMaxLength(30);
        builder.Property(l => l.ProviderSubject).HasMaxLength(255);
        builder.Property(l => l.Email).HasMaxLength(320);

        // §4.5: one provider identity maps to exactly one user.
        builder.HasIndex(l => new { l.Provider, l.ProviderSubject }).IsUnique();
        builder.HasIndex(l => l.UserId);

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(l => l.UserId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}
