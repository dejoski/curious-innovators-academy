"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import type { ProgramTrack, SchoolClassRow } from "@/lib/data/types";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { fallbackClassesStripText } from "@/lib/product-copy";

const imgFlowbiteSortOutline = "/images/icon-generic.svg";
const imgIcRoundPlus = "/images/icon-generic.svg";
const imgWeuiMoreOutlined = "/images/icon-generic.svg";
const imgChevronPrev = "/images/icon-generic.svg";
const imgChevronNext = "/images/icon-generic.svg";

type ClassStatus = "Active" | "Full";

const PAGE_SIZE = 10;

export type ClassesPageClientProps = {
  initialClasses: SchoolClassRow[];
  dataSource: DataSource;
  /** Default tab when opening from `/dashboard/classes/core` or `.../enrichment`. */
  initialTrack?: ProgramTrack;
};

type SortKey =
  | "name"
  | "teacher"
  | "level"
  | "block"
  | "schedule"
  | "pendingCount"
  | "waitlistCount"
  | "students"
  | "status";

const SORT_LABELS: Record<SortKey, string> = {
  name: "Class name",
  teacher: "Teacher",
  level: "Level",
  block: "Block",
  schedule: "Schedule",
  pendingCount: "Pending",
  waitlistCount: "Waitlist",
  students: "Seats",
  status: "Class status",
};

type VisibilityFilter = "all" | "active" | "inactive";

function dash(text: string): string {
  const t = text.trim();
  return t.length > 0 ? t : "—";
}

function getVisiblePages(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, "ellipsis", total];
  if (current >= total - 2) return [1, "ellipsis", total - 2, total - 1, total];
  return [1, "ellipsis", current, "ellipsis", total];
}

function parseStudentsSort(s: string): [number, number] {
  const m = /^(\d+)\s*\/\s*(\d+)$/.exec(s.trim());
  if (!m) return [0, 0];
  return [Number(m[1]), Number(m[2])];
}

function nextClassId(classes: SchoolClassRow[]) {
  let max = 0;
  for (const c of classes) {
    const n = Number.parseInt(String(c.id), 10);
    if (Number.isFinite(n)) max = Math.max(max, n);
  }
  return String(max + 1);
}

function computeAnchoredMenuPosition(triggerEl: HTMLElement) {
  const r = triggerEl.getBoundingClientRect();
  const MENU_W = 160;
  const MENU_H = 132;
  let left = Math.max(8, r.right - MENU_W);
  if (left + MENU_W > window.innerWidth - 8) left = Math.max(8, window.innerWidth - MENU_W - 8);
  let top = r.bottom + 4;
  if (top + MENU_H > window.innerHeight - 8) top = Math.max(8, r.top - MENU_H - 4);
  return { top, left };
}

