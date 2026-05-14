"use client";

import React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PARENT_DEMO_STUDENTS } from "@/lib/parent-student-profile-demo";
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
    <div className="flex w-[448px] max-w-full items-center justify-between">
      <span
        className={`font-['Inter:Semi_Bold',sans-serif] font-semibold text-[16px] leading-[1.4] ${DASHBOARD_TEXT_PRIMARY_CLASS}`}
      >
        {label}
      </span>
      <label className="sr-only" htmlFor="parent-student-picker">
        Select student
      </label>
      <div
        className="flex h-[48px] w-[260px] items-center overflow-hidden rounded-[10px] bg-white px-[12px] py-[8px] shadow-[0px_0px_0px_1px_#f0f0f0]"
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
            className={`h-full min-w-px flex-[1_0_0] border-0 bg-transparent font-['Inter:Regular',sans-serif] ${DASHBOARD_TEXT_PRIMARY_CLASS} text-[16px] leading-[1.6] tracking-[-0.32px] outline-none cursor-pointer [-webkit-appearance:none] [appearance:none] [&::-ms-expand]:hidden`}
          >
            {PARENT_DEMO_STUDENTS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.displayName}
              </option>
            ))}
          </select>
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
