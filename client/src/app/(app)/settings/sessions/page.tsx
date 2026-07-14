"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import { timeAgo } from "@/lib/utils";
import { useConfirm } from "@/providers/confirm-provider";
import { useToast } from "@/providers/toast-provider";

function deviceIcon(device: string): IconName {
  if (/iphone|android|pixel|phone/i.test(device)) return "smartphone";
  return "monitor";
}

export default function SessionsSettingsPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: sessions, loading } = useAsyncData(
    () => api.sessions.list(),
    [],
    [KEYS.loginSessions],
  );

  const revoke = async (id: string) => {
    await api.sessions.revoke(id);
    toast.success("Session revoked");
  };

  const revokeOthers = async () => {
    const ok = await confirm({
      title: "Sign out other sessions?",
      description: "This signs you out everywhere except this device.",
      confirmText: "Sign out others",
      icon: "log-out",
    });
    if (!ok) return;
    await api.sessions.revokeOthers();
    toast.success("Other sessions signed out");
  };

  const hasOthers = (sessions ?? []).some((s) => !s.current);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Active sessions</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Devices currently signed in to your account.
          </p>
        </div>
        {hasOthers && (
          <Button
            variant="outline"
            size="sm"
            leftIcon="log-out"
            onClick={revokeOthers}
          >
            Sign out others
          </Button>
        )}
      </CardHeader>

      {loading && !sessions ? (
        <CardContent>
          <Skeleton className="h-40" />
        </CardContent>
      ) : (
        <div className="divide-y divide-border">
          {sessions?.map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon name={deviceIcon(s.device)} size={19} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-medium text-foreground">
                    {s.device}
                  </p>
                  {s.current && (
                    <Badge tone="success" dot>
                      This device
                    </Badge>
                  )}
                </div>
                <p className="text-[12.5px] text-muted-foreground">
                  {s.browser} · {s.os}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {s.location} · {s.ip}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[12px] text-muted-foreground">
                  {s.current ? "Active now" : `Active ${timeAgo(s.lastActive)}`}
                </p>
                {!s.current && (
                  <button
                    type="button"
                    onClick={() => revoke(s.id)}
                    className="mt-1 text-[12.5px] font-medium text-destructive hover:underline"
                  >
                    Revoke
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