async function readApiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export default function ClassesPageClient({
  initialClasses,
  dataSource,
  initialTrack = "core",
}: ClassesPageClientProps) {
  const router = useRouter();
  const [classes, setClasses] = useState<SchoolClassRow[]>(initialClasses);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [trackTab, setTrackTab] = useState<ProgramTrack>(initialTrack);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [sortOpen, setSortOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const sortRef = useRef<HTMLDivElement | null>(null);
  const rowMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const rowMenuTriggerRef = useRef<HTMLElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setTrackTab(initialTrack);
  }, [initialTrack]);

  useEffect(() => {
    if (!syncHint) return;
    const t = window.setTimeout(() => setSyncHint(null), 9000);
    return () => window.clearTimeout(t);
  }, [syncHint]);

  const processedIdsMemo = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = classes.filter((c) => c.program === trackTab);

    if (visibilityFilter === "active") {
      rows = rows.filter((c) => c.status === "Active");
    } else if (visibilityFilter === "inactive") {
      rows = rows.filter((c) => c.status === "Full");
    }

    if (q.length > 0) {
      rows = rows.filter((c) => {
        const hay = [
          c.name,
          c.teacher,
          c.students,
          c.schedule,
          c.level,
          c.block,
          String(c.pendingCount),
          String(c.waitlistCount),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }

    rows.sort((a, b) => {
      if (sortKey === "students") {
        const [ac, aa] = parseStudentsSort(a.students);
        const [bc, ba] = parseStudentsSort(b.students);
        const fillA = aa > 0 ? ac / aa : 0;
        const fillB = ba > 0 ? bc / ba : 0;
        const cmp = fillA === fillB ? ac - bc : fillA - fillB;
        return sortDir === "asc" ? cmp : -cmp;
      }
      if (sortKey === "pendingCount" || sortKey === "waitlistCount") {
        const cmp = a[sortKey] - b[sortKey];
        return sortDir === "asc" ? cmp : -cmp;
      }
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = String(av).localeCompare(String(bv), undefined, { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });

    return { rows, count: rows.length };
  }, [classes, trackTab, visibilityFilter, search, sortKey, sortDir]);

  const processed = processedIdsMemo.rows;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    const n = processedIdsMemo.count;
    el.indeterminate = selectedIds.size > 0 && selectedIds.size < n;
  }, [selectedIds, processedIdsMemo.count]);

  useClickOutside(sortRef as React.RefObject<HTMLElement | null>, () => setSortOpen(false), sortOpen);

  useLayoutEffect(() => {
    if (rowMenu === null) {
      rowMenuTriggerRef.current = null;
      return;
    }
    rowMenuTriggerRef.current =
      (document.querySelector(`[data-classes-row-trigger="${rowMenu.id}"]`) as HTMLElement | null) ?? null;

    const onScrollResize = () => {
      const t = rowMenuTriggerRef.current;
      if (!t) return;
      const pos = computeAnchoredMenuPosition(t);
      setRowMenu((prev) => (prev ? { ...prev, ...pos } : null));
    };
    window.addEventListener("scroll", onScrollResize, true);
    window.addEventListener("resize", onScrollResize);
    return () => {
      window.removeEventListener("scroll", onScrollResize, true);
      window.removeEventListener("resize", onScrollResize);
    };
  }, [rowMenu?.id]);

  useClickOutside(
    [rowMenuTriggerRef, rowMenuPanelRef as React.RefObject<HTMLElement | null>],
    () => setRowMenu(null),
    rowMenu !== null,
  );

  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return processed.slice(start, start + PAGE_SIZE);
  }, [processed, safePage]);

  const visiblePages = getVisiblePages(safePage, totalPages);

  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, trackTab, visibilityFilter]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const allowed = new Set(classes.filter((c) => c.program === trackTab).map((c) => c.id));
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
      }
      return next;
    });
  }, [trackTab, classes]);

  const deleteClassById = async (id: string) => {
    const removed = classes.find((c) => c.id === id);
    setClasses((prev) => prev.filter((c) => c.id !== id));
    setPendingDeleteId(null);
    setRowMenu(null);
    const res = await fetch(`/api/data/classes?id=${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    });
    if (!res.ok && removed) {
      setClasses((prev) => [...prev, removed].sort((a, b) => String(a.id).localeCompare(String(b.id))));
      setSyncHint(`Could not delete in cloud (${await readApiError(res)}). Row restored here.`);
    }
  };

  const duplicateClassById = async (id: string) => {
    const row = classes.find((c) => c.id === id);
    if (!row) return;
    const name = `${row.name} (copy)`;
    const res = await fetch("/api/data/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        teacher: row.teacher,
        students: row.students,
        schedule: row.schedule,
        status: row.status,
        track: row.program,
      }),
    });
    setRowMenu(null);
    if (res.ok) {
      const body = (await res.json()) as { class: SchoolClassRow };
      setClasses((prev) => [...prev, body.class]);
      return;
    }
    const copy: SchoolClassRow = {
      ...row,
      id: nextClassId(classes),
      name,
    };
    setClasses((prev) => [...prev, copy]);
    setSyncHint(`Duplicated locally only (${await readApiError(res)}).`);
  };

  const goToClassDetail = (row: SchoolClassRow) => {
    const segment = row.program === "enrichment" ? "enrichment" : "core";
    router.push(`/dashboard/classes/${segment}/${row.id}`);
  };

  const toggleSelectAllFiltered = () => {
    const ids = processed.map((c) => c.id);
    if (ids.length === 0) return;
    const allSelected = ids.every((id) => selectedIds.has(id));
    if (allSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
    }
  };

  const filterLabel =
    visibilityFilter === "all"
      ? "All classes"
      : visibilityFilter === "active"
        ? "Active classes"
        : "Inactive classes";

  return (
    <div className="w-full p-[24px] md:p-[32px]">
      <div className="mx-auto flex max-w-[1168px] flex-col gap-[24px]">
        <div className="flex flex-col gap-[16px] lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 flex-col gap-[8px]">
            <h1 className="font-sans text-[26px] font-bold leading-tight tracking-tight text-[#0d0d12] md:text-[28px]">
              Class Setup
            </h1>
            <p className="max-w-[560px] font-sans text-[14px] leading-relaxed text-[#666d80] md:text-[15px]">
              Create and configure core and enrichment classes for the upcoming term.
            </p>
          </div>

          <div
            className="inline-flex shrink-0 rounded-[10px] bg-[#ececee] p-[4px]"
            role="tablist"
            aria-label="Class program"
          >
            <button
              type="button"
              role="tab"
              aria-selected={trackTab === "core"}
              className={`rounded-[8px] px-[18px] py-[8px] font-sans text-[14px] font-medium transition-colors ${
                trackTab === "core"
                  ? "bg-[#14c1d5] text-white shadow-[0_1px_2px_rgba(13,13,18,0.08)]"
                  : "text-[#666d80] hover:text-[#272932]"
              }`}
              onClick={() => setTrackTab("core")}
            >
              Core
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={trackTab === "enrichment"}
              className={`rounded-[8px] px-[18px] py-[8px] font-sans text-[14px] font-medium transition-colors ${
                trackTab === "enrichment"
                  ? "bg-[#14c1d5] text-white shadow-[0_1px_2px_rgba(13,13,18,0.06)]"
                  : "text-[#666d80] hover:text-[#272932]"
              }`}
              onClick={() => setTrackTab("enrichment")}
            >
              Enrichment
            </button>
          </div>
        </div>

        {dataSource === "fallback" && (
          <p className="rounded-lg border border-[#dfe1e7] bg-[#f7f7f8] px-3 py-2 font-sans text-[13px] text-[#5c6370]">
            {fallbackClassesStripText()}
          </p>
        )}

        {syncHint && (
          <p className="rounded-lg border border-[#d80509]/30 bg-[#fff5f5] px-4 py-2 font-sans text-sm text-[#a00408]">
            {syncHint}
          </p>
        )}

        <div className="rounded-[12px] border border-[#ebecef] bg-white p-[20px] shadow-[0_1px_2px_rgba(13,13,18,0.04)] md:p-[24px]">
          <div className="mb-[16px] flex flex-col gap-[12px] xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-[10px] md:gap-[12px]">
              <div className="relative min-w-[200px] flex-1 sm:max-w-[280px]">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-[16px] -translate-y-1/2 text-[#a4aab8]"
                  aria-hidden
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full rounded-[8px] border border-[#dfe1e7] bg-white py-[9px] pl-[38px] pr-[12px] font-sans text-[13px] text-[#0d0d12] outline-none placeholder:text-[#a4aab8] focus:border-[#14c1d5]"
                />
              </div>

              <label className="flex shrink-0 items-center gap-2 font-sans text-[13px] text-[#666d80]">
                <span className="whitespace-nowrap">Filter by:</span>
                <select
                  value={visibilityFilter}
                  onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
                  className="rounded-[8px] border border-[#dfe1e7] bg-white px-[12px] py-[9px] font-sans text-[13px] text-[#272932] outline-none focus:border-[#14c1d5]"
                  aria-label="Filter classes"
                >
                  <option value="all">All classes</option>
                  <option value="active">Active classes</option>
                  <option value="inactive">Inactive classes</option>
                </select>
              </label>

              <div className="relative shrink-0" ref={sortRef}>
                <button
                  type="button"
                  className="flex items-center gap-2 rounded-[8px] border border-[#dfe1e7] bg-white px-[14px] py-[9px] font-sans text-[13px] text-[#666d80] hover:bg-[#fafafa]"
                  onClick={() => {
                    setSortOpen((o) => !o);
                    setRowMenu(null);
                  }}
                  aria-expanded={sortOpen}
                >
                  <img src={imgFlowbiteSortOutline} alt="" className="size-[15px]" />
                  Sort
                </button>
                {sortOpen && (
                  <div className="absolute left-0 top-full z-50 mt-1 w-[220px] rounded-lg border border-[#ebecef] bg-white py-1 shadow-md">
                    {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={`w-full px-3 py-2 text-left font-sans text-[13px] hover:bg-[#fafafa] ${
                          sortKey === key ? "font-semibold text-[#14c1d5]" : "text-[#0d0d12]"
                        }`}
                        onClick={() => {
                          setSortKey(key);
                          if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                          else setSortDir("asc");
                          setSortOpen(false);
                        }}
                      >
                        {SORT_LABELS[key]}
                        {sortKey === key && (
                          <span className="ml-1 text-[12px] text-[#666d80]">
                            ({sortDir === "asc" ? "asc" : "desc"})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex shrink-0 cursor-pointer items-center gap-2 font-sans text-[13px] text-[#272932]">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  className="size-[15px] rounded border-[#cfd3dc] accent-[#14c1d5]"
                  checked={processed.length > 0 && processed.every((c) => selectedIds.has(c.id))}
                  onChange={toggleSelectAllFiltered}
                  aria-label={`Select all ${filterLabel.toLowerCase()} in this tab`}
                />
                Select All
              </label>
            </div>

            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-2 rounded-[8px] bg-[#14c1d5] px-[14px] py-[9px] font-sans text-[13px] font-semibold text-white transition-colors hover:bg-[#12aebd]"
              onClick={() =>
                router.push(`/dashboard/classes/new?track=${trackTab}`)
              }
            >
              <img src={imgIcRoundPlus} alt="" className="size-[15px]" />
              {trackTab === "enrichment" ? "Add Enrichment Class" : "Add Core Class"}
            </button>
          </div>

          <div className="w-full overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[#ebecef]">
                  <th className="w-[40px] px-[8px] py-[8px]" aria-hidden />
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Class name
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Teacher
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Level
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Block
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Schedule
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Pending
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Waitlist
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Seats
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold uppercase tracking-[0.02em] text-[#8b919f]">
                    Status
                  </th>
                  <th className="w-[44px] px-[8px] py-[8px]" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {pageRows.map((cls) => (
                  <tr
                    key={cls.id}
                    className={`cursor-pointer border-b border-[#f4f4f6] transition-colors hover:bg-[#f6fbfc] ${
                      selectedIds.has(cls.id) ? "bg-[#eef8fa]" : ""
                    }`}
                    onClick={() => goToClassDetail(cls)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        goToClassDetail(cls);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                  >
                    <td className="px-[8px] py-[8px]" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        className="size-[15px] rounded border-[#cfd3dc] accent-[#14c1d5]"
                        checked={selectedIds.has(cls.id)}
                        onChange={() => {
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(cls.id)) next.delete(cls.id);
                            else next.add(cls.id);
                            return next;
                          });
                        }}
                        aria-label={`Select ${cls.name}`}
                      />
                    </td>
                    <td className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[12px] font-semibold text-[#0d0d12]">
                      {cls.name}
                    </td>
                    <td className="max-w-[140px] truncate px-[8px] py-[8px] font-sans text-[12px] text-[#5c6370]">
                      {cls.teacher}
                    </td>
                    <td className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[12px] text-[#5c6370]">
                      {dash(cls.level)}
                    </td>
                    <td className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[12px] text-[#5c6370]">
                      {dash(cls.block)}
                    </td>
                    <td className="max-w-[200px] truncate px-[8px] py-[8px] font-sans text-[12px] text-[#5c6370]">
                      {cls.schedule}
                    </td>
                    <td className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[12px] tabular-nums text-[#5c6370]">
                      {cls.pendingCount}
                    </td>
                    <td className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[12px] tabular-nums text-[#5c6370]">
                      {cls.waitlistCount}
                    </td>
                    <td className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[12px] tabular-nums text-[#5c6370]">
                      {cls.students}
                    </td>
                    <td className="whitespace-nowrap px-[8px] py-[8px]">
                      {cls.status === "Active" ? (
                        <span className="inline-flex items-center rounded-md border border-[rgba(0,77,8,0.45)] bg-[rgba(0,77,8,0.12)] px-2 py-[1px] font-sans text-[10px] font-medium text-[#004d08]">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md border border-[#cfd3dc] bg-[#f4f4f6] px-2 py-[1px] font-sans text-[10px] font-medium text-[#5c6370]">
                          Full
                        </span>
                      )}
                    </td>
                    <td className="relative px-[8px] py-[8px]" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        data-classes-row-trigger={cls.id}
                        className="text-[#8b919f] hover:text-[#0d0d12]"
                        aria-expanded={rowMenu?.id === cls.id}
                        aria-label={`Actions for ${cls.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSortOpen(false);
                          if (rowMenu?.id === cls.id) setRowMenu(null);
                          else setRowMenu({ id: cls.id, ...computeAnchoredMenuPosition(e.currentTarget) });
                        }}
                      >
                        <img src={imgWeuiMoreOutlined} alt="" className="size-[18px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {processed.length === 0 && (
            <div className="py-10 text-center font-sans text-[13px] text-[#666d80]">
              No classes match your filters.
            </div>
          )}

          {totalPages > 1 && processed.length > 0 && (
            <div className="flex items-center justify-center gap-3 pt-5">
              <button
                type="button"
                disabled={safePage <= 1}
                className="flex items-center justify-center rounded-md p-1 hover:bg-[#f4f4f6] disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <img src={imgChevronPrev} alt="" className="size-[18px] rotate-90" aria-hidden />
              </button>
              <div className="flex items-center gap-2">
                {visiblePages.map((item, i) =>
                  item === "ellipsis" ? (
                    <div
                      key={`e-${i}`}
                      className="min-w-[28px] px-2 py-2 text-center font-sans text-xs font-semibold text-[#666d80]"
                    >
                      ...
                    </div>
                  ) : (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setPage(item)}
                      className={`min-w-[28px] rounded-[8px] px-2 py-2 text-center font-sans text-xs font-semibold shadow-sm ${
                        item === safePage ? "bg-[#14c1d5] text-white" : "cursor-pointer text-[#666d80] hover:bg-[#f4f4f6]"
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
                className="flex items-center justify-center rounded-md p-1 hover:bg-[#f4f4f6] disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next page"
              >
                <img src={imgChevronNext} alt="" className="size-[18px] -rotate-90" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </div>

      {mounted &&
        rowMenu !== null &&
        document.body &&
        createPortal(
          <div
            ref={rowMenuPanelRef}
            className="fixed z-[300] w-[160px] rounded-lg border border-[#ebecef] bg-white py-1 shadow-md"
            role="menu"
            style={{ top: rowMenu.top, left: rowMenu.left }}
          >
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left font-sans text-[13px] text-[#0d0d12] hover:bg-[#fafafa]"
              onClick={(e) => {
                e.stopPropagation();
                const row = classes.find((c) => c.id === rowMenu.id);
                if (row) {
                  const segment = row.program === "enrichment" ? "enrichment" : "core";
                  router.push(`/dashboard/classes/edit/${segment}/${row.id}`);
                }
                setRowMenu(null);
              }}
            >
              Edit
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left font-sans text-[13px] text-[#0d0d12] hover:bg-[#fafafa]"
              onClick={(e) => {
                e.stopPropagation();
                duplicateClassById(rowMenu.id);
              }}
            >
              Duplicate
            </button>
            <button
              type="button"
              role="menuitem"
              className="w-full px-3 py-2 text-left font-sans text-[13px] text-[#d80509] hover:bg-[#fafafa]"
              onClick={(e) => {
                e.stopPropagation();
                setPendingDeleteId(rowMenu.id);
                setRowMenu(null);
              }}
            >
              Delete
            </button>
          </div>,
          document.body,
        )}

      {pendingDeleteId !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-class-title"
        >
          <div className="relative w-full max-w-md rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-lg">
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setPendingDeleteId(null)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <h2 id="delete-class-title" className="pr-8 font-sans text-xl font-bold text-[#0d0d12]">
              Delete class
            </h2>
            <p className="mt-2 font-sans text-sm text-[#666d80]">
              Delete{" "}
              <span className="font-semibold text-[#0d0d12]">
                {classes.find((c) => c.id === pendingDeleteId)?.name ?? "this class"}
              </span>
              ? This removes the class from the directory for all administrators.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md bg-[#fafafa] px-4 py-2 font-sans text-sm font-semibold text-[#0d0d12]"
                onClick={() => setPendingDeleteId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#d80509] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#c00408]"
                onClick={() => deleteClassById(pendingDeleteId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
