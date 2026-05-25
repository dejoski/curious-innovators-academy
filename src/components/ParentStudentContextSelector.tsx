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
import { getParentStudentContextLabel } from "@/lib/parent-student-context-label";
import {
  readStoredParentStudentId,
  withParentStudentParam,
  writeStoredParentStudentId,
} from "@/lib/parent-student-selection";
import {
  DASHBOARD_TEXT_PRIMARY_CLASS,
} from "@/lib/dashboard-shell-classes";

const imgHugeiconsStudentPicker = "/images/figma-icon-student.svg";

type StudentsBody = {
  students?: StudentListItem[];
  source?: DataSource;
};

function readCachedStudents() {
  const body = peekCachedJson<StudentsBody>("/api/data/students");
  return {
    body,
    students: Array.isArray(body?.students) ? body.students : [],
    source: body?.source ?? null,
  };
}

export default function ParentStudentContextSelector() {
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

  if (!pathname.startsWith("/dashboard/parents")) {
    return null;
  }

  const label = getParentStudentContextLabel(pathname);
  const resolvedStudentId = students.some((s) => s.id === requestedStudentId)
    ? requestedStudentId
    : students[0]?.id ?? "";
  const studentPickerValue = pendingStudentIsValid
    ? pendingStudentId
    : resolvedStudentId;

  function setStudentQuery(studentId: string) {
    if (!studentId) return;
    preloadParentStudentData(studentId);
    writeStoredParentStudentId(studentId);
    setStoredStudentId(studentId);
    setPendingStudentId(studentId);
    replaceStudentUrl(studentId);
  }

  return (
    <div className="flex w-full max-w-full flex-col items-start gap-2 sm:w-[448px] sm:flex-row sm:items-center sm:justify-between">
      <span
        className={`font-['Inter:Semi_Bold',sans-serif] font-semibold text-[14px] leading-[1.4] sm:text-[16px] ${DASHBOARD_TEXT_PRIMARY_CLASS}`}
      >
        {label}
      </span>
      <label className="sr-only" htmlFor="parent-student-picker">
        Select student
      </label>
      <div
        className="flex h-[44px] w-full items-center overflow-hidden rounded-[10px] bg-white px-[12px] py-[8px] shadow-[0px_0px_0px_1px_#f0f0f0] sm:h-[48px] sm:w-[260px]"
      >
        <div className="flex h-[40px] min-w-px flex-[1_0_0] items-center gap-[12px] overflow-hidden rounded-[8px] px-[12px] py-[8px]">
          <img
            alt=""
            className="size-[20px] shrink-0 object-contain"
            src={imgHugeiconsStudentPicker}
            aria-hidden
          />
          <select
            id="parent-student-picker"
            value={studentPickerValue}
            onChange={(e) => setStudentQuery(e.target.value)}
            disabled={isLoading || students.length === 0}
            className={`h-full min-w-px flex-[1_0_0] border-0 bg-transparent font-['Inter:Regular',sans-serif] ${DASHBOARD_TEXT_PRIMARY_CLASS} text-[16px] leading-[1.6] tracking-[-0.32px] outline-none cursor-pointer [-webkit-appearance:none] [appearance:none] [&::-ms-expand]:hidden`}
            aria-describedby={source === "fallback" ? "parent-student-picker-source" : undefined}
            aria-busy={false}
          >
            {students.length === 0 ? (
              <option value="">{isLoading ? "Loading students..." : "No students"}</option>
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
              Showing sample students because cloud data is unavailable.
            </span>
          ) : null}
        </div>
        <ChevronDown className="mr-1 size-4 shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
      </div>
    </div>
  );
}
