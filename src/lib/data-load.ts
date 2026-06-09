import { useCallback, useEffect, useRef, useState } from "react";
import { readDashboardData } from "@/lib/client-data-cache";

type LoadState<T> = { data: T | null; loading: boolean; resolved: boolean };

function initialLoadState<T>(cached: T | null): LoadState<T> {
  return {
    data: cached,
    loading: cached === null,
    resolved: cached !== null,
  };
}

export function useDashboardData<T>(url: string, transform: (body: unknown) => T, cached?: T | null) {
  const [state, setState] = useState<LoadState<T>>(() => initialLoadState(cached ?? null));
  const transformRef = useRef(transform);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  const loadData = useCallback(() => {
    setState((prev) => ({ ...prev, loading: prev.data === null }));
    let cancelled = false;
    void readDashboardData<unknown>(url)
      .then((body) => {
        if (!cancelled) setState({ data: transformRef.current(body) as T, loading: false, resolved: true });
      })
      .catch(() => {
        if (!cancelled) setState({ data: (null as unknown) as T, loading: false, resolved: false });
      })
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    const cancel = loadData();
    return cancel;
  }, [loadData]);

  return [state, loadData] as const;
}
