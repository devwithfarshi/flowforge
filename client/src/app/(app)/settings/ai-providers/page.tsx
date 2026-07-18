"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Field, Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncData } from "@/hooks/use-data";
import { ApiError, api } from "@/lib/api";
import { KEYS } from "@/lib/db/storage";
import type { AiProvider } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { useConfirm } from "@/providers/confirm-provider";
import { useToast } from "@/providers/toast-provider";

const PROVIDERS: {
  key: AiProvider;
  name: string;
  description: string;
  placeholder: string;
  keysUrl: string;
}[] = [
  {
    key: "anthropic",
    name: "Anthropic",
    description: "Claude models — Opus, Sonnet, Haiku.",
    placeholder: "sk-ant-…",
    keysUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    key: "openai",
    name: "OpenAI",
    description: "GPT models.",
    placeholder: "sk-…",
    keysUrl: "https://platform.openai.com/api-keys",
  },
  {
    key: "gemini",
    name: "Google Gemini",
    description: "Gemini models.",
    placeholder: "AIza…",
    keysUrl: "https://aistudio.google.com/apikey",
  },
];

export default function AiProvidersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading } = useAsyncData(
    () => api.aiProviders.list(),
    [],
    [KEYS.aiProviders],
  );
  const [editing, setEditing] = useState<AiProvider | null>(null);
  const [keyValue, setKeyValue] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const byProvider = new Map((data ?? []).map((p) => [p.provider, p]));
  const editingMeta = PROVIDERS.find((p) => p.key === editing);

  const openEdit = (provider: AiProvider) => {
    setKeyValue("");
    setEditing(provider);
  };

  const save = async () => {
    if (!editing || !keyValue.trim()) return;
    setSubmitting(true);
    try {
      await api.aiProviders.setKey(editing, keyValue.trim());
      toast.success("API key saved");
      setEditing(null);
    } catch (err) {
      toast.error(
        "Couldn't save key",
        err instanceof ApiError ? err.message : "Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (provider: AiProvider, name: string) => {
    const ok = await confirm({
      title: `Remove ${name} key?`,
      description:
        "Workflows using this provider will stop running until you add a key again.",
      confirmText: "Remove",
      tone: "danger",
      icon: "trash",
    });
    if (!ok) return;
    await api.aiProviders.remove(provider);
    toast.success(`${name} key removed`);
  };

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>AI providers</CardTitle>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            Bring your own API key. Keys are encrypted at rest and used only to
            run your workflows' AI nodes.
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-2">
        {loading && !data ? (
          <Skeleton className="h-40" />
        ) : (
          PROVIDERS.map((p) => {
            const info = byProvider.get(p.key);
            const configured = info?.configured ?? false;
            return (
              <div
                key={p.key}
                className="flex items-center justify-between gap-4 rounded-lg border border-border p-3.5"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-medium text-foreground">
                      {p.name}
                    </span>
                    {configured ? (
                      <Badge tone="success">Connected</Badge>
                    ) : (
                      <Badge>Not connected</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-[13px] text-muted-foreground">
                    {configured
                      ? `Key ending ••${info?.last4} · updated ${info?.updatedAt ? timeAgo(info.updatedAt) : "just now"}`
                      : p.description}
                  </p>
                  <a
                    href={p.keysUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[12px] font-medium text-primary hover:underline"
                  >
                    Get an API key <Icon name="external-link" size={12} />
                  </a>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {configured && (
                    <Button
                      variant="ghost"
                      size="sm"
                      leftIcon="trash"
                      onClick={() => remove(p.key, p.name)}
                    >
                      Remove
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={configured ? "outline" : undefined}
                    onClick={() => openEdit(p.key)}
                  >
                    {configured ? "Update key" : "Add key"}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </CardContent>

      <Modal
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={`${editingMeta?.name ?? ""} API key`}
        description="Paste your API key. It's stored encrypted and never shown in full again."
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditing(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              loading={submitting}
              disabled={!keyValue.trim()}
              onClick={save}
            >
              Save key
            </Button>
          </>
        }
      >
        <Field label="API key" required>
          <Input
            type="password"
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value)}
            placeholder={editingMeta?.placeholder}
            autoFocus
          />
        </Field>
      </Modal>
    </Card>
  );
}
