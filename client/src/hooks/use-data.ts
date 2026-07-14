"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { subscribe } from "@/lib/db/storage";

interface AsyncState<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
}

/**
 * Runs an async loader, exposes {data, loading, error, refetch}, and optionally
 * re-runs whenever one of the watched storage keys changes (live updates).
 */
export function useAsyncData<T>(
  loader: () => Promise<T>,
  deps: unknown[] = [],
  watchKeys: string[] = [],
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: undefined,
    loading: true,
    error: null,
  });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;
  const mounted = useRef(true);

  const run = useCallback((showLoading = false) => {
    if (showLoading) setState((s) => ({ ...s, loading: true }));
    loaderRef
      .current()
      .then((data) => {
        if (mounted.current) setState({ data, loading: false, error: null });
      })
      .catch((error: Error) => {
        if (mounted.current) setState((s) => ({ ...s, loading: false, error }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    mounted.current = true;
    run(true);
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (!watchKeys.length) return;
    const unsubs = watchKeys.map((k) => subscribe(k, () => run(false)));
    return () => {
      for (const u of unsubs) u();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [watchKeys.join(","), run]);

  return { ...state, refetch: () => run(true) };
}
