"use client";

import { Icon } from "@/components/ui/icon";
import { useEscapeKey } from "@/hooks/use-click-outside";
import { cn } from "@/lib/utils";
import { Portal, useBodyScrollLock } from "./portal";

type ModalSize = "sm" | "md" | "lg" | "xl";

const SIZES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: ModalSize;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  hideClose?: boolean;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  hideClose,
}: ModalProps) {
  useEscapeKey(onClose, open);
  useBodyScrollLock(open);
  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center">
        <div
          className="animate-fade-in fixed inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          className={cn(
            "animate-scale-in relative z-10 my-8 w-full rounded-xl border border-border bg-card shadow-2xl shadow-black/20",
            SIZES[size],
          )}
        >
          {(title || !hideClose) && (
            <div className="flex items-start justify-between gap-4 px-5 pt-5">
              <div>
                {title && (
                  <h2 className="text-base font-semibold text-foreground">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                )}
              </div>
              {!hideClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="-mr-1.5 -mt-1 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  aria-label="Close"
                >
                  <Icon name="x" size={18} />
                </button>
              )}
            </div>
          )}
          {children && <div className="px-5 py-4">{children}</div>}
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
