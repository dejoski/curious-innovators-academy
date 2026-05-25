"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { readApiError } from "@/lib/client-api-errors";
import {
  ENTITY_FORM_CANCEL_CLASS,
  ENTITY_FORM_CARD_CLASS,
  ENTITY_FORM_INPUT_CLASS,
  ENTITY_FORM_LABEL_CLASS,
  ENTITY_FORM_SELECT_CLASS,
  ENTITY_FORM_SUBMIT_CLASS,
  ENTITY_FORM_WARNING_CLASS,
} from "@/lib/entity-form-classes";
import { studentCreatePartialSaveHint } from "@/lib/product-copy";

type ProgramTrack = "core" | "enrichment";

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
          <p className={ENTITY_FORM_WARNING_CLASS}>{hint}</p>
        )}
        <div className={ENTITY_FORM_CARD_CLASS}>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Student name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={ENTITY_FORM_INPUT_CLASS}
              placeholder="e.g. Alex Johnson"
            />
          </label>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Parent / guardian
            <input
              value={parent}
              onChange={(e) => setParent(e.target.value)}
              className={ENTITY_FORM_INPUT_CLASS}
            />
          </label>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Grade label
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={ENTITY_FORM_SELECT_CLASS}
            >
              {GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Program track
            <select
              value={track}
              onChange={(e) => setTrack(e.target.value as ProgramTrack)}
              className={ENTITY_FORM_SELECT_CLASS}
            >
              <option value="core">Core</option>
              <option value="enrichment">Enrichment</option>
            </select>
          </label>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Notes (optional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={ENTITY_FORM_INPUT_CLASS}
            />
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Link href="/dashboard/students" className={ENTITY_FORM_CANCEL_CLASS}>
              Cancel
            </Link>
            <button
              type="button"
              disabled={!name.trim() || submitting}
              onClick={() => void submit()}
              className={ENTITY_FORM_SUBMIT_CLASS}
            >
              {submitting ? "Saving…" : "Save student"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
