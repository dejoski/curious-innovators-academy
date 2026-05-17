"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { studentCreatePartialSaveHint } from "@/lib/product-copy";

type ProgramTrack = "core" | "enrichment";

async function readApiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

const GRADE_LEVELS = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5"] as const;

export default function AddStudentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [parent, setParent] = useState("");
  const [level, setLevel] = useState<string>("Grade 5");
  const [track, setTrack] = useState<ProgramTrack>("core");
  const [notes, setNotes] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const n = name.trim();
    if (!n || submitting) return;
    const levNum = String(parseInt(level.replace(/\D/g, "") || "5", 10));
    setSubmitting(true);
    setHint(null);
    try {
      const res = await fetch("/api/data/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          parent: parent.trim(),
          level: levNum,
          track,
          notes: notes.trim() || undefined,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { student: { id: string } };
        router.push(`/dashboard/students/${body.student.id}`);
        return;
      }
      setHint(`Could not sync (${await readApiError(res)}). ${studentCreatePartialSaveHint()}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full bg-[#fafafa] min-h-screen p-8 font-sans">
      <div className="mx-auto max-w-md">
        <Link href="/dashboard/students" className="inline-block text-sm font-medium text-[#666d80] hover:text-[#0d0d12] mb-6">
          ← Students
        </Link>
        <h1 className="font-bold text-[#272932] text-[28px] mb-2">Add student</h1>
        <p className="text-[#666d80] text-[16px] mb-6">Create a student record in the directory. You will be taken to their profile after a successful save.</p>
        {hint && (
          <p className="mb-4 rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-xs text-amber-950">{hint}</p>
        )}
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-sm flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Student name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
              placeholder="e.g. Alex Johnson"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Parent / guardian
            <input
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Grade label
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Program track
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as ProgramTrack)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
            >
              <option value="core">Core</option>
              <option value="enrichment">Enrichment</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Notes (optional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Link href="/dashboard/students" className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </Link>
            <button
              type="button"
              disabled={!name.trim() || submitting}
              onClick={() => void submit()}
              className="rounded-lg bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebf] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
