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
import { teacherCreateFailureExtraHint } from "@/lib/product-copy";

export type ProgramKind = "core" | "enrichment";

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
    const e = email.trim();
    if (!n || submitting) return;
    if (!e) {
      setHint("Teacher email is required so the record can be tied to a staff account.");
      return;
    }
    setSubmitting(true);
    setHint(null);
    try {
      const res = await fetch("/api/data/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: n,
          subjects: subjects.trim(),
          email: e,
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
          <p className={`${ENTITY_FORM_WARNING_CLASS} leading-snug`}>
            {hint}
          </p>
        )}
        <div className={ENTITY_FORM_CARD_CLASS}>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Full name
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={ENTITY_FORM_INPUT_CLASS}
              placeholder="e.g. Jamie Chen"
            />
          </label>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Subjects
            <input
              value={subjects}
              onChange={(e) => setSubjects(e.target.value)}
              className={ENTITY_FORM_INPUT_CLASS}
              placeholder="e.g. Geometry, Robotics"
            />
          </label>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={ENTITY_FORM_INPUT_CLASS}
              placeholder="name@school.edu"
            />
          </label>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Phone (optional)
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={ENTITY_FORM_INPUT_CLASS}
              placeholder="Optional phone number"
            />
          </label>
          <label className={ENTITY_FORM_LABEL_CLASS}>
            Primary program
            <select
              value={program}
              onChange={(e) => setProgram(e.target.value as ProgramKind)}
              className={ENTITY_FORM_SELECT_CLASS}
            >
              <option value="core">Core</option>
              <option value="enrichment">Enrichment</option>
            </select>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Link href="/dashboard/teachers" className={ENTITY_FORM_CANCEL_CLASS}>
              Cancel
            </Link>
            <button
              type="button"
              disabled={!name.trim() || !email.trim() || submitting}
              onClick={() => void submit()}
              className={ENTITY_FORM_SUBMIT_CLASS}
            >
              {submitting ? "Saving…" : "Save teacher"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
