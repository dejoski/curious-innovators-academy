"use client";

import { Suspense, useMemo, useRef, useState, useEffect } from "react";
import { X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useClickOutside } from "@/hooks/use-click-outside";
import { useFixedMenuPlacement } from "@/hooks/use-fixed-menu-placement";
import type { EnrichmentRequestRow } from "@/lib/data/types";

const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector3 = "/images/vector.svg";
const imgIconCaretDown = "/images/icon-caret-down.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";
const imgChevronDown = "/images/icon-chevron-down.svg";
const imgChevronDown1 = "/images/icon-chevron-down2.svg";
const imgMaskGroup = "/images/mask-group.svg";
const imgMaskGroup1 = "/images/mask-group.svg";
const imgMaskGroup2 = "/images/mask-group.svg";

type ApprovalStatus = "Approved" | "Rejected";

type ApprovalRow = {
  id: string;
  student: string;
  parent: string;
  className: string;
  block: string;
  option: string;
  status: ApprovalStatus;
  reviewedBy: string;
  reason: string;
};

function toApprovalRow(row: EnrichmentRequestRow): ApprovalRow | null {
  if (row.status === "Pending") return null;
  return {
    id: row.id,
    student: row.student,
    parent: row.parent,
    className: row.class,
    block: row.block,
    option: row.option,
    status: row.status,
    reviewedBy: "School team",
    reason: row.status === "Approved" ? "Approved for placement" : "Not placed in this round",
  };
}

const PAGE_SIZE = 10;

type SortKey = keyof Pick<
  ApprovalRow,
  "student" | "parent" | "className" | "block" | "option" | "status" | "reviewedBy" | "reason"
>;
type FilterValue = "All" | ApprovalStatus;

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "ellipsis", total];
  if (current >= total - 2) return [1, "ellipsis", total - 2, total - 1, total];
  return [1, "ellipsis", current, "ellipsis", total];
}

export default function ClassesApprovalHistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#666d80]">Loading...</div>}>
      <ClassesApprovalHistory />
    </Suspense>
  );
}

