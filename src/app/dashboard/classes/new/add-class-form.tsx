"use client";

import type { ProgramTrack } from "@/lib/data/types";
import { useDashboardNavigationProgress } from "@/components/dashboard-navigation-progress";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData } from "@/lib/client-data-cache";
import { ChevronDown, Clock3 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

type ClassStatus = "Active" | "Full";
type DayOption = "1" | "2" | "3";
type BlockOption = "1" | "2" | "3" | "4";

const DEFAULT_TEACHER_NAME = "Unassigned Teacher";

const BLOCK_TIMES: Record<BlockOption, { label: string; start: string; end: string }> = {
  "1": { label: "Block 1", start: "9:00 AM", end: "10:30 AM" },
  "2": { label: "Block 2", start: "10:30 AM", end: "12:00 PM" },
  "3": { label: "Block 3", start: "12:30 PM", end: "2:00 PM" },
  "4": { label: "Block 4", start: "2:00 PM", end: "3:30 PM" },
};

const DAY_OPTIONS: DayOption[] = ["1", "2", "3"];
const BLOCK_OPTIONS: BlockOption[] = ["1", "2", "3", "4"];

function requiredLabel(label: string) {
  return (
    <>
      {label}
      <span className="text-[#d80509]">*</span>
    </>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="font-sans text-[15px] font-medium leading-[1.35] text-[#272932]">{children}</span>;
}

function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={[
        "h-[48px] w-full rounded-[8px] border border-[#dfe1e7] bg-white px-4 font-sans text-[15px] text-[#272932] outline-none transition-colors placeholder:text-[#818898]",
        "focus:border-[#14c1d5] focus:ring-2 focus:ring-[#14c1d5]/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function TextAreaInput(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={[
        "min-h-[112px] w-full resize-y rounded-[8px] border border-[#dfe1e7] bg-white px-4 py-3 font-sans text-[15px] leading-[1.45] text-[#272932] outline-none transition-colors placeholder:text-[#818898]",
        "focus:border-[#14c1d5] focus:ring-2 focus:ring-[#14c1d5]/15",
        props.className ?? "",
      ].join(" ")}
    />
  );
}

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement> & { leadingIcon?: React.ReactNode }) {
  return (
    <div className="relative">
      {props.leadingIcon ? <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#666d80]">{props.leadingIcon}</div> : null}
      <select
        {...props}
        className={[
          "h-[48px] w-full appearance-none rounded-[8px] border border-[#dfe1e7] bg-white px-4 pr-10 font-sans text-[15px] text-[#272932] outline-none transition-colors",
          props.leadingIcon ? "pl-11" : "",
          "focus:border-[#14c1d5] focus:ring-2 focus:ring-[#14c1d5]/15",
          props.className ?? "",
        ].join(" ")}
      />
      <ChevronDown className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-[#0d0d12]" aria-hidden strokeWidth={2} />
    </div>
  );
}

function FormSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-[#f0f0f0] bg-white px-5 py-5 shadow-sm md:px-6 md:py-6">
      <h2 className="mb-6 font-sans text-[22px] font-bold leading-[1.2] text-[#272932]">{title}</h2>
      {children}
    </section>
  );
}

export default function AddClassForm() {
  const router = useRouter();
  const { startNavigation } = useDashboardNavigationProgress();
  const searchParams = useSearchParams();
  const [trackTab, setTrackTab] = useState<ProgramTrack>(() =>
    searchParams.get("track") === "enrichment" ? "enrichment" : "core",
  );

  useEffect(() => {
    const t = searchParams.get("track");
    setTrackTab(t === "enrichment" ? "enrichment" : "core");
  }, [searchParams]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [day, setDay] = useState<DayOption>("1");
  const [block, setBlock] = useState<BlockOption>("1");
  const [status, setStatus] = useState<ClassStatus>("Active");
  const [capacity, setCapacity] = useState("");
  const [plannerSubject, setPlannerSubject] = useState("");
  const [plannerSummary, setPlannerSummary] = useState("");
  const [teacherGuideObjectives, setTeacherGuideObjectives] = useState("");
  const [teacherGuideInformation, setTeacherGuideInformation] = useState("");
  const [teacherGuideSummary, setTeacherGuideSummary] = useState("");
  const [studentGuideObjectives, setStudentGuideObjectives] = useState("");
  const [studentGuideInformation, setStudentGuideInformation] = useState("");
  const [studentGuideSummary, setStudentGuideSummary] = useState("");
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const segment = trackTab === "enrichment" ? "enrichment" : "core";
  const blockTime = BLOCK_TIMES[block];
  const scheduleText = `Day ${day} · ${blockTime.label} · ${blockTime.start} - ${blockTime.end}`;
  const blockText = `${blockTime.label} Day ${day}`;
  const capacityNumber = Number.parseInt(capacity, 10);
  const canSubmit = useMemo(
    () =>
      Boolean(
        name.trim() &&
          description.trim() &&
          Number.isFinite(capacityNumber) &&
          capacityNumber > 0,
      ) && !submitting,
    [capacityNumber, description, name, submitting],
  );

  const submit = async () => {
    if (submitting) return;
    if (!name.trim()) {
      setSyncHint("Class name is required.");
      return;
    }
    if (!description.trim()) {
      setSyncHint("Description is required.");
      return;
    }
    if (!Number.isFinite(capacityNumber) || capacityNumber <= 0) {
      setSyncHint("Maximum students must be a positive number.");
      return;
    }

    setSubmitting(true);
    setSyncHint(null);
    try {
      const res = await fetch("/api/data/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          teacher: DEFAULT_TEACHER_NAME,
          capacity: capacityNumber,
          schedule: scheduleText,
          status,
          track: segment,
          description: description.trim(),
          block: blockText,
          plannerSubject: plannerSubject.trim(),
          plannerSummary: plannerSummary.trim(),
          teacherGuideObjectives: teacherGuideObjectives.trim(),
          teacherGuideInformation: teacherGuideInformation.trim(),
          teacherGuideSummary: teacherGuideSummary.trim(),
          studentGuideObjectives: studentGuideObjectives.trim(),
          studentGuideInformation: studentGuideInformation.trim(),
          studentGuideSummary: studentGuideSummary.trim(),
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { class: { id: string } };
        invalidateDashboardData(["/api/data/classes", "/api/data/class-options", "/api/dashboard-presentation"]);
        const href = `/dashboard/classes/${segment}/${body.class.id}`;
        startNavigation(href);
        router.push(href);
        return;
      }
      setSyncHint(`Could not save (${await readApiError(res)}).`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#fafafa] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-7">
        <div className="border-t border-[#dfe1e7] pt-8">
          <h1 className="font-sans text-[34px] font-bold leading-[1.1] text-[#272932]">Create Class</h1>
        </div>

        {syncHint ? (
          <p className="rounded-[10px] border border-[#d80509]/30 bg-[#fff5f5] px-4 py-3 font-sans text-sm text-[#a00408]">
            {syncHint}
          </p>
        ) : null}

        <FormSection title="Class Information">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.9fr)]">
            <div className="flex flex-col gap-5">
              <label className="flex flex-col gap-3">
                <FieldLabel>{requiredLabel("Name")}</FieldLabel>
                <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Creative Writing" />
              </label>

              <label className="flex flex-col gap-3">
                <FieldLabel>{requiredLabel("Description")}</FieldLabel>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="ex. Develop storytelling skills through imagination, character creation, and expressive writing."
                  className="min-h-[152px] w-full resize-y rounded-[8px] border border-[#dfe1e7] bg-white px-4 py-4 font-sans text-[15px] leading-[1.45] text-[#272932] outline-none transition-colors placeholder:text-[#818898] focus:border-[#14c1d5] focus:ring-2 focus:ring-[#14c1d5]/15"
                />
              </label>
            </div>

            <div className="flex flex-col gap-5 pt-0 lg:pt-[2px]">
              <div className="flex flex-col gap-3">
                <FieldLabel>Class Type</FieldLabel>
                <div className="flex flex-col gap-3">
                  <label className="flex cursor-pointer items-center gap-3 font-sans text-[18px] text-[#818898]">
                    <input
                      type="radio"
                      name="class-type"
                      checked={trackTab === "core"}
                      onChange={() => setTrackTab("core")}
                      className="size-5 accent-[#ff5a5f]"
                    />
                    Core
                  </label>
                  <label className="flex cursor-pointer items-center gap-3 font-sans text-[18px] text-[#818898]">
                    <input
                      type="radio"
                      name="class-type"
                      checked={trackTab === "enrichment"}
                      onChange={() => setTrackTab("enrichment")}
                      className="size-5 accent-[#ff5a5f]"
                    />
                    Enrichment
                  </label>
                </div>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={status === "Active"}
                onClick={() => setStatus((current) => (current === "Active" ? "Full" : "Active"))}
                className="mt-auto flex w-fit items-center gap-4 pt-4 font-sans text-[19px] font-medium text-[#0d0d12]"
              >
                <span className={`relative h-7 w-12 rounded-full transition-colors ${status === "Active" ? "bg-[#14c1d5]" : "bg-[#dfe1e7]"}`}>
                  <span
                    className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${
                      status === "Active" ? "translate-x-[22px]" : "translate-x-1"
                    }`}
                  />
                </span>
                Status: {status}
              </button>
            </div>
          </div>
        </FormSection>

        <FormSection title="Schedule">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Day of the Week")}</FieldLabel>
              <SelectInput value={day} onChange={(e) => setDay(e.target.value as DayOption)}>
                {DAY_OPTIONS.map((value) => (
                  <option key={value} value={value}>Day {value}</option>
                ))}
              </SelectInput>
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Block")}</FieldLabel>
              <SelectInput value={block} onChange={(e) => setBlock(e.target.value as BlockOption)}>
                {BLOCK_OPTIONS.map((value) => (
                  <option key={value} value={value}>{BLOCK_TIMES[value].label}</option>
                ))}
              </SelectInput>
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Start Time")}</FieldLabel>
              <SelectInput value={blockTime.start} disabled leadingIcon={<Clock3 className="size-5" aria-hidden strokeWidth={1.8} />}>
                <option>{blockTime.start}</option>
              </SelectInput>
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("End Time")}</FieldLabel>
              <SelectInput value={blockTime.end} disabled leadingIcon={<Clock3 className="size-5" aria-hidden strokeWidth={1.8} />}>
                <option>{blockTime.end}</option>
              </SelectInput>
            </label>
          </div>
        </FormSection>

        <FormSection title="Daily Planner">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-3 md:col-span-2">
              <FieldLabel>Subject</FieldLabel>
              <TextAreaInput value={plannerSubject} onChange={(e) => setPlannerSubject(e.target.value)} />
            </label>
            <label className="flex flex-col gap-3 md:col-span-2">
              <FieldLabel>Summary</FieldLabel>
              <TextAreaInput value={plannerSummary} onChange={(e) => setPlannerSummary(e.target.value)} />
            </label>
          </div>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <div className="flex flex-col gap-5">
              <h3 className="font-sans text-[18px] font-bold text-[#272932]">Teacher&apos;s Guide</h3>
              <label className="flex flex-col gap-3">
                <FieldLabel>Objectives</FieldLabel>
                <TextAreaInput value={teacherGuideObjectives} onChange={(e) => setTeacherGuideObjectives(e.target.value)} />
              </label>
              <label className="flex flex-col gap-3">
                <FieldLabel>Information</FieldLabel>
                <TextAreaInput value={teacherGuideInformation} onChange={(e) => setTeacherGuideInformation(e.target.value)} />
              </label>
              <label className="flex flex-col gap-3">
                <FieldLabel>Summary</FieldLabel>
                <TextAreaInput value={teacherGuideSummary} onChange={(e) => setTeacherGuideSummary(e.target.value)} />
              </label>
            </div>
            <div className="flex flex-col gap-5">
              <h3 className="font-sans text-[18px] font-bold text-[#272932]">Students&apos; Guide</h3>
              <label className="flex flex-col gap-3">
                <FieldLabel>Objectives</FieldLabel>
                <TextAreaInput value={studentGuideObjectives} onChange={(e) => setStudentGuideObjectives(e.target.value)} />
              </label>
              <label className="flex flex-col gap-3">
                <FieldLabel>Information</FieldLabel>
                <TextAreaInput value={studentGuideInformation} onChange={(e) => setStudentGuideInformation(e.target.value)} />
              </label>
              <label className="flex flex-col gap-3">
                <FieldLabel>Summary</FieldLabel>
                <TextAreaInput value={studentGuideSummary} onChange={(e) => setStudentGuideSummary(e.target.value)} />
              </label>
            </div>
          </div>
        </FormSection>

        <FormSection title="Capacity & Enrollment">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Maximum Students")}</FieldLabel>
              <TextInput
                inputMode="numeric"
                min={1}
                type="number"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                placeholder="ex. 18"
              />
            </label>
          </div>
        </FormSection>
      </div>

      <div className="sticky bottom-0 z-20 -mx-5 mt-8 border-t border-[#f0f0f0] bg-white/95 px-5 py-5 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-[1220px] justify-end gap-6">
          <Link
            href="/dashboard/classes"
            className="inline-flex h-[46px] min-w-[200px] items-center justify-center rounded-[6px] bg-[#d2f1f5] px-8 font-sans text-[18px] font-semibold text-[#14c1d5] transition-colors hover:bg-[#c6edf2]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="inline-flex h-[46px] min-w-[200px] items-center justify-center rounded-[6px] bg-[#14c1d5] px-8 font-sans text-[18px] font-semibold text-white transition-colors hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Class"}
          </button>
        </div>
      </div>
    </div>
  );
}
