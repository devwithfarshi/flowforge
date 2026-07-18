"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { useAuth } from "@/providers/auth-provider";
import { useConfirm } from "@/providers/confirm-provider";

export default function AccountSettingsPage() {
  const { user, logout } = useAuth();
  const confirm = useConfirm();

  const deleteAccount = async () => {
    const ok = await confirm({
      title: "Delete your account?",
      description:
        "This signs you out and clears your local session. (Demo only — your seed data remains.)",
      confirmText: "Delete account",
      tone: "danger",
      icon: "trash",
    });
    if (!ok) return;
    await logout();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Account information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3.5 text-[13.5px]">
          {[
            { label: "Email", value: user?.email },
            {
              label: "Role",
              value: <Badge tone="primary">{user?.role}</Badge>,
            },
            { label: "Company", value: user?.company ?? "—" },
            {
              label: "Member since",
              value: user
                ? new Date(user.createdAt).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })
                : "—",
            },
            {
              label: "Email verified",
              value: user?.emailVerified ? (
                <span className="flex items-center gap-1 text-success">
                  <Icon name="check-circle" size={14} /> Verified
                </span>
              ) : (
                <span className="text-warning">Not verified</span>
              ),
            },
          ].map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0"
            >
              <span className="text-muted-foreground">{r.label}</span>
              <span className="font-medium text-foreground">{r.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="rocket" size={20} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-foreground">
                  Enterprise
                </p>
                <p className="text-[13px] text-muted-foreground">
                  Unlimited workflows · Priority support
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Manage plan
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="border-destructive/20">
          <CardTitle className="text-destructive">Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[13.5px] font-medium text-foreground">
                Delete account
              </p>
              <p className="text-[13px] text-muted-foreground">
                Sign out and clear your local session.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              leftIcon="trash"
              onClick={deleteAccount}
            >
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
