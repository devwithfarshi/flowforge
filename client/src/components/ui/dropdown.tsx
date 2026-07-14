"use client";

import {
  cloneElement,
  createContext,
  isValidElement,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { useClickOutside, useEscapeKey } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { Portal } from "./portal";

const DropdownCtx = createContext<{ close: () => void } | null>(null);

interface DropdownProps {
  trigger: React.ReactElement<{
    onClick?: (e: React.MouseEvent) => void;
    ref?: React.Ref<HTMLElement>;
  }>;
  children: React.ReactNode;
  align?: "start" | "end";
  width?: number;
  className?: string;
}

export function Dropdown({
  trigger,
  children,
  align = "end",
  width = 200,
  className,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; flip: boolean }>({
    top: 0,
    left: 0,
    flip: false,
  });
  const anchorRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const computePosition = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const flip = r.bottom + 280 > window.innerHeight && r.top > 280;
    const left = align === "end" ? r.right - width : r.left;
    setPos({
      top: flip ? r.top : r.bottom,
      left: Math.max(8, Math.min(left, window.innerWidth - width - 8)),
      flip,
    });
  };

  useLayoutEffect(() => {
    if (open) computePosition();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = () => computePosition();
    window.addEventListener("scroll", handler, true);
    window.addEventListener("resize", handler);
    return () => {
      window.removeEventListener("scroll", handler, true);
      window.removeEventListener("resize", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useClickOutside([anchorRef, menuRef], () => setOpen(false), open);
  useEscapeKey(() => setOpen(false), open);

  const triggerEl = isValidElement(trigger)
    ? cloneElement(trigger, {
        ref: anchorRef,
        onClick: (e: React.MouseEvent) => {
          trigger.props.onClick?.(e);
          setOpen((o) => !o);
        },
      })
    : trigger;

  return (
    <>
      {triggerEl}
      {open && (
        <Portal>
          <DropdownCtx.Provider value={{ close: () => setOpen(false) }}>
            <div
              ref={menuRef}
              style={{
                top: pos.top,
                left: pos.left,
                width,
                transform: pos.flip ? "translateY(-100%)" : undefined,
              }}
              className={cn(
                "animate-fade-in fixed z-[60] mt-1 rounded-lg border border-border bg-popover p-1 shadow-lg shadow-black/10",
                pos.flip && "-mt-1",
                className,
              )}
            >
              {children}
            </div>
          </DropdownCtx.Provider>
        </Portal>
      )}
    </>
  );
}

interface DropdownItemProps {
  children: React.ReactNode;
  icon?: IconName;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  shortcut?: string;
}

export function DropdownItem({
  children,
  icon,
  onSelect,
  destructive,
  disabled,
  shortcut,
}: DropdownItemProps) {
  const ctx = useContext(DropdownCtx);
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        onSelect?.();
        ctx?.close();
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        destructive
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-accent",
      )}
    >
      {icon && <Icon name={icon} size={15} className="shrink-0 opacity-80" />}
      <span className="flex-1 text-left">{children}</span>
      {shortcut && (
        <span className="text-[11px] text-muted-foreground">{shortcut}</span>
      )}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}
