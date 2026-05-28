"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DataSource, StudentListItem } from "@/lib/data";
import {
  cachedJson,
  peekCachedJson,
  preloadParentStudentData,
} from "@/lib/client-data-cache";
import {
  readStoredParentStudentId,
  withParentStudentParam,
  writeStoredParentStudentId,
} from "@/lib/parent-student-selection";
import {
  DASHBOARD_TEXT_PRIMARY_CLASS,
} from "@/lib/dashboard-shell-classes";

const imgHugeiconsStudentPicker = "/images/icon-student-picker.svg";

type StudentsBody = {
  students?: StudentListItem[];
  source?: DataSource;
};

type ParentStudentContextSelectorProps = {
  onSelectedStudentNameChange?: (name: string) => void;
  pickerWidthPx?: number;
};

function readCachedStudents() {
  const body = peekCachedJson<StudentsBody>("/api/data/students");
  if (body?.source === "unavailable") {
    return {
      body: null,
      students: [],
      source: null,
    };
  }
  return {
    body,
    students: Array.isArray(body?.students) ? body.students : [],
    source: body?.source ?? null,
  };
}

export default function ParentStudentContextSelector({
  onSelectedStudentNameChange,
  pickerWidthPx,
}: ParentStudentContextSelectorProps) {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [source, setSource] = useState<DataSource | null>(null);
  const [isLoading, setIsLoading] = useState(() => pathname.startsWith("/dashboard/parents"));
  const [pendingStudentId, setPendingStudentId] = useState("");
  const [storedStudentId, setStoredStudentId] = useState("");

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/parents")) return;
    let cancelled = false;
    async function loadStudents() {
      const cached = readCachedStudents();
      if (cached.body) {
        setStudents(cached.students);
        setSource(cached.source);
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      try {
        const body = await cachedJson<StudentsBody>("/api/data/students");
        if (cancelled) return;
        setStudents(Array.isArray(body.students) ? body.students : []);
        setSource(body.source ?? null);
      } catch {
        if (!cancelled) {
          setStudents([]);
          setSource("unavailable");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadStudents();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/parents")) return;
    setStoredStudentId(readStoredParentStudentId()); // eslint-disable-line react-hooks/set-state-in-effect -- hydrate persisted parent student selection after mount
  }, [pathname]);

  const queryStudentId = searchParams.get("student") ?? "";
  const requestedStudentId = queryStudentId || storedStudentId;
  const pendingStudentIsValid = pendingStudentId
    ? students.some((s) => s.id === pendingStudentId)
    : false;

  const replaceStudentUrl = useCallback((studentId: string) => {
    const href = withParentStudentParam(`${pathname}?${searchParams.toString()}`, studentId);
    window.history.replaceState(null, "", href);
    router.prefetch(href);
  }, [pathname, router, searchParams]);

  useEffect(() => {
    if (pendingStudentId && pendingStudentId === requestedStudentId) setPendingStudentId("");
  }, [pendingStudentId, requestedStudentId]);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/parents") || students.length === 0) return;
    for (const student of students) preloadParentStudentData(student.id);
    if (pendingStudentIsValid && pendingStudentId !== queryStudentId) return;

    const queryStudentIsValid = students.some((s) => s.id === queryStudentId);
    const storedStudentIsValid = students.some((s) => s.id === storedStudentId);
    const nextStudentId = queryStudentIsValid
      ? queryStudentId
      : storedStudentIsValid
        ? storedStudentId
        : students[0]?.id ?? "";

    if (!nextStudentId) return;
    if (storedStudentId !== nextStudentId) {
      writeStoredParentStudentId(nextStudentId);
      setStoredStudentId(nextStudentId); // eslint-disable-line react-hooks/set-state-in-effect -- keep picker state aligned with canonical parent student selection
    }
    if (queryStudentId !== nextStudentId) {
      replaceStudentUrl(nextStudentId);
    }
  }, [pathname, pendingStudentId, pendingStudentIsValid, queryStudentId, replaceStudentUrl, storedStudentId, students]);

  const resolvedStudentId = students.some((s) => s.id === requestedStudentId)
    ? requestedStudentId
    : students[0]?.id ?? "";
  const studentPickerValue = pendingStudentIsValid
    ? pendingStudentId
    : resolvedStudentId;
  const selectedStudentName = students.find((s) => s.id === studentPickerValue)?.name ?? "";

  useEffect(() => {
    onSelectedStudentNameChange?.(selectedStudentName);
  }, [onSelectedStudentNameChange, selectedStudentName]);

  if (!pathname.startsWith("/dashboard/parents")) {
    return null;
  }

  function setStudentQuery(studentId: string) {
    if (!studentId) return;
    preloadParentStudentData(studentId);
    writeStoredParentStudentId(studentId);
    setStoredStudentId(studentId);
    setPendingStudentId(studentId);
    replaceStudentUrl(studentId);
  }

  const pickerStyle = pickerWidthPx
    ? ({
        "--parent-student-picker-width": `${Math.round(pickerWidthPx)}px`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="flex min-w-0 flex-1 items-center"
      style={pickerStyle}
    >
      <label className="sr-only" htmlFor="parent-student-picker">
        Select student
      </label>
      <div className="relative h-[44px] min-w-[180px] flex-1 overflow-hidden rounded-[10px] bg-white shadow-[0px_0px_0px_1px_#f0f0f0] transition-shadow focus-within:shadow-[0px_0px_0px_2px_rgba(20,193,213,0.45)] hover:shadow-[0px_0px_0px_1px_#dfe1e6] sm:h-[48px] sm:w-[var(--parent-student-picker-width,260px)] sm:max-w-[min(420px,calc(100vw-160px))] sm:flex-none">
        <img
          alt=""
          className="pointer-events-none absolute left-[24px] top-1/2 z-10 size-[20px] -translate-y-1/2 object-contain"
          src={imgHugeiconsStudentPicker}
          aria-hidden
        />
        <select
          id="parent-student-picker"
          value={studentPickerValue}
          onChange={(e) => setStudentQuery(e.target.value)}
          disabled={isLoading || students.length === 0}
          className={`absolute inset-0 h-full w-full cursor-pointer rounded-[10px] border-0 bg-transparent py-[8px] pl-[56px] pr-[42px] font-['Inter:Regular',sans-serif] ${DASHBOARD_TEXT_PRIMARY_CLASS} text-[16px] leading-[1.6] tracking-[-0.32px] outline-none disabled:cursor-not-allowed disabled:text-[#818898] [-webkit-appearance:none] [appearance:none] [&::-ms-expand]:hidden`}
          aria-describedby={source === "fallback" ? "parent-student-picker-source" : undefined}
          aria-busy={false}
        >
          {students.length === 0 ? (
            <option value="">
              {isLoading ? "Loading students..." : source === "unavailable" ? "Students unavailable" : "No students"}
            </option>
          ) : (
            students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))
          )}
        </select>
        {source === "fallback" ? (
          <span id="parent-student-picker-source" className="sr-only">
            Showing starter students while school records finish loading.
          </span>
        ) : null}
        <ChevronDown className="pointer-events-none absolute right-[16px] top-1/2 z-10 size-4 -translate-y-1/2 text-[#666d80]" aria-hidden strokeWidth={1.8} />
      </div>
    </div>
  );
}
