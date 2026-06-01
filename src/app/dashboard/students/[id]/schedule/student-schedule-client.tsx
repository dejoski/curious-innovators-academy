"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Download, ListChecks, UserRound } from "lucide-react";

import {
  ParentScheduleGrid,
  type ParentScheduleBadges,
  type ParentScheduleSlotKey,
} from "@/components/parent-schedule-grid";
import { buildParentScheduleBadges } from "@/lib/parent-schedule-badges";
import { downloadCsv } from "@/lib/client-directory-actions";
import { mutateDashboardData, readDashboardData } from "@/lib/client-data-cache";
import { readApiError } from "@/lib/client-api-errors";
import { DASHBOARD_PANEL_CLASS } from "@/lib/dashboard-shell-classes";
import type { DataSource } from "@/lib/data/fetch-source";
import type { SchoolClassRow, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import {
  parentScheduleFinalityClasses,
  parentScheduleFinalityFromRow,
} from "@/lib/parent-schedule-status";
import { scheduleSlotForClassFields, studentScheduleSlots } from "@/lib/schedule-slots";

type RowData = StudentScheduleRow;

type SlotDetail = {
  slot: ParentScheduleSlotKey;
  day: string;
  block: string;
  time: string;
};

const SLOT_DETAILS: SlotDetail[] = [
  { slot: "b1", day: "Day 1-3", block: "Block 1", time: "9:00 - 10:30 am" },
  { slot: "b2", day: "Day 1-3", block: "Block 2", time: "10:30 am - 12:00 pm" },
  { slot: "b3Tue", day: "Day 1", block: "Block 3", time: "12:30 - 2:00 pm" },
  { slot: "b3Wed", day: "Day 2", block: "Block 3", time: "12:30 - 2:00 pm" },
  { slot: "b3Thu", day: "Day 3", block: "Block 3", time: "12:30 - 2:00 pm" },
  { slot: "b4Tue", day: "Day 1", block: "Block 4", time: "2:00 - 3:30 pm" },
  { slot: "b4Wed", day: "Day 2", block: "Block 4", time: "2:00 - 3:30 pm" },
  { slot: "b4Thu", day: "Day 3", block: "Block 4", time: "2:00 - 3:30 pm" },
];

const SELECTABLE_SLOTS: ParentScheduleSlotKey[] = [
  "b3Tue",
  "b3Wed",
  "b3Thu",
  "b4Tue",
  "b4Wed",
  "b4Thu",
];

function realBadges(badges: StudentScheduleBadge[] | undefined): StudentScheduleBadge[] {
  return (badges ?? []).filter((badge) => badge.tone !== "empty" && badge.label !== "--");
}

function badgeStatusLabel(tone: StudentScheduleBadge["tone"]): string {
  if (tone === "core") return "Core";
  if (tone === "approved") return "Approved";
  if (tone === "pending") return "Pending approval";
  if (tone === "waitlisted") return "Waitlisted";
  if (tone === "draft") return "Draft choice";
  return "Open";
}

function badgeChipClasses(tone: StudentScheduleBadge["tone"]): string {
  if (tone === "core") return "border-[#14c1d5]/45 bg-[#d2f1f5] text-[#155e66]";
  if (tone === "approved") return "border-[#004d08]/25 bg-[#d9e7d8] text-[#004d08]";
  if (tone === "pending") return "border-[#d80509]/25 bg-[#ffd9d9] text-[#8c1f1f]";
  if (tone === "waitlisted") return "border-[#cfa500]/45 bg-[#fff8e6] text-[#7a5b00]";
  if (tone === "draft") return "border-[#84adff]/45 bg-[#eef4ff] text-[#3451a4]";
  return "border-[#dfe3ea] bg-[#fbfcfe] text-[#667085]";
}

function sourceHint(source: DataSource): string | null {
  if (source === "fallback") return "Showing a starter schedule while student records finish loading.";
  if (source === "unavailable") return "Student schedule is temporarily unavailable.";
  return null;
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex min-h-[88px] items-center gap-3 rounded-[12px] border border-[#eef0f3] bg-white px-4 py-3 shadow-sm">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#d2f1f5] text-[#1392a0]">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[22px] font-bold leading-tight text-[#272932]">{value}</p>
        <p className="text-[13px] leading-snug text-[#666d80]">{label}</p>
      </div>
    </div>
  );
}

function LegendItem({ tone, label }: { tone: StudentScheduleBadge["tone"]; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`size-[18px] rounded-[5px] border ${badgeChipClasses(tone)}`} aria-hidden />
      <span className="text-[13px] leading-tight text-[#0d0d12]">{label}</span>
    </div>
  );
}

