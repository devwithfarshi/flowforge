using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class AiProviderCredentialConfiguration : IEntityTypeConfiguration<AiProviderCredential>
{
    public void Configure(EntityTypeBuilder<AiProviderCredential> builder)
    {
        builder.Ignore(c => c.DomainEvents);

        builder.Property(c => c.Provider).HasMaxLength(30);
        builder.Property(c => c.EncryptedApiKey).HasColumnName("encrypted_api_key");
        builder.Property(c => c.Last4).HasMaxLength(8);

        // One credential per (user, provider).
        builder.HasIndex(c => new { c.UserId, c.Provider }).IsUnique();

        builder.HasOne<User>().WithMany().HasForeignKey(c => c.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}
