"use client";

import type { ProgramTrack, SchoolClassRow } from "@/lib/data/types";
import { readApiError } from "@/lib/client-api-errors";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

type ClassStatus = "Active" | "Full";

export default function EditClassPage() {
  const router = useRouter();
  const params = useParams<{ segment: string; id: string }>();
  const rawSegment = typeof params?.segment === "string" ? params.segment : "";
  const id = typeof params?.id === "string" ? params.id : "";
  const segmentValid = rawSegment === "core" || rawSegment === "enrichment";

  const program: ProgramTrack = rawSegment === "enrichment" ? "enrichment" : "core";
  const [row, setRow] = useState<SchoolClassRow | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!segmentValid || !id) return;
    let cancelled = false;
    (async () => {
      setLoadError(null);
      try {
        const res = await fetch("/api/data/classes");
        if (!res.ok) {
          if (!cancelled) setLoadError(await readApiError(res));
          return;
        }
        const body = (await res.json()) as { classes: SchoolClassRow[] };
        const found = body.classes.find((c) => String(c.id) === String(id) && c.program === program);
        if (!cancelled) {
          if (!found) setLoadError("This class ID is not in the current roster.");
          else setRow(found);
        }
      } catch {
        if (!cancelled) setLoadError("Network error loading classes.");
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
        <Link href="/dashboard/classes" className="font-medium text-[#14c1d5] hover:underline">
          Back to Class Setup
        </Link>
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
          plannerSubject: draft.plannerSubject ?? "",
          plannerSummary: draft.plannerSummary ?? "",
          teacherGuideObjectives: draft.teacherGuideObjectives ?? "",
          teacherGuideInformation: draft.teacherGuideInformation ?? "",
          teacherGuideSummary: draft.teacherGuideSummary ?? "",
          studentGuideObjectives: draft.studentGuideObjectives ?? "",
          studentGuideInformation: draft.studentGuideInformation ?? "",
          studentGuideSummary: draft.studentGuideSummary ?? "",
        }),
      });
      if (res.ok) {
        router.push(`/dashboard/classes/${segment}/${draft.id}`);
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
          <button
            type="button"
            onClick={() => router.back()}
            className="w-fit bg-transparent border-0 p-0 font-sans text-[14px] font-medium text-[#666d80] hover:text-[#0d0d12] cursor-pointer"
          >
            ← Back
          </button>
          <h1 className="font-sans text-[26px] font-bold leading-tight text-[#0d0d12] md:text-[28px]">
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
            Teacher roster name
            <input
              value={draft.teacher}
              onChange={(e) => setRow({ ...draft, teacher: e.target.value })}
              aria-required="true"
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
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
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Schedule
            <input
              value={draft.schedule}
              onChange={(e) => setRow({ ...draft, schedule: e.target.value })}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Description
            <textarea
              value={draft.description ?? ""}
              onChange={(e) => setRow({ ...draft, description: e.target.value })}
              className="min-h-[96px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Level
            <input
              value={draft.level ?? ""}
              onChange={(e) => setRow({ ...draft, level: e.target.value })}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Block
            <input
              value={draft.block ?? ""}
              onChange={(e) => setRow({ ...draft, block: e.target.value })}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>

          <div className="border-t border-[#f0f0f0] pt-4">
            <h2 className="mb-3 font-sans text-[18px] font-bold text-[#272932]">Daily Planner</h2>
            <div className="grid gap-3">
              <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
                Subject
                <textarea value={draft.plannerSubject ?? ""} onChange={(e) => setRow({ ...draft, plannerSubject: e.target.value })} className="min-h-[80px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]" />
              </label>
              <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
                Summary
                <textarea value={draft.plannerSummary ?? ""} onChange={(e) => setRow({ ...draft, plannerSummary: e.target.value })} className="min-h-[80px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]" />
              </label>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-3">
                <h3 className="font-sans text-[15px] font-bold text-[#272932]">Teacher&apos;s Guide</h3>
                <textarea aria-label="Teacher guide objectives" value={draft.teacherGuideObjectives ?? ""} onChange={(e) => setRow({ ...draft, teacherGuideObjectives: e.target.value })} className="min-h-[80px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]" />
                <textarea aria-label="Teacher guide information" value={draft.teacherGuideInformation ?? ""} onChange={(e) => setRow({ ...draft, teacherGuideInformation: e.target.value })} className="min-h-[80px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]" />
                <textarea aria-label="Teacher guide summary" value={draft.teacherGuideSummary ?? ""} onChange={(e) => setRow({ ...draft, teacherGuideSummary: e.target.value })} className="min-h-[80px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]" />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="font-sans text-[15px] font-bold text-[#272932]">Students&apos; Guide</h3>
                <textarea aria-label="Student guide objectives" value={draft.studentGuideObjectives ?? ""} onChange={(e) => setRow({ ...draft, studentGuideObjectives: e.target.value })} className="min-h-[80px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]" />
                <textarea aria-label="Student guide information" value={draft.studentGuideInformation ?? ""} onChange={(e) => setRow({ ...draft, studentGuideInformation: e.target.value })} className="min-h-[80px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]" />
                <textarea aria-label="Student guide summary" value={draft.studentGuideSummary ?? ""} onChange={(e) => setRow({ ...draft, studentGuideSummary: e.target.value })} className="min-h-[80px] resize-y rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]" />
              </div>
            </div>
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
