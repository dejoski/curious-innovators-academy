"use client";

import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Clock, ListPlus, X, XCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { DashboardBulkSelectionBar } from "@/components/dashboard-row-actions";
import { useClassesDataCache } from "@/components/classes-data-cache";
import { DashboardValueSkeleton } from "@/components/dashboard-loading-state";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useFixedMenuPlacement } from "@/hooks/use-fixed-menu-placement";
import { downloadCsv } from "@/lib/client-directory-actions";
import type { ApprovalHistoryRow } from "@/lib/data/repositories/requests";
import { getVisibleDashboardPages } from "@/lib/dashboard-pagination";

const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector3 = "/images/vector.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";

type ApprovalStatus = "Approved" | "Waitlisted" | "Rejected";

type ApprovalRow = ApprovalHistoryRow;

const PAGE_SIZE = 10;

type SortKey = keyof Pick<
  ApprovalRow,
  "student" | "parent" | "className" | "block" | "option" | "status" | "reviewedBy" | "reviewedAt" | "reason"
>;
type FilterValue = "All" | ApprovalStatus;

function ClassesApprovalHistoryClient() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#666d80]">Loading...</div>}>
      <ClassesApprovalHistory />
    </Suspense>
  );
}

export function ClassesApprovalHistory() {
  const searchParams = useSearchParams();
  const detailIdFromUrl = searchParams.get("detail");
  const classesCache = useClassesDataCache();
  const [rows, setRows] = useState<ApprovalRow[]>(() => classesCache.approvals.data ?? []);
  const [dataHint, setDataHint] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);

  const stats = useMemo(() => {
    const approved = rows.filter((r) => r.status === "Approved").length;
    const waitlisted = rows.filter((r) => r.status === "Waitlisted").length;
    const rejected = rows.filter((r) => r.status === "Rejected").length;
    return {
      total: rows.length,
      approved,
      waitlisted,
      rejected,
    };
  }, [rows]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("All");
  const [sortKey, setSortKey] = useState<SortKey>("reviewedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState<string | null>(null);
  const [detailRow, setDetailRow] = useState<ApprovalRow | null>(null);

  useEffect(() => {
    if (detailIdFromUrl) {
      const row = rows.find((r) => r.id === detailIdFromUrl);
      if (row) setDetailRow(row);
    }
  }, [detailIdFromUrl, rows]);

  useEffect(() => {
    let cancelled = false;
    async function loadApprovals() {
      if (classesCache.approvals.data) {
        setRows(classesCache.approvals.data);
      } else {
        const nextRows = await classesCache.loadApprovals();
        if (cancelled) return;
        setRows(nextRows);
      }
      setDataHint(
        classesCache.approvals.error
          ? `Could not load approval history: ${classesCache.approvals.error}.`
          : classesCache.approvals.source === "fallback"
            ? "Showing starter decisions while approval records finish loading."
            : classesCache.approvals.source === "unavailable"
              ? "Approval history is temporarily unavailable."
              : null,
      );
    }
    loadApprovals();
    return () => {
      cancelled = true;
    };
  }, [classesCache]);

  const filterRef = useRef<HTMLDivElement | null>(null);
  const sortRef = useRef<HTMLDivElement | null>(null);
  const rowMenuRef = useRef<HTMLDivElement | null>(null);
  const rowMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const rowMenuPlacement = useFixedMenuPlacement(rowMenuId !== null, rowMenuAnchorRef, 160);

  useClickOutside(filterRef, () => setFilterOpen(false), filterOpen);
  useClickOutside(sortRef, () => setSortOpen(false), sortOpen);
  useClickOutside(rowMenuRef, () => setRowMenuId(null), rowMenuId !== null);

  const processed = useMemo(() => {
    const q = search.trim().toLowerCase();
    let filteredRows = rows.filter((row) => {
      if (filter !== "All" && row.status !== filter) return false;
      if (!q) return true;
      const hay = [
        row.student,
        row.parent,
        row.className,
        row.block,
        row.option,
        row.status,
        row.reviewedBy,
        row.reviewedAt,
        row.reason,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    filteredRows = [...filteredRows].sort((a, b) => {
      const av = sortKey === "reviewedAt" ? String(a.reviewedAtIso ?? "") : String(a[sortKey]);
      const bv = sortKey === "reviewedAt" ? String(b.reviewedAtIso ?? "") : String(b[sortKey]);
      const cmp = av.localeCompare(bv, undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
    return filteredRows;
  }, [rows, search, filter, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return processed.slice(start, start + PAGE_SIZE);
  }, [processed, safePage]);

  const visiblePages = getVisibleDashboardPages(safePage, totalPages);
  const hasResolvedApprovals = Boolean(classesCache.approvals.loadedAt);
  const isInitialApprovalsLoad = !hasResolvedApprovals && (classesCache.approvals.loading || rows.length === 0);
  const statValue = (value: number) =>
    isInitialApprovalsLoad ? <DashboardValueSkeleton className="h-5 w-10" /> : value;
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(pageRows.map((row) => row.id)));
  };

  const sortLabels: [SortKey, string][] = [
    ["student", "Student"],
    ["parent", "Parent"],
    ["className", "Class"],
    ["block", "Block"],
    ["option", "Option"],
    ["status", "Final Status"],
    ["reviewedBy", "Reviewed by"],
    ["reviewedAt", "Reviewed at"],
    ["reason", "Reason"],
  ];

  const exportRow = async (row: ApprovalRow) => {
    const text = JSON.stringify(row, null, 2);
    try {
      await navigator.clipboard.writeText(text);
      setActionHint("Record copied to clipboard.");
    } catch {
      const url = URL.createObjectURL(new Blob([text], { type: "application/json;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `approval-${row.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setActionHint("Clipboard was unavailable, so the approval record was downloaded.");
    }
  };

  const exportSelectedApprovals = () => {
    const selectedRows = processed.filter((row) => selectedIds.has(row.id));
    downloadCsv(
      "approval-history-selected.csv",
      ["Student", "Parent", "Class", "Block", "Option", "Final Status", "Reviewed By", "Reviewed At", "Requested At", "Reason"],
      selectedRows.map((row) => [
        row.student,
        row.parent,
        row.className,
        row.block,
        row.option,
        row.status,
        row.reviewedBy,
        row.reviewedAt,
        row.requestedAt ?? "",
        row.reason,
      ]),
    );
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-[4px] items-start w-full">
        <h1 className="font-bold text-[#272932] text-[28px] leading-[1.1]">
          Approval history
        </h1>
        <p className="font-normal text-[#666d80] text-[16px] leading-[1.4]">
          Review completed enrichment decisions: outcome, reviewer, and notes for each request.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex items-center gap-[10px] shadow-sm">
          <div className="bg-[#fff8e6] rounded-[10px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-[#cfa500]" aria-hidden strokeWidth={2} />
          </div>
          <div className="flex min-w-0 flex-col leading-snug">
            <p className="break-words text-[15px] font-semibold text-[#272932]">Total decisions</p>
            <p className="text-[16px] font-medium text-[#666d80]">{statValue(stats.total)}</p>
          </div>
        </div>
        
        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex items-center gap-[10px] shadow-sm">
          <div className="bg-[#d9e7d8] rounded-[10px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#004d08]" aria-hidden strokeWidth={2} />
          </div>
          <div className="flex min-w-0 flex-col leading-snug">
            <p className="break-words text-[15px] font-semibold text-[#272932]">Approved</p>
            <p className="text-[16px] font-medium text-[#666d80]">{statValue(stats.approved)}</p>
          </div>
        </div>

        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex items-center gap-[10px] shadow-sm">
          <div className="bg-[#fff8e6] rounded-[10px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
            <ListPlus className="w-5 h-5 text-[#cfa500]" aria-hidden strokeWidth={2} />
          </div>
          <div className="flex min-w-0 flex-col leading-snug">
            <p className="break-words text-[15px] font-semibold text-[#272932]">Waitlisted</p>
            <p className="text-[16px] font-medium text-[#666d80]">{statValue(stats.waitlisted)}</p>
          </div>
        </div>

        <div className="min-w-0 bg-white border border-[#f0f0f0] rounded-[18px] p-[14px] flex items-center gap-[10px] shadow-sm">
          <div className="bg-[#ffd9d9] rounded-[10px] w-[40px] h-[40px] flex items-center justify-center shrink-0">
            <XCircle className="w-5 h-5 text-[#d80509]" aria-hidden strokeWidth={2} />
          </div>
          <div className="flex min-w-0 flex-col leading-snug">
            <p className="break-words text-[15px] font-semibold text-[#272932]">Rejected</p>
            <p className="text-[16px] font-medium text-[#666d80]">{statValue(stats.rejected)}</p>
          </div>
        </div>
      </div>

      {dataHint && (
        <div className="rounded-[12px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-3 text-sm text-[#7a5b00] font-medium">
          {dataHint}
        </div>
      )}
      {actionHint && (
        <div className="rounded-[12px] border border-[#004d08]/20 bg-[#f1fbf3] px-4 py-3 text-sm text-[#004d08] font-medium">
          {actionHint}
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white border border-[#f0f0f0] rounded-[18px] flex flex-col shadow-sm w-full overflow-visible">
        
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 w-full gap-4">
          <div className="flex gap-[6px] items-center">
            <img alt="Search" className="size-[14px]" src={imgMaterialSymbolsSearch} />
            <input 
              type="text" 
              placeholder="Search..." 
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="text-[#0d0d12] text-[12px] bg-transparent outline-none placeholder:text-[#0d0d12] min-w-[200px]"
            />
          </div>
          <div className="flex flex-wrap gap-[16px] items-center">
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                className="bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setFilterOpen((o) => !o);
                  setSortOpen(false);
                }}
              >
                <img alt="Filter" className="size-[14px]" src={imgVector3} />
                <span className="text-[#0d0d12] text-[12px]">Filter by: {filter}</span>
                <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-[100] mt-1 min-w-[160px] rounded-lg border border-[#f0f0f0] bg-white py-1 shadow-md">
                  {(["All", "Approved", "Waitlisted", "Rejected"] as const).map((opt) => (
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
                className="bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
                onClick={() => {
                  setSortOpen((o) => !o);
                  setFilterOpen(false);
                }}
              >
                <img alt="Sort" className="size-[14px]" src={imgFlowbiteSortOutline} />
                <span className="text-[#0d0d12] text-[12px]">Sort</span>
                <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-[100] mt-1 min-w-[200px] rounded-lg border border-[#f0f0f0] bg-white py-1 shadow-md">
                  {sortLabels.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => {
                        if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        else {
                          setSortKey(key);
                          setSortDir("asc");
                        }
                        setSortOpen(false);
                      }}
                    >
                      <span>{label}</span>
                      {sortKey === key && (
                        <span className="text-[10px] text-[#666d80]">{sortDir === "asc" ? "A→Z" : "Z→A"}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="bg-[#fafafa] flex items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
              onClick={toggleSelectAllPage}
            >
              <span className="text-[#0d0d12] text-[12px]">
                {selectedIds.size > 0 ? `Clear selected (${selectedIds.size})` : "Select visible"}
              </span>
            </button>
          </div>
        </div>

        <DashboardBulkSelectionBar count={selectedIds.size} noun="approval" onClear={() => setSelectedIds(new Set())}>
          <button
            type="button"
            onClick={exportSelectedApprovals}
            className="rounded-md bg-[#14c1d5] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#11adbf]"
          >
            Download selected CSV
          </button>
        </DashboardBulkSelectionBar>

        <div className="overflow-x-auto w-full min-w-0 pb-2">
          <div className="min-w-[1080px]">
            {/* Table Header Columns */}
            <div className="grid grid-cols-[13fr_10fr_14fr_9fr_8fr_10fr_11fr_13fr_12fr_5fr] border-t border-[#f0f0f0] py-3 px-4 w-full items-center">
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide">Student</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide">Parent</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide">Class</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide text-center">Block</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide text-center">Option</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide text-center">Final status</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide text-center">Reviewed by</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide text-center">Reviewed at</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide text-center">Reason</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide text-center"> </div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col w-full">
              {pageRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[13fr_10fr_14fr_9fr_8fr_10fr_11fr_13fr_12fr_5fr] border-t border-[#f0f0f0] hover:bg-[#fafafa] transition-colors py-2.5 px-4 w-full items-center">
                  
                  {/* Student */}
                  <div className="flex gap-[8px] items-center">
                    <button
                      type="button"
                      className={`rounded-[4px] shrink-0 size-[14px] border border-[#14c1d5] ${
                        selectedIds.has(row.id) ? "bg-[#14c1d5] opacity-100" : "bg-[#d2f1f5] opacity-50"
                      }`}
                      onClick={() => toggleSelect(row.id)}
                      aria-pressed={selectedIds.has(row.id)}
                    />
                    <span className="text-[#0d0d12] text-[13px]">
                      {row.student}
                    </span>
                  </div>
                  
                  {/* Parent */}
                  <div className="text-[#0d0d12] text-[13px]">
                    {row.parent}
                  </div>
                  
                  {/* Class */}
                  <div className="text-[#0d0d12] text-[13px]">
                    {row.className}
                  </div>
                  
                  {/* Block */}
                  <div className="text-[#0d0d12] text-[13px] text-center">
                    {row.block}
                  </div>
                  
                  {/* Option */}
                  <div className="text-[#0d0d12] text-[13px] text-center">
                    {row.option}
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    {row.status === "Approved" ? (
                      <div className="bg-[rgba(0,77,8,0.2)] border border-[rgba(0,77,8,0.5)] px-[8px] py-[2px] rounded-[6px]">
                        <span className="text-[#004d08] text-[10px]">Approved</span>
                      </div>
                    ) : row.status === "Waitlisted" ? (
                      <div className="bg-[#fff8e6] border border-[#cfa500]/50 px-[8px] py-[2px] rounded-[6px]">
                        <span className="text-[#7a5b00] text-[10px]">Waitlisted</span>
                      </div>
                    ) : (
                      <div className="bg-[#ffd9d9] border border-[rgba(216,5,9,0.5)] px-[8px] py-[2px] rounded-[6px]">
                        <span className="text-[#d80509] text-[10px]">Rejected</span>
                      </div>
                    )}
                  </div>

                  {/* Reviewed by */}
                  <div className="text-[#0d0d12] text-[13px] text-center">
                    {row.reviewedBy}
                  </div>

                  {/* Reviewed at */}
                  <div className="text-[#0d0d12] text-[12px] text-center">
                    {row.reviewedAt}
                  </div>

                  {/* Reason */}
                  <div className="italic text-[#666d80] text-[13px] text-center">
                    {row.reason}
                  </div>
                  
                  {/* Action */}
                  <div
                    className="relative flex items-center justify-center"
                    ref={rowMenuId === row.id ? rowMenuRef : null}
                  >
                    <button
                      type="button"
                      ref={rowMenuId === row.id ? rowMenuAnchorRef : null}
                      className="size-[24px] hover:opacity-70 transition-opacity"
                      onClick={() => setRowMenuId((id) => (id === row.id ? null : row.id))}
                      aria-expanded={rowMenuId === row.id}
                    >
                      <img alt="More" className="size-full" src={imgWeuiMoreOutlined} />
                    </button>
                    {rowMenuId === row.id && rowMenuPlacement && (
                      <div
                        className="fixed z-[70] w-[160px] rounded-lg border border-[#f0f0f0] bg-white py-1 shadow-md text-left"
                        style={{
                          top: rowMenuPlacement.top,
                          left: rowMenuPlacement.left,
                        }}
                      >
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
                          onClick={() => {
                            setDetailRow(row);
                            setRowMenuId(null);
                          }}
                        >
                          View decision
                        </button>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
                          onClick={() => {
                            void exportRow(row);
                            setRowMenuId(null);
                          }}
                        >
                          Copy record
                        </button>
                      </div>
                    )}
                  </div>

                </div>
              ))}
            </div>
          </div>
        </div>

        {pageRows.length === 0 && (
          <div className="border-t border-[#f0f0f0] py-8 text-center text-[14px] text-[#666d80]">
            {isInitialApprovalsLoad ? "Loading approvals..." : "No approvals match your filters."}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center py-4 border-t border-[#f0f0f0]">
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              disabled={safePage <= 1}
              className="hover:opacity-70 transition-opacity disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
            </button>
            <div className="flex gap-[3px] items-center">
              {visiblePages.map((item, i) =>
                item === "ellipsis" ? (
                  <span key={`e-${i}`} className="px-1 font-semibold text-[12px] text-[#666d80]">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`rounded-[9px] size-[24px] flex items-center justify-center font-semibold text-[12px] font-semibold ${
                      item === safePage
                        ? "bg-[#14c1d5] text-white"
                        : "text-[#666d80] hover:bg-gray-100"
                    }`}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
            <button
              type="button"
              disabled={safePage >= totalPages}
              className="hover:opacity-70 transition-opacity disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>

      {detailRow && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="approval-detail-title"
        >
          <div className="relative w-full max-w-md rounded-[18px] border border-[#f0f0f0] bg-white p-6 shadow-lg">
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setDetailRow(null)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 id="approval-detail-title" className="pr-8 text-lg font-semibold text-[#272932]">
              Approval decision
            </h2>
            <dl className="mt-4 space-y-2 text-[14px]">
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Student</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRow.student}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Parent</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRow.parent}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Class</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRow.className}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Block</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRow.block}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Option</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRow.option}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Status</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRow.status}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Reviewed by</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRow.reviewedBy}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-[#666d80]">Reviewed at</dt>
                <dd className="font-medium text-[#0d0d12]">{detailRow.reviewedAt}</dd>
              </div>
              {detailRow.requestedAt && detailRow.requestedAt !== "Not recorded" && (
                <div className="flex justify-between gap-4">
                  <dt className="text-[#666d80]">Requested at</dt>
                  <dd className="font-medium text-[#0d0d12]">{detailRow.requestedAt}</dd>
                </div>
              )}
              <div className="pt-2">
                <dt className="text-[#666d80]">Reason</dt>
                <dd className="mt-1 italic text-[#0d0d12]">{detailRow.reason}</dd>
              </div>
            </dl>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg border border-[#f0f0f0] px-4 py-2 text-[12px] font-semibold text-[#0d0d12] hover:bg-[#fafafa]"
                onClick={() => void exportRow(detailRow)}
              >
                Copy record
              </button>
              <button
                type="button"
                className="rounded-lg bg-[#14c1d5] px-4 py-2 text-[12px] font-semibold text-white hover:bg-[#11abbd]"
                onClick={() => setDetailRow(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
