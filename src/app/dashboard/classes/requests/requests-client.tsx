"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import React, { useMemo, useRef, useState, useEffect } from "react";
import { Search, SortAsc, Filter, ChevronDown, MoreHorizontal, Clock, CheckCircle2, XCircle, X, ListPlus, RotateCcw, Trash2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useFixedMenuPlacement } from "@/hooks/use-fixed-menu-placement";
import { useClassesDataCache } from "@/components/classes-data-cache";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData, parentStudentDataUrls } from "@/lib/client-data-cache";
import type { EnrichmentDecisionSummary } from "@/lib/data/repositories/requests";
import type { EnrichmentRequestRow, RequestStatus } from "@/lib/data/types";
import { getVisibleDashboardPages } from "@/lib/dashboard-pagination";
import { fallbackQueueBannerText } from "@/lib/product-copy";
import { DashboardValueSkeleton } from "@/components/dashboard-loading-state";
import { DashboardActionFeedback, type DashboardActionFeedbackState } from "@/components/dashboard-action-feedback";

export type ClassesEnrichmentRequestsProps = {
  initialRequests: EnrichmentRequestRow[];
  dataSource: DataSource;
  initialDecisionSummary?: EnrichmentDecisionSummary;
};

const PAGE_SIZE = 10;
type SortKey = "student" | "parent" | "class" | "block" | "level" | "option" | "status";
type FilterValue = "All" | RequestStatus;

const STATUS_PRIORITY: Record<RequestStatus, number> = {
  Pending: 0,
  Waitlisted: 1,
  Rejected: 2,
  Approved: 3,
};

const REQUESTS_GRID_COLUMNS =
  "32px minmax(104px,0.65fr) minmax(130px,1fr) minmax(130px,1fr) minmax(170px,1.25fr) minmax(112px,0.8fr) minmax(86px,0.65fr) minmax(126px,0.85fr) 40px";

function statusBadgeClass(status: RequestStatus) {
  if (status === "Pending") return "bg-[#cfa500]/20 text-[#8a6d00] border-[#cfa500]/50";
  if (status === "Approved") return "bg-[#004d08]/20 text-[#004d08] border-[#004d08]/50";
  if (status === "Waitlisted") return "bg-[#fff8e6] text-[#7a5b00] border-[#cfa500]/50";
  return "bg-[#ffd9d9] text-[#d80509] border-[#d80509]/50";
}

const FINAL_STATUSES = ["Approved", "Waitlisted", "Rejected"] as const;

type RequestAdminAction =
  | { type: "status"; status: RequestStatus; request: EnrichmentRequestRow }
  | { type: "delete"; request: EnrichmentRequestRow };

function statusActionLabel(status: RequestStatus) {
  if (status === "Approved") return "Approve";
  if (status === "Waitlisted") return "Waitlist";
  if (status === "Rejected") return "Reject";
  return "Reopen pending";
}

function statusActionTone(status: RequestStatus) {
  if (status === "Approved") return "text-[#004d08]";
  if (status === "Waitlisted") return "text-[#7a5b00]";
  if (status === "Rejected") return "text-[#d80509]";
  return "text-[#0d0d12]";
}

function statusActionOptions(req: EnrichmentRequestRow): RequestStatus[] {
  const next: RequestStatus[] = [];
  if (req.status !== "Pending") next.push("Pending");
  FINAL_STATUSES.forEach((status) => {
    if (req.status !== status) next.push(status);
  });
  return next;
}

function confirmActionTitle(action: RequestAdminAction) {
  if (action.type === "delete") return action.request.status === "Pending" ? "Delete request" : "Remove placement";
  return action.status === "Pending" ? "Reopen request" : `${statusActionLabel(action.status)} request`;
}

function confirmActionBody(action: RequestAdminAction) {
  if (action.type === "delete") {
    return action.request.status === "Pending"
      ? `Delete the pending request for ${action.request.student}?`
      : `Remove the final ${action.request.status.toLowerCase()} placement for ${action.request.student}?`;
  }
  if (action.status === "Pending") return `Reopen ${action.request.student}'s final placement as a pending request?`;
  if (action.status === "Approved") return `Approve enrollment for ${action.request.student}?`;
  if (action.status === "Waitlisted") return `Move ${action.request.student} to the waitlist? This does not reserve a seat.`;
  return `Reject enrollment for ${action.request.student}?`;
}

