import type { IconName } from "@/components/ui/icon";
import type { TriggerType } from "@/lib/types";

export const TRIGGER_ICON: Record<TriggerType, IconName> = {
  webhook: "webhook",
  cron: "clock",
  manual: "play",
  email: "mail",
  api: "code",
};

export const TRIGGER_LABEL: Record<TriggerType, string> = {
  webhook: "Webhook",
  cron: "Schedule",
  manual: "Manual",
  email: "Email",
  api: "API",
};

const TAG_COLORS = [
  "#2563eb",
  "#7c3aed",
  "#059669",
  "#d97706",
  "#db2777",
  "#0891b2",
  "#dc2626",
  "#4f46e5",
];
export function tagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++)
    hash = (hash * 31 + tag.charCodeAt(i)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}
