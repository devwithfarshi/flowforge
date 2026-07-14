using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;
using AiWorkflow.Domain.Enums;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Variables;

/// <summary>Serializes to the frontend's `Variable` shape; secret values are decrypted for the owner.</summary>
public sealed record VariableDto(
    Guid Id,
    string Key,
    string Value,
    string Scope,
    string? Environment,
    string? Description,
    DateTimeOffset UpdatedAt);

internal static class VariableMapper
{
    private static readonly string[] Environments = ["production", "staging", "development"];

    public static bool IsValidScope(string value) => Enum.TryParse<VariableScope>(value, true, out _);

    public static VariableScope ParseScope(string value) => Enum.Parse<VariableScope>(value, true);

    public static bool IsValidEnvironment(string value) => Environments.Contains(value);

    public static VariableDto ToDto(Variable v, ICredentialEncryptor encryptor) => new(
        v.Id,
        v.Key,
        v.IsSecret ? encryptor.Decrypt(v.Value) : v.Value,
        v.Scope.ToString().ToLowerInvariant(),
        v.Environment,
        v.Description,
        v.UpdatedAt ?? v.CreatedAt);

    /// <summary>Uniqueness check for (owner, key, scope, environment) → 409 (§3.4).</summary>
    public static async Task EnsureUnique(
        IApplicationDbContext db, Guid ownerId, string key, VariableScope scope, string? environment,
        Guid? exceptId, CancellationToken ct)
    {
        var duplicate = await db.Variables.AsNoTracking().AnyAsync(
            v => v.OwnerId == ownerId && v.Key == key && v.Scope == scope
                && v.Environment == environment && v.Id != exceptId,
            ct);

        if (duplicate)
        {
            throw new ConflictException($"A {scope.ToString().ToLowerInvariant()} variable named '{key}' already exists");
        }
    }
}

/// <summary>`GET /variables?search=&scope=` (§6.2): owner-scoped, updatedAt desc.</summary>
public sealed record ListVariablesQuery(string? Search, string? Scope) : IRequest<IReadOnlyList<VariableDto>>;

public sealed class ListVariablesValidator : AbstractValidator<ListVariablesQuery>
{
    public ListVariablesValidator()
    {
        RuleFor(x => x.Scope)
            .Must(v => v == "all" || VariableMapper.IsValidScope(v!))
            .When(x => !string.IsNullOrEmpty(x.Scope))
            .WithMessage("Unknown scope filter");
    }
}

public sealed class ListVariablesHandler(IApplicationDbContext db, ICurrentUser currentUser, ICredentialEncryptor encryptor)
    : IRequestHandler<ListVariablesQuery, IReadOnlyList<VariableDto>>
{
    public async ValueTask<IReadOnlyList<VariableDto>> Handle(ListVariablesQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var variables = db.Variables.AsNoTracking().Where(v => v.OwnerId == userId);

        if (!string.IsNullOrEmpty(query.Scope) && query.Scope != "all")
        {
            var scope = VariableMapper.ParseScope(query.Scope);
            variables = variables.Where(v => v.Scope == scope);
        }

        if (!string.IsNullOrEmpty(query.Search))
        {
            var q = query.Search.ToLowerInvariant();
            variables = variables.Where(v => v.Key.ToLower().Contains(q));
        }

        var items = await variables
            .OrderByDescending(v => v.UpdatedAt ?? v.CreatedAt)
            .ToListAsync(ct);

        return items.Select(v => VariableMapper.ToDto(v, encryptor)).ToList();
    }
}

/// <summary>`POST /variables` (§6.2).</summary>
public sealed record CreateVariableCommand(
    string Key, string Value, string Scope, string? Environment, string? Description) : IRequest<VariableDto>;

