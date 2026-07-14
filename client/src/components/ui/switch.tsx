"use client";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md";
  "aria-label"?: string;
}

export function Switch({
  checked,
  onChange,
  disabled,
  size = "md",
  ...aria
}: SwitchProps) {
  const dims =
    size === "sm"
      ? {
          w: "w-8",
          h: "h-[18px]",
          knob: "h-3.5 w-3.5",
          x: checked ? "translate-x-[15px]" : "translate-x-0.5",
        }
      : {
          w: "w-10",
          h: "h-6",
          knob: "h-4.5 w-4.5",
          x: checked ? "translate-x-[18px]" : "translate-x-0.5",
        };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        dims.w,
        dims.h,
        checked ? "bg-primary" : "bg-border-strong",
      )}
      {...aria}
    >
      <span
        className={cn(
          "inline-block transform rounded-full bg-white shadow-sm transition-transform",
          dims.knob,
          dims.x,
        )}
      />
    </button>
  );
}

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
}

export function Checkbox({
  checked,
  onChange,
  indeterminate,
  disabled,
  className,
  ...aria
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex h-4 w-4 items-center justify-center rounded-[5px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
        checked || indeterminate
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border-strong bg-card hover:border-primary",
        className,
      )}
      {...aria}
    >
      {indeterminate ? (
        <Icon name="minus" size={12} />
      ) : checked ? (
        <Icon name="check" size={12} />
      ) : null}
    </button>
  );
}
