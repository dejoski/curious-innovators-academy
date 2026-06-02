"use client";

import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData } from "@/lib/client-data-cache";
import { teacherCreateFailureExtraHint } from "@/lib/product-copy";
import { ChevronDown, ImagePlus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { DASHBOARD_PANEL_TITLE_CLASS } from "@/lib/dashboard-shell-classes";

export type ProgramKind = "core" | "enrichment";

const AVAILABILITY_DAYS = ["Mon", "Tue", "Wed", "Thu", "Friday"] as const;

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

function FormSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[18px] border border-[#f0f0f0] bg-white px-5 py-5 shadow-sm md:px-6 md:py-6">
      <h2 className={`${DASHBOARD_PANEL_TITLE_CLASS} mb-6`}>{title}</h2>
      {children}
    </section>
  );
}

function CheckBox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 font-sans text-[18px] text-[#0d0d12]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="size-[18px] rounded-[4px] border-[#91dfea] accent-[#91dfea]"
      />
      {label}
    </label>
  );
}

export default function CreateTeacherPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [preferredName, setPreferredName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [subjects, setSubjects] = useState("");
  const [program, setProgram] = useState<ProgramKind>("core");
  const [active, setActive] = useState(true);
  const [homeroom, setHomeroom] = useState(true);
  const [availability, setAvailability] = useState<Record<(typeof AVAILABILITY_DAYS)[number], boolean>>({
    Mon: false,
    Tue: true,
    Wed: true,
    Thu: true,
    Friday: false,
  });
  const [hint, setHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const displayName = useMemo(() => {
    const preferred = preferredName.trim();
    if (preferred) return preferred;
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");
  }, [firstName, lastName, preferredName]);

  const canSubmit = Boolean(firstName.trim() && lastName.trim() && email.trim() && phone.trim() && subjects.trim() && !submitting);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setHint(null);
    try {
      const res = await fetch("/api/data/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: displayName,
          subjects: subjects.trim(),
          email: email.trim(),
          phone: phone.trim(),
          program,
        }),
      });
      if (res.ok) {
        invalidateDashboardData(["/api/data/teachers", "/api/dashboard-presentation"]);
        router.push("/dashboard/teachers");
        return;
      }
      setHint(`${await readApiError(res)}. ${teacherCreateFailureExtraHint()}`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full bg-[#fafafa] px-5 py-6 md:px-8 md:py-8">
      <div className="mx-auto flex max-w-[1220px] flex-col gap-7">
        <div className="flex flex-col gap-8 border-t border-[#dfe1e7] pt-5">
          <h1 className="font-sans text-[28px] font-bold leading-[1.1] text-[#272932]">Create Teacher</h1>
        </div>

        {hint ? (
          <p className="rounded-[10px] border border-[#d80509]/30 bg-[#fff5f5] px-4 py-3 font-sans text-sm text-[#a00408]">
            {hint}
          </p>
        ) : null}

        <FormSection title="Teacher Information">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_180px]">
            <div className="grid gap-5 md:grid-cols-2">
              <label className="flex flex-col gap-3">
                <FieldLabel>{requiredLabel("First Name")}</FieldLabel>
                <TextInput value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="ex. Emily" />
              </label>
              <label className="flex flex-col gap-3">
                <FieldLabel>{requiredLabel("Last Name")}</FieldLabel>
                <TextInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="ex. Carter" />
              </label>
              <label className="flex flex-col gap-3 md:col-span-2">
                <FieldLabel>Preferred Name</FieldLabel>
                <TextInput value={preferredName} onChange={(e) => setPreferredName(e.target.value)} placeholder="ex. Em" />
              </label>
              <label className="flex flex-col gap-3">
                <FieldLabel>{requiredLabel("Email")}</FieldLabel>
                <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ex. emily.carter@email.com" />
              </label>
              <label className="flex flex-col gap-3">
                <FieldLabel>{requiredLabel("Phone")}</FieldLabel>
                <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="ex. 55 123-456" />
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                onClick={() => setActive((current) => !current)}
                className="flex w-fit items-center gap-4 font-sans text-[19px] font-medium text-[#0d0d12]"
              >
                <span className={`relative h-7 w-12 rounded-full transition-colors ${active ? "bg-[#14c1d5]" : "bg-[#dfe1e7]"}`}>
                  <span className={`absolute top-1 size-5 rounded-full bg-white shadow-sm transition-transform ${active ? "translate-x-[22px]" : "translate-x-1"}`} />
                </span>
                Status: {active ? "Active" : "Inactive"}
              </button>
            </div>

            <button
              type="button"
              className="flex h-[150px] w-full flex-col items-center justify-center gap-3 self-center rounded-[14px] bg-[#edf9fb] font-sans text-[14px] font-semibold text-[#00b6ca] transition-colors hover:bg-[#ddf5f8] lg:w-[160px]"
            >
              <ImagePlus className="size-6" aria-hidden strokeWidth={1.9} />
              Upload Photo
            </button>
          </div>
        </FormSection>

        <FormSection title="Teaching Information">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Subjects")}</FieldLabel>
              <TextInput value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="Select subjects" />
            </label>
            <label className="flex flex-col gap-3">
              <FieldLabel>{requiredLabel("Teacher Type")}</FieldLabel>
              <SelectInput value={program} onChange={(e) => setProgram(e.target.value as ProgramKind)}>
                <option value="core">Core</option>
                <option value="enrichment">Enrichment</option>
              </SelectInput>
            </label>
            <div className="md:col-span-2">
              <CheckBox checked={homeroom} onChange={setHomeroom} label="Assign as homeroom teacher" />
            </div>
          </div>
        </FormSection>

        <FormSection title="Availability">
          <div className="grid max-w-md gap-4 sm:grid-cols-2">
            {AVAILABILITY_DAYS.map((day) => (
              <CheckBox
                key={day}
                checked={availability[day]}
                onChange={(checked) => setAvailability((current) => ({ ...current, [day]: checked }))}
                label={day}
              />
            ))}
          </div>
        </FormSection>
      </div>

      <div className="sticky bottom-0 z-20 -mx-5 mt-8 border-t border-[#f0f0f0] bg-white/95 px-5 py-5 backdrop-blur md:-mx-8 md:px-8">
        <div className="mx-auto flex max-w-[1220px] justify-end gap-6">
          <Link
            href="/dashboard/teachers"
            className="inline-flex h-[46px] min-w-[180px] items-center justify-center rounded-[6px] bg-[#d2f1f5] px-8 font-sans text-[16px] font-semibold text-[#14c1d5] transition-colors hover:bg-[#c6edf2]"
          >
            Cancel
          </Link>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={() => void submit()}
            className="inline-flex h-[46px] min-w-[180px] items-center justify-center rounded-[6px] bg-[#14c1d5] px-8 font-sans text-[16px] font-semibold text-white transition-colors hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:bg-[#c9f3f7]"
          >
            {submitting ? "Creating..." : "Create Teacher"}
          </button>
        </div>
      </div>
    </div>
  );
}
