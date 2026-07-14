"use client";

import Link from "next/link";
import { Dropdown } from "@/components/ui/dropdown";
import { Icon, type IconName } from "@/components/ui/icon";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import type { NotificationType } from "@/lib/types";
import { cn, timeAgo } from "@/lib/utils";

export const NOTIF_META: Record<
  NotificationType,
  { icon: IconName; className: string }
> = {
  workflow_completed: {
    icon: "check-circle",
    className: "bg-success/10 text-success",
  },
  workflow_failed: {
    icon: "x-circle",
    className: "bg-destructive/10 text-destructive",
  },
  integration: { icon: "plug", className: "bg-primary/10 text-primary" },
  system: { icon: "settings", className: "bg-muted text-muted-foreground" },
  info: { icon: "info", className: "bg-info/10 text-info" },
};

export function NotificationsMenu() {
  const { data: notifications } = useAsyncData(
    () => api.notifications.list("all"),
    [],
    [KEYS.notifications],
  );
  const unread = notifications?.filter((n) => !n.read).length ?? 0;
  const recent = notifications?.slice(0, 6) ?? [];

  return (
    <Dropdown
      align="end"
      width={380}
      trigger={
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
        >
          <Icon name="bell" size={19} />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      }
    >
      <div className="flex items-center justify-between px-2.5 py-1.5">
        <p className="text-[13px] font-semibold text-foreground">
          Notifications
        </p>
        {unread > 0 && (
          <button
            type="button"
            onClick={() => api.notifications.markAllRead()}
            className="text-[12px] font-medium text-primary hover:underline"
          >
            Mark all read
          </button>
        )}
      </div>
      <div className="my-1 h-px bg-border" />
      <div className="scrollbar-thin max-h-80 overflow-y-auto">
        {recent.length === 0 ? (
          <p className="px-2.5 py-8 text-center text-[13px] text-muted-foreground">
            You&apos;re all caught up
          </p>
        ) : (
          recent.map((n) => {
            const meta = NOTIF_META[n.type];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => api.notifications.markRead(n.id)}
                className="flex w-full gap-3 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-accent"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                    meta.className,
                  )}
                >
                  <Icon name={meta.icon} size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate text-[13px]",
                      n.read
                        ? "font-medium text-foreground"
                        : "font-semibold text-foreground",
                    )}
                  >
                    {n.title}
                  </p>
                  <p className="truncate text-[12px] text-muted-foreground">
                    {n.message}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/80">
                    {timeAgo(n.ts)}
                  </p>
                </div>
                {!n.read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </button>
            );
          })
        )}
      </div>
      <div className="my-1 h-px bg-border" />
      <Link
        href="/notifications"
        className="block rounded-md px-2.5 py-1.5 text-center text-[13px] font-medium text-primary transition-colors hover:bg-accent"
      >
        View all notifications
      </Link>
    </Dropdown>
  );
}
