"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { Filter, Search } from "lucide-react";

import { DashboardBulkImportModal, type ParsedImportRow } from "@/components/dashboard-bulk-import-modal";
import { DashboardBulkSelectionBar, DashboardRowActionsMenu } from "@/components/dashboard-row-actions";
import { DASHBOARD_PANEL_CLASS, DASHBOARD_TABLE_SCROLL_CLASS } from "@/lib/dashboard-shell-classes";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData } from "@/lib/client-data-cache";
import { downloadCsv } from "@/lib/client-directory-actions";
import type { DataSource, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data";

type ScheduleFilter = "all" | "pending" | "approved";

type ScheduleColumn = {
  key: keyof Pick<StudentScheduleRow, "b1" | "b2" | "b3Tue" | "b3Wed" | "b3Thu" | "b4Tue" | "b4Wed" | "b4Thu">;
  label: string;
  sublabel: string;
};

const COLUMNS: ScheduleColumn[] = [
  { key: "b1", label: "B1", sublabel: "Tue Wed Thu" },
  { key: "b2", label: "B2", sublabel: "Tue Wed Thu" },
  { key: "b3Tue", label: "B3", sublabel: "Tue" },
  { key: "b3Wed", label: "B3", sublabel: "Wed" },
  { key: "b3Thu", label: "B3", sublabel: "Thu" },
  { key: "b4Tue", label: "B4", sublabel: "Tue" },
  { key: "b4Wed", label: "B4", sublabel: "Wed" },
  { key: "b4Thu", label: "B4", sublabel: "Thu" },
];

function realBadges(badges: StudentScheduleBadge[] | undefined) {
  return (badges ?? []).filter((badge) => badge.tone !== "empty" && badge.label !== "--");
}

function chipClasses(tone: StudentScheduleBadge["tone"]) {
  if (tone === "core") return "border-[#14c1d5]/50 bg-[#d2f1f5] text-[#1392a0]";
  if (tone === "approved") return "border-[#004d08]/35 bg-[#d9e7d8] text-[#1f5d2a]";
  if (tone === "pending") return "border-[#d80509]/45 bg-[#ffd9d9] text-[#d80509]";
  if (tone === "waitlisted") return "border-[#cfa500]/45 bg-[#fff8e6] text-[#9a7600]";
  if (tone === "draft") return "border-[#8b5cf6]/35 bg-[#eadcff] text-[#6d28d9]";
  return "border-[#dfe3ea] bg-[#fbfcfe] text-[#667085]";
}

function LegendItem({ tone, label }: { tone: StudentScheduleBadge["tone"]; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-[14px] text-[#0d0d12]">
      <span className={`size-[18px] rounded-[5px] border ${chipClasses(tone)}`} aria-hidden />
      {label}
    </span>
  );
}

function ScheduleCell({ badges }: { badges: StudentScheduleBadge[] }) {
  const visible = realBadges(badges);
  if (!visible.length) return <span className="text-[16px] text-[#818898]">--</span>;
  return (
    <div className="flex max-w-[150px] flex-wrap justify-center gap-1.5">
      {visible.map((badge, index) => (
        <span
          key={`${badge.label}-${badge.tone}-${index}`}
          className={`inline-flex max-w-full items-center rounded-[6px] border px-2.5 py-1 text-[12px] leading-none ${chipClasses(badge.tone)}`}
          title={badge.label}
        >
          <span className="truncate">{badge.label}</span>
        </span>
      ))}
    </div>
  );
}

function rowMatchesFilter(row: StudentScheduleRow, filter: ScheduleFilter) {
  if (filter === "all") return true;
  const badges = COLUMNS.flatMap((column) => realBadges(row[column.key]));
  if (filter === "pending") return badges.some((badge) => badge.tone === "pending");
  return badges.some((badge) => badge.tone === "approved") && !badges.some((badge) => badge.tone === "pending");
}

function sourceHint(source: DataSource) {
  if (source === "fallback") return "Showing starter schedules while records finish loading.";
  if (source === "unavailable") return "Student schedules are temporarily unavailable.";
  return null;
}

export default function AdminStudentScheduleClient({
  initialRows,
  dataSource,
}: {
  initialRows: StudentScheduleRow[];
  dataSource: DataSource;
}) {
  const [rows] = useState(() => [...initialRows]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ScheduleFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);

  React.useEffect(() => {
    function closeActions(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-dashboard-row-actions]")) return;
      setOpenActionId(null);
    }
    document.addEventListener("mousedown", closeActions);
    return () => document.removeEventListener("mousedown", closeActions);
  }, []);

  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !q || row.name.toLowerCase().includes(q) || row.parent.toLowerCase().includes(q);
      return matchesQuery && rowMatchesFilter(row, filter);
    });
  }, [filter, query, rows]);

  const hint = sourceHint(dataSource);
  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(filteredRows.map((row) => row.id)));
  }

  function exportSelectedSchedules() {
    const selected = filteredRows.filter((row) => selectedIds.has(row.id));
    downloadCsv(
      "student-schedules-selected.csv",
      ["Student", "Parent", ...COLUMNS.map((column) => `${column.label} ${column.sublabel}`)],
      selected.map((row) => [
        row.name,
        row.parent,
        ...COLUMNS.map((column) => realBadges(row[column.key]).map((badge) => `${badge.label} (${badge.tone})`).join("; ")),
      ]),
    );
    setSyncHint(`Downloaded ${selected.length} student schedule row(s).`);
  }

  async function importStudents(rows: ParsedImportRow[]) {
    const errors: string[] = [];
    let created = 0;
    for (const row of rows) {
      const res = await fetch("/api/data/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.values.name,
          parent: row.values.parent,
          level: row.values.level,
          track: row.values.track?.toLowerCase() === "enrichment" ? "enrichment" : "core",
          notes: row.values.notes,
        }),
      });
      if (res.ok) created += 1;
      else errors.push(`Row ${row.rowNumber}: ${await readApiError(res)}`);
    }
    if (created > 0) {
      invalidateDashboardData(["/api/data/students", "/api/data/student-schedules", "/api/dashboard-presentation"]);
      setSyncHint(`Imported ${created} student row(s). Refresh schedules after import completes.`);
    }
    return { created, errors };
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-4 py-8 font-sans md:px-8">
      <div>
        <h1 className="text-[32px] font-bold leading-[1.08] text-[#272932]">Student Schedule</h1>
        <p className="mt-2 text-[18px] leading-[1.4] text-[#666d80]">
          View and compare student schedules across all blocks.
        </p>
        {hint ? <p className="mt-2 text-sm text-[#7a5b00]">{hint}</p> : null}
        {syncHint ? <p className="mt-2 text-sm text-[#155e66]">{syncHint}</p> : null}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-3">
        <LegendItem tone="core" label="Core (School assigned)" />
        <LegendItem tone="approved" label="Enrichment approved" />
        <LegendItem tone="pending" label="Enrichment pending" />
        <LegendItem tone="waitlisted" label="Waitlisted" />
      </div>

      <section className={`${DASHBOARD_PANEL_CLASS} p-5`}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex h-[44px] min-w-0 flex-1 items-center gap-3 rounded-[10px] bg-white px-3 text-[#666d80] lg:max-w-[420px]">
            <Search className="size-5 shrink-0" aria-hidden strokeWidth={2} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search..."
              className="min-w-0 flex-1 bg-transparent text-[16px] text-[#0d0d12] outline-none placeholder:text-[#666d80]"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex h-[44px] items-center gap-2 rounded-[10px] bg-[#fafafa] px-3 text-[14px] text-[#0d0d12]">
              <Filter className="size-4" aria-hidden strokeWidth={2} />
              <span className="whitespace-nowrap">Filter by:</span>
              <select
                value={filter}
                onChange={(event) => setFilter(event.target.value as ScheduleFilter)}
                className="bg-transparent font-medium outline-none"
              >
                <option value="all">Active Students</option>
                <option value="pending">Pending Requests</option>
                <option value="approved">Approved Only</option>
              </select>
            </label>
            <button
              type="button"
              onClick={toggleAll}
              className="h-[44px] rounded-[10px] bg-[#fafafa] px-4 text-[14px] text-[#0d0d12] hover:bg-[#f0f0f0]"
            >
              {selectedIds.size > 0 ? `Clear selected (${selectedIds.size})` : "Select visible"}
            </button>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="h-[44px] rounded-[10px] border border-[#14c1d5]/40 bg-white px-4 text-[14px] font-semibold text-[#14c1d5] hover:bg-[#ecfdff]"
            >
              Bulk import CSV
            </button>
          </div>
        </div>

        <DashboardBulkSelectionBar count={selectedIds.size} noun="student" onClear={() => setSelectedIds(new Set())}>
          <button
            type="button"
            onClick={exportSelectedSchedules}
            className="rounded-[6px] bg-[#14c1d5] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#11adbf]"
          >
            Download selected CSV
          </button>
          <Link
            href={`/dashboard/students/${encodeURIComponent(Array.from(selectedIds)[0] ?? "")}`}
            className={`rounded-[6px] px-3 py-1.5 text-[12px] font-semibold ${
              selectedIds.size === 1 ? "bg-[#14c1d5] text-white hover:bg-[#11adbf]" : "pointer-events-none bg-white/60 text-[#667085]"
            }`}
          >
            Open selected profile
          </Link>
        </DashboardBulkSelectionBar>

        <div className={DASHBOARD_TABLE_SCROLL_CLASS}>
          <table className="min-w-[1120px] table-fixed border-collapse">
            <thead>
              <tr className="border-y border-[#f0f0f0] text-left text-[14px] font-semibold text-[#0d0d12]">
                <th className="w-[220px] px-3 py-5">Student</th>
                <th className="w-[150px] px-3 py-5">Parent</th>
                {COLUMNS.map((column) => (
                  <th key={column.key} className="w-[122px] px-3 py-5 text-center">
                    <span className="block text-[16px]">{column.label}</span>
                    <span className="mt-2 block font-normal text-[#818898]">{column.sublabel}</span>
                  </th>
                ))}
                <th className="w-[90px] px-3 py-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <tr key={row.id} className="border-b border-[#f0f0f0] text-[16px] text-[#0d0d12]">
                    <td className="px-3 py-5">
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          aria-pressed={selectedIds.has(row.id)}
                          onClick={() => toggleRow(row.id)}
                          className={`size-[16px] shrink-0 rounded-[4px] border border-[#14c1d5] ${selectedIds.has(row.id) ? "bg-[#14c1d5]" : "bg-[#d2f1f5]/50"}`}
                        />
                        <img src={row.avatar} alt="" className="size-9 rounded-full object-cover" />
                        <Link href={`/dashboard/students/${encodeURIComponent(row.id)}`} className="truncate hover:text-[#14c1d5]">
                          {row.name}
                        </Link>
                      </div>
                    </td>
                    <td className="px-3 py-5">{row.parent || "--"}</td>
                    {COLUMNS.map((column) => (
                      <td key={column.key} className="px-3 py-4 text-center align-middle">
                        <ScheduleCell badges={row[column.key]} />
                      </td>
                    ))}
                    <td className="px-3 py-5 text-center">
                      <DashboardRowActionsMenu
                        label={`Actions for ${row.name}`}
                        isOpen={openActionId === row.id}
                        onToggle={() => setOpenActionId((id) => (id === row.id ? null : row.id))}
                        onClose={() => setOpenActionId(null)}
                        actions={[
                          { label: "View schedule", href: `/dashboard/students/${encodeURIComponent(row.id)}/schedule` },
                          { label: "View profile", href: `/dashboard/students/${encodeURIComponent(row.id)}` },
                          { label: "View roster", href: `/dashboard/students/${encodeURIComponent(row.id)}/roster` },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-[15px] text-[#666d80]">
                    No student schedules match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <DashboardBulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk import students"
        entityLabel="student"
        filename="students-import-template.csv"
        columns={[
          { key: "name", label: "Name", required: true, sample: "New Student" },
          { key: "parent", label: "Parent", sample: "Parent Name" },
          { key: "level", label: "Level", required: true, sample: "3" },
          { key: "track", label: "Track", sample: "core" },
          { key: "notes", label: "Notes", sample: "Optional support notes" },
        ]}
        onImport={importStudents}
      />
    </div>
  );
}
