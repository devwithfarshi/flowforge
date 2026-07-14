"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  tone?: "default" | "danger";
  icon?: IconName;
}

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
const ConfirmCtx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const confirm = useCallback<ConfirmFn>((o) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (result: boolean) => {
    resolver.current(result);
    setOpts(null);
  };

  const danger = opts?.tone === "danger";

  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal open={!!opts} onClose={() => close(false)} size="sm" hideClose>
        {opts && (
          <div className="flex gap-4">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-full",
                danger
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary",
              )}
            >
              <Icon
                name={opts.icon ?? (danger ? "alert-triangle" : "help-circle")}
                size={20}
              />
            </div>
            <div className="flex-1">
              <h2 className="text-[15px] font-semibold text-foreground">
                {opts.title}
              </h2>
              {opts.description && (
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {opts.description}
                </p>
              )}
              <div className="mt-5 flex justify-end gap-2.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => close(false)}
                >
                  {opts.cancelText ?? "Cancel"}
                </Button>
                <Button
                  variant={danger ? "destructive" : "primary"}
                  size="sm"
                  onClick={() => close(true)}
                >
                  {opts.confirmText ?? "Confirm"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </ConfirmCtx.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within ConfirmProvider");
  return ctx;
}
