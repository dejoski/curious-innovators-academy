"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, SlidersHorizontal } from "lucide-react";

import { DashboardBulkImportModal, type ParsedImportRow } from "@/components/dashboard-bulk-import-modal";
import { DashboardBulkSelectionBar, DashboardRowActionsMenu } from "@/components/dashboard-row-actions";
import {
  DASHBOARD_DIRECTORY_TOOLBAR_CONTROL_CLASS,
  DASHBOARD_DIRECTORY_TOOLBAR_INPUT_CLASS,
  DASHBOARD_DIRECTORY_TOOLBAR_SELECT_CLASS,
  DASHBOARD_DIRECTORY_TABLE_BODY_ROW_CLASS,
  DASHBOARD_DIRECTORY_TABLE_CELL_CLASS,
  DASHBOARD_DIRECTORY_TABLE_HEAD_ROW_CLASS,
  DASHBOARD_BODY_TEXT_CLASS,
  DASHBOARD_BUTTON_TEXT_CLASS,
  DASHBOARD_PAGE_SUBTITLE_CLASS,
  DASHBOARD_PAGE_TITLE_CLASS,
  DASHBOARD_PANEL_CLASS,
  DASHBOARD_STATUS_PILL_TEXT_CLASS,
  DASHBOARD_TABLE_SCROLL_CLASS,
} from "@/lib/dashboard-shell-classes";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData, preloadStudentDetailData, readDashboardData } from "@/lib/client-data-cache";
import { downloadCsv } from "@/lib/client-directory-actions";
import type { ClassRosterStatus, ClassRosterStudent, DataSource, SchoolClassOptionRow } from "@/lib/data";

type SortOption = "status" | "student-az" | "student-za";

function statusClasses(status: ClassRosterStatus) {
  if (status === "Approved") return "border-[#004d08]/45 bg-[#d9e7d8] text-[#004d08]";
  if (status === "Pending") return "border-[#d80509]/45 bg-[#ffd9d9] text-[#d80509]";
  if (status === "Waitlisted") return "border-[#cfa500]/45 bg-[#fff8e6] text-[#9a7600]";
  return "border-[#d80509]/35 bg-[#fff5f5] text-[#a00408]";
}

function statusLabel(status: ClassRosterStatus) {
  return status === "Waitlisted" ? "Waitlist" : status;
}

function statusRank(status: ClassRosterStatus) {
  if (status === "Pending") return 0;
  if (status === "Waitlisted") return 1;
  if (status === "Rejected") return 2;
  return 3;
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
  );
}

function sourceHint(source: DataSource) {
  if (source === "fallback") return "Showing a starter roster while records finish loading.";
  if (source === "unavailable") return "Class roster is temporarily unavailable.";
  return null;
}

function classCapacity(row: SchoolClassOptionRow | null) {
  return row?.capacity ?? 0;
}

