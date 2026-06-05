"use client";

import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData, studentDetailDataUrls } from "@/lib/client-data-cache";
import { studentCreatePartialSaveHint } from "@/lib/product-copy";
import { CalendarDays, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { DASHBOARD_PANEL_TITLE_CLASS } from "@/lib/dashboard-shell-classes";

type LevelOption = "1" | "2" | "3" | "4" | "5" | "6";

const LEVEL_OPTIONS: LevelOption[] = ["1", "2", "3", "4", "5", "6"];

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

function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select
        {...props}
        className={[
          "h-[48px] w-full appearance-none rounded-[8px] border border-[#dfe1e7] bg-white px-4 pr-10 font-sans text-[15px] text-[#272932] outline-none transition-colors",
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
      <h2 className={`${DASHBOARD_PANEL_TITLE_CLASS} mb-6`}>{title}</h2>
      {children}
    </section>
  );
}

function dateOfBirthToAge(value: string): string {
  if (!value) return "";
  const birth = new Date(`${value}T00:00:00`);
  if (Number.isNaN(birth.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDelta = today.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) age -= 1;
  if (age < 0 || age > 30) return "";
  return String(age);
}

export default function AddStudentPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [level, setLevel] = useState<LevelOption>("2");
  const [learningProfile, setLearningProfile] = useState("");
  const [strengths, setStrengths] = useState("");
  const [supportNotes, setSupportNotes] = useState("");
  const [hint, setHint] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const displayName = useMemo(() => {
    const preferred = preferredName.trim();
    if (preferred) return preferred;
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  }, [firstName, lastName, preferredName]);

  const canSubmit = useMemo(
    () =>
      Boolean(
        firstName.trim() &&
          lastName.trim() &&
          parentName.trim() &&
          parentEmail.trim() &&
          level &&
          !submitting &&
          !createdId,
      ),
    [createdId, firstName, lastName, level, parentEmail, parentName, submitting],
  );

  async function submit() {
    if (!canSubmit) return;
    const name = displayName.trim();
    if (name.length < 2) {
      setHint("Student name must be at least 2 characters.");
      return;
    }

    setSubmitting(true);
    setHint(null);
    setCreatedId(null);

    try {
      const createRes = await fetch("/api/data/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parent: parentName.trim(),
          level,
          track: "core",
          notes: supportNotes.trim() || undefined,
        }),
      });

      if (!createRes.ok) {
        setHint(`Could not sync (${await readApiError(createRes)}). ${studentCreatePartialSaveHint()}`);
        return;
      }

      const body = (await createRes.json()) as { student: { id: string } };
      const studentId = body.student.id;
      const secondaryErrors: string[] = [];

      const profileRes = await fetch(`/api/data/students/${encodeURIComponent(studentId)}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          age: dateOfBirthToAge(dateOfBirth),
          level,
          learningProfile: learningProfile.trim(),
          strengths: strengths.trim(),
          supportNotes: supportNotes.trim(),
        }),
      });
      if (!profileRes.ok) secondaryErrors.push(await readApiError(profileRes));

      const parentRes = await fetch(`/api/data/students?id=${encodeURIComponent(studentId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: parentName.trim(),
          parentEmail: parentEmail.trim(),
        }),
      });
      if (!parentRes.ok) secondaryErrors.push(await readApiError(parentRes));

      invalidateDashboardData([
        "/api/data/students",
        "/api/data/parents",
        "/api/data/student-schedules",
        "/api/dashboard-presentation",
        ...studentDetailDataUrls(studentId),
      ]);

      if (secondaryErrors.length > 0) {
        setCreatedId(studentId);
        setHint(`Student was created, but some details could not be saved: ${secondaryErrors.join(" ")}`);
        return;
      }

      router.push(`/dashboard/students/${studentId}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full bg-[#fafafa] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-7">
        <div className="border-t border-[#dfe1e7] pt-8">
          <h1 className="font-sans text-[28px] font-bold leading-[1.1] text-[#272932]">Create Student</h1>
        </div>

        {hint ? (
          <div className="rounded-[10px] border border-[#d80509]/30 bg-[#fff5f5] px-4 py-3 font-sans text-sm text-[#a00408]">
            <p>{hint}</p>
            {createdId ? (
              <Link href={`/dashboard/students/${createdId}`} className="mt-2 inline-flex font-semibold text-[#0a7f8d] hover:text-[#065b65]">
                Open created student
              </Link>
            ) : null}
          </div>
        ) : null}

        <FormSection title="Student Information">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("First Name")}</FieldLabel>
              <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="ex. Maria" />
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Last Name")}</FieldLabel>
              <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="ex. Collins" />
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>Preferred Name</FieldLabel>
              <TextInput value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="ex. Mary" />
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>Date of Birth</FieldLabel>
              <div className="relative">
                <TextInput type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="pl-11" />
                <CalendarDays className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-[#666d80]" aria-hidden strokeWidth={2} />
              </div>
            </label>
          </div>
        </FormSection>

        <FormSection title="Parent Information">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Name")}</FieldLabel>
              <TextInput value={parentName} onChange={(e) => setParentName(e.target.value)} placeholder="ex. Joseph Collins" />
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Email")}</FieldLabel>
              <TextInput type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} placeholder="ex. parent@example.com" />
            </label>
          </div>
        </FormSection>

        <FormSection title="Academic Information">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Level")}</FieldLabel>
              <SelectInput value={level} onChange={(e) => setLevel(e.target.value as LevelOption)}>
                {LEVEL_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    Level {value}
                  </option>
                ))}
              </SelectInput>
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>Learning Profile</FieldLabel>
              <TextInput
                value={learningProfile}
                onChange={(e) => setLearningProfile(e.target.value)}
                placeholder="ex. Curious and engaged learner who enjoys..."
              />
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>Strengths</FieldLabel>
              <TextInput value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="ex. Strong communication and creativity" />
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>Support Notes</FieldLabel>
              <TextInput
                value={supportNotes}
                onChange={(e) => setSupportNotes(e.target.value)}
                placeholder="ex. Benefits from structured guidance on long..."
              />
            </label>
          </div>
        </FormSection>
      </div>

      <div className="sticky bottom-0 z-20 mt-8 border-t border-[#f0f0f0] bg-white/95 px-5 py-4 backdrop-blur md:px-8">
        <div className="mx-auto flex max-w-[1220px] items-center justify-end gap-5">
          <Link
            href="/dashboard/students"
            className="inline-flex h-[52px] min-w-[170px] items-center justify-center rounded-[8px] bg-[#c9f3f7] px-8 font-sans text-[17px] font-bold text-[#00b6ca] transition-colors hover:bg-[#b8edf3]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="inline-flex h-[52px] min-w-[190px] items-center justify-center rounded-[8px] bg-[#14c1d5] px-8 font-sans text-[17px] font-bold text-white transition-colors hover:bg-[#0fb1c4] disabled:cursor-not-allowed disabled:bg-[#c9f3f7]"
          >
            {submitting ? "Creating..." : "Create Student"}
          </button>
        </div>
      </div>
    </div>
  );
}