function SlotChoiceList({
  badges,
  slot,
  onManage,
}: {
  badges: StudentScheduleBadge[];
  slot: ParentScheduleSlotKey;
  onManage: () => void;
}) {
  const visible = realBadges(badges);
  if (visible.length === 0) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-[13px] text-[#667085]">{slot === "b1" || slot === "b2" ? "No core assignment" : "Open enrichment slot"}</span>
        <button type="button" onClick={onManage} className="text-[12px] font-semibold text-[#0b7180] hover:underline">
          Add class
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((badge, index) => (
        <span
          key={`${badge.label}-${badge.tone}-${index}`}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold ${badgeChipClasses(badge.tone)}`}
        >
          {badge.label}
          <span className="font-medium opacity-80">{badgeStatusLabel(badge.tone)}</span>
        </span>
      ))}
      <button type="button" onClick={onManage} className="text-[12px] font-semibold text-[#0b7180] hover:underline">
        Edit
      </button>
    </div>
  );
}

type ClassesBody = { classes?: SchoolClassRow[]; source?: DataSource };

function classSlot(row: SchoolClassRow): ParentScheduleSlotKey {
  return scheduleSlotForClassFields({
    block: row.block,
    scheduleSummary: row.schedule,
  });
}

export default function StudentScheduleClient({
  studentId,
  initialRows,
  initialSource,
}: {
  studentId: string;
  initialRows: RowData[];
  initialSource: DataSource;
}) {
  const cacheKey = `/api/data/students/${encodeURIComponent(studentId)}/schedule`;
  const [rows, setRows] = useState<RowData[]>(() => initialRows);
  const [source, setSource] = useState<DataSource>(initialSource);
  const [isLoading, setIsLoading] = useState(initialRows.length === 0 && initialSource !== "remote");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classes, setClasses] = useState<SchoolClassRow[]>([]);
  const [assignmentSlot, setAssignmentSlot] = useState<ParentScheduleSlotKey | null>(null);
  const [assignmentClassId, setAssignmentClassId] = useState("");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  useEffect(() => {
    let cancelled = false;
    mutateDashboardData(cacheKey, () => ({ rows: initialRows, source: initialSource }));
    async function loadSchedule() {
      if (initialRows.length === 0) setIsLoading(true);
      setLoadError(null);
      try {
        const payload = await readDashboardData<{ rows?: RowData[]; source?: DataSource }>(
          cacheKey,
          undefined,
          { force: true },
        );
        if (cancelled) return;
        setRows(Array.isArray(payload.rows) ? payload.rows : []);
        setSource(payload.source ?? "unavailable");
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setSource("unavailable");
          setLoadError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, initialRows, initialSource]);

  const schedule = useMemo(() => rows.find((row) => row.id === studentId) ?? rows[0] ?? null, [rows, studentId]);
  const badgesBySlot: ParentScheduleBadges = useMemo(
    () => buildParentScheduleBadges(schedule),
    [schedule],
  );
  const slots = useMemo(() => (schedule ? studentScheduleSlots(schedule) : null), [schedule]);
  const finality = useMemo(() => parentScheduleFinalityFromRow(schedule), [schedule]);

  const summary = useMemo(() => {
    const badges = slots ? Object.values(slots).flatMap((slotBadges) => realBadges(slotBadges)) : [];
    const openSlots = slots
      ? SELECTABLE_SLOTS.filter((slot) => realBadges(slots[slot]).length === 0).length
      : 0;

    return {
      core: badges.filter((badge) => badge.tone === "core").length,
      approved: badges.filter((badge) => badge.tone === "approved").length,
      pending: badges.filter((badge) => badge.tone === "pending" || badge.tone === "draft").length,
      openSlots,
    };
  }, [slots]);

  const hint = sourceHint(source);
  const assignmentBadges = assignmentSlot ? realBadges(badgesBySlot[assignmentSlot]) : [];
  const replaceableClassId = assignmentBadges.find((badge) => badge.classId && (badge.tone === "core" || badge.tone === "approved"))?.classId ?? "";
  const assignmentOptions = useMemo(() => {
    if (!assignmentSlot) return [];
    const matching = classes.filter((row) => classSlot(row) === assignmentSlot);
    return matching.length ? matching : classes;
  }, [assignmentSlot, classes]);

  const openAssignmentModal = async (slot: ParentScheduleSlotKey) => {
    setAssignmentSlot(slot);
    setAssignmentClassId("");
    setAssignmentError(null);
    if (classes.length > 0) return;
    try {
      const body = await readDashboardData<ClassesBody>("/api/data/classes");
      setClasses(body.classes ?? []);
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Classes could not be loaded.");
    }
  };

  const refreshSchedule = async () => {
    const payload = await readDashboardData<{ rows?: RowData[]; source?: DataSource }>(
      cacheKey,
      undefined,
      { force: true },
    );
    setRows(Array.isArray(payload.rows) ? payload.rows : []);
    setSource(payload.source ?? "unavailable");
  };

  const saveAssignment = async () => {
    if (!assignmentSlot || !assignmentClassId || isSavingAssignment) return;
    setIsSavingAssignment(true);
    setAssignmentError(null);
    try {
      if (replaceableClassId && replaceableClassId === assignmentClassId) {
        setAssignmentSlot(null);
        return;
      }
      if (replaceableClassId && replaceableClassId !== assignmentClassId) {
        const removeRes = await fetch(
          `/api/data/classes/${encodeURIComponent(replaceableClassId)}/roster?studentId=${encodeURIComponent(studentId)}`,
          { method: "DELETE" },
        );
        if (!removeRes.ok) throw new Error(await readApiError(removeRes));
      }
      const addRes = await fetch(`/api/data/classes/${encodeURIComponent(assignmentClassId)}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, status: "Approved" }),
      });
      if (!addRes.ok) throw new Error(await readApiError(addRes));
      await refreshSchedule();
      setAssignmentSlot(null);
    } catch (error) {
      setAssignmentError(error instanceof Error ? error.message : "Schedule assignment could not be saved.");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const exportSchedule = () => {
    if (!schedule || !slots) return;
    const label = (items: StudentScheduleBadge[]) =>
      realBadges(items)
        .map((item) => `${item.label} (${badgeStatusLabel(item.tone)})`)
        .join("; ") || "Open";

    downloadCsv(
      `${schedule.name || "student"}-schedule.csv`,
      ["Student", "Parent", "Day", "Block", "Time", "Classes"],
      SLOT_DETAILS.map((slot) => [
        schedule.name,
        schedule.parent,
        slot.day,
        slot.block,
        slot.time,
        label(slots[slot.slot]),
      ]),
    );
  };

  return (
    <div className="relative flex min-h-full w-full flex-col gap-6 px-4 py-6 font-sans md:px-8 md:py-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#667085]">
            Student schedule
          </p>
          <h1 className="mt-1 text-[30px] font-bold leading-[1.08] text-[#272932] md:text-[34px]">
            {schedule?.name ? `${schedule.name}'s schedule` : "Student schedule"}
          </h1>
          <p className="mt-2 max-w-[720px] text-[16px] leading-[1.45] text-[#666d80]">
            Admin view for the selected student schedule: core assignments, enrichment approvals, pending choices, and open blocks.
          </p>
          {hint ? <p className="mt-2 text-sm text-[#7a5b00]">{hint}</p> : null}
          {loadError ? <p className="mt-2 text-sm text-[#8c1f1f]">{loadError}</p> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/dashboard/students/${encodeURIComponent(studentId)}`}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#dfe3ea] bg-white px-3 py-2 text-[13px] font-semibold text-[#344054] shadow-sm hover:bg-[#fafafa]"
          >
            <UserRound className="size-4" aria-hidden strokeWidth={2} />
            Profile
          </Link>
          <Link
            href={`/dashboard/students/${encodeURIComponent(studentId)}/roster`}
            className="inline-flex items-center gap-2 rounded-[8px] border border-[#dfe3ea] bg-white px-3 py-2 text-[13px] font-semibold text-[#344054] shadow-sm hover:bg-[#fafafa]"
          >
            <ListChecks className="size-4" aria-hidden strokeWidth={2} />
            Roster
          </Link>
          <button
            type="button"
            onClick={exportSchedule}
            disabled={!schedule}
            className="inline-flex items-center gap-2 rounded-[8px] bg-[#14c1d5] px-3 py-2 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#11adbf] disabled:cursor-not-allowed disabled:bg-[#d6eef1] disabled:text-[#78aeb5]"
          >
            <Download className="size-4" aria-hidden strokeWidth={2} />
            Download CSV
          </button>
        </div>
      </div>

      {isLoading ? (
        <output className={`${DASHBOARD_PANEL_CLASS} flex min-h-[300px] items-center justify-center p-8`}>
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="size-8 animate-spin rounded-full border-[3px] border-[#14c1d5]/25 border-t-[#14c1d5]" aria-hidden />
            <p className="text-sm font-semibold text-[#155e66]">Loading student schedule&hellip;</p>
          </div>
        </output>
      ) : schedule ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard icon={<CalendarDays className="size-5" aria-hidden strokeWidth={2} />} label="Core assignments" value={summary.core} />
            <MetricCard icon={<ListChecks className="size-5" aria-hidden strokeWidth={2} />} label="Approved enrichments" value={summary.approved} />
            <MetricCard icon={<ListChecks className="size-5" aria-hidden strokeWidth={2} />} label="Pending or draft choices" value={summary.pending} />
            <MetricCard icon={<CalendarDays className="size-5" aria-hidden strokeWidth={2} />} label="Open enrichment slots" value={summary.openSlots} />
          </div>

          <section className={`${DASHBOARD_PANEL_CLASS} p-4 md:p-5`}>
            <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[20px] font-bold leading-tight text-[#272932]">Schedule grid</h2>
                  <span className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${parentScheduleFinalityClasses(finality.state)}`}>
                    {finality.label}
                  </span>
                </div>
                <p className="mt-1 max-w-[720px] text-[14px] leading-[1.45] text-[#666d80]">
                  {finality.description}
                </p>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                <LegendItem tone="core" label="Core" />
                <LegendItem tone="approved" label="Approved" />
                <LegendItem tone="pending" label="Pending" />
                <LegendItem tone="waitlisted" label="Waitlisted" />
                <LegendItem tone="draft" label="Draft" />
              </div>
            </div>
            <ParentScheduleGrid badgesBySlot={badgesBySlot} className="border-[#eef0f3] shadow-none" />
          </section>

          <section className={`${DASHBOARD_PANEL_CLASS} overflow-hidden`}>
            <div className="border-b border-[#eef0f3] px-4 py-4 md:px-5">
              <h2 className="text-[18px] font-bold leading-tight text-[#272932]">Block details</h2>
              <p className="mt-1 text-[14px] text-[#666d80]">
                One row per real schedule slot. Open rows are available for enrichment placement.
              </p>
            </div>
            <div className="divide-y divide-[#eef0f3]">
              {SLOT_DETAILS.map((slot) => (
                <div key={slot.slot} className="grid gap-3 px-4 py-4 md:grid-cols-[120px_130px_150px_minmax(0,1fr)] md:px-5">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#818898]">Day</p>
                    <p className="mt-1 text-[14px] font-semibold text-[#272932]">{slot.day}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#818898]">Block</p>
                    <p className="mt-1 text-[14px] font-semibold text-[#272932]">{slot.block}</p>
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#818898]">Time</p>
                    <p className="mt-1 text-[14px] text-[#344054]">{slot.time}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-semibold uppercase tracking-[0.04em] text-[#818898]">Classes</p>
                    <div className="mt-2">
                      <SlotChoiceList
                        badges={badgesBySlot[slot.slot] ?? []}
                        slot={slot.slot}
                        onManage={() => void openAssignmentModal(slot.slot)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <div className={`${DASHBOARD_PANEL_CLASS} p-8 text-center`}>
          <p className="text-[15px] font-semibold text-[#272932]">No schedule found for this student.</p>
          <p className="mt-2 text-[14px] text-[#666d80]">
            The route is valid, but the student has no schedule rows in the current data source.
          </p>
        </div>
      )}
      {assignmentSlot ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-[520px] rounded-[18px] bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-[#272932]">Edit schedule assignment</h3>
                <p className="mt-1 text-sm text-[#666d80]">
                  Choose a class for {SLOT_DETAILS.find((slot) => slot.slot === assignmentSlot)?.block}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAssignmentSlot(null)}
                className="rounded-full px-2 py-1 text-xl font-bold text-[#667085] hover:bg-[#f5f7fa]"
                aria-label="Close assignment editor"
              >
                &times;
              </button>
            </div>
            {assignmentBadges.length > 0 ? (
              <div className="mt-4 rounded-[10px] border border-[#eef0f3] bg-[#fafafa] p-3 text-sm text-[#344054]">
                Current: {assignmentBadges.map((badge) => badge.label).join("; ")}
              </div>
            ) : null}
            {assignmentError ? (
              <div role="alert" className="mt-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {assignmentError}
              </div>
            ) : null}
            <label className="mt-5 flex flex-col gap-2">
              <span className="text-sm font-semibold text-[#272932]">Class</span>
              <select
                value={assignmentClassId}
                onChange={(event) => setAssignmentClassId(event.target.value)}
                className="h-11 rounded-[8px] border border-[#dfe1e7] bg-white px-3 text-sm text-[#272932] outline-none focus:border-[#14c1d5]"
              >
                <option value="">Select a class</option>
                {assignmentOptions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} - {row.program} - {row.block || "Block not set"} {row.level || ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setAssignmentSlot(null)}
                className="rounded-[8px] px-4 py-2 text-sm font-semibold text-[#666d80] hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveAssignment()}
                disabled={!assignmentClassId || isSavingAssignment}
                className="rounded-[8px] bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#11a9bb] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
              >
                {isSavingAssignment ? "Saving..." : "Save assignment"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