function ClassesApprovalHistory() {
  const searchParams = useSearchParams();
  const detailIdFromUrl = searchParams.get("detail");
  const [rows, setRows] = useState<ApprovalRow[]>([]);
  const [dataHint, setDataHint] = useState<string | null>(null);
  const [actionHint, setActionHint] = useState<string | null>(null);

  const stats = useMemo(() => {
    const approved = rows.filter((r) => r.status === "Approved").length;
    const rejected = rows.filter((r) => r.status === "Rejected").length;
    const distinctClasses = new Set(rows.map((r) => r.className.trim()).filter(Boolean)).size;
    return {
      total: rows.length,
      approved,
      rejected,
      distinctClasses,
    };
  }, [rows]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterValue>("All");
  const [sortKey, setSortKey] = useState<SortKey>("student");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
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
      try {
        const res = await fetch("/api/data/enrichment-requests", { cache: "no-store" });
        if (!res.ok) throw new Error(res.statusText);
        const body = (await res.json()) as { requests?: EnrichmentRequestRow[]; source?: string };
        const nextRows = (body.requests ?? [])
          .map(toApprovalRow)
          .filter((x): x is ApprovalRow => x !== null);
        if (cancelled) return;
        setRows(nextRows);
        setDataHint(
          body.source === "fallback"
            ? "Showing sample decisions because cloud data is unavailable."
            : body.source === "unavailable"
              ? "Cloud decisions are unavailable. Ask an administrator to configure Supabase."
              : null,
        );
      } catch (error) {
        if (!cancelled) {
          setRows([]);
          setDataHint(
            `Could not load approval history: ${
              error instanceof Error ? error.message : String(error)
            }.`,
          );
        }
      }
    }
    loadApprovals();
    return () => {
      cancelled = true;
    };
  }, []);

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
        row.reason,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
    filteredRows = [...filteredRows].sort((a, b) => {
      const av = String(a[sortKey]);
      const bv = String(b[sortKey]);
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

  const visiblePages = getVisiblePages(safePage, totalPages);
  const pageIdSet = useMemo(() => new Set(pageRows.map((r) => r.id)), [pageRows]);
  const allOnPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) pageIdSet.forEach((id) => next.delete(id));
      else pageIdSet.forEach((id) => next.add(id));
      return next;
    });
  };

  const sortLabels: [SortKey, string][] = [
    ["student", "Student"],
    ["parent", "Parent"],
    ["className", "Class"],
    ["block", "Block"],
    ["option", "Option"],
    ["status", "Final Status"],
    ["reviewedBy", "Reviewed by"],
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

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col gap-[4px] items-start w-full">
        <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[28px] leading-[1.1]">
          Approval history
        </h1>
        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#666d80] text-[16px] leading-[1.4]">
          Review completed enrichment decisions: outcome, reviewer, and notes for each request.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex items-center gap-3 shadow-sm">
          <div className="bg-[rgba(207,165,0,0.2)] rounded-[10px] size-[40px] flex items-center justify-center shrink-0">
            <img alt="Total" className="size-[20px]" src={imgMaskGroup} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] leading-[1.4]">Total decisions</p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px] leading-[1.4]">{stats.total}</p>
          </div>
        </div>
        
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex items-center gap-3 shadow-sm">
          <div className="bg-[rgba(0,77,8,0.2)] rounded-[10px] size-[40px] flex items-center justify-center shrink-0">
            <img alt="Approved" className="size-[20px]" src={imgMaskGroup1} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] leading-[1.4]">Approved</p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px] leading-[1.4]">{stats.approved}</p>
          </div>
        </div>

        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex items-center gap-3 shadow-sm">
          <div className="bg-[#ffd9d9] rounded-[10px] size-[40px] flex items-center justify-center shrink-0">
            <img alt="Rejected" className="size-[20px]" src={imgMaskGroup2} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] leading-[1.4]">Rejected</p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px] leading-[1.4]">{stats.rejected}</p>
          </div>
        </div>

        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex items-center gap-3 shadow-sm">
          <div className="bg-[rgba(207,165,0,0.2)] rounded-[10px] size-[40px] flex items-center justify-center shrink-0">
            <img alt="Waitlisted" className="size-[20px]" src={imgMaskGroup} />
          </div>
          <div className="flex flex-col gap-1">
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] leading-[1.4]">Classes affected</p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px] leading-[1.4]">{stats.distinctClasses}</p>
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
              className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px] bg-transparent outline-none placeholder:text-[#0d0d12] min-w-[200px]"
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
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px]">Filter by: {filter}</span>
                <img alt="Dropdown" className="size-[14px]" src={imgIconCaretDown} />
              </button>
              {filterOpen && (
                <div className="absolute right-0 top-full z-[100] mt-1 min-w-[160px] rounded-lg border border-[#f0f0f0] bg-white py-1 shadow-md">
                  {(["All", "Approved", "Rejected"] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="w-full px-3 py-2 text-left font-['Inter:Regular',sans-serif] text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
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
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px]">Sort</span>
                <img alt="Dropdown" className="size-[14px]" src={imgIconCaretDown} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full z-[100] mt-1 min-w-[200px] rounded-lg border border-[#f0f0f0] bg-white py-1 shadow-md">
                  {sortLabels.map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left font-['Inter:Regular',sans-serif] text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
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
              <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px]">
                {allOnPageSelected ? "Deselect page" : "Select All"}
              </span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto w-full min-w-0 pb-2">
          <div className="min-w-[900px]">
            {/* Table Header Columns */}
            <div className="grid grid-cols-[15fr_12fr_15fr_8fr_8fr_12fr_12fr_12fr_6fr] border-t border-[#f0f0f0] py-3 px-4 w-full items-center">
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif]">Student</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif]">Parent</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif]">Class</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif] text-center">Block</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif] text-center">Option</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif] text-center">Final status</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif] text-center">Reviewed by</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif] text-center">Reason</div>
              <div className="text-[#8b919f] font-semibold text-[11px] uppercase tracking-wide font-['Inter:Semi_Bold',sans-serif] text-center"> </div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col w-full">
              {pageRows.map((row) => (
                <div key={row.id} className="grid grid-cols-[15fr_12fr_15fr_8fr_8fr_12fr_12fr_12fr_6fr] border-t border-[#f0f0f0] hover:bg-[#fafafa] transition-colors py-2.5 px-4 w-full items-center">
                  
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
                    <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[13px]">
                      {row.student}
                    </span>
                  </div>
                  
                  {/* Parent */}
                  <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[13px]">
                    {row.parent}
                  </div>
                  
                  {/* Class */}
                  <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[13px]">
                    {row.className}
                  </div>
                  
                  {/* Block */}
                  <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[13px] text-center">
                    {row.block}
                  </div>
                  
                  {/* Option */}
                  <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[13px] text-center">
                    {row.option}
                  </div>

                  {/* Status */}
                  <div className="flex justify-center">
                    {row.status === "Approved" ? (
                      <div className="bg-[rgba(0,77,8,0.2)] border border-[rgba(0,77,8,0.5)] px-[8px] py-[2px] rounded-[6px]">
                        <span className="font-['Inter:Regular',sans-serif] text-[#004d08] text-[10px]">Approved</span>
                      </div>
                    ) : (
                      <div className="bg-[#ffd9d9] border border-[rgba(216,5,9,0.5)] px-[8px] py-[2px] rounded-[6px]">
                        <span className="font-['Inter:Regular',sans-serif] text-[#d80509] text-[10px]">Rejected</span>
                      </div>
                    )}
                  </div>

                  {/* Reviewed by */}
                  <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[13px] text-center">
                    {row.reviewedBy}
                  </div>

                  {/* Reason */}
                  <div className="font-['Inter:Italic',sans-serif] italic text-[#666d80] text-[13px] text-center">
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
                          className="w-full px-3 py-2 text-left font-['Inter:Regular',sans-serif] text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
                          onClick={() => {
                            setDetailRow(row);
                            setRowMenuId(null);
                          }}
                        >
                          View decision
                        </button>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left font-['Inter:Regular',sans-serif] text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
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
          <div className="border-t border-[#f0f0f0] py-8 text-center font-['Inter:Regular',sans-serif] text-[14px] text-[#666d80]">
            No approvals match your filters.
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-center py-4 border-t border-[#f0f0f0]">
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              disabled={safePage <= 1}
              className="rotate-90 hover:opacity-70 transition-opacity disabled:opacity-40"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <img alt="Prev" className="size-[18px]" src={imgChevronDown} />
            </button>
            <div className="flex gap-[3px] items-center">
              {visiblePages.map((item, i) =>
                item === "ellipsis" ? (
                  <span key={`e-${i}`} className="px-1 font-['Inter:Semi_Bold',sans-serif] text-[12px] font-semibold text-[#666d80]">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setPage(item)}
                    className={`rounded-[9px] size-[24px] flex items-center justify-center font-['Inter:Semi_Bold',sans-serif] text-[12px] font-semibold ${
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
              className="-rotate-90 hover:opacity-70 transition-opacity disabled:opacity-40"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              <img alt="Next" className="size-[18px]" src={imgChevronDown1} />
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
