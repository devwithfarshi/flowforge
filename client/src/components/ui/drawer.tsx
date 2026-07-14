"use client";

import { Icon } from "@/components/ui/icon";
import { useEscapeKey } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { Portal, useBodyScrollLock } from "./portal";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  width?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  width = "max-w-md",
  children,
  footer,
}: DrawerProps) {
  useEscapeKey(onClose, open);
  useBodyScrollLock(open);
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50">
        <div
          className="animate-fade-in absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "animate-slide-in-right absolute right-0 top-0 flex h-full w-full flex-col border-l border-border bg-card shadow-2xl",
            width,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              {title && (
                <h2 className="text-[15px] font-semibold text-foreground">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-0.5 text-[13px] text-muted-foreground">
                  {description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="-mr-1.5 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Close"
            >
              <Icon name="x" size={18} />
            </button>
          </div>
          <div className="scrollbar-thin flex-1 overflow-y-auto px-5 py-4">
            {children}
          </div>
          {footer && (
            <div className="flex items-center justify-end gap-2.5 border-t border-border px-5 py-3.5">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
