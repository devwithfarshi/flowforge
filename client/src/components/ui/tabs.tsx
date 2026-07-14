"use client";

import { Icon, type IconName } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export interface TabItem {
  value: string;
  label: string;
  icon?: IconName;
  count?: number;
}

interface TabsProps {
  tabs: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
  variant?: "underline" | "pill";
}

export function Tabs({
  tabs,
  value,
  onChange,
  className,
  variant = "underline",
}: TabsProps) {
  if (variant === "pill") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-lg border border-border bg-muted p-1",
          className,
        )}
      >
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
              value === t.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon && <Icon name={t.icon} size={14} />}
            {t.label}
            {t.count != null && (
              <span className="text-muted-foreground">{t.count}</span>
            )}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center gap-1 border-b border-border",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          className={cn(
            "relative inline-flex items-center gap-1.5 px-3 pb-2.5 pt-1 text-[13px] font-medium transition-colors",
            value === t.value
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {t.icon && <Icon name={t.icon} size={15} />}
          {t.label}
          {t.count != null && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[11px] font-semibold",
                value === t.value
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {t.count}
            </span>
          )}
          {value === t.value && (
            <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary" />
          )}
        </button>
      ))}
    </div>
  );
}
