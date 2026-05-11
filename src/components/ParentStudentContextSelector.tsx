"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PARENT_DEMO_STUDENTS } from "@/lib/parent-student-profile-demo";
import { getParentStudentContextLabel } from "@/lib/parent-student-context-label";
import {
  DASHBOARD_BORDER_SUBTLE_CLASS,
  DASHBOARD_RADIUS_CONTROL,
  DASHBOARD_TEXT_MUTED_CLASS,
  DASHBOARD_TEXT_PRIMARY_CLASS,
} from "@/lib/dashboard-shell-classes";

const imgHugeiconsStudentPicker =
  "/images/icon-generic.svg";

export default function ParentStudentContextSelector() {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const router = useRouter();

  if (!pathname.startsWith("/dashboard/parents")) {
    return null;
  }

  const label = getParentStudentContextLabel(pathname);
  const studentPickerValue = searchParams.get("student") ?? "anna";

  function setStudentQuery(studentId: string) {
    const p = new URLSearchParams(searchParams.toString());
    p.set("student", studentId);
    const q = p.toString();
    router.replace(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="flex flex-wrap items-center gap-2 md:gap-3">
      <span
        className={`font-['Inter:Regular',sans-serif] text-[12px] leading-tight tracking-[-0.01em] ${DASHBOARD_TEXT_MUTED_CLASS}`}
      >
        {label}
      </span>
      <label className="sr-only" htmlFor="parent-student-picker">
        Select student
      </label>
      <div
        className={`flex h-12 max-h-12 items-center gap-2 ${DASHBOARD_RADIUS_CONTROL} border ${DASHBOARD_BORDER_SUBTLE_CLASS} bg-white pl-3 pr-2`}
      >
        <div className="relative size-[20px] shrink-0 overflow-hidden rounded-full bg-[#e8fafc] ring-1 ring-black/[0.04] flex items-center justify-center">
          <img
            alt=""
            className="size-[14px] object-contain"
            src={imgHugeiconsStudentPicker}
            aria-hidden
          />
        </div>
        <select
          id="parent-student-picker"
          value={studentPickerValue}
          onChange={(e) => setStudentQuery(e.target.value)}
          className={`h-full min-w-[132px] max-w-[240px] flex-1 border-0 bg-transparent py-0 font-['Inter:Medium',sans-serif] ${DASHBOARD_TEXT_PRIMARY_CLASS} text-[12px] leading-tight outline-none cursor-pointer [-webkit-appearance:none] [appearance:none] [&::-ms-expand]:hidden pr-7 bg-[length:14px_14px] bg-[right_8px_center] bg-no-repeat`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23666d80' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          }}
        >
          {PARENT_DEMO_STUDENTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.displayName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
