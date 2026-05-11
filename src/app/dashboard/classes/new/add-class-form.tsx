"use client";

import type { ProgramTrack } from "@/lib/data/types";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function AddClassForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [trackTab, setTrackTab] = useState<ProgramTrack>(() =>
    searchParams.get("track") === "enrichment" ? "enrichment" : "core",
  );

  useEffect(() => {
    const t = searchParams.get("track");
    setTrackTab(t === "enrichment" ? "enrichment" : "core");
  }, [searchParams]);

  const [name, setName] = useState("");
  const [teacher, setTeacher] = useState("");
  const [students, setStudents] = useState("0/24");
  const [scheduleText, setScheduleText] = useState("");
  const [status, setStatus] = useState<ClassStatus>("Active");
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const segment = trackTab === "enrichment" ? "enrichment" : "core";

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setSyncHint(null);
    try {
      const res = await fetch("/api/data/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmed,
          teacher: teacher.trim() || "TBD",
          students: students.trim() || "0/1",
          schedule: scheduleText.trim() || "TBD",
          status,
          track: segment,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { class: { id: string } };
        router.push(`/dashboard/classes/${segment}/${body.class.id}`);
        return;
      }
      setSyncHint(`Could not save (${await readApiError(res)}). Return to Class Setup and try again.`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full p-[24px] md:p-[32px]">
      <div className="mx-auto flex max-w-[560px] flex-col gap-[24px]">
        <div className="flex flex-col gap-[8px]">
          <Link
            href="/dashboard/classes"
            className="w-fit font-sans text-[14px] font-medium text-[#666d80] hover:text-[#0d0d12]"
          >
            ← Back to Class Setup
          </Link>
          <h1 className="font-sans text-[26px] font-bold leading-tight text-[#0d0d12] md:text-[28px]">
            Add {trackTab === "enrichment" ? "enrichment" : "core"} class
          </h1>
          <div className="inline-flex rounded-[10px] bg-[#ececee] p-[4px]" role="tablist" aria-label="Program track">
            <button
              type="button"
              aria-selected={trackTab === "core"}
              className={`rounded-[8px] px-[18px] py-[8px] font-sans text-[14px] font-medium transition-colors ${
                trackTab === "core"
                  ? "bg-[#14c1d5] text-white shadow-sm"
                  : "text-[#666d80] hover:text-[#272932]"
              }`}
              onClick={() => setTrackTab("core")}
            >
              Core
            </button>
            <button
              type="button"
              aria-selected={trackTab === "enrichment"}
              className={`rounded-[8px] px-[18px] py-[8px] font-sans text-[14px] font-medium transition-colors ${
                trackTab === "enrichment"
                  ? "bg-[#14c1d5] text-white shadow-sm"
                  : "text-[#666d80] hover:text-[#272932]"
              }`}
              onClick={() => setTrackTab("enrichment")}
            >
              Enrichment
            </button>
          </div>
          {syncHint && (
            <p className="rounded-lg border border-[#d80509]/30 bg-[#fff5f5] px-4 py-2 text-sm text-[#a00408]">{syncHint}</p>
          )}
        </div>

        <div className="rounded-2xl border border-[#f0f0f0] bg-white p-6 shadow-sm flex flex-col gap-4">
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Class name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Teacher
            <input
              value={teacher}
              onChange={(e) => setTeacher(e.target.value)}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Seats (e.g. 12/30)
            <input
              value={students}
              onChange={(e) => setStudents(e.target.value)}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Schedule
            <input
              value={scheduleText}
              onChange={(e) => setScheduleText(e.target.value)}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            />
          </label>
          <label className="flex flex-col gap-1 font-sans text-[13px] text-[#666d80]">
            Status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ClassStatus)}
              className="rounded-lg border border-[#dfe1e7] px-3 py-2 font-sans text-[14px] text-[#0d0d12] outline-none focus:border-[#14c1d5]"
            >
              <option value="Active">Active</option>
              <option value="Full">Full</option>
            </select>
          </label>
          <div className="flex flex-wrap justify-end gap-3 pt-2">
            <Link
              href="/dashboard/classes"
              className="rounded-md bg-[#fafafa] px-4 py-2 font-sans text-sm font-semibold text-[#0d0d12] hover:bg-[#ececee]"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={!name.trim() || submitting}
              onClick={() => void submit()}
              className="rounded-md bg-[#14c1d5] px-4 py-2 font-sans text-sm font-semibold text-white transition-colors hover:bg-[#12aebd] disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Create class"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
