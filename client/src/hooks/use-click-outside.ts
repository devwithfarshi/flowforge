"use client";

import { useEffect } from "react";

/** Covariant ref shape so refs to any element type can be mixed in one array. */
type OutsideRef = { readonly current: Element | null };

export function useClickOutside(
  refs: OutsideRef | OutsideRef[],
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    const list = Array.isArray(refs) ? refs : [refs];
    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node;
      if (list.some((r) => r.current?.contains(target))) return;
      handler();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [refs, handler, enabled]);
}

export function useEscapeKey(handler: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handler();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [handler, enabled]);
}
