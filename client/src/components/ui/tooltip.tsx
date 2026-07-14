"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Portal } from "./portal";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom";
  className?: string;
}

export function Tooltip({
  content,
  children,
  side = "top",
  className,
}: TooltipProps) {
  const [show, setShow] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  const open = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect());
    setShow(true);
  };

  return (
    <>
      <span
        ref={ref}
        onMouseEnter={open}
        onMouseLeave={() => setShow(false)}
        onFocus={open}
        onBlur={() => setShow(false)}
        className="inline-flex"
      >
        {children}
      </span>
      {show && rect && content && (
        <Portal>
          <div
            role="tooltip"
            style={{
              position: "fixed",
              top: side === "top" ? rect.top - 8 : rect.bottom + 8,
              left: rect.left + rect.width / 2,
              transform: `translateX(-50%) ${side === "top" ? "translateY(-100%)" : ""}`,
            }}
            className={cn(
              "animate-fade-in pointer-events-none z-[70] max-w-xs rounded-md bg-foreground px-2 py-1 text-[11.5px] font-medium text-background shadow-md",
              className,
            )}
          >
            {content}
          </div>
        </Portal>
      )}
    </>
  );
}
