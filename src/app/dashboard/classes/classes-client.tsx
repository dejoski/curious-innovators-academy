"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import type { ProgramTrack, SchoolClassRow } from "@/lib/data/types";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useClickOutside } from "@/hooks/use-click-outside";
import { DashboardBulkImportModal, type ParsedImportRow } from "@/components/dashboard-bulk-import-modal";
import { useClassesDataCache } from "@/components/classes-data-cache";
import { DashboardBulkSelectionBar } from "@/components/dashboard-row-actions";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData } from "@/lib/client-data-cache";
import { downloadCsv } from "@/lib/client-directory-actions";

const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgIcRoundPlus = "/images/icon-plus.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";
const imgFilterFunnel = "/images/icon-filter-funnel.svg";
const imgCheckRounded = "/images/icon-check-rounded.svg";

type ClassStatus = "Active" | "Full";

const PAGE_SIZE = 10;

export type ClassesPageClientProps = {
  initialClasses: SchoolClassRow[];
  dataSource: DataSource;
  /** Default tab when opening from `/dashboard/classes/core` or `.../enrichment`. */
  initialTrack?: ProgramTrack;
  initialSelectedIds?: string[];
  onTrackChange?: (track: ProgramTrack) => void;
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

type VisibilityFilter = "all" | "active" | "full";

const VISIBILITY_FILTER_LABELS: Record<VisibilityFilter, string> = {
  all: "All Classes",
  active: "Active Classes",
  full: "Full Classes",
};

type ClassImportDraft = {
  name: string;
  teacher: string;
  students: string;
  schedule: string;
  status: ClassStatus;
  track: ProgramTrack;
  description?: string;
  level?: string;
  block?: string;
};

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

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (quoted) {
      if (ch === "\"" && next === "\"") {
        cell += "\"";
        i += 1;
      } else if (ch === "\"") {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === "\"") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

function headerKey(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function firstCsvValue(row: string[], headers: Map<string, number>, names: string[]): string {
  for (const name of names) {
    const idx = headers.get(headerKey(name));
    if (idx != null) return String(row[idx] ?? "").trim();
  }
  return "";
}

function normalizeImportStatus(value: string): ClassStatus {
  return value.trim().toLowerCase() === "full" ? "Full" : "Active";
}

function normalizeImportTrack(value: string, fallback: ProgramTrack): ProgramTrack {
  return value.trim().toLowerCase() === "enrichment" ? "enrichment" : value.trim().toLowerCase() === "core" ? "core" : fallback;
}

function parseClassImportCsv(text: string, fallbackTrack: ProgramTrack): ClassImportDraft[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];
  const headers = new Map<string, number>();
  rows[0].forEach((header, idx) => headers.set(headerKey(header), idx));
  return rows.slice(1).map((row) => {
    const name = firstCsvValue(row, headers, ["Class", "Class Name", "Name"]);
    const teacher = firstCsvValue(row, headers, ["Teacher", "Teacher Name"]);
    const students =
      firstCsvValue(row, headers, ["Seats", "Students", "Enrollment", "Enrolled/Capacity"]) || "0/30";
    const schedule = firstCsvValue(row, headers, ["Schedule", "Schedule Summary"]);
    const status = normalizeImportStatus(firstCsvValue(row, headers, ["Status", "Class Status"]));
    const track = normalizeImportTrack(firstCsvValue(row, headers, ["Track", "Program"]), fallbackTrack);
    const description = firstCsvValue(row, headers, ["Description"]);
    const level = firstCsvValue(row, headers, ["Level"]);
    const block = firstCsvValue(row, headers, ["Block"]);
    return { name, teacher, students, schedule, status, track, description, level, block };
  }).filter((row) => row.name || row.teacher || row.schedule || row.level || row.block);
}

export default function ClassesPageClient({
  initialClasses,
  dataSource,
  initialTrack = "core",
  initialSelectedIds = [],
  onTrackChange,
}: ClassesPageClientProps) {
  const router = useRouter();
  const classesCache = useClassesDataCache();
  const [classes, setClasses] = useState<SchoolClassRow[]>(
    () => classesCache.classes.data ?? initialClasses,
  );
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [trackTab, setTrackTab] = useState<ProgramTrack>(initialTrack);
  const [visibilityFilter, setVisibilityFilter] = useState<VisibilityFilter>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [rowMenu, setRowMenu] = useState<{ id: string; top: number; left: number } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [importing, setImporting] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(initialSelectedIds),
  );

  const sortRef = useRef<HTMLDivElement | null>(null);
  const filterRef = useRef<HTMLDivElement | null>(null);
  const rowMenuPanelRef = useRef<HTMLDivElement | null>(null);
  const rowMenuTriggerRef = useRef<HTMLElement | null>(null);
  const selectAllRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (initialClasses.length > 0 && !classesCache.classes.data) {
      classesCache.setClassesData(initialClasses, dataSource);
    }
  }, [classesCache, dataSource, initialClasses]);

  useEffect(() => {
    if (classesCache.classes.data) {
      setClasses(classesCache.classes.data);
      return;
    }
    void classesCache.loadClasses();
  }, [classesCache]);

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
    } else if (visibilityFilter === "full") {
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
  const visibleRows = processed;

  useEffect(() => {
    const el = selectAllRef.current;
    if (!el) return;
    const n = visibleRows.length;
    el.indeterminate = selectedIds.size > 0 && selectedIds.size < n;
  }, [selectedIds, visibleRows.length]);

  useClickOutside(filterRef as React.RefObject<HTMLElement | null>, () => setFilterOpen(false), filterOpen);
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

  const totalPages = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return visibleRows.slice(start, start + PAGE_SIZE);
  }, [visibleRows, safePage]);

  const visiblePages = getVisiblePages(safePage, totalPages);
  const hasResolvedClasses = Boolean(classesCache.classes.loadedAt) || initialClasses.length > 0;
  const isInitialClassesLoad = !hasResolvedClasses && (classesCache.classes.loading || classes.length === 0);

  const exportClasses = () => {
    const selected = selectedIds.size
      ? visibleRows.filter((row) => selectedIds.has(row.id))
      : visibleRows;
    downloadCsv(
      "classes-directory.csv",
      ["Class", "Teacher", "Level", "Block", "Schedule", "Seats", "Status", "Track", "Pending", "Waitlist"],
      selected.map((row) => [
        row.name,
        row.teacher,
        row.level,
        row.block,
        row.schedule,
        row.students,
        row.status,
        row.program,
        row.pendingCount,
        row.waitlistCount,
      ]),
    );
    setSyncHint(`Downloaded ${selected.length} class row(s) as CSV.`);
  };

  const importClasses = async (file: File) => {
    if (importing) return;
    setImporting(true);
    setSyncHint(null);
    try {
      const drafts = parseClassImportCsv(await file.text(), trackTab);
      if (drafts.length === 0) {
        setSyncHint("No class rows found. Use a CSV with Class, Teacher, Seats, Schedule, Status, and Track columns.");
        return;
      }

      const seatsPattern = /^\d+\s*\/\s*\d+$/;
      const validDrafts: ClassImportDraft[] = [];
      const validationErrors: string[] = [];
      drafts.forEach((draft, idx) => {
        const rowLabel = `Row ${idx + 2}`;
        if (!draft.name.trim()) validationErrors.push(`${rowLabel}: class name is required`);
        else if (!draft.teacher.trim()) validationErrors.push(`${rowLabel}: teacher is required`);
        else if (!seatsPattern.test(draft.students.trim())) validationErrors.push(`${rowLabel}: seats must look like 0/30`);
        else validDrafts.push(draft);
      });

      if (validDrafts.length === 0) {
        setSyncHint(validationErrors.slice(0, 3).join("; "));
        return;
      }

      const created: SchoolClassRow[] = [];
      const writeErrors: string[] = [];
      for (const draft of validDrafts) {
        const res = await fetch("/api/data/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name.trim(),
            teacher: draft.teacher.trim(),
            students: draft.students.trim(),
            schedule: draft.schedule.trim(),
            status: draft.status,
            track: draft.track,
            description: draft.description?.trim(),
            level: draft.level?.trim(),
            block: draft.block?.trim(),
          }),
        });
        if (res.ok) {
          const body = (await res.json()) as { class?: SchoolClassRow };
          if (body.class) created.push(body.class);
        } else {
          writeErrors.push(`${draft.name}: ${await readApiError(res)}`);
        }
      }

      if (created.length > 0) {
        setClasses((prev) => {
          const next = [...prev, ...created];
          classesCache.setClassesData(next);
          return next;
        });
        invalidateDashboardData(["/api/data/class-options", "/api/dashboard-presentation"]);
        void classesCache.loadClasses(true);
      }

      const skipped = validationErrors.length + writeErrors.length;
      if (created.length === 0) {
        setSyncHint(writeErrors[0] ?? validationErrors[0] ?? "No classes were uploaded.");
      } else if (skipped > 0) {
        const sample = [...validationErrors, ...writeErrors].slice(0, 2).join("; ");
        setSyncHint(`Uploaded ${created.length} class row(s). ${skipped} row(s) need attention. ${sample}`);
      } else {
        setSyncHint(`Uploaded ${created.length} class row(s).`);
      }
    } finally {
      setImporting(false);
    }
  };

  const importClassRows = async (rows: ParsedImportRow[]) => {
    if (importing) return { created: 0, errors: ["Another class import is still running."] };
    setImporting(true);
    setSyncHint(null);
    const seatsPattern = /^\d+\s*\/\s*\d+$/;
    const validDrafts: ClassImportDraft[] = [];
    const validationErrors: string[] = [];
    rows.forEach((row) => {
      const draft: ClassImportDraft = {
        name: row.values.name,
        teacher: row.values.teacher,
        students: row.values.students || "0/30",
        schedule: row.values.schedule,
        status: normalizeImportStatus(row.values.status),
        track: normalizeImportTrack(row.values.track, trackTab),
        description: row.values.description,
        level: row.values.level,
        block: row.values.block,
      };
      if (!draft.name.trim()) validationErrors.push(`Row ${row.rowNumber}: class name is required`);
      else if (!draft.teacher.trim()) validationErrors.push(`Row ${row.rowNumber}: teacher is required`);
      else if (!seatsPattern.test(draft.students.trim())) validationErrors.push(`Row ${row.rowNumber}: seats must look like 0/30`);
      else validDrafts.push(draft);
    });

    const created: SchoolClassRow[] = [];
    const writeErrors: string[] = [];
    try {
      for (const draft of validDrafts) {
        const res = await fetch("/api/data/classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name.trim(),
            teacher: draft.teacher.trim(),
            students: draft.students.trim(),
            schedule: draft.schedule.trim(),
            status: draft.status,
            track: draft.track,
            description: draft.description?.trim(),
            level: draft.level?.trim(),
            block: draft.block?.trim(),
          }),
        });
        if (res.ok) {
          const body = (await res.json()) as { class?: SchoolClassRow };
          if (body.class) created.push(body.class);
        } else {
          writeErrors.push(`${draft.name}: ${await readApiError(res)}`);
        }
      }
      if (created.length > 0) {
        setClasses((prev) => {
          const next = [...prev, ...created];
          classesCache.setClassesData(next);
          return next;
        });
        invalidateDashboardData(["/api/data/classes", "/api/data/class-options", "/api/dashboard-presentation"]);
        void classesCache.loadClasses(true);
        setSyncHint(`Imported ${created.length} class row(s).`);
      }
      return { created: created.length, errors: [...validationErrors, ...writeErrors] };
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, sortKey, sortDir, trackTab, visibilityFilter]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const allowed = new Set(
        classes.filter((c) => c.program === trackTab).map((c) => c.id),
      );
      const next = new Set<string>();
      for (const id of prev) {
        if (allowed.has(id)) next.add(id);
      }
      return next;
    });
  }, [trackTab, classes]);

  const deleteClassById = async (id: string) => {
    const removed = classes.find((c) => c.id === id);
    const nextClasses = classes.filter((c) => c.id !== id);
    setClasses(nextClasses);
    classesCache.setClassesData(nextClasses);
    setPendingDeleteId(null);
    setRowMenu(null);
    const res = await fetch(`/api/data/classes?id=${encodeURIComponent(String(id))}`, {
      method: "DELETE",
    });
    if (!res.ok && removed) {
      const restored = [...nextClasses, removed].sort((a, b) => String(a.id).localeCompare(String(b.id)));
      setClasses(restored);
      classesCache.setClassesData(restored);
      setSyncHint(`Could not delete (${await readApiError(res)}). Row restored here.`);
      return;
    }
    invalidateDashboardData(["/api/data/class-options", "/api/dashboard-presentation"]);
    void classesCache.loadClasses(true);
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
      const nextClasses = [...classes, body.class];
      setClasses(nextClasses);
      classesCache.setClassesData(nextClasses);
      invalidateDashboardData(["/api/data/class-options", "/api/dashboard-presentation"]);
      void classesCache.loadClasses(true);
      return;
    }
    setSyncHint(`Could not duplicate class (${await readApiError(res)}).`);
  };

  const goToClassDetail = (row: SchoolClassRow) => {
    const segment = row.program === "enrichment" ? "enrichment" : "core";
    router.push(`/dashboard/classes/${segment}/${row.id}`);
  };

  const toggleSelectAllFiltered = () => {
    const ids = visibleRows.map((c) => c.id);
    if (ids.length === 0) return;
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(ids));
  };

  const changeTrack = (track: ProgramTrack) => {
    setTrackTab(track);
    onTrackChange?.(track);
  };

  return (
    <div className="w-full p-[24px] md:p-[32px]">
      <div className="mx-auto flex max-w-[1104px] flex-col gap-[16px]">
        <div className="flex flex-col gap-[8px]">
          <div className="flex min-w-0 flex-col gap-[8px]">
            <h1 className="font-sans text-[28px] font-bold leading-[1.1] text-[#272932]">
              Class Setup
            </h1>
            <p className="max-w-[560px] font-sans text-[16px] leading-[1.4] text-[#666d80]">
              Create and configure core and enrichment classes for the upcoming term.
            </p>
          </div>
        </div>

        {syncHint && (
          <p className="rounded-lg border border-[#d80509]/30 bg-[#fff5f5] px-4 py-2 font-sans text-sm text-[#a00408]">
            {syncHint}
          </p>
        )}

        <div className="flex w-full max-w-full overflow-hidden rounded-tl-[8px] rounded-tr-[8px] sm:inline-flex sm:w-auto">
          <button
            type="button"
            className={`flex-1 px-6 pb-[18px] pt-[6px] text-[14px] leading-[1.25] sm:flex-none sm:px-[50px] sm:pb-[23px] sm:pt-[4px] ${
              trackTab === "core" ? "bg-[#d2f1f5] text-[#0d0d12]" : "bg-[#d2f1f54d] text-[#0d0d12]"
            }`}
            onClick={() => changeTrack("core")}
          >
            Core
          </button>
          <button
            type="button"
            className={`flex-1 px-6 pb-[18px] pt-[6px] text-[14px] leading-[1.25] sm:flex-none sm:px-[50px] sm:pb-[23px] sm:pt-[4px] ${
              trackTab === "enrichment" ? "bg-[#d2f1f5] text-[#0d0d12]" : "bg-[#d2f1f54d] text-[#0d0d12]"
            }`}
            onClick={() => changeTrack("enrichment")}
          >
            Enrichment
          </button>
        </div>

        <div className="relative -mt-[6px] min-h-[758px] rounded-[18px] border border-[#f0f0f0] bg-white px-3 py-[16px] shadow-sm sm:px-[18px]">
          <div className="mb-[16px] flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4">
            <div className="flex w-full min-w-0 items-center gap-[6px] rounded-[8px] bg-[#fafafa] px-3 py-2 md:w-auto md:bg-transparent md:px-0 md:py-0">
              <div className="relative size-[14px]">
                <Search
                  className="size-[14px] text-[#0d0d12]"
                  aria-hidden
                />
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="min-w-0 flex-1 bg-transparent text-[12px] text-[#0d0d12] outline-none placeholder:text-[#0d0d12] md:w-[220px] md:flex-none"
              />
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:gap-[16px]">
              <div className="relative" ref={filterRef}>
                <button
                  type="button"
                  className="flex min-w-0 max-w-full items-center gap-[4px] rounded-[8px] bg-[#fafafa] p-[8px] text-[12px] text-[#0d0d12]"
                  onClick={() => {
                    setFilterOpen((open) => !open);
                    setSortOpen(false);
                    setRowMenu(null);
                  }}
                  aria-expanded={filterOpen}
                >
                  <img src={imgFilterFunnel} alt="" className="size-[14px]" />
                  <span className="truncate">Filter by: {VISIBILITY_FILTER_LABELS[visibilityFilter]}</span>
                  <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
                </button>
                {filterOpen ? (
                  <div className="absolute left-0 top-full z-50 mt-1 w-[190px] rounded-lg border border-[#ebecef] bg-white py-1 shadow-md">
                    {(Object.keys(VISIBILITY_FILTER_LABELS) as VisibilityFilter[]).map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={`w-full px-3 py-2 text-left font-sans text-[13px] hover:bg-[#fafafa] ${
                          visibilityFilter === key ? "font-semibold text-[#14c1d5]" : "text-[#0d0d12]"
                        }`}
                        onClick={() => {
                          setVisibilityFilter(key);
                          setFilterOpen(false);
                        }}
                      >
                        {VISIBILITY_FILTER_LABELS[key]}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative" ref={sortRef}>
                <button
                  type="button"
                  className="flex items-center gap-[4px] rounded-[8px] bg-[#fafafa] p-[8px] text-[12px] text-[#0d0d12]"
                  onClick={() => {
                    setSortOpen((o) => !o);
                    setRowMenu(null);
                  }}
                  aria-expanded={sortOpen}
                >
                  <img src={imgFlowbiteSortOutline} alt="" className="size-[14px]" />
                  Sort
                  <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
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

              <button type="button" className="text-[12px] text-[#0d0d12]" onClick={toggleSelectAllFiltered}>
                {selectedIds.size > 0 ? `Clear selected (${selectedIds.size})` : "Select visible"}
              </button>

              <button
                type="button"
                className="inline-flex h-[42px] min-w-0 flex-1 items-center justify-center gap-[8px] rounded-[6px] bg-[#14c1d5] px-[14px] py-[8px] font-inter-tight text-[14px] font-medium leading-[1.5] text-white sm:flex-none sm:text-[16px]"
                onClick={() => router.push(`/dashboard/classes/new?track=${trackTab}`)}
              >
                <img src={imgIcRoundPlus} alt="" className="size-[16px]" />
                <span className="truncate">{trackTab === "enrichment" ? "Add Enrichment Class" : "Add Core Class"}</span>
              </button>
            </div>
          </div>

          <DashboardBulkSelectionBar count={selectedIds.size} noun="class" onClear={() => setSelectedIds(new Set())}>
            <button
              type="button"
              onClick={exportClasses}
              className="rounded-[6px] bg-[#14c1d5] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#11adbf]"
            >
              Download selected CSV
            </button>
          </DashboardBulkSelectionBar>

          <div className="w-full overflow-x-auto pb-2 [-webkit-overflow-scrolling:touch]">
            <table className="min-w-[980px] table-fixed border-collapse text-left">
              <colgroup>
                <col className="w-[11.111%]" />
                <col className="w-[11.111%]" />
                <col className="w-[11.111%]" />
                <col className="w-[11.111%]" />
                <col className="w-[11.111%]" />
                <col className="w-[11.111%]" />
                <col className="w-[11.111%]" />
                <col className="w-[11.111%]" />
                <col className="w-[11.111%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#ebecef]">
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Class Name
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Teacher
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Level
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Block
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Schedule
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Pending
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Waitlist
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Seats
                  </th>
                  <th className="whitespace-nowrap px-[8px] py-[8px] text-center font-sans text-[11px] font-semibold tracking-[0.02em] text-[#0d0d12]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((cls, idx) => (
                  <tr
                    key={cls.id}
                    className={`h-[75px] cursor-pointer border-b border-[#f0f0f0] transition-colors hover:bg-[#f6fbfc] ${
                      idx % 2 === 1 ? "bg-[rgba(250,250,250,0.4)]" : ""
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
                    <td className="px-[10px] py-[2px] align-top font-sans text-[16px] font-normal text-[#0d0d12]">
                      <div className="flex items-start gap-[8px]">
                        <span className="mt-[1px] flex size-[14px] items-center justify-center rounded-[4px] border border-[#14c1d5] bg-[#d2f1f5] opacity-50">
                          {selectedIds.has(cls.id) ? (
                            <img src={imgCheckRounded} alt="" className="size-[12px]" />
                          ) : null}
                        </span>
                        <span className="block max-w-[85px] leading-[1.25]">{cls.name}</span>
                      </div>
                    </td>
                    <td className="truncate px-[10px] py-[2px] align-top font-sans text-[16px] leading-[1.25] text-[#0d0d12]">
                      {cls.teacher}
                    </td>
                    <td className="whitespace-nowrap px-[10px] py-[2px] text-center align-top font-sans text-[16px] leading-[1.25] text-[#0d0d12]">
                      {dash(cls.level)}
                    </td>
                    <td className="whitespace-nowrap px-[10px] py-[2px] text-center align-top font-sans text-[16px] leading-[1.25] text-[#0d0d12]">
                      {dash(cls.block)}
                    </td>
                    <td className="px-[10px] py-[2px] align-top font-sans text-[16px] text-[#0d0d12]">
                      <div className="flex flex-col items-center gap-[7px]">
                        <span className="text-[16px] leading-[1.25] text-[#0d0d12]">{cls.schedule}</span>
                        <span className="text-[11px] leading-[11px] text-[#666d80]">
                          {cls.location || "Room not assigned"}
                        </span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-[10px] py-[2px] text-center align-top font-sans text-[16px] leading-[1.25] tabular-nums text-[#0d0d12]">
                      {cls.pendingCount}
                    </td>
                    <td className="whitespace-nowrap px-[10px] py-[2px] text-center align-top font-sans text-[16px] leading-[1.25] tabular-nums text-[#0d0d12]">
                      {cls.waitlistCount}
                    </td>
                    <td className="whitespace-nowrap px-[10px] py-[2px] text-center align-top font-sans text-[16px] leading-[0.99] tabular-nums text-[#0d0d12]">
                      <div className="flex flex-col items-center">
                        <span>{cls.students}</span>
                        {trackTab === "enrichment" && (
                          <span className="mt-[6px] italic text-[16px] leading-[0.99] text-[#666d80]">
                            {cls.pendingCount > 0 ? `(${cls.pendingCount} pending)` : "No pending requests"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="relative px-[10px] py-[2px] align-top text-center" onClick={(e) => e.stopPropagation()}>
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
                        <img src={imgWeuiMoreOutlined} alt="" className="inline-block size-[24px]" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {visibleRows.length === 0 && (
            <div className="py-10 text-center font-sans text-[13px] text-[#666d80]">
              {isInitialClassesLoad ? "Loading classes..." : "No classes match your filters."}
            </div>
          )}

          {totalPages > 1 && visibleRows.length > 0 && (
            <div className="flex items-center justify-center gap-3 pt-5">
              <button
                type="button"
                disabled={safePage <= 1}
                className="flex items-center justify-center rounded-md p-1 hover:bg-[#f4f4f6] disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
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
                <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
              </button>
            </div>
          )}

          <div className="mt-3 flex flex-wrap justify-end gap-3">
            <button
              type="button"
              disabled={importing}
              className="inline-flex items-center gap-2 rounded-[6px] bg-[#fafafa] px-[16px] py-[8px] font-inter-tight text-[16px] font-medium tracking-[0.32px] text-[#0d0d12] shadow-[0px_0px_4.8px_rgba(0,0,0,0.12)] hover:bg-[#f0f0f0] disabled:opacity-50"
              onClick={() => setIsImportOpen(true)}
            >
              {importing ? "Importing..." : "Bulk import CSV"}
            </button>
            <button
              type="button"
              className="rounded-[6px] bg-[#d2f1f5] px-[16px] py-[8px] font-inter-tight text-[16px] font-medium tracking-[0.32px] text-[#14c1d5] shadow-[0px_0px_4.8px_rgba(0,0,0,0.12)]"
              onClick={exportClasses}
            >
              Download CSV
            </button>
          </div>
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
      <DashboardBulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk import classes"
        entityLabel="class"
        filename="classes-import-template.csv"
        columns={[
          { key: "name", label: "Name", required: true, sample: "New Class" },
          { key: "teacher", label: "Teacher", required: true, sample: "Emily Carter" },
          { key: "students", label: "Students", required: true, sample: "0/30" },
          { key: "schedule", label: "Schedule", sample: "Day 1/2/3 - Block 1 - 7:00 - 8:30 AM" },
          { key: "status", label: "Status", sample: "Active" },
          { key: "track", label: "Track", sample: trackTab },
          { key: "level", label: "Level", sample: "3" },
          { key: "block", label: "Block", sample: "Block 1 Day 1" },
          { key: "description", label: "Description", sample: "Optional class description" },
        ]}
        onImport={importClassRows}
      />
    </div>
  );
}