public sealed class CreateVariableValidator : AbstractValidator<CreateVariableCommand>
{
    public CreateVariableValidator()
    {
        RuleFor(x => x.Key).NotEmpty().MaximumLength(120);
        RuleFor(x => x.Value).NotNull().MaximumLength(10_000);
        RuleFor(x => x.Scope).NotEmpty().Must(VariableMapper.IsValidScope).WithMessage("Unknown variable scope");
        RuleFor(x => x.Environment)
            .NotEmpty()
            .Must(v => VariableMapper.IsValidEnvironment(v!))
            .When(x => x.Scope == "environment")
            .WithMessage("Environment must be production, staging, or development");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class CreateVariableHandler(
    IApplicationDbContext db, ICurrentUser currentUser, ICredentialEncryptor encryptor, IDateTime clock)
    : IRequestHandler<CreateVariableCommand, VariableDto>
{
    public async ValueTask<VariableDto> Handle(CreateVariableCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();
        var scope = VariableMapper.ParseScope(command.Scope);
        var environment = scope == VariableScope.Environment ? command.Environment : null;

        await VariableMapper.EnsureUnique(db, userId, command.Key, scope, environment, exceptId: null, ct);

        var storedValue = scope == VariableScope.Secret ? encryptor.Encrypt(command.Value) : command.Value;
        var variable = Variable.Create(userId, command.Key, storedValue, scope, environment, command.Description);

        db.Variables.Add(variable);
        await Activity.Audit.Log(
            db, userId, "created variable", command.Key, "variable", clock.UtcNow, ct);
        await db.SaveChangesAsync(ct);

        return VariableMapper.ToDto(variable, encryptor);
    }
}

/// <summary>`PUT /variables/{id}` (§6.2): partial — null means "leave unchanged".</summary>
public sealed record UpdateVariableCommand(
    Guid Id, string? Key, string? Value, string? Scope, string? Environment, string? Description) : IRequest<VariableDto>;

public sealed class UpdateVariableValidator : AbstractValidator<UpdateVariableCommand>
{
    public UpdateVariableValidator()
    {
        RuleFor(x => x.Key).NotEmpty().MaximumLength(120).When(x => x.Key is not null);
        RuleFor(x => x.Value).MaximumLength(10_000);
        RuleFor(x => x.Scope)
            .Must(v => VariableMapper.IsValidScope(v!))
            .When(x => x.Scope is not null)
            .WithMessage("Unknown variable scope");
        RuleFor(x => x.Environment)
            .Must(v => VariableMapper.IsValidEnvironment(v!))
            .When(x => x.Environment is not null)
            .WithMessage("Environment must be production, staging, or development");
        RuleFor(x => x.Description).MaximumLength(500);
    }
}

public sealed class UpdateVariableHandler(IApplicationDbContext db, ICurrentUser currentUser, ICredentialEncryptor encryptor)
    : IRequestHandler<UpdateVariableCommand, VariableDto>
{
    public async ValueTask<VariableDto> Handle(UpdateVariableCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var variable = await db.Variables.FirstOrDefaultAsync(
            v => v.Id == command.Id && v.OwnerId == userId, ct)
            ?? throw new NotFoundException("Variable", command.Id);

        // Merge onto current plaintext state, then re-encode for the final scope.
        var plaintext = command.Value
            ?? (variable.IsSecret ? encryptor.Decrypt(variable.Value) : variable.Value);
        var scope = command.Scope is not null ? VariableMapper.ParseScope(command.Scope) : variable.Scope;
        var key = command.Key ?? variable.Key;
        var environment = scope == VariableScope.Environment
            ? command.Environment ?? variable.Environment
            : null;

        await VariableMapper.EnsureUnique(db, userId, key, scope, environment, variable.Id, ct);

        var storedValue = scope == VariableScope.Secret ? encryptor.Encrypt(plaintext) : plaintext;
        variable.Update(key, storedValue, scope, environment, command.Description ?? variable.Description);

        await db.SaveChangesAsync(ct);

        return VariableMapper.ToDto(variable, encryptor);
    }
}

/// <summary>`DELETE /variables/{id}` (§6.2).</summary>
public sealed record DeleteVariableCommand(Guid Id) : IRequest;

public sealed class DeleteVariableHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<DeleteVariableCommand>
{
    public async ValueTask<Unit> Handle(DeleteVariableCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var variable = await db.Variables.FirstOrDefaultAsync(
            v => v.Id == command.Id && v.OwnerId == userId, ct)
            ?? throw new NotFoundException("Variable", command.Id);

        db.Variables.Remove(variable);
        await db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
