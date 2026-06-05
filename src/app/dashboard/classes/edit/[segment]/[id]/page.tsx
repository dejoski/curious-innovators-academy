"use client";

import type { ProgramTrack, SchoolClassRow, TeacherRow } from "@/lib/data/types";
import { useDashboardNavigationProgress } from "@/components/dashboard-navigation-progress";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData } from "@/lib/client-data-cache";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";
import { PARENT_SCHEDULE_ROWS, canonicalScheduleSummaryForBlockDay } from "@/lib/schedule-slots";

type ClassStatus = "Active" | "Full";
type DayOption = "1" | "2" | "3";
type BlockOption = "1" | "2" | "3" | "4";

const WEEKDAY_OPTIONS = ["M", "T", "W", "TH", "F"] as const;
const DAY_OPTIONS: DayOption[] = ["1", "2", "3"];
const BLOCK_OPTIONS: BlockOption[] = ["1", "2", "3", "4"];

function blockLabelForOption(value: BlockOption): string {
  return PARENT_SCHEDULE_ROWS[Number(value) - 1]?.label ?? `Block ${value}`;
}

function scheduleDaysText(days: string[] | undefined): string {
  return (days ?? []).join(", ");
}

function parseScheduleDays(value: string): string[] {
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function optionalNumber(value: number | undefined): number | undefined {
  return Number.isFinite(value) && value != null && value >= 0 ? value : undefined;
}

export default function EditClassPage() {
  const router = useRouter();
  const { startNavigation } = useDashboardNavigationProgress();
  const params = useParams<{ segment: string; id: string }>();
  const rawSegment = typeof params?.segment === "string" ? params.segment : "";
  const id = typeof params?.id === "string" ? params.id : "";
  const segmentValid = rawSegment === "core" || rawSegment === "enrichment";

  const program: ProgramTrack = rawSegment === "enrichment" ? "enrichment" : "core";
  const [teachers, setTeachers] = useState<TeacherRow[]>([]);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [row, setRow] = useState<SchoolClassRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editBlock, setEditBlock] = useState<BlockOption>("1");
  const [editDay, setEditDay] = useState<DayOption>("1");
  const [editScheduleDays, setEditScheduleDays] = useState<string[]>(["M", "T", "W", "TH", "F"]);

  useEffect(() => {
    if (!segmentValid || !id) return;
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const [classesRes, teachersRes] = await Promise.all([
          fetch("/api/data/classes"),
          fetch("/api/data/teachers"),
        ]);
        if (!classesRes.ok) {
          if (!cancelled) setLoadError(await readApiError(classesRes));
          return;
        }
        const classesBody = (await classesRes.json()) as { classes: SchoolClassRow[] };
        const found = classesBody.classes.find((c) => String(c.id) === String(id) && c.program === program);
        if (!cancelled) {
          if (!found) setLoadError("This class ID is not in the current roster.");
          else {
            setRow(found);
            const blockNum = String(found.block ?? "").match(/\b([1-4])\b/)?.[1] ?? "1";
            const dayNum = String(found.schedule ?? found.block ?? "").match(/\b([1-3])\b/)?.[1] ?? "1";
            setEditBlock(blockNum as BlockOption);
            setEditDay(dayNum as DayOption);
            setEditScheduleDays(found.scheduleDays.length > 0 ? found.scheduleDays : ["M", "T", "W", "TH", "F"]);
          }
        }
        if (teachersRes.ok) {
          const teachersBody = (await teachersRes.json()) as { teachers?: TeacherRow[] };
          if (!cancelled && Array.isArray(teachersBody.teachers)) {
            setTeachers(teachersBody.teachers);
          }
        }
      } catch {
        if (!cancelled) setLoadError("Network error loading classes.");
      } finally {
        if (!cancelled) setTeachersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, program, segmentValid]);

  if (!segmentValid) notFound();

  const segment = rawSegment;

  if (!row && !loadError) {
    return (
      <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
        Loading class…
      </div>
    );
  }

  if (!row && loadError) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-8">
        <p className="text-[#a00408]">{loadError}</p>
      </div>
    );
  }

  const draft = row!;
  const capacity = Number(draft.capacity ?? 0);
  const canSave = Boolean(draft.name.trim() && draft.teacher.trim() && Number.isFinite(capacity) && capacity > 0) && !submitting;

  const save = async () => {
    const trimmed = draft.name.trim();
    const teacherName = draft.teacher.trim();
    if (submitting) return;
    if (!trimmed) {
      setSyncHint("Class name is required.");
      return;
    }
    if (!teacherName) {
      setSyncHint("Choose an existing teacher from the roster before saving this class.");
      return;
    }
    if (!Number.isFinite(capacity) || capacity <= 0) {
      setSyncHint("Capacity must be a positive number.");
      return;
    }
    setSubmitting(true);
    setSyncHint(null);
    try {
      const res = await fetch("/api/data/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          name: trimmed,
          teacher: teacherName,
          capacity,
          schedule: draft.schedule.trim(),
          status: draft.status,
          track: draft.program,
          description: draft.description ?? "",
          level: draft.level ?? "",
          block: draft.block ?? "",
          scheduleDays: draft.scheduleDays,
          location: draft.location ?? "",
          room: draft.room ?? "",
          minAgeYears: optionalNumber(draft.minAgeYears),
          maxAgeYears: optionalNumber(draft.maxAgeYears),
          isActive: draft.isActive,
          archivedAt: draft.archivedAt,
        }),
      });
      if (res.ok) {
        const href = `/dashboard/classes/${segment}/${draft.id}`;
        startNavigation(href);
        router.push(href);
        return;
      }
      setSyncHint(`Could not sync (${await readApiError(res)}).`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full p-[24px] md:p-[32px]">
      <div className="mx-auto flex max-w-[560px] flex-col gap-[24px]">
        <div className="flex flex-col gap-[8px]">
          <h1 className="font-sans text-[28px] font-bold leading-[1.1] text-[#0d0d12]">
            Edit class
          </h1>
          {syncHint && (
            <p className="rounded-lg border border-[#d80509]/30 bg-[#fff5f5] px-4 py-2 text-sm text-[#a00408]">{syncHint}</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-sm flex flex-col gap-4">
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Class name
            <input
              value={draft.name}
              onChange={(e) => setRow({ ...draft, name: e.target.value })}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Teacher
            {teachersLoading ? (
              <input disabled value="Loading teachers..." className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#666d80] outline-none" />
            ) : teachers.length > 0 ? (
              <select
                value={draft.teacher}
                onChange={(e) => setRow({ ...draft, teacher: e.target.value })}
                aria-required="true"
                className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
              >
                <option value="">Select a teacher...</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={draft.teacher}
                onChange={(e) => setRow({ ...draft, teacher: e.target.value })}
                aria-required="true"
                className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
              />
            )}
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Capacity
            <input
              type="number"
              min={1}
              value={String(draft.capacity ?? "")}
              onChange={(e) => setRow({ ...draft, capacity: Number.parseInt(e.target.value, 10) || 0 })}
              aria-required="true"
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
              Day
              <select
                value={editDay}
                onChange={(e) => {
                  const day = e.target.value as DayOption;
                  setEditDay(day);
                  const summary = canonicalScheduleSummaryForBlockDay(editBlock, day);
                  setRow({ ...draft, schedule: summary });
                }}
                className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
              >
                {DAY_OPTIONS.map((value) => (
                  <option key={value} value={value}>Day {value}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
              Block
              <select
                value={editBlock}
                onChange={(e) => {
                  const block = e.target.value as BlockOption;
                  setEditBlock(block);
                  const summary = canonicalScheduleSummaryForBlockDay(block, editDay);
                  setRow({ ...draft, block: blockLabelForOption(block), schedule: summary });
                }}
                className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
              >
                {BLOCK_OPTIONS.map((value) => (
                  <option key={value} value={value}>{blockLabelForOption(value)}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Meeting days
            <div className="mt-1 flex flex-wrap gap-2">
              {WEEKDAY_OPTIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    const next = editScheduleDays.includes(value)
                      ? editScheduleDays.filter((dayValue) => dayValue !== value)
                      : [...editScheduleDays, value];
                    setEditScheduleDays(next);
                    setRow({ ...draft, scheduleDays: next });
                  }}
                  className={`rounded-[8px] border px-3 py-1 font-sans text-[13px] font-semibold ${
                    editScheduleDays.includes(value)
                      ? "border-[#14c1d5] bg-[#d2f1f5] text-[#0d0d12]"
                      : "border-[#dfe1e7] bg-white text-[#666d80]"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Description
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setRow({ ...draft, description: e.target.value })}
              className="min-h-[96px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
              Room
              <input
                value={draft.room ?? ""}
                onChange={(e) => setRow({ ...draft, room: e.target.value, location: e.target.value || draft.location })}
                className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
              />
            </label>
            <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
              Location
              <input
                value={draft.location ?? ""}
                onChange={(e) => setRow({ ...draft, location: e.target.value })}
                className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
              />
            </label>
          </div>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Level
            <input
              value={draft.level ?? ""}
              onChange={(e) => setRow({ ...draft, level: e.target.value })}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
              Minimum age
              <input
                type="number"
                min={0}
                value={draft.minAgeYears ?? ""}
                onChange={(e) => setRow({ ...draft, minAgeYears: e.target.value === "" ? undefined : Number.parseInt(e.target.value, 10) })}
                className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
              />
            </label>
            <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
              Maximum age
              <input
                type="number"
                min={0}
                value={draft.maxAgeYears ?? ""}
                onChange={(e) => setRow({ ...draft, maxAgeYears: e.target.value === "" ? undefined : Number.parseInt(e.target.value, 10) })}
                className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
              />
            </label>
          </div>

          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Status
            <select
              value={draft.status}
              onChange={(e) => setRow({ ...draft, status: e.target.value as ClassStatus })}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            >
              <option value="Active">Active</option>
              <option value="Full">Full</option>
            </select>
          </label>
          <div className="rounded-lg border border-[#ebecef] bg-[#fbfcfd] p-3 font-sans text-[13px] text-[#3f4350]">
            <div className="font-semibold text-[#272932]">Parent visibility</div>
            <div className="mt-1">{draft.isActive && !draft.archivedAt ? "Visible to parents" : "Hidden from parents"}</div>
            {draft.archivedAt ? <div className="mt-1 text-[#7a5b00]">Archived: {new Date(draft.archivedAt).toLocaleString()}</div> : null}
          </div>

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Link
              href={`/dashboard/classes/${segment}/${draft.id}`}
              className="rounded-md bg-[#fafafa] px-4 py-2 font-sans text-sm font-semibold text-[#0d0d12] hover:bg-[#ececee]"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={!canSave}
              onClick={() => void save()}
              className="rounded-md bg-[#14c1d5] px-4 py-2 font-sans text-sm font-semibold text-white hover:bg-[#12aebd] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
