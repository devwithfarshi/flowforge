using AiWorkflow.Application.Common.Exceptions;
using AiWorkflow.Application.Common.Interfaces;
using AiWorkflow.Domain.Entities;

using FluentValidation;

using Mediator;

using Microsoft.EntityFrameworkCore;

namespace AiWorkflow.Application.Notifications;

/// <summary>Serializes to the frontend's `Notification` shape.</summary>
public sealed record NotificationDto(
    Guid Id,
    string Type,
    string Title,
    string Message,
    DateTimeOffset Ts,
    bool Read,
    bool Archived,
    string? Href)
{
    public static NotificationDto From(Notification n) =>
        new(n.Id, n.Type, n.Title, n.Message, n.CreatedAt, n.IsRead, n.IsArchived, n.Href);
}

/// <summary>`GET /notifications?filter=all|unread|archived` (§6.2): "all" excludes archived (mock parity).</summary>
public sealed record ListNotificationsQuery(string? Filter) : IRequest<IReadOnlyList<NotificationDto>>;

public sealed class ListNotificationsValidator : AbstractValidator<ListNotificationsQuery>
{
    public ListNotificationsValidator()
    {
        RuleFor(x => x.Filter)
            .Must(v => v is "all" or "unread" or "archived")
            .When(x => !string.IsNullOrEmpty(x.Filter))
            .WithMessage("Filter must be all, unread, or archived");
    }
}

public sealed class ListNotificationsHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<ListNotificationsQuery, IReadOnlyList<NotificationDto>>
{
    public async ValueTask<IReadOnlyList<NotificationDto>> Handle(ListNotificationsQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var notifications = db.Notifications.AsNoTracking().Where(n => n.UserId == userId);

        notifications = query.Filter switch
        {
            "unread" => notifications.Where(n => !n.IsRead && !n.IsArchived),
            "archived" => notifications.Where(n => n.IsArchived),
            _ => notifications.Where(n => !n.IsArchived),
        };

        var items = await notifications.OrderByDescending(n => n.CreatedAt).ToListAsync(ct);
        return items.Select(NotificationDto.From).ToList();
    }
}

/// <summary>`GET /notifications/unread-count` (§6.2).</summary>
public sealed record UnreadCountQuery : IRequest<int>;

public sealed class UnreadCountHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<UnreadCountQuery, int>
{
    public async ValueTask<int> Handle(UnreadCountQuery query, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        return await db.Notifications.AsNoTracking()
            .CountAsync(n => n.UserId == userId && !n.IsRead && !n.IsArchived, ct);
    }
}

/// <summary>`POST /notifications/{id}/read` (§6.2).</summary>
public sealed record MarkNotificationReadCommand(Guid Id, bool Read) : IRequest;

/// <summary>`POST /notifications/read-all` (§6.2).</summary>
public sealed record MarkAllNotificationsReadCommand : IRequest;

/// <summary>`POST /notifications/{id}/archive` (§6.2): archiving also marks read.</summary>
public sealed record SetNotificationArchivedCommand(Guid Id, bool Archived) : IRequest;

/// <summary>`DELETE /notifications/{id}` (§6.2).</summary>
public sealed record DeleteNotificationCommand(Guid Id) : IRequest;

public sealed class MarkNotificationReadHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<MarkNotificationReadCommand>
{
    public async ValueTask<Unit> Handle(MarkNotificationReadCommand command, CancellationToken ct)
    {
        var notification = await NotificationStore.GetOwned(db, currentUser, command.Id, ct);
        notification.MarkRead(command.Read);
        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public sealed class MarkAllNotificationsReadHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<MarkAllNotificationsReadCommand>
{
    public async ValueTask<Unit> Handle(MarkAllNotificationsReadCommand command, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        var unread = await db.Notifications.Where(n => n.UserId == userId && !n.IsRead).ToListAsync(ct);
        foreach (var notification in unread)
        {
            notification.MarkRead();
        }

        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public sealed class SetNotificationArchivedHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<SetNotificationArchivedCommand>
{
    public async ValueTask<Unit> Handle(SetNotificationArchivedCommand command, CancellationToken ct)
    {
        var notification = await NotificationStore.GetOwned(db, currentUser, command.Id, ct);
        notification.SetArchived(command.Archived);
        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

public sealed class DeleteNotificationHandler(IApplicationDbContext db, ICurrentUser currentUser)
    : IRequestHandler<DeleteNotificationCommand>
{
    public async ValueTask<Unit> Handle(DeleteNotificationCommand command, CancellationToken ct)
    {
        var notification = await NotificationStore.GetOwned(db, currentUser, command.Id, ct);
        db.Notifications.Remove(notification);
        await db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}

internal static class NotificationStore
{
    public static async Task<Notification> GetOwned(
        IApplicationDbContext db, ICurrentUser currentUser, Guid id, CancellationToken ct)
    {
        var userId = currentUser.Id ?? throw new UnauthorizedException();

        return await db.Notifications.FirstOrDefaultAsync(n => n.Id == id && n.UserId == userId, ct)
            ?? throw new NotFoundException("Notification", id);
    }
}
