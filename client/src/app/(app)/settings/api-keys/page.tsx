"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/switch";
import { useAsyncData } from "@/hooks/use-data";
import { api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import { formatDate, timeAgo } from "@/lib/utils";
import { useConfirm } from "@/providers/confirm-provider";
import { useToast } from "@/providers/toast-provider";

const SCOPES = [
  "workflows:read",
  "workflows:write",
  "executions:read",
  "executions:write",
];

export default function ApiKeysPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: keys, loading } = useAsyncData(
    () => api.apiKeys.list(),
    [],
    [KEYS.apiKeys],
  );
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["workflows:read"]);
  const [submitting, setSubmitting] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);

  const toggleScope = (s: string) =>
    setScopes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );

  const create = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const { secret } = await api.apiKeys.create(name.trim(), scopes);
      setSecret(secret);
      setCreating(false);
      setName("");
      setScopes(["workflows:read"]);
      toast.success("API key created");
    } finally {
      setSubmitting(false);
    }
  };

  const revoke = async (id: string, keyName: string) => {
    const ok = await confirm({
      title: `Revoke "${keyName}"?`,
      description:
        "Any integrations using this key will stop working immediately.",
      confirmText: "Revoke key",
      tone: "danger",
      icon: "key",
    });
    if (!ok) return;
    await api.apiKeys.revoke(id);
    toast.success("API key revoked");
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>API keys</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Programmatic access to the Flowforge API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api-docs" target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline" leftIcon="file-text">
              API reference
            </Button>
          </a>
          <Button size="sm" leftIcon="plus" onClick={() => setCreating(true)}>
            Create key
          </Button>
        </div>
      </CardHeader>

      {loading && !keys ? (
        <CardContent>
          <Skeleton className="h-32" />
        </CardContent>
      ) : keys && keys.length > 0 ? (
        <div className="divide-y divide-border">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-4 px-5 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <Icon name="key" size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-[13.5px] font-medium text-foreground">
                    {k.name}
                  </p>
                  {k.prefix.includes("test") && (
                    <Badge tone="warning">Test</Badge>
                  )}
                </div>
                <p className="font-mono text-[12px] text-muted-foreground">
                  {k.token}
                </p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {k.scopes.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-muted px-1.5 py-0.5 text-[10.5px] font-medium text-muted-foreground"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden text-right sm:block">
                <p className="text-[12px] text-muted-foreground">
                  Created {formatDate(k.createdAt)}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {k.lastUsedAt
                    ? `Used ${timeAgo(k.lastUsedAt)}`
                    : "Never used"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => revoke(k.id, k.name)}
              >
                Revoke
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="key"
          title="No API keys"
          description="Create a key to access the API."
          action={
            <Button size="sm" leftIcon="plus" onClick={() => setCreating(true)}>
              Create key
            </Button>
          }
        />
      )}

      {/* Create modal */}
      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="Create API key"
        description="Give your key a name and select its scopes."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreating(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={submitting}
              disabled={!name.trim() || scopes.length === 0}
              onClick={create}
            >
              Create key
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="Key name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Production API"
              autoFocus
            />
          </Field>
          <Field label="Scopes">
            <div className="space-y-2">
              {SCOPES.map((s) => (
                <label
                  key={s}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-3 py-2"
                >
                  <Checkbox
                    checked={scopes.includes(s)}
                    onChange={() => toggleScope(s)}
                    aria-label={s}
                  />
                  <span className="font-mono text-[13px] text-foreground">
                    {s}
                  </span>
                </label>
              ))}
            </div>
          </Field>
        </div>
      </Modal>

      {/* Reveal-once modal */}
      <Modal
        open={!!secret}
        onClose={() => setSecret(null)}
        title="Save your API key"
        description="This is the only time you'll see the full key. Copy it now."
        footer={
          <Button size="sm" onClick={() => setSecret(null)}>
            Done
          </Button>
        }
      >
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 p-3">
          <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-foreground">
            {secret}
          </code>
          <Button
            variant="outline"
            size="sm"
            leftIcon="copy"
            onClick={() => {
              navigator.clipboard?.writeText(secret ?? "");
              toast.success("Copied");
            }}
          >
            Copy
          </Button>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-[12px] text-warning">
          <Icon name="alert-triangle" size={13} /> Store this somewhere safe.
          You won&apos;t be able to see it again.
        </p>
      </Modal>
    </Card>
  );
}
