using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AiWorkflow.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddVariablesTable : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "variables",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    key = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    value = table.Column<string>(type: "character varying(10000)", maxLength: 10000, nullable: false),
                    scope = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    environment = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_variables", x => x.id);
                    table.CheckConstraint("ck_variables_environment", "environment IS NULL OR environment IN ('production','staging','development')");
                    table.CheckConstraint("ck_variables_scope", "scope IN ('global','environment','secret')");
                    table.ForeignKey(
                        name: "fk_variables_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_variables_owner_id_key_scope_environment",
                table: "variables",
                columns: new[] { "owner_id", "key", "scope", "environment" },
                unique: true)
                .Annotation("Npgsql:NullsDistinct", false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "variables");
        }
    }
}
