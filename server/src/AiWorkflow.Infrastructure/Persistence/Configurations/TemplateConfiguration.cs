using AiWorkflow.Domain.Entities;

using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace AiWorkflow.Infrastructure.Persistence.Configurations;

public sealed class TemplateConfiguration : IEntityTypeConfiguration<Template>
{
    public void Configure(EntityTypeBuilder<Template> builder)
    {
        builder.Ignore(t => t.DomainEvents);

        builder.Property(t => t.Name).HasMaxLength(200);
        builder.Property(t => t.Description).HasMaxLength(2000);
        builder.Property(t => t.Category).HasMaxLength(50);
        builder.Property(t => t.Difficulty).HasMaxLength(20);
        builder.Property(t => t.Author).HasMaxLength(120);
        builder.Property(t => t.Color).HasMaxLength(40);
        builder.Property(t => t.Icon).HasMaxLength(50);

        // Money/rating → numeric, never float (§3.3).
        builder.Property(t => t.Rating).HasColumnType("numeric(2,1)");

        builder.Property(t => t.Tags).HasColumnType("text[]");

        builder.ToTable(t => t.HasCheckConstraint(
            "ck_templates_difficulty",
            "difficulty IN ('Beginner','Intermediate','Advanced')"));

        builder.HasIndex(t => t.Category);
    }
}
