"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { useClickOutside, useEscapeKey } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { Portal } from "./portal";

export interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
}

export function Select({
  value,
  onChange,
  options,
  placeholder = "Select…",
  size = "md",
  className,
  disabled,
  ...aria
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  const place = () =>
    btnRef.current && setRect(btnRef.current.getBoundingClientRect());
  useLayoutEffect(() => {
    if (open) place();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const h = () => place();
    window.addEventListener("scroll", h, true);
    window.addEventListener("resize", h);
    return () => {
      window.removeEventListener("scroll", h, true);
      window.removeEventListener("resize", h);
    };
  }, [open]);

  useClickOutside([btnRef, listRef], () => setOpen(false), open);
  useEscapeKey(() => setOpen(false), open);

  const flip = rect
    ? rect.bottom + 260 > window.innerHeight && rect.top > 260
    : false;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "inline-flex w-full items-center justify-between gap-2 rounded-md border border-input bg-card text-sm text-foreground transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
          size === "sm" ? "h-8 px-2.5 text-[13px]" : "h-9 px-3",
          className,
        )}
        {...aria}
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected?.label ?? placeholder}
        </span>
        <Icon
          name="chevrons-up-down"
          size={14}
          className="shrink-0 text-muted-foreground"
        />
      </button>
      {open && rect && (
        <Portal>
          <div
            ref={listRef}
            style={{
              position: "fixed",
              top: flip ? rect.top - 4 : rect.bottom + 4,
              left: rect.left,
              width: rect.width,
              transform: flip ? "translateY(-100%)" : undefined,
            }}
            className="scrollbar-thin animate-fade-in z-[60] max-h-60 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg shadow-black/10"
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors hover:bg-accent",
                  o.value === value
                    ? "font-medium text-foreground"
                    : "text-foreground/90",
                )}
              >
                <span className="truncate">{o.label}</span>
                {o.value === value && (
                  <Icon name="check" size={14} className="text-primary" />
                )}
              </button>
            ))}
          </div>
        </Portal>
      )}
    </>
  );
}
