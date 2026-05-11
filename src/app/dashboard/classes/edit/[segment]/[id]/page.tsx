"use client";

import type { ProgramTrack, SchoolClassRow } from "@/lib/data/types";
import Link from "next/link";
import { notFound, useParams, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

type ClassStatus = "Active" | "Full";

async function readApiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

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

  const save = async () => {
    const trimmed = draft.name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSyncHint(null);
    try {
      const res = await fetch("/api/data/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: draft.id,
          name: trimmed,
          teacher: draft.teacher.trim() || "TBD",
          students: draft.students.trim() || "0/1",
          schedule: draft.schedule.trim() || "TBD",
          status: draft.status,
          track: draft.program,
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
          <p className="font-sans text-[14px] leading-relaxed text-[#666d80]">
            Figma: Classes / Edit Class (<span className="font-mono text-[13px]">363:4181</span>).
          </p>
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
            <input
              value={draft.teacher}
              onChange={(e) => setRow({ ...draft, teacher: e.target.value })}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Seats
            <input
              value={draft.students}
              onChange={(e) => setRow({ ...draft, students: e.target.value })}
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
              disabled={!draft.name.trim() || submitting}
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
