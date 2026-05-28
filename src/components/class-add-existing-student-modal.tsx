"use client";

import { readApiError } from "@/lib/client-api-errors";
import { readDashboardData } from "@/lib/client-data-cache";
import type { ClassRosterStatus, StudentListItem } from "@/lib/data/types";
import { Search, X } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

type StudentsResponse = {
  students?: StudentListItem[];
};

type AddExistingStudentModalProps = {
  open: boolean;
  existingStudentIds: string[];
  classNameLabel: string;
  onClose: () => void;
  onSubmit: (input: { studentId: string; status: Exclude<ClassRosterStatus, "Pending"> }) => Promise<void>;
};

const STATUS_OPTIONS: Exclude<ClassRosterStatus, "Pending">[] = ["Approved", "Waitlisted", "Rejected"];

export function ClassAddExistingStudentModal({
  open,
  existingStudentIds,
  classNameLabel,
  onClose,
  onSubmit,
}: AddExistingStudentModalProps) {
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [query, setQuery] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [status, setStatus] = useState<Exclude<ClassRosterStatus, "Pending">>("Approved");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const existingIds = useMemo(() => new Set(existingStudentIds), [existingStudentIds]);
  const availableStudents = useMemo(
    () => students.filter((student) => !existingIds.has(student.id)),
    [existingIds, students],
  );
  const visibleStudents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return availableStudents;
    return availableStudents.filter((student) =>
      [student.name, student.parent, student.level, student.enrichment]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [availableStudents, query]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setSubmitError(null);
    void readDashboardData<StudentsResponse>("/api/data/students")
      .then((body) => {
        if (cancelled) return;
        setStudents(body.students ?? []);
      })
      .catch(async (error) => {
        if (cancelled) return;
        setLoadError(error instanceof Response ? await readApiError(error) : error instanceof Error ? error.message : "Students could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (selectedStudentId && visibleStudents.some((student) => student.id === selectedStudentId)) return;
    setSelectedStudentId(visibleStudents[0]?.id ?? "");
  }, [open, selectedStudentId, visibleStudents]);

  if (!open) return null;

  async function submit() {
    if (!selectedStudentId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await onSubmit({ studentId: selectedStudentId, status });
      setQuery("");
      setSelectedStudentId("");
      setStatus("Approved");
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Student could not be added to this class.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-[560px] rounded-[18px] bg-white p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-existing-student-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="add-existing-student-title" className="font-sans text-xl font-bold text-[#272932]">
              Add Student
            </h3>
            <p className="mt-1 text-sm text-[#666d80]">
              Add an existing student to {classNameLabel || "this class"}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#666d80] transition-colors hover:bg-gray-100 hover:text-[#272932]"
            aria-label="Close"
          >
            <X className="size-5" aria-hidden strokeWidth={1.8} />
          </button>
        </div>

        {loadError || submitError ? (
          <div role="alert" className="mt-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
            {submitError ?? loadError}
          </div>
        ) : null}

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#272932]">Student</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#666d80]" aria-hidden strokeWidth={1.8} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search existing students..."
                className="h-11 w-full rounded-[8px] border border-[#dfe1e7] bg-white pl-10 pr-3 text-sm text-[#272932] outline-none focus:border-[#14c1d5] focus:ring-2 focus:ring-[#14c1d5]/15"
              />
            </div>
          </label>

          <div className="max-h-[260px] overflow-y-auto rounded-[10px] border border-[#f0f0f0]">
            {loading ? (
              <div className="p-4 text-sm text-[#666d80]">Loading students...</div>
            ) : visibleStudents.length === 0 ? (
              <div className="p-4 text-sm text-[#666d80]">
                {availableStudents.length === 0 ? "Every existing student is already on this class roster." : "No students match your search."}
              </div>
            ) : (
              visibleStudents.map((student) => (
                <button
                  key={student.id}
                  type="button"
                  onClick={() => setSelectedStudentId(student.id)}
                  className={`flex w-full items-center justify-between gap-4 border-b border-[#f0f0f0] px-4 py-3 text-left last:border-b-0 transition-colors ${
                    selectedStudentId === student.id ? "bg-[#ecfdff]" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-[#272932]">{student.name}</span>
                    <span className="block truncate text-xs text-[#666d80]">
                      {student.parent || "Parent not assigned"} · Level {student.level || "not set"}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full border border-[#dfe1e7] px-2 py-1 text-xs text-[#666d80]">
                    {student.enrichment}
                  </span>
                </button>
              ))
            )}
          </div>

          <label className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-[#272932]">Roster status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as Exclude<ClassRosterStatus, "Pending">)}
              className="h-11 rounded-[8px] border border-[#dfe1e7] bg-white px-3 text-sm text-[#272932] outline-none focus:border-[#14c1d5] focus:ring-2 focus:ring-[#14c1d5]/15"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-[8px] px-4 py-2 text-sm font-semibold text-[#666d80] transition-colors hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!selectedStudentId || submitting || loading}
            className="rounded-[8px] bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#11a9bb] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
          >
            {submitting ? "Adding..." : "Add to class"}
          </button>
        </div>
      </div>
    </div>
  );
}
