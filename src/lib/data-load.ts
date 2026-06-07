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

  const loadData = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    let cancelled = false;
    void readDashboardData<unknown>(url)
      .then((body) => {
        if (!cancelled) setState({ data: transform(body) as T, loading: false, resolved: true });
      })
      .catch(() => {
        if (!cancelled) setState({ data: (null as unknown) as T, loading: false, resolved: false });
      })
      .finally(() => {
        if (!cancelled) setState((prev) => ({ ...prev, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [url, transform]);

  useEffect(() => {
    const cancel = loadData();
    return cancel;
  }, [loadData]);

  return [state, loadData] as const;
}
