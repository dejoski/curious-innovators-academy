"use client";

import React from "react";
import { useDashboardPersona } from "@/components/dashboard-persona";
import { invalidateDashboardData, readDashboardData } from "@/lib/client-data-cache";
import type { DataSource } from "@/lib/data/fetch-source";
import type { EnrichmentDecisionSummary, ApprovalHistoryRow } from "@/lib/data/repositories/requests";
import type { EnrichmentRequestRow, SchoolClassRow } from "@/lib/data/types";

type CacheEntry<T> = {
  data: T | null;
  source: DataSource;
  loading: boolean;
  error: string | null;
  loadedAt: number | null;
};

type RequestsPayload = {
  requests: EnrichmentRequestRow[];
  decisionSummary: EnrichmentDecisionSummary;
};

type ClassesDataCacheValue = {
  classes: CacheEntry<SchoolClassRow[]>;
  requests: CacheEntry<RequestsPayload>;
  approvals: CacheEntry<ApprovalHistoryRow[]>;
  loadClasses: (force?: boolean) => Promise<SchoolClassRow[]>;
  loadRequests: (force?: boolean) => Promise<RequestsPayload>;
  loadApprovals: (force?: boolean) => Promise<ApprovalHistoryRow[]>;
  setClassesData: (rows: SchoolClassRow[], source?: DataSource) => void;
  setRequestsData: (
    rows: EnrichmentRequestRow[],
    decisionSummary: EnrichmentDecisionSummary,
    source?: DataSource,
  ) => void;
};

const EMPTY_DECISION_SUMMARY: EnrichmentDecisionSummary = {
  approved: 0,
  waitlisted: 0,
  rejected: 0,
};

const CLASSES_URL = "/api/data/classes";
const REQUESTS_URL = "/api/data/enrichment-requests";
const APPROVALS_URL = "/api/data/approval-history";

function emptyEntry<T>(): CacheEntry<T> {
  return {
    data: null,
    source: "unavailable",
    loading: false,
    error: null,
    loadedAt: null,
  };
}

const ClassesDataCacheContext = React.createContext<ClassesDataCacheValue | null>(null);

export function ClassesDataCacheProvider({ children }: { children: React.ReactNode }) {
  const { persona } = useDashboardPersona();
  const [classes, setClasses] = React.useState<CacheEntry<SchoolClassRow[]>>(() => emptyEntry());
  const [requests, setRequests] = React.useState<CacheEntry<RequestsPayload>>(() => emptyEntry());
  const [approvals, setApprovals] = React.useState<CacheEntry<ApprovalHistoryRow[]>>(() => emptyEntry());
  const inflight = React.useRef<Record<string, Promise<unknown> | null>>({
    classes: null,
    requests: null,
    approvals: null,
  });

  const loadClasses = React.useCallback(async (force = false) => {
    if (!force && classes.data) return classes.data;
    if (!force && inflight.current.classes) return inflight.current.classes as Promise<SchoolClassRow[]>;

    const promise = (async () => {
      setClasses((prev) => ({ ...prev, loading: true, error: null }));
      try {
        if (force) invalidateDashboardData(CLASSES_URL);
        const body = await readDashboardData<{ classes?: SchoolClassRow[]; source?: DataSource }>(CLASSES_URL);
        const rows = Array.isArray(body.classes) ? body.classes : [];
        setClasses({
          data: rows,
          source: body.source ?? "remote",
          loading: false,
          error: null,
          loadedAt: Date.now(),
        });
        return rows;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setClasses((prev) => ({ ...prev, loading: false, error: message }));
        return classes.data ?? [];
      } finally {
        inflight.current.classes = null;
      }
    })();

    inflight.current.classes = promise;
    return promise;
  }, [classes.data]);

  const loadRequests = React.useCallback(async (force = false) => {
    if (!force && requests.data) return requests.data;
    if (!force && inflight.current.requests) return inflight.current.requests as Promise<RequestsPayload>;

    const promise = (async () => {
      setRequests((prev) => ({ ...prev, loading: true, error: null }));
      try {
        if (force) invalidateDashboardData(REQUESTS_URL);
        const body = await readDashboardData<{
          requests?: EnrichmentRequestRow[];
          decisionSummary?: EnrichmentDecisionSummary;
          source?: DataSource;
        }>(REQUESTS_URL);
        const payload = {
          requests: Array.isArray(body.requests) ? body.requests : [],
          decisionSummary: body.decisionSummary ?? EMPTY_DECISION_SUMMARY,
        };
        setRequests({
          data: payload,
          source: body.source ?? "remote",
          loading: false,
          error: null,
          loadedAt: Date.now(),
        });
        return payload;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setRequests((prev) => ({ ...prev, loading: false, error: message }));
        return requests.data ?? { requests: [], decisionSummary: EMPTY_DECISION_SUMMARY };
      } finally {
        inflight.current.requests = null;
      }
    })();

    inflight.current.requests = promise;
    return promise;
  }, [requests.data]);

  const loadApprovals = React.useCallback(async (force = false) => {
    if (!force && approvals.data) return approvals.data;
    if (!force && inflight.current.approvals) return inflight.current.approvals as Promise<ApprovalHistoryRow[]>;

    const promise = (async () => {
      setApprovals((prev) => ({ ...prev, loading: true, error: null }));
      try {
        if (force) invalidateDashboardData(APPROVALS_URL);
        const body = await readDashboardData<{ approvals?: ApprovalHistoryRow[]; source?: DataSource }>(APPROVALS_URL);
        const rows = Array.isArray(body.approvals) ? body.approvals : [];
        setApprovals({
          data: rows,
          source: body.source ?? "remote",
          loading: false,
          error: null,
          loadedAt: Date.now(),
        });
        return rows;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setApprovals((prev) => ({ ...prev, loading: false, error: message }));
        return approvals.data ?? [];
      } finally {
        inflight.current.approvals = null;
      }
    })();

    inflight.current.approvals = promise;
    return promise;
  }, [approvals.data]);

  const setClassesData = React.useCallback((rows: SchoolClassRow[], source: DataSource = "remote") => {
    setClasses({ data: rows, source, loading: false, error: null, loadedAt: Date.now() });
  }, []);

  const setRequestsData = React.useCallback(
    (rows: EnrichmentRequestRow[], decisionSummary: EnrichmentDecisionSummary, source: DataSource = "remote") => {
      setRequests({
        data: { requests: rows, decisionSummary },
        source,
        loading: false,
        error: null,
        loadedAt: Date.now(),
      });
    },
    [],
  );

  React.useEffect(() => {
    if (persona !== "admin") return;
    void Promise.allSettled([loadClasses(), loadRequests(), loadApprovals()]);
  }, [loadApprovals, loadClasses, loadRequests, persona]);

  const value = React.useMemo(
    () => ({
      classes,
      requests,
      approvals,
      loadClasses,
      loadRequests,
      loadApprovals,
      setClassesData,
      setRequestsData,
    }),
    [approvals, classes, loadApprovals, loadClasses, loadRequests, requests, setClassesData, setRequestsData],
  );

  return (
    <ClassesDataCacheContext.Provider value={value}>
      {children}
    </ClassesDataCacheContext.Provider>
  );
}

export function useClassesDataCache() {
  const value = React.useContext(ClassesDataCacheContext);
  if (!value) {
    throw new Error("useClassesDataCache must be used inside ClassesDataCacheProvider");
  }
  return value;
}
