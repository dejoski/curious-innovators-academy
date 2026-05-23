"use client";

import React, { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DataSource, StudentListItem } from "@/lib/data";
import { cachedJson, peekCachedJson, preloadJson } from "@/lib/client-data-cache";
import { getParentStudentContextLabel } from "@/lib/parent-student-context-label";
import {
  DASHBOARD_TEXT_PRIMARY_CLASS,
} from "@/lib/dashboard-shell-classes";

const imgHugeiconsStudentPicker = "/images/figma-icon-student.svg";
const imgChevronDown = "/images/icon-caret-down.svg";

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
  const [isRoutePending, startTransition] = useTransition();

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

  const requestedStudentId = searchParams.get("student") ?? "";

  useEffect(() => {
    if (pendingStudentId && pendingStudentId === requestedStudentId) setPendingStudentId("");
  }, [pendingStudentId, requestedStudentId]);

  if (!pathname.startsWith("/dashboard/parents")) {
    return null;
  }

  const label = getParentStudentContextLabel(pathname);
  const resolvedStudentId = students.some((s) => s.id === requestedStudentId)
    ? requestedStudentId
    : students[0]?.id ?? "";
  const studentPickerValue = pendingStudentId && students.some((s) => s.id === pendingStudentId)
    ? pendingStudentId
    : resolvedStudentId;
  const isSwitching = Boolean(isRoutePending || (pendingStudentId && pendingStudentId !== resolvedStudentId));

  function setStudentQuery(studentId: string) {
    if (!studentId) return;
    const encodedId = encodeURIComponent(studentId);
    preloadJson(`/api/data/students/${encodedId}/profile`);
    preloadJson(`/api/data/students/${encodedId}/schedule`);
    setPendingStudentId(studentId);
    const p = new URLSearchParams(searchParams.toString());
    p.set("student", studentId);
    const q = p.toString();
    startTransition(() => {
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    });
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
            disabled={isLoading || isSwitching || students.length === 0}
            className={`h-full min-w-px flex-[1_0_0] border-0 bg-transparent font-['Inter:Regular',sans-serif] ${DASHBOARD_TEXT_PRIMARY_CLASS} text-[16px] leading-[1.6] tracking-[-0.32px] outline-none cursor-pointer [-webkit-appearance:none] [appearance:none] [&::-ms-expand]:hidden`}
            aria-describedby={source === "fallback" ? "parent-student-picker-source" : undefined}
            aria-busy={isSwitching}
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
          {isSwitching ? (
            <span className="sr-only" role="status">
              Loading selected student.
            </span>
          ) : null}
        </div>
        {isSwitching ? (
          <span
            className="mr-2 size-4 shrink-0 animate-spin rounded-full border-2 border-[#14c1d5]/25 border-t-[#14c1d5]"
            aria-hidden
          />
        ) : null}
        <div className="relative flex shrink-0 items-center justify-center">
          <div className="-scale-y-100 flex-none">
            <div className="overflow-clip relative size-[20px]">
              <div className="absolute bottom-[37.5%] left-1/4 right-1/4 top-[37.5%]">
                <img
                  alt=""
                  aria-hidden
                  className="absolute inset-[-9.76%_-8.33%_-16.67%_-8.33%] max-w-none size-full"
                  src={imgChevronDown}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
