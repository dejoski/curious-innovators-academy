"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { teacherCreateFailureExtraHint } from "@/lib/product-copy";

export type ProgramKind = "core" | "enrichment";

async function readApiError(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { error?: string };
    return j.error ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

export default function CreateTeacherPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [subjects, setSubjects] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [program, setProgram] = useState<ProgramKind>("core");
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    const n = name.trim();
    if (!n || submitting) return;
    setSubmitting(true);
    setHint(null);
    try {
      const res = await fetch("/api/data/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          subjects: subjects.trim() || "TBD",
          email: email.trim() || "pending@school.edu",
          phone: phone.trim() || undefined,
          program,
        }),
      });
      if (res.ok) {
        router.push("/dashboard/teachers");
        return;
      }
      const errDetail = `${await readApiError(res)}. ${teacherCreateFailureExtraHint()}`;
      setHint(errDetail);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full bg-[#fafafa] min-h-screen p-8 font-sans">
      <div className="mx-auto max-w-md">
        <Link href="/dashboard/teachers" className="inline-block text-sm font-medium text-[#666d80] hover:text-[#0d0d12] mb-6">
          ← Teachers
        </Link>
        <h1 className="font-bold text-[#272932] text-[28px] mb-2">Create teacher</h1>
        <p className="text-[#666d80] text-[16px] mb-6">
          Adds a faculty record to the directory using <code className="text-[13px]">POST /api/data/teachers</code>. You
          return to Teachers after a successful save.
        </p>
        {hint && (
          <p className="mb-4 rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-xs text-amber-950 leading-snug">
            {hint}
          </p>
        )}
        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-sm flex flex-col gap-4">
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
              placeholder="e.g. Jamie Chen"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Subjects
            <input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
              placeholder="e.g. Geometry, Robotics"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
              placeholder="name@school.edu"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Phone (optional)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
              placeholder="(555) 000-0000"
            />
          </label>
          <label className="flex flex-col gap-2 text-sm text-[#272932] font-semibold">
            Primary program
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value as ProgramKind)}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
            >
              <option value="core">Core</option>
              <option value="enrichment">Enrichment</option>
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Link href="/dashboard/teachers" className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
              Cancel
            </Link>
            <button
              type="button"
              disabled={!name.trim() || submitting}
              onClick={() => void submit()}
              className="rounded-lg bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebd] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save teacher"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
