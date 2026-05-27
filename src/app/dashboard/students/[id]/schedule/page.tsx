"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CalendarDays, Download, ListChecks, UserRound } from "lucide-react";

import {
  buildParentScheduleBadges,
  ParentScheduleGrid,
  type ParentScheduleBadges,
  type ParentScheduleSlotKey,
} from "@/components/parent-schedule-grid";
import { downloadCsv } from "@/lib/client-directory-actions";
import { DASHBOARD_PANEL_CLASS } from "@/lib/dashboard-shell-classes";
import type { DataSource } from "@/lib/data/fetch-source";
import type { StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import {
  parentScheduleFinalityClasses,
  parentScheduleFinalityFromRow,
} from "@/lib/parent-schedule-status";
import { studentScheduleSlots } from "@/lib/schedule-slots";

type RowData = StudentScheduleRow;

type SlotDetail = {
  slot: ParentScheduleSlotKey;
  day: string;
  block: string;
  time: string;
};

const SLOT_DETAILS: SlotDetail[] = [
  { slot: "b1", day: "Day 1-3", block: "Block 1", time: "7:00 - 8:30 am" },
  { slot: "b2", day: "Day 1-3", block: "Block 2", time: "8:40 - 10:10 am" },
  { slot: "b3Tue", day: "Day 1", block: "Block 3", time: "10:20 - 11:50 am" },
  { slot: "b3Wed", day: "Day 2", block: "Block 3", time: "10:20 - 11:50 am" },
  { slot: "b3Thu", day: "Day 3", block: "Block 3", time: "10:20 - 11:50 am" },
  { slot: "b4Tue", day: "Day 1", block: "Block 4", time: "12:00 - 1:30 pm" },
  { slot: "b4Wed", day: "Day 2", block: "Block 4", time: "12:00 - 1:30 pm" },
  { slot: "b4Thu", day: "Day 3", block: "Block 4", time: "12:00 - 1:30 pm" },
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

function SlotChoiceList({ badges }: { badges: StudentScheduleBadge[] }) {
  const visible = realBadges(badges);
  if (visible.length === 0) {
    return <span className="text-[13px] text-[#667085]">Open enrichment slot</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((badge, index) => (
        <span
          key={`${badge.label}-${badge.tone}-${index}`}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-semibold ${badgeChipClasses(badge.tone)}`}
        >
          {badge.label}
          <span className="font-medium opacity-80">{badgeStatusLabel(badge.tone)}</span>
        </span>
      ))}
    </div>
  );
}

export default function StudentSchedulePage() {
  const params = useParams<{ id: string }>();
  const studentId = params.id;
  const [rows, setRows] = useState<RowData[]>([]);
  const [source, setSource] = useState<DataSource>("unavailable");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const res = await fetch(`/api/data/students/${encodeURIComponent(studentId)}/schedule`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error(`Schedule API failed: ${res.status}`);
        const payload = (await res.json()) as { rows?: RowData[]; source?: DataSource };
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
  }, [studentId]);

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
        <div className={`${DASHBOARD_PANEL_CLASS} flex min-h-[300px] items-center justify-center p-8`} role="status">
          <div className="flex flex-col items-center gap-3 text-center">
            <span className="size-8 animate-spin rounded-full border-[3px] border-[#14c1d5]/25 border-t-[#14c1d5]" aria-hidden />
            <p className="text-sm font-semibold text-[#155e66]">Loading student schedule...</p>
          </div>
        </div>
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
                      <SlotChoiceList badges={slots?.[slot.slot] ?? []} />
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
    </div>
  );
}
