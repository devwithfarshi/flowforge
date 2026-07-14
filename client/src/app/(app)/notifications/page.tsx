"use client";

import { useState } from "react";
import { NOTIF_META } from "@/components/layout/notifications-menu";
import { PageContainer, PageHeader } from "@/components/layout/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import { cn, timeAgo } from "@/lib/utils";
import { useToast } from "@/providers/toast-provider";

export default function NotificationsPage() {
  const toast = useToast();
  const [tab, setTab] = useState<"all" | "unread" | "archived">("all");
  const { data: notifications, loading } = useAsyncData(
    () => api.notifications.list(tab),
    [tab],
    [KEYS.notifications],
  );
  const { data: allNotifs } = useAsyncData(
    () => api.notifications.list("all"),
    [],
    [KEYS.notifications],
  );
  const unreadCount = allNotifs?.filter((n) => !n.read).length ?? 0;

  return (
    <PageContainer>
      <PageHeader
        title="Notifications"
        description="Stay on top of workflow runs, integrations, and system alerts."
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              leftIcon="check"
              onClick={() => {
                api.notifications.markAllRead();
                toast.success("All marked as read");
              }}
            >
              Mark all read
            </Button>
          ) : undefined
        }
      />

      <div className="mb-4">
        <Tabs
          value={tab}
          onChange={(v) => setTab(v as typeof tab)}
          tabs={[
            { value: "all", label: "All" },
            { value: "unread", label: "Unread", count: unreadCount },
            { value: "archived", label: "Archived" },
          ]}
        />
      </div>

      {loading && !notifications ? (
        <Skeleton className="h-80 rounded-xl" />
      ) : notifications && notifications.length > 0 ? (
        <Card className="overflow-hidden">
          <div className="divide-y divide-border">
            {notifications.map((n) => {
              const meta = NOTIF_META[n.type];
              return (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3.5 px-4 py-3.5 transition-colors hover:bg-accent/40",
                    !n.read && "bg-primary/[0.03]",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                      meta.className,
                    )}
                  >
                    <Icon name={meta.icon} size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p
                        className={cn(
                          "text-[14px]",
                          n.read
                            ? "font-medium text-foreground"
                            : "font-semibold text-foreground",
                        )}
                      >
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {n.message}
                    </p>
                    <p className="mt-1 text-[11.5px] text-muted-foreground/80">
                      {timeAgo(n.ts)}
                    </p>
                  </div>
                  <Dropdown
                    align="end"
                    trigger={
                      <button
                        type="button"
                        className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        aria-label="Actions"
                      >
                        <Icon name="more-horizontal" size={16} />
                      </button>
                    }
                  >
                    <DropdownItem
                      icon={n.read ? "circle-dot" : "check"}
                      onSelect={() => api.notifications.markRead(n.id, !n.read)}
                    >
                      {n.read ? "Mark as unread" : "Mark as read"}
                    </DropdownItem>
                    <DropdownItem
                      icon={n.archived ? "archive-restore" : "archive"}
                      onSelect={() =>
                        api.notifications.setArchived(n.id, !n.archived)
                      }
                    >
                      {n.archived ? "Unarchive" : "Archive"}
                    </DropdownItem>
                    <DropdownItem
                      icon="trash"
                      destructive
                      onSelect={() => {
                        api.notifications.remove(n.id);
                        toast.success("Notification deleted");
                      }}
                    >
                      Delete
                    </DropdownItem>
                  </Dropdown>
                </div>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <EmptyState
            icon={tab === "archived" ? "archive" : "bell"}
            title={
              tab === "unread"
                ? "No unread notifications"
                : tab === "archived"
                  ? "Nothing archived"
                  : "You're all caught up"
            }
            description={
              tab === "all" ? "New notifications will show up here." : undefined
            }
          />
        </Card>
      )}
    </PageContainer>
  );
}