export default function AdminStudentRosterClient({
  classes,
  dataSource,
}: {
  classes: SchoolClassOptionRow[];
  dataSource: DataSource;
}) {
  const router = useRouter();
  const availableClasses = useMemo(
    () => classes.filter((row) => row.program === "enrichment" || row.program === "core"),
    [classes],
  );
  const [selectedClassId, setSelectedClassId] = useState(() => availableClasses[0]?.id ?? "");
  const [students, setStudents] = useState<ClassRosterStudent[]>([]);
  const [source, setSource] = useState<DataSource>(dataSource);
  const [isLoading, setIsLoading] = useState(Boolean(selectedClassId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [sort, setSort] = useState<SortOption>("status");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [openPicker, setOpenPicker] = useState<"class" | "block" | "level" | "sort" | null>(null);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedClassId || availableClasses.length === 0) return;
    setSelectedClassId(availableClasses[0]?.id ?? "");
  }, [availableClasses, selectedClassId]);

  const selectedClass = useMemo(
    () => availableClasses.find((row) => row.id === selectedClassId) ?? null,
    [availableClasses, selectedClassId],
  );

  useEffect(() => {
    let cancelled = false;
    if (!selectedClassId) {
      setStudents([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    void readDashboardData<{ students?: ClassRosterStudent[]; source?: DataSource }>(
      `/api/data/classes/${encodeURIComponent(selectedClassId)}/roster`,
    )
      .then((body) => {
        if (cancelled) return;
        setStudents(body.students ?? []);
        setSource(body.source ?? "unavailable");
      })
      .catch((error) => {
        if (cancelled) return;
        setStudents([]);
        setSource("unavailable");
        setLoadError(error instanceof Error ? error.message : String(error));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedClassId]);

  useEffect(() => {
    function closePickers(event: MouseEvent) {
      if (pickerRef.current?.contains(event.target as Node)) return;
      setOpenPicker(null);
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-dashboard-row-actions]")) setOpenActionId(null);
    }
    document.addEventListener("mousedown", closePickers);
    return () => document.removeEventListener("mousedown", closePickers);
  }, []);

  const warmStudent = React.useCallback((studentId: string) => {
    if (!studentId) return;
    preloadStudentDetailData(studentId);
    router.prefetch(`/dashboard/students/${encodeURIComponent(studentId)}`);
  }, [router]);

  const blockOptions = useMemo(() => uniqueSorted(availableClasses.map((row) => row.block)), [availableClasses]);
  const levelOptions = useMemo(
    () => uniqueSorted(availableClasses.filter((row) => !selectedBlock || row.block === selectedBlock).map((row) => row.level)),
    [availableClasses, selectedBlock],
  );

  useEffect(() => {
    if (selectedClass) {
      setSelectedBlock(selectedClass.block);
      setSelectedLevel(selectedClass.level);
    }
  }, [selectedClass]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = students.filter((student) => {
      const matchesQuery =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.parent.toLowerCase().includes(q) ||
        student.status.toLowerCase().includes(q);
      return matchesQuery;
    });
    if (sort === "student-az") return [...list].sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "student-za") return [...list].sort((a, b) => b.name.localeCompare(a.name));
    return [...list].sort((a, b) => statusRank(a.status) - statusRank(b.status) || a.name.localeCompare(b.name));
  }, [query, sort, students]);

  const stats = useMemo(() => {
    const approved = students.filter((row) => row.status === "Approved").length;
    const pending = students.filter((row) => row.status === "Pending").length;
    const waitlist = students.filter((row) => row.status === "Waitlisted").length;
    return { approved, pending, waitlist, capacity: classCapacity(selectedClass) };
  }, [selectedClass, students]);

  const hint = sourceHint(source);
  function chooseClass(classId: string) {
    setSelectedClassId(classId);
    setSelectedIds(new Set());
    setOpenPicker(null);
  }

  function toggleAll() {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleRows.map((row) => row.id)));
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exportSelectedRoster() {
    const selected = visibleRows.filter((student) => selectedIds.has(student.id));
    downloadCsv(
      "student-roster-selected.csv",
      ["Student", "Parent", "Age", "Status", "Level", "Description"],
      selected.map((student) => [
        student.name,
        student.parent,
        student.age,
        student.status,
        student.level,
        student.description,
      ]),
    );
    setSyncHint(`Downloaded ${selected.length} roster row(s).`);
  }

  async function importRosterRows(rows: ParsedImportRow[]) {
    if (!selectedClassId) return { created: 0, errors: ["Choose a class before importing roster rows."] };
    const created: ClassRosterStudent[] = [];
    const errors: string[] = [];
    for (const row of rows) {
      const res = await fetch(`/api/data/classes/${encodeURIComponent(selectedClassId)}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.values.name,
          parent: row.values.parent,
          age: row.values.age,
          level: row.values.level,
          status: row.values.status,
          description: row.values.description,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { student?: ClassRosterStudent };
        if (body.student) created.push(body.student);
      } else {
        errors.push(`Row ${row.rowNumber}: ${await readApiError(res)}`);
      }
    }
    if (created.length > 0) {
      setStudents((prev) => [...prev, ...created]);
      invalidateDashboardData([`/api/data/classes/${encodeURIComponent(selectedClassId)}/roster`, "/api/data/students", "/api/dashboard-presentation"]);
      setSyncHint(`Imported ${created.length} roster row(s).`);
    }
    return { created: created.length, errors };
  }

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-7 px-4 py-8 font-sans md:px-8">
      <div>
        <h1 className={DASHBOARD_PAGE_TITLE_CLASS}>Class Roster</h1>
        <p className={`mt-2 ${DASHBOARD_PAGE_SUBTITLE_CLASS}`}>
          Manage students enrolled in this class, including approvals, waitlist, and requests.
        </p>
        {hint ? <p className={`mt-2 ${DASHBOARD_BODY_TEXT_CLASS} text-[#7a5b00]`}>{hint}</p> : null}
        {syncHint ? <p className={`mt-2 ${DASHBOARD_BODY_TEXT_CLASS} text-[#155e66]`}>{syncHint}</p> : null}
        {loadError ? <p className={`mt-2 ${DASHBOARD_BODY_TEXT_CLASS} text-[#a00408]`}>{loadError}</p> : null}
      </div>

      <div ref={pickerRef} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1fr]">
        <div className="relative">
          <PickerButton label={selectedClass?.name ?? "Select class"} open={openPicker === "class"} onClick={() => setOpenPicker(openPicker === "class" ? null : "class")} />
          {openPicker === "class" ? (
            <PickerMenu>
              {availableClasses.map((row) => (
                <button key={row.id} type="button" onClick={() => chooseClass(row.id)} className={`w-full px-3 py-2 text-left ${DASHBOARD_BUTTON_TEXT_CLASS} hover:bg-[#fafafa]`}>
                  {row.name}
                </button>
              ))}
            </PickerMenu>
          ) : null}
        </div>
        <div className="relative">
          <PickerButton label={selectedBlock || "Block"} open={openPicker === "block"} onClick={() => setOpenPicker(openPicker === "block" ? null : "block")} />
          {openPicker === "block" ? (
            <PickerMenu>
              {blockOptions.map((block) => (
                <button
                  key={block}
                  type="button"
                  onClick={() => {
                    const nextClass = availableClasses.find((row) => row.block === block && (!selectedLevel || row.level === selectedLevel)) ??
                      availableClasses.find((row) => row.block === block);
                    setSelectedBlock(block);
                    if (nextClass) setSelectedClassId(nextClass.id);
                    setOpenPicker(null);
                  }}
                  className={`w-full px-3 py-2 text-left ${DASHBOARD_BUTTON_TEXT_CLASS} hover:bg-[#fafafa]`}
                >
                  {block}
                </button>
              ))}
            </PickerMenu>
          ) : null}
        </div>
        <div className="relative">
          <PickerButton label={selectedLevel || "Level"} open={openPicker === "level"} onClick={() => setOpenPicker(openPicker === "level" ? null : "level")} />
          {openPicker === "level" ? (
            <PickerMenu>
              {levelOptions.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => {
                    const nextClass = availableClasses.find((row) => row.level === level && (!selectedBlock || row.block === selectedBlock)) ??
                      availableClasses.find((row) => row.level === level);
                    setSelectedLevel(level);
                    if (nextClass) setSelectedClassId(nextClass.id);
                    setOpenPicker(null);
                  }}
                  className={`w-full px-3 py-2 text-left ${DASHBOARD_BUTTON_TEXT_CLASS} hover:bg-[#fafafa]`}
                >
                  {level}
                </button>
              ))}
            </PickerMenu>
          ) : null}
        </div>
        <label className={`flex items-center gap-3 ${DASHBOARD_DIRECTORY_TOOLBAR_CONTROL_CLASS}`}>
          <Search className="size-5 shrink-0 text-[#14c1d5]" aria-hidden strokeWidth={2} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search student..."
            className={DASHBOARD_DIRECTORY_TOOLBAR_INPUT_CLASS}
          />
        </label>
      </div>

      <section className={`${DASHBOARD_PANEL_CLASS} p-5`}>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-3">
            <StatPill tone="approved" label={`Enrolled: ${stats.approved}`} />
            <StatPill tone="pending" label={`Pending: ${stats.pending}`} />
            <StatPill tone="waitlist" label={`Waitlist: ${stats.waitlist}`} />
            <StatPill tone="capacity" label={`Capacity: ${stats.capacity || "--"}`} />
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenPicker(openPicker === "sort" ? null : "sort")}
                className={`inline-flex items-center gap-2 hover:bg-[#f0f0f0] ${DASHBOARD_DIRECTORY_TOOLBAR_CONTROL_CLASS} bg-[#fafafa]`}
              >
                <SlidersHorizontal className="size-4" aria-hidden strokeWidth={2} />
                Sort
                <ChevronDown className="size-4" aria-hidden strokeWidth={2} />
              </button>
              {openPicker === "sort" ? (
                <PickerMenu alignRight>
                  {[
                    ["status", "Status priority"],
                    ["student-az", "Student A-Z"],
                    ["student-za", "Student Z-A"],
                  ].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => { setSort(value as SortOption); setOpenPicker(null); }} className={`w-full px-3 py-2 text-left ${DASHBOARD_BUTTON_TEXT_CLASS} hover:bg-[#fafafa]`}>
                      {label}
                    </button>
                  ))}
                </PickerMenu>
              ) : null}
            </div>
            <button type="button" onClick={toggleAll} className={`${DASHBOARD_DIRECTORY_TOOLBAR_CONTROL_CLASS} bg-[#fafafa] px-4 hover:bg-[#f0f0f0]`}>
              {selectedIds.size > 0 ? `Clear selected (${selectedIds.size})` : "Select visible"}
            </button>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className={`${DASHBOARD_DIRECTORY_TOOLBAR_CONTROL_CLASS} border border-[#14c1d5]/40 px-4 font-semibold text-[#14c1d5] hover:bg-[#ecfdff]`}
            >
              Bulk import CSV
            </button>
          </div>
        </div>

        <DashboardBulkSelectionBar count={selectedIds.size} noun="student" onClear={() => setSelectedIds(new Set())}>
          <button
            type="button"
            onClick={exportSelectedRoster}
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
          <table className="min-w-[960px] table-fixed border-collapse">
            <thead>
              <tr className={DASHBOARD_DIRECTORY_TABLE_HEAD_ROW_CLASS}>
                <th className={`w-[250px] ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>Student</th>
                <th className={`w-[160px] ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>Parent</th>
                <th className={`w-[90px] text-center ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>Age</th>
                <th className={`w-[150px] text-center ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>Status</th>
                <th className={`w-[140px] text-center ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>Preference</th>
                <th className={DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}>Notes</th>
                <th className={`w-[90px] text-center ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>Action</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[15px] text-[#666d80]">Loading roster...</td>
                </tr>
              ) : visibleRows.length ? (
                visibleRows.map((student) => (
                  <tr
                    key={`${student.id}-${student.status}`}
                    className={DASHBOARD_DIRECTORY_TABLE_BODY_ROW_CLASS}
                    onMouseEnter={() => warmStudent(student.id)}
                    onFocusCapture={() => warmStudent(student.id)}
                  >
                    <td className={DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}>
                      <div className="flex min-w-0 items-center gap-3">
                        <button
                          type="button"
                          aria-pressed={selectedIds.has(student.id)}
                          onClick={() => toggleRow(student.id)}
                          className={`size-[16px] shrink-0 rounded-[4px] border border-[#14c1d5] ${selectedIds.has(student.id) ? "bg-[#14c1d5]" : "bg-[#d2f1f5]/50"}`}
                        />
                        <img src="/images/avatars/student-1.png" alt="" className="size-9 rounded-full object-cover" />
                        <Link href={`/dashboard/students/${encodeURIComponent(student.id)}`} className="truncate hover:text-[#14c1d5]">
                          {student.name}
                        </Link>
                      </div>
                    </td>
                    <td className={DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}>{student.parent || "--"}</td>
                    <td className={`text-center ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>{student.age || "--"}</td>
                    <td className={`text-center ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>
                      <span className={`inline-flex rounded-[6px] border px-2.5 py-1 ${DASHBOARD_STATUS_PILL_TEXT_CLASS} ${statusClasses(student.status)}`}>
                        {statusLabel(student.status)}
                      </span>
                    </td>
                    <td className={`text-center ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>{student.status === "Rejected" ? "--" : student.status === "Pending" ? "Pending" : "1st"}</td>
                    <td className={`${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS} italic text-[#666d80]`}>{student.description || "--"}</td>
                    <td className={`text-center ${DASHBOARD_DIRECTORY_TABLE_CELL_CLASS}`}>
                      <DashboardRowActionsMenu
                        label={`Actions for ${student.name}`}
                        isOpen={openActionId === student.id}
                        onToggle={() => {
                          warmStudent(student.id);
                          setOpenActionId((id) => (id === student.id ? null : student.id));
                        }}
                        onClose={() => setOpenActionId(null)}
                        actions={[
                          { label: "View profile", href: `/dashboard/students/${encodeURIComponent(student.id)}` },
                          { label: "View schedule", href: `/dashboard/students/${encodeURIComponent(student.id)}/schedule` },
                          { label: "View student roster", href: `/dashboard/students/${encodeURIComponent(student.id)}/roster` },
                        ]}
                      />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[15px] text-[#666d80]">No students match this roster.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      <DashboardBulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk import roster rows"
        entityLabel="student"
        filename="student-roster-import-template.csv"
        columns={[
          { key: "name", label: "Name", required: true, sample: "New Student" },
          { key: "parent", label: "Parent", sample: "Parent Name" },
          { key: "age", label: "Age", sample: "14" },
          { key: "level", label: "Level", sample: "3" },
          { key: "status", label: "Status", sample: "Pending" },
          { key: "description", label: "Description", sample: "Optional roster note" },
        ]}
        onImport={importRosterRows}
      />
    </div>
  );
}

function PickerButton({ label, open, onClick }: { label: string; open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={DASHBOARD_DIRECTORY_TOOLBAR_SELECT_CLASS}
    >
      <span className="truncate">{label}</span>
      <ChevronDown className={`size-5 shrink-0 text-[#0d0d12] transition-transform ${open ? "rotate-180" : ""}`} aria-hidden strokeWidth={2} />
    </button>
  );
}

function PickerMenu({ children, alignRight = false }: { children: React.ReactNode; alignRight?: boolean }) {
  return (
    <div className={`absolute top-[calc(100%+6px)] z-50 max-h-[280px] w-full min-w-[190px] overflow-auto rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg ${alignRight ? "right-0" : "left-0"}`}>
      {children}
    </div>
  );
}

function StatPill({ tone, label }: { tone: "approved" | "pending" | "waitlist" | "capacity"; label: string }) {
  const classes = {
    approved: "border-[#004d08]/45 bg-[#d9e7d8] text-[#004d08]",
    pending: "border-[#d80509]/45 bg-[#ffd9d9] text-[#d80509]",
    waitlist: "border-[#cfa500]/45 bg-[#fff8e6] text-[#9a7600]",
    capacity: "border-[#14c1d5]/50 bg-[#d2f1f5] text-[#1392a0]",
  }[tone];
  return <span className={`inline-flex rounded-[6px] border px-2.5 py-1 ${DASHBOARD_STATUS_PILL_TEXT_CLASS} ${classes}`}>{label}</span>;
}
