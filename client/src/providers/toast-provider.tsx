"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import { cn, uid } from "@/lib/utils";

type ToastVariant = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (variant: ToastVariant, title: string, description?: string) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const META: Record<ToastVariant, { icon: IconName; className: string }> = {
  success: { icon: "check-circle", className: "text-success" },
  error: { icon: "x-circle", className: "text-destructive" },
  info: { icon: "info", className: "text-primary" },
  warning: { icon: "alert-triangle", className: "text-warning" },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback(
    (id: string) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  const push = useCallback(
    (variant: ToastVariant, title: string, description?: string) => {
      const id = uid("toast");
      setToasts((t) => [...t, { id, variant, title, description }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast: push,
      success: (t, d) => push("success", t, d),
      error: (t, d) => push("error", t, d),
      info: (t, d) => push("info", t, d),
      warning: (t, d) => push("warning", t, d),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2.5">
        {toasts.map((t) => {
          const meta = META[t.variant];
          return (
            <div
              key={t.id}
              className="animate-slide-in-right pointer-events-auto flex items-start gap-3 rounded-lg border border-border bg-popover p-3.5 shadow-lg shadow-black/5"
              role="status"
            >
              <Icon
                name={meta.icon}
                size={18}
                className={cn("mt-0.5 shrink-0", meta.className)}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-popover-foreground">
                  {t.title}
                </p>
                {t.description && (
                  <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
                    {t.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Dismiss"
              >
                <Icon name="x" size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
