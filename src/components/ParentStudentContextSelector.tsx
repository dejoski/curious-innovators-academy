"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { DataSource, StudentListItem } from "@/lib/data";
import { getParentStudentContextLabel } from "@/lib/parent-student-context-label";
import {
  DASHBOARD_TEXT_PRIMARY_CLASS,
} from "@/lib/dashboard-shell-classes";

const imgHugeiconsStudentPicker = "/images/figma-icon-student.svg";
const imgChevronDown = "/images/icon-caret-down.svg";

export default function ParentStudentContextSelector() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();
  const [students, setStudents] = useState<StudentListItem[]>([]);
  const [source, setSource] = useState<DataSource | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!pathname.startsWith("/dashboard/parents")) return;
    let cancelled = false;
    async function loadStudents() {
      setIsLoading(true);
      try {
        const res = await fetch("/api/data/students", { cache: "no-store" });
        if (!res.ok) throw new Error(res.statusText);
        const body = (await res.json()) as {
          students?: StudentListItem[];
          source?: DataSource;
        };
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

  if (!pathname.startsWith("/dashboard/parents")) {
    return null;
  }

  const label = getParentStudentContextLabel(pathname);
  const requestedStudentId = searchParams.get("student") ?? "";
  const studentPickerValue = students.some((s) => s.id === requestedStudentId)
    ? requestedStudentId
    : students[0]?.id ?? "";

  function setStudentQuery(studentId: string) {
    if (!studentId) return;
    const p = new URLSearchParams(searchParams.toString());
    p.set("student", studentId);
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
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