function decisionSummaryForRequests(rows: EnrichmentRequestRow[]): EnrichmentDecisionSummary {
  return rows.reduce<EnrichmentDecisionSummary>(
    (summary, row) => {
      if (row.status === "Approved") summary.approved += 1;
      if (row.status === "Waitlisted") summary.waitlisted += 1;
      if (row.status === "Rejected") summary.rejected += 1;
      return summary;
    },
    { approved: 0, waitlisted: 0, rejected: 0 },
  );
}

function statusActionProgress(status: RequestStatus, count: number) {
  const noun = count === 1 ? "class" : "classes";
  if (status === "Approved") return `Approving ${count} ${noun}...`;
  if (status === "Waitlisted") return `Moving ${count} ${noun} to waitlist...`;
  if (status === "Rejected") return `Rejecting ${count} ${noun}...`;
  return `Reopening ${count} ${noun}...`;
}

function statusActionComplete(status: RequestStatus, count: number) {
  const noun = count === 1 ? "class" : "classes";
  if (status === "Approved") return `${count} ${noun} approved.`;
  if (status === "Waitlisted") return `${count} ${noun} waitlisted.`;
  if (status === "Rejected") return `${count} ${noun} rejected.`;
  return `${count} ${noun} reopened.`;
}

export default function ClassesEnrichmentRequests({
  initialRequests,
  dataSource,
  initialDecisionSummary = { approved: 0, waitlisted: 0, rejected: 0 },
}: ClassesEnrichmentRequestsProps) {
  const searchParams = useSearchParams();
  const detailIdFromUrl = searchParams.get("detail");
  const classesCache = useClassesDataCache();

  const [requests, setRequests] = useState<EnrichmentRequestRow[]>(
    () => classesCache.requests.data?.requests ?? [...initialRequests],
  );
  const [decisionSummary, setDecisionSummary] = useState<EnrichmentDecisionSummary>(
    () => classesCache.requests.data?.decisionSummary ?? initialDecisionSummary,
  );
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<DashboardActionFeedbackState>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("All");
  const [sortKey, setSortKey] = useState<SortKey>("student");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);

  const filterRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);
  const rowMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const rowMenuPlacement = useFixedMenuPlacement(rowMenuId !== null, rowMenuAnchorRef, 190);

  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen);
  useClickOutside(sortRef, () => setSortOpen(false), sortOpen);
  useClickOutside(rowMenuRef, () => setRowMenuId(null), rowMenuId !== null);

  const [confirmAction, setConfirmAction] = useState<
    | null
    | RequestAdminAction
  >(null);
  const [reasonDraft, setReasonDraft] = useState("");
  const [detailRequest, setDetailRequest] = useState<EnrichmentRequestRow | null>(null);

  useEffect(() => {
    if (detailIdFromUrl) {
      const request = requests.find((r) => r.id === detailIdFromUrl);
      if (request) setDetailRequest(request);
    }
  }, [detailIdFromUrl, requests]);

  useEffect(() => {
    if (actionFeedback?.tone !== "success") return;
    const timeout = window.setTimeout(() => setActionFeedback(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [actionFeedback]);

  useEffect(() => {
    if (initialRequests.length > 0 && !classesCache.requests.data) {
      classesCache.setRequestsData(initialRequests, initialDecisionSummary, dataSource);
    }
  }, [classesCache, dataSource, initialDecisionSummary, initialRequests]);

  useEffect(() => {
    const payload = classesCache.requests.data;
    if (payload) {
      setRequests(payload.requests);
      setDecisionSummary(payload.decisionSummary);
      return;
    }
    void classesCache.loadRequests();
  }, [classesCache]);

  const pendingCount = useMemo(() => requests.filter((r) => r.status === "Pending").length, [requests]);
  const approvedCount = decisionSummary.approved;
  const waitlistedCount = decisionSummary.waitlisted;
  const rejectedCount = decisionSummary.rejected;
  const totalRequests = requests.length;
  const distinctClasses = useMemo(
    () => new Set(requests.map((r) => r.class.trim()).filter(Boolean)).size,
    [requests],
  );

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = requests.filter((r) => {
      if (filter !== "All" && r.status !== filter) return false;
      if (!q) return true;
      const hay = [r.student, r.parent, r.class, r.block, r.level, r.option, r.status].join(" ").toLowerCase();
      return hay.includes(q);
    });
    rows = [...rows].sort((a, b) => {
      const statusCmp = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];
      if (statusCmp !== 0) return statusCmp;
      if (sortKey === "status") {
        return a.student.localeCompare(b.student, undefined, { sensitivity: "base" });
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return rows;
  }, [requests, search, filter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return processed.slice(start, start + PAGE_SIZE);
  }, [processed, safePage]);

  const visiblePages = getVisibleDashboardPages(safePage, totalPages);
  const hasResolvedRequests = Boolean(classesCache.requests.loadedAt) || initialRequests.length > 0;
  const isInitialRequestsLoad = !hasResolvedRequests && (classesCache.requests.loading || requests.length === 0);
  const metricValue = (value: React.ReactNode) =>
    isInitialRequestsLoad ? <DashboardValueSkeleton className="h-5 w-10" /> : value;

  const selectableProcessed = processed;
  const processedIdSet = useMemo(() => new Set(selectableProcessed.map((r) => r.id)), [selectableProcessed]);
  const allFilteredSelected = selectableProcessed.length > 0 && selectableProcessed.every((r) => selectedIds.has(r.id));
  const selectedRows = useMemo(
    () => requests.filter((request) => selectedIds.has(request.id)),
    [requests, selectedIds],
  );
  const selectedCount = selectedRows.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openStatusAction = (request: EnrichmentRequestRow, status: RequestStatus) => {
    setReasonDraft("");
    setConfirmAction({ type: "status", status, request });
    setRowMenuId(null);
  };

  const openDeleteAction = (request: EnrichmentRequestRow) => {
    setReasonDraft("");
    setConfirmAction({ type: "delete", request });
    setRowMenuId(null);
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        processedIdSet.forEach((id) => next.delete(id));
      } else {
        processedIdSet.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const invalidateRequestDecisionCaches = (rows: EnrichmentRequestRow[]) => {
    const touchedKeys = new Set<string>([
      "/api/dashboard-presentation",
      "/api/data/enrichment-requests",
      "/api/data/classes",
      "/api/data/approval-history",
    ]);
    rows.forEach((row) => {
      if (!row.studentId) return;
      parentStudentDataUrls(row.studentId).forEach((url) => touchedKeys.add(url));
    });
    invalidateDashboardData([...touchedKeys]);
  };

  const refreshRequestsFromRemote = async (touchedRows: EnrichmentRequestRow[] = []) => {
    invalidateRequestDecisionCaches(touchedRows);
    const payload = await classesCache.loadRequests(true);
    setRequests(payload.requests);
    setDecisionSummary(payload.decisionSummary);
    void classesCache.loadClasses(true);
    void classesCache.loadApprovals(true);
    return true;
  };

  const commitOptimisticRequests = (nextRows: EnrichmentRequestRow[]) => {
    const nextSummary = decisionSummaryForRequests(nextRows);
    setRequests(nextRows);
    setDecisionSummary(nextSummary);
    classesCache.setRequestsData(nextRows, nextSummary, "remote");
  };

  const reconcileRequestsInBackground = (touchedRows: EnrichmentRequestRow[]) => {
    void refreshRequestsFromRemote(touchedRows).catch((error) => {
      setActionFeedback({
        tone: "error",
        message: `Updated locally, but refresh failed: ${error instanceof Error ? error.message : String(error)}.`,
      });
    });
  };

  const applyStatus = async (id: string, status: RequestStatus, reason?: string) => {
    const touchedRow = requests.find((request) => request.id === id);
    setConfirmAction(null);
    setRowMenuId(null);
    setSyncHint(null);
    if (!touchedRow || actionBusy) return;
    const previousRows = requests;
    const nextRows = previousRows.map((request) => (
      request.id === id ? { ...request, status } : request
    ));
    setActionBusy(true);
    setActionFeedback({ tone: "loading", message: statusActionProgress(status, 1) });
    commitOptimisticRequests(nextRows);
    const res = await fetch("/api/data/enrichment-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, reason }),
    });
    if (!res.ok) {
      commitOptimisticRequests(previousRows);
      setActionFeedback({ tone: "error", message: `Could not update class: ${await readApiError(res)}.` });
      setActionBusy(false);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setActionFeedback({ tone: "success", message: statusActionComplete(status, 1) });
    setActionBusy(false);
    reconcileRequestsInBackground([touchedRow]);
  };

  const deleteRequest = async (id: string, reason?: string) => {
    const touchedRow = requests.find((request) => request.id === id);
    setConfirmAction(null);
    setRowMenuId(null);
    setSyncHint(null);
    if (!touchedRow || actionBusy) return;
    const previousRows = requests;
    const nextRows = previousRows.filter((request) => request.id !== id);
    setActionBusy(true);
    setActionFeedback({ tone: "loading", message: "Removing class request..." });
    commitOptimisticRequests(nextRows);
    const res = await fetch("/api/data/enrichment-requests", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, reason }),
    });
    if (!res.ok) {
      commitOptimisticRequests(previousRows);
      setActionFeedback({ tone: "error", message: `Could not remove request: ${await readApiError(res)}.` });
      setActionBusy(false);
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setActionFeedback({ tone: "success", message: "Class request removed." });
    setActionBusy(false);
    reconcileRequestsInBackground([touchedRow]);
  };

  const applyBulkStatus = async (status: RequestStatus) => {
    if (selectedRows.length === 0 || actionBusy) return;
    const targetRows = selectedRows;
    const targetIds = new Set(targetRows.map((row) => row.id));
    const previousRows = requests;
    const nextRows = previousRows.map((row) => (
      targetIds.has(row.id) ? { ...row, status } : row
    ));
    const failedMessages: string[] = [];

    setRowMenuId(null);
    setSyncHint(null);
    setActionBusy(true);
    setActionFeedback({ tone: "loading", message: statusActionProgress(status, targetRows.length) });
    commitOptimisticRequests(nextRows);

    await Promise.all(
      targetRows.map(async (row) => {
        const res = await fetch("/api/data/enrichment-requests", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: row.id, status }),
        });
        if (!res.ok) {
          failedMessages.push(await readApiError(res));
        }
      }),
    );

    if (failedMessages.length > 0) {
      commitOptimisticRequests(previousRows);
      setActionFeedback({ tone: "error", message: `Could not update ${failedMessages.length} selected class(es): ${failedMessages[0] ?? "Unknown error"}.` });
      setActionBusy(false);
      reconcileRequestsInBackground(targetRows);
      return;
    }

    setSelectedIds(new Set());
    setActionFeedback({ tone: "success", message: statusActionComplete(status, targetRows.length) });
    setActionBusy(false);
    reconcileRequestsInBackground(targetRows);
  };

  return (
    <div className="flex h-full flex-col gap-6 bg-[#fafafa] p-4 md:p-8">
      <DashboardActionFeedback state={actionFeedback} />
      <div className="flex flex-col gap-2">
        <h1 className="text-[28px] font-bold text-[#272932]">Enrichment requests</h1>
        <p className="text-[16px] text-[#666d80]">
          Review enrichment class requests, approve or reject enrollments, and track demand by class.
        </p>
        {((classesCache.requests.source === "fallback" || dataSource === "fallback") || syncHint) && (
          <div className="flex flex-col gap-2 max-w-3xl">
            {(classesCache.requests.source === "fallback" || dataSource === "fallback") && (
              <p className="rounded-lg border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
                {fallbackQueueBannerText()}
              </p>
            )}
            {syncHint && (
              <p className="rounded-lg border border-[#d80509]/30 bg-[#fff5f5] px-4 py-2 text-sm text-[#a00408]">{syncHint}</p>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex items-center gap-[10px]">
          <div className="bg-[#fff8e6] rounded-[10px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
            <ListPlus className="w-5 h-5 text-[#cfa500]" />
          </div>
          <div className="flex min-w-0 flex-col leading-snug">
            <span className="break-words text-[15px] font-semibold text-[#272932]">Waitlisted</span>
            <span className="text-[16px] font-medium text-[#666d80]">{metricValue(waitlistedCount)}</span>
          </div>
        </div>

        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex items-center gap-[10px]">
          <div className="bg-[#cfa500]/20 rounded-[10px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#cfa500]" />
          </div>
          <div className="flex min-w-0 flex-col leading-snug">
            <span className="break-words text-[15px] font-semibold text-[#272932]">Pending</span>
            <span className="text-[16px] font-medium text-[#666d80]">{metricValue(pendingCount)}</span>
          </div>
        </div>

        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex items-center gap-[10px]">
          <div className="bg-[#004d08]/20 rounded-[10px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#004d08]" />
          </div>
          <div className="flex min-w-0 flex-col leading-snug">
            <span className="break-words text-[15px] font-semibold text-[#272932]">Approved enrollments</span>
            <span className="text-[16px] font-medium text-[#666d80]">{metricValue(approvedCount)}</span>
          </div>
        </div>

        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex items-center gap-[10px]">
          <div className="bg-[#ffd9d9] rounded-[10px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-[#d80509]" />
          </div>
          <div className="flex min-w-0 flex-col leading-snug">
            <span className="break-words text-[15px] font-semibold text-[#272932]">Declined</span>
            <span className="text-[16px] font-medium text-[#666d80]">{metricValue(rejectedCount)}</span>
          </div>
        </div>

        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex flex-col justify-center gap-1 leading-snug">
          <span className="break-words text-[15px] font-semibold text-[#272932]">Classes in queue</span>
          <span className="text-[16px] font-medium text-[#666d80]">
            {isInitialRequestsLoad ? <DashboardValueSkeleton className="h-5 w-20" /> : `${distinctClasses} ${distinctClasses === 1 ? "class" : "classes"}`}
          </span>
          <span className="text-[12px] text-[#8b919f]">
            {isInitialRequestsLoad ? <DashboardValueSkeleton className="h-4 w-24" /> : `${totalRequests} total requests`}
          </span>
        </div>
      </div>

      <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex flex-col gap-4 flex-1">
        <div className="grid gap-3 lg:grid-cols-[minmax(220px,1fr)_auto] lg:items-center">
          <div className="flex min-h-9 w-full items-center gap-[6px] rounded-[8px] bg-[#fafafa] px-3 text-[#0d0d12] lg:bg-transparent lg:px-0">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search..."
              className="w-full min-w-[120px] bg-transparent text-[12px] outline-none placeholder:text-[#0d0d12]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {selectableProcessed.length > 0 ? (
              <button
                type="button"
                disabled={actionBusy}
                className="bg-[#fafafa] px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-[#272932] hover:bg-[#f0f0f0] disabled:cursor-not-allowed disabled:opacity-60"
                onClick={toggleSelectAllFiltered}
              >
                {allFilteredSelected ? "Deselect rows" : `Select rows (${selectableProcessed.length})`}
              </button>
            ) : null}
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                className="flex items-center gap-1 bg-[#fafafa] px-2 py-1 rounded-[8px] text-[12px]"
                onClick={() => {
                  setFilterOpen((o) => !o);
                  setSortOpen(false);
                }}
              >
                <Filter className="w-4 h-4" />
                <span>Filter by: {filter}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full mt-1 z-[100] min-w-[160px] rounded-[8px] border border-[#f0f0f0] bg-white py-1 shadow-md">
                  {(["All", "Pending", "Approved", "Waitlisted", "Rejected"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="w-full px-3 py-2 text-left text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => {
                        setFilter(opt);
                        setFilterOpen(false);
                        setPage(1);
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative" ref={sortRef}>
              <button
                type="button"
                className="flex items-center gap-1 bg-[#fafafa] px-2 py-1 rounded-[8px] text-[12px]"
                onClick={() => {
                  setSortOpen((o) => !o);
                  setFilterOpen(false);
                }}
              >
                <SortAsc className="w-4 h-4" />
                <span>Sort</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-1 z-[100] min-w-[200px] rounded-[8px] border border-[#f0f0f0] bg-white py-1 shadow-md">
                  {(
                    [
                      ["student", "Student name"],
                      ["parent", "Parent"],
                      ["class", "Class"],
                      ["block", "Block"],
                      ["level", "Level"],
                      ["option", "Option"],
                      ["status", "Status priority"],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => {
                        if (sortKey === key) {
                          setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        } else {
                          setSortKey(key);
                          setSortDir("asc");
                        }
                        setSortOpen(false);
                      }}
                    >
                      <span>{label}</span>
                      {sortKey === key && <span className="text-[10px] text-[#666d80]">{sortDir === "asc" ? "A→Z" : "Z→A"}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[#dfe1e6] bg-[#fafafa] px-3 py-2">
            <span className="mr-1 text-[12px] font-semibold text-[#272932]">
              {selectedCount} selected
            </span>
            <button
              type="button"
              disabled={actionBusy}
              className="rounded-[8px] bg-[#004d08] px-3 py-1.5 text-[12px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void applyBulkStatus("Approved")}
            >
              Approve
            </button>
            <button
              type="button"
              disabled={actionBusy}
              className="rounded-[8px] bg-[#fff8e6] px-3 py-1.5 text-[12px] font-semibold text-[#7a5b00] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void applyBulkStatus("Waitlisted")}
            >
              Waitlist
            </button>
            <button
              type="button"
              disabled={actionBusy}
              className="rounded-[8px] bg-[#ffd9d9] px-3 py-1.5 text-[12px] font-semibold text-[#d80509] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void applyBulkStatus("Rejected")}
            >
              Reject
            </button>
            <button
              type="button"
              disabled={actionBusy}
              className="rounded-[8px] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#272932] disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => void applyBulkStatus("Pending")}
            >
              Reopen
            </button>
            <button
              type="button"
              disabled={actionBusy}
              className="rounded-[8px] px-3 py-1.5 text-[12px] font-semibold text-[#666d80] hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              onClick={() => setSelectedIds(new Set())}
            >
              Clear
            </button>
          </div>
        ) : null}

        <div className="flex flex-col flex-1 min-h-0 border-t border-[#f0f0f0] pt-4">
          <div className="grid gap-3 md:hidden">
            {pageRows.map((req) => (
              <article key={req.id} className="rounded-[14px] border border-[#f0f0f0] bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <button
                    type="button"
                    aria-label={`Select ${req.student} request for ${req.class}`}
                    aria-pressed={selectedIds.has(req.id)}
                    disabled={actionBusy}
	                    className={`mt-1 h-4 w-4 shrink-0 rounded border border-[#14c1d5] disabled:cursor-not-allowed disabled:border-[#dfe1e7] disabled:bg-[#f7f8fa] ${
                      selectedIds.has(req.id) ? "bg-[#14c1d5] opacity-100" : "bg-[#d2f1f5] opacity-50"
                    }`}
                    onClick={() => toggleSelect(req.id)}
                  />
                  <span className={`shrink-0 rounded-[6px] border px-2 py-1 text-[10px] font-semibold ${statusBadgeClass(req.status)}`}>
                    {req.status}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-[#272932]">{req.class}</p>
                    <p className="mt-1 text-[12px] text-[#666d80]">
                      {req.student} · {req.parent}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                  <div className="rounded-[8px] bg-[#fafafa] p-2">
                    <p className="text-[10px] font-semibold uppercase text-[#8b919f]">Block</p>
                    <p className="mt-1 font-semibold text-[#0d0d12]">{req.block}</p>
                  </div>
                  <div className="rounded-[8px] bg-[#fafafa] p-2">
                    <p className="text-[10px] font-semibold uppercase text-[#8b919f]">Level</p>
                    <p className="mt-1 font-semibold text-[#0d0d12]">{req.level}</p>
                  </div>
                  <div className="rounded-[8px] bg-[#fafafa] p-2">
                    <p className="text-[10px] font-semibold uppercase text-[#8b919f]">Choice</p>
                    <p className="mt-1 font-semibold text-[#0d0d12]">{req.option}</p>
                  </div>
                </div>
	                <div className="mt-3 flex flex-wrap gap-2">
	                  {statusActionOptions(req).map((status) => (
	                    <button
	                      key={status}
	                      type="button"
	                      disabled={actionBusy}
	                      className={`h-9 flex-1 rounded-[8px] border border-[#dfe1e6] px-3 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${statusActionTone(status)}`}
	                      onClick={() => openStatusAction(req, status)}
	                    >
	                      {statusActionLabel(status)}
	                    </button>
	                  ))}
	                  <button
	                    type="button"
	                    disabled={actionBusy}
	                    className="h-9 flex-1 rounded-[8px] border border-[#dfe1e6] px-3 text-[12px] font-semibold text-[#272932] disabled:cursor-not-allowed disabled:opacity-60"
                    onClick={() => setDetailRequest(req)}
                  >
                    View request
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="hidden w-full min-w-0 overflow-x-auto pb-2 md:block">
            <div className="min-w-[1040px]">
          <div className="grid gap-3 pb-3 border-b border-[#f0f0f0] text-[12px] font-semibold text-[#8b919f] uppercase tracking-wide" style={{ gridTemplateColumns: REQUESTS_GRID_COLUMNS }}>
            <button
              type="button"
	              aria-label={allFilteredSelected ? "Deselect all requests" : "Select all requests"}
              aria-pressed={allFilteredSelected}
              disabled={selectableProcessed.length === 0 || actionBusy}
              className={`h-4 w-4 rounded border border-[#14c1d5] ${
                allFilteredSelected ? "bg-[#14c1d5] opacity-100" : "bg-[#d2f1f5] opacity-50"
              } disabled:cursor-not-allowed disabled:border-[#dfe1e7] disabled:bg-[#f7f8fa]`}
              onClick={toggleSelectAllFiltered}
            />
            <div>Status</div>
            <div>Student</div>
            <div>Parent</div>
            <div>Class</div>
            <div className="text-center">Block</div>
            <div className="text-center">Level</div>
            <div>Option</div>
            <div className="text-center"> </div>
          </div>

            {pageRows.map((req) => (
              <div
                key={req.id}
                className="grid gap-3 py-2.5 border-b border-[#f0f0f0] items-center text-[13px] text-[#0d0d12] hover:bg-[#fafafa] transition-colors"
                style={{ gridTemplateColumns: REQUESTS_GRID_COLUMNS }}
              >
              <div className="flex items-center min-w-0">
                <button
                  type="button"
                  aria-label={`Select ${req.student} request for ${req.class}`}
                  aria-pressed={selectedIds.has(req.id)}
                  disabled={actionBusy}
	                  className={`w-4 h-4 rounded border border-[#14c1d5] shrink-0 disabled:cursor-not-allowed disabled:border-[#dfe1e7] disabled:bg-[#f7f8fa] ${
                    selectedIds.has(req.id) ? "bg-[#14c1d5] opacity-100" : "bg-[#d2f1f5] opacity-50"
                  }`}
                  onClick={() => toggleSelect(req.id)}
                />
              </div>
              <div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-[6px] text-[10px] border ${statusBadgeClass(req.status)}`}
                >
                  {req.status}
                </span>
              </div>
              <div className="min-w-0 truncate">
                <span className="truncate">{req.student}</span>
              </div>
              <div className="truncate">{req.parent}</div>
              <div className="truncate">{req.class}</div>
              <div className="text-center">{req.block}</div>
              <div className="text-center">{req.level}</div>
              <div>{req.option}</div>
              <div className="flex justify-center relative" ref={rowMenuId === req.id ? rowMenuRef : null}>
                <button
                  type="button"
                  ref={rowMenuId === req.id ? rowMenuAnchorRef : null}
                  disabled={actionBusy}
                  className="text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                  onClick={() => setRowMenuId((id) => (id === req.id ? null : req.id))}
                  aria-expanded={rowMenuId === req.id}
                >
                  <MoreHorizontal className="w-5 h-5" />
                </button>
                {rowMenuId === req.id && rowMenuPlacement && (
	                  <div
	                    className="fixed z-[70] w-[190px] rounded-[8px] border border-[#f0f0f0] bg-white py-1 shadow-md"
                    style={{
                      top: rowMenuPlacement.top,
                      left: rowMenuPlacement.left,
                    }}
                  >
	                    {statusActionOptions(req).map((status) => (
	                      <button
	                        key={status}
	                        type="button"
	                        disabled={actionBusy}
	                        className={`w-full px-3 py-2 text-left text-[12px] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60 ${statusActionTone(status)}`}
	                        onClick={() => openStatusAction(req, status)}
	                      >
	                        {statusActionLabel(status)}
	                      </button>
	                    ))}
	                    <button
	                      type="button"
	                      className="w-full px-3 py-2 text-left text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => {
                        setDetailRequest(req);
                        setRowMenuId(null);
                      }}
	                    >
	                      View request
	                    </button>
	                    <button
	                      type="button"
	                      disabled={actionBusy}
	                      className="w-full px-3 py-2 text-left text-[12px] text-[#d80509] hover:bg-[#fafafa] disabled:cursor-not-allowed disabled:opacity-60"
	                      onClick={() => openDeleteAction(req)}
	                    >
	                      {req.status === "Pending" ? "Delete request" : "Remove placement"}
	                    </button>
	                  </div>
                )}
              </div>
            </div>
          ))}
            </div>
          </div>

          {pageRows.length === 0 && (
            <div className="py-8 text-center text-[14px] text-[#666d80]">
              {isInitialRequestsLoad ? "Loading requests..." : "No requests match your filters."}
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          <button
            type="button"
            disabled={safePage <= 1}
            className="min-w-[32px] min-h-[32px] flex items-center justify-center rotate-90 text-gray-500 disabled:opacity-40 rounded-lg hover:bg-gray-100"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous page"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1">
            {visiblePages.map((item, i) =>
              item === "ellipsis" ? (
                <span key={`e-${i}`} className="min-w-[32px] min-h-[32px] flex items-center justify-center text-[#666d80] text-[12px] font-semibold">
                  ...
                </span>
              ) : (
                <button
                  key={item}
                  type="button"
                  className={`min-w-[32px] min-h-[32px] flex items-center justify-center rounded-[9px] text-[12px] font-semibold transition-colors ${
                    item === safePage ? "bg-[#14c1d5] text-white" : "text-[#666d80] hover:bg-gray-100"
                  }`}
                  onClick={() => setPage(item)}
                >
                  {item}
                </button>
              ),
            )}
          </div>
          <button
            type="button"
            disabled={safePage >= totalPages}
            className="min-w-[32px] min-h-[32px] flex items-center justify-center -rotate-90 text-gray-500 disabled:opacity-40 rounded-lg hover:bg-gray-100"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label="Next page"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {detailRequest && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="request-detail-title"
        >
          <div className="relative w-full max-w-md rounded-[18px] border border-[#f0f0f0] bg-white p-6 shadow-lg">
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setDetailRequest(null)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 id="request-detail-title" className="pr-8 text-lg font-semibold text-[#272932]">
              Request summary
            </h2>
            <dl className="mt-4 space-y-2 text-[14px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Student</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRequest.student}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Parent</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRequest.parent}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Class</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRequest.class}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Block</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRequest.block}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Level</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRequest.level}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Option</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRequest.option}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Status</dt>
                <dd>
                  <span className={`rounded-[6px] border px-2 py-1 text-[10px] font-semibold ${statusBadgeClass(detailRequest.status)}`}>
                    {detailRequest.status}
                  </span>
                </dd>
              </div>
	            </dl>
	            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-2">
	              {statusActionOptions(detailRequest).map((status) => (
	                <button
	                  key={status}
	                  type="button"
	                  disabled={actionBusy}
	                  className={`inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#dfe1e6] px-3 py-2 text-[12px] font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${statusActionTone(status)} hover:bg-[#fafafa]`}
	                  onClick={() => {
	                    setDetailRequest(null);
	                    openStatusAction(detailRequest, status);
	                  }}
	                >
	                  {status === "Pending" ? <RotateCcw className="h-4 w-4" /> : null}
	                  {statusActionLabel(status)}
	                </button>
	              ))}
	              <button
	                type="button"
	                disabled={actionBusy}
	                className="inline-flex items-center justify-center gap-2 rounded-[8px] border border-[#ffd9d9] px-3 py-2 text-[12px] font-semibold text-[#d80509] hover:bg-[#fff5f5] disabled:cursor-not-allowed disabled:opacity-60"
	                onClick={() => {
	                  setDetailRequest(null);
	                  openDeleteAction(detailRequest);
	                }}
	              >
	                <Trash2 className="h-4 w-4" />
	                {detailRequest.status === "Pending" ? "Delete request" : "Remove placement"}
	              </button>
	            </div>
	            <div className="mt-6 flex justify-end">
	              <button
	                type="button"
                disabled={actionBusy}
                className="rounded-[8px] bg-[#14c1d5] px-4 py-2 text-[12px] font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                onClick={() => setDetailRequest(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmAction && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-request-title"
        >
          <div className="relative w-full max-w-md rounded-[18px] border border-[#f0f0f0] bg-white p-6 shadow-lg">
	            <button
	              type="button"
	              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
	              onClick={() => {
	                setConfirmAction(null);
	                setReasonDraft("");
	              }}
	              aria-label="Close"
	            >
              <X className="w-5 h-5" />
	            </button>
	            <h2 id="confirm-request-title" className="pr-8 text-lg font-semibold text-[#272932]">
	              {confirmActionTitle(confirmAction)}
	            </h2>
	            <p className="mt-2 text-[14px] text-[#666d80]">
	              {confirmActionBody(confirmAction)}
	            </p>
	            <label className="mt-4 block text-[12px] font-semibold uppercase tracking-wide text-[#666d80]" htmlFor="request-action-reason">
	              Correction note
	            </label>
	            <textarea
	              id="request-action-reason"
	              value={reasonDraft}
	              onChange={(e) => setReasonDraft(e.target.value)}
	              placeholder="Optional note for the decision history"
	              className="mt-2 min-h-[86px] w-full resize-none rounded-[8px] border border-[#dfe1e6] bg-white px-3 py-2 text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
	            />
	            <div className="mt-6 flex justify-end gap-3">
	              <button
	                type="button"
	                disabled={actionBusy}
	                className="rounded-[8px] bg-[#fafafa] px-4 py-2 text-[12px] font-semibold text-[#0d0d12] disabled:cursor-not-allowed disabled:opacity-60"
	                onClick={() => {
	                  setConfirmAction(null);
	                  setReasonDraft("");
	                }}
	              >
	                Cancel
	              </button>
	              <button
	                type="button"
	                disabled={actionBusy}
	                className={`rounded-[8px] px-4 py-2 text-[12px] font-semibold text-white ${
	                  confirmAction.type === "delete"
	                    ? "bg-[#d80509]"
	                    : confirmAction.status === "Approved"
	                    ? "bg-[#004d08]"
	                    : confirmAction.status === "Waitlisted"
	                      ? "bg-[#cfa500]"
	                      : confirmAction.status === "Pending"
	                        ? "bg-[#272932]"
	                        : "bg-[#d80509]"
	                } disabled:cursor-not-allowed disabled:opacity-60`}
	                onClick={() => {
	                  const note = reasonDraft.trim() || undefined;
	                  if (confirmAction.type === "delete") {
	                    void deleteRequest(confirmAction.request.id, note);
	                    return;
	                  }
	                  void applyStatus(confirmAction.request.id, confirmAction.status, note);
	                }}
	              >
	                {actionBusy ? "Working..." : "Confirm"}
	              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
