"use client";
import type { DataSource } from "@/lib/data/fetch-source";
import type { StudentListItem } from "@/lib/data/types";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardBulkImportModal, type ParsedImportRow } from "@/components/dashboard-bulk-import-modal";
import { DashboardBulkSelectionBar } from "@/components/dashboard-row-actions";
import {
  DASHBOARD_PANEL_CLASS,
  DASHBOARD_TABLE_SCROLL_CLASS,
} from "@/lib/dashboard-shell-classes";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData, preloadStudentDetailData } from "@/lib/client-data-cache";
import { downloadCsv, mailtoHref } from "@/lib/client-directory-actions";
import { getVisibleDashboardPages } from "@/lib/dashboard-pagination";
const imgHugeiconsStudent1 = "/images/icon-student-picker.svg";
const imgMaskGroup = "/images/icon-pending-requests.svg";
const imgGroup2 = "/images/icon-fully-scheduled.svg";
const imgGroup3 = "/images/icon-open-blocks.svg";
const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector = "/images/vector.svg";
const imgIcRoundPlus = "/images/icon-plus.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";

function TableRow({
  studentId,
  studentName,
  avatar,
  parentName,
  level,
  coreStatus,
  enrichment,
  notes,
  isSelected,
  onSelect,
  activeDropdown,
  setActiveDropdown,
  dropdownRef,
  onOpenMessage,
  onRequestRemove,
  onWarmStudent,
}: {
  studentId: string;
  studentName: string;
  avatar: string;
  parentName: string;
  level: string;
  coreStatus: string;
  enrichment: string;
  notes: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  activeDropdown: string | null;
  setActiveDropdown: (id: string | null) => void;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  onOpenMessage: () => void;
  onRequestRemove: () => void;
  onWarmStudent: (id: string) => void;
}) {
  const isCompleted = coreStatus === "Completed";
  return (
    <div
      className={`border-[#f0f0f0] border-t flex h-[63.857px] items-start transition-colors ${isSelected ? "bg-[#f8fdfd]" : "hover:bg-gray-50"}`}
      onMouseEnter={() => onWarmStudent(studentId)}
      onFocusCapture={() => onWarmStudent(studentId)}
    >
      <div className="w-[194px] flex items-center gap-[12px] pt-[8px]">
        <button
          onClick={() => onSelect(studentId)}
          className={`border border-[#14c1d5] border-solid rounded-[4px] shrink-0 size-[14px] flex items-center justify-center transition-colors ${isSelected ? "bg-[#14c1d5]" : "bg-[#d2f1f5] opacity-50"}`}
        >
          {isSelected && (
            <svg
              width="10"
              height="8"
              viewBox="0 0 10 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
        <div className="flex gap-[6px] items-center">
          <div className="relative shrink-0 size-[32px]">
            <img
              alt=""
              className="absolute block inset-0 max-w-none size-full rounded-full object-cover"
              src={avatar}
            />
          </div>
          <Link
            href={`/dashboard/students/${studentId}`}
            className="text-[13px] text-[#0d0d12] transition-colors hover:text-[#14c1d5]"
          >
            {studentName}
          </Link>
        </div>
      </div>
      <div className="w-[175.333px] pt-[8px] text-[13px] text-[#0d0d12]">
        {parentName}
      </div>
      <div className="w-[98px] pt-[8px] text-center text-[13px] text-[#0d0d12]">
        {level}
      </div>
      <div className="w-[175.333px] flex justify-center pt-[8px]">
        <div
          className={`border content-stretch flex h-[20px] items-center px-[8px] rounded-[6px] ${isCompleted ? "bg-[rgba(0,77,8,0.2)] border-[rgba(0,77,8,0.5)] text-[#004d08]" : "bg-[#ffd9d9] border-[rgba(216,5,9,0.5)] text-[#d80509]"}`}
        >
          <p className="text-[10px] leading-[1.4]">{coreStatus}</p>
        </div>
      </div>
      <div className="w-[140px] pt-[8px] text-center text-[13px] text-[#0d0d12]">
        {enrichment}
      </div>
      <div className="w-[175.333px] pt-[8px] pr-[10px] italic text-[#666d80] text-[12px] leading-[1.25]">
        {notes}
      </div>
      <div className="w-[110px] flex justify-center pt-[8px]">
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveDropdown(
                activeDropdown === studentId ? null : studentId,
              );
            }}
            className={`cursor-pointer relative size-[24px] hover:opacity-70 transition-opacity rounded-full p-1 ${activeDropdown === studentId ? "bg-gray-200" : "hover:bg-gray-200"}`}
          >
            <img alt="" className="block size-full" src={imgWeuiMoreOutlined} />
          </button>
          {activeDropdown === studentId && (
            <div
              ref={dropdownRef}
              className="absolute right-8 top-8 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30"
            >
              <Link
                href={`/dashboard/students/${studentId}`}
                onClick={() => setActiveDropdown(null)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View profile
              </Link>
              <Link
                href={`/dashboard/students/${studentId}/schedule`}
                onClick={() => setActiveDropdown(null)}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                View Schedule
              </Link>
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(null);
                  onOpenMessage();
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Message Parent
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                type="button"
                onClick={() => {
                  setActiveDropdown(null);
                  onRequestRemove();
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                Remove Student
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
type StudentItem = StudentListItem;
export type StudentsStudentsListProps = {
  initialStudents: StudentItem[];
  dataSource: DataSource;
};
export default function StudentsStudentsList({
  initialStudents,
  dataSource,
}: StudentsStudentsListProps) {
  const router = useRouter();
  const [students, setStudents] = useState<StudentItem[]>(() => [
    ...initialStudents,
  ]);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isCoreFilterOpen, setIsCoreFilterOpen] = useState(false);
  const [isStatusFilterOpen, setIsStatusFilterOpen] = useState(false);
  const [programFilter, setProgramFilter] = useState<
    "all" | "core" | "enrichment"
  >("all");
  const [scheduleFilter, setScheduleFilter] = useState<
    "all" | "Completed" | "Incomplete"
  >("all");
  const [messageTarget, setMessageTarget] = useState<{
    id: string;
    name: string;
    parent: string;
    parentEmail?: string;
  } | null>(null);
  const [parentEmailDraft, setParentEmailDraft] = useState("");
  const [messageHint, setMessageHint] = useState<string | null>(null);
  const [savingParentEmail, setSavingParentEmail] = useState(false);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [spreadsheetBanner, setSpreadsheetBanner] = useState<string | null>(
    null,
  );
  const itemsPerPage = 10;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const coreFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setStudents([...initialStudents]);
  }, [initialStudents]);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdown(null);
      }
      if (
        coreFilterRef.current &&
        !coreFilterRef.current.contains(event.target as Node)
      ) {
        setIsCoreFilterOpen(false);
      }
      if (
        statusFilterRef.current &&
        !statusFilterRef.current.contains(event.target as Node)
      ) {
        setIsStatusFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  useEffect(() => {
    if (!spreadsheetBanner) return;
    const t = window.setTimeout(() => setSpreadsheetBanner(null), 5000);
    return () => window.clearTimeout(t);
  }, [spreadsheetBanner]);
  useEffect(() => {
    if (!syncHint) return;
    const t = window.setTimeout(() => setSyncHint(null), 9000);
    return () => window.clearTimeout(t);
  }, [syncHint]);
  useEffect(() => {
    setParentEmailDraft(messageTarget?.parentEmail ?? "");
    setMessageHint(null);
    setSavingParentEmail(false);
  }, [messageTarget?.id]);
  const stats = useMemo(() => {
    const total = students.length;
    const completed = students.filter((student) => student.status === "Completed").length;
    const openBlocks = students.reduce((sum, student) => sum + Math.max(0, student.openScheduleBlocks), 0);
    const pendingRequests = students.reduce((sum, student) => sum + Math.max(0, student.enrichmentPendingCount), 0);
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, openBlocks, pct, pend: pendingRequests };
  }, [students]);
  const filteredStudents = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return students.filter((student) => {
      const matchesSearch =
        student.name.toLowerCase().includes(q) ||
        student.parent.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (programFilter !== "all" && student.track !== programFilter)
        return false;
      if (scheduleFilter !== "all" && student.status !== scheduleFilter)
        return false;
      return true;
    });
  }, [students, searchQuery, programFilter, scheduleFilter]);
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, programFilter, scheduleFilter, students.length]);
  const handleSelectAll = () => {
    if (selectedStudents.length === filteredStudents.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(filteredStudents.map((s) => s.id));
    }
  };
  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages);
  const visiblePages = getVisibleDashboardPages(safePage, totalPages);
  const paginatedStudents = filteredStudents.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage,
  );
  const programFilterLabel =
    programFilter === "all"
      ? "All Classes"
      : programFilter === "core"
        ? "Core Classes"
        : "Enrichment Classes";
  const visibleRangeStart = filteredStudents.length === 0 ? 0 : (safePage - 1) * itemsPerPage + 1;
  const visibleRangeEnd = Math.min(safePage * itemsPerPage, filteredStudents.length);
  const warmStudent = React.useCallback((studentId: string) => {
    if (!studentId) return;
    preloadStudentDetailData(studentId);
    router.prefetch(`/dashboard/students/${encodeURIComponent(studentId)}`);
  }, [router]);

  useEffect(() => {
    const visibleIds = paginatedStudents.slice(0, 4).map((student) => student.id);
    const timers = visibleIds.map((studentId, index) =>
      window.setTimeout(() => warmStudent(studentId), index * 120),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [paginatedStudents, warmStudent]);
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveDropdown(null);
    }
  };
  const exportStudents = () => {
    const selected = selectedStudents.length
      ? filteredStudents.filter((student) => selectedStudents.includes(student.id))
      : filteredStudents;
    downloadCsv(
      "students-directory.csv",
      ["Name", "Parent", "Level", "Schedule status", "Enrichment", "Track", "Notes"],
      selected.map((student) => [
        student.name,
        student.parent,
        student.level,
        student.status,
        student.enrichment,
        student.track,
        student.notes,
      ]),
    );
    setSpreadsheetBanner(`Downloaded ${selected.length} student row(s) as CSV.`);
  };

  const importStudents = async (rows: ParsedImportRow[]) => {
    const created: StudentItem[] = [];
    const errors: string[] = [];
    for (const row of rows) {
      const res = await fetch("/api/data/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.values.name,
          parent: row.values.parent,
          parentEmail: row.values.parentEmail,
          level: row.values.level,
          track: row.values.track?.toLowerCase() === "enrichment" ? "enrichment" : "core",
          notes: row.values.notes,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { student?: StudentItem };
        if (body.student) created.push(body.student);
      } else {
        errors.push(`Row ${row.rowNumber}: ${await readApiError(res)}`);
      }
    }
    if (created.length > 0) {
      setStudents((prev) => [...prev, ...created]);
      invalidateDashboardData(["/api/data/students", "/api/dashboard-presentation"]);
      setSpreadsheetBanner(`Imported ${created.length} student row(s).`);
    }
    return { created: created.length, errors };
  };
  async function saveParentEmail() {
    if (!messageTarget || savingParentEmail) return;
    const email = parentEmailDraft.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setMessageHint("Enter a valid parent email address.");
      return;
    }
    setSavingParentEmail(true);
    setMessageHint(null);
    try {
      const res = await fetch(`/api/data/students?id=${encodeURIComponent(messageTarget.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent: messageTarget.parent,
          parentEmail: email,
        }),
      });
      if (!res.ok) {
        setMessageHint(`Could not save parent email: ${await readApiError(res)}`);
        return;
      }
      const body = (await res.json()) as { student: StudentItem };
      setStudents((prev) =>
        prev.map((student) => (student.id === body.student.id ? body.student : student)),
      );
      setMessageTarget({
        id: body.student.id,
        name: body.student.name,
        parent: body.student.parent,
        parentEmail: body.student.parentEmail,
      });
      invalidateDashboardData(["/api/data/students", "/api/dashboard-presentation"]);
      setMessageHint("Parent email saved. You can open a mail draft now.");
    } finally {
      setSavingParentEmail(false);
    }
  }
  const handleSelectStudent = (id: string) => {
    if (selectedStudents.includes(id)) {
      setSelectedStudents(
        selectedStudents.filter((studentId) => studentId !== id),
      );
    } else {
      setSelectedStudents([...selectedStudents, id]);
    }
  };
  return (
    <div className="flex flex-col w-full min-h-full px-[32px] py-[32px] gap-[24px] font-sans relative">
      <div className="flex flex-col gap-[4px]">
        <h1 className="font-bold leading-[1.1] text-[#272932] text-[28px]">
          Student List
        </h1>
        <p className="font-normal leading-[1.4] text-[#666d80] text-[16px] max-w-[920px]">
          View all enrolled students, monitor scheduling status, and access
          individual profiles and class information.
        </p>
        {syncHint ? (
          <p className="max-w-3xl rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-xs text-amber-950 leading-snug">
            {syncHint}
          </p>
        ) : null}
      </div>
      <div className="flex w-full flex-wrap gap-[20px]">
        <Link
          href="/dashboard/students"
          className="h-[72px] w-[261px] bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow"
        >
          <div className="flex gap-[8px] items-center">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <div className="relative shrink-0 size-[20px]">
                <img
                  alt=""
                  className="absolute block inset-0 max-w-none size-full"
                  src={imgHugeiconsStudent1}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-semibold text-[#272932] text-[16px]">
                Total Students
              </p>
              <p className="font-medium text-[#666d80] text-[16px]">
                {stats.total}
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/students"
          className="h-[72px] w-[261px] bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow"
        >
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[rgba(0,77,8,0.2)] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <div className="overflow-clip relative shrink-0 size-[20px]">
                <div className="absolute inset-[10.42%_8.33%_8.33%_8.33%]">
                  <div className="absolute inset-[-5%_-5%]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src={imgGroup2}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4] flex-1">
              <p className="font-semibold text-[#272932] text-[16px]">
                Fully Scheduled
              </p>
              <div className="flex gap-[10px] items-center">
                <p className="font-medium text-[#666d80] text-[16px]">
                  {stats.completed}
                </p>
                <div className="flex items-center gap-2 flex-1">
                  <div className="bg-[rgba(0,77,8,0.2)] h-[8px] rounded-[41px] w-full relative overflow-hidden">
                    <div
                      className="bg-[#004d08] absolute left-0 top-0 bottom-0 rounded-[41px]"
                      style={{ width: `${stats.pct}%` }}
                    />
                  </div>
                  <p className="font-medium text-[#666d80] text-[16px]">
                    {stats.pct}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/schedule"
          className="h-[72px] w-[261px] bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow"
        >
          <div className="flex gap-[8px] items-center">
            <div className="bg-[rgba(207,165,0,0.2)] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <div className="overflow-clip relative shrink-0 size-[20px]">
                <div className="absolute inset-[10.42%_8.33%_8.33%_8.33%]">
                  <div className="absolute inset-[-5%_-5%]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src={imgGroup3}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-semibold text-[#272932] text-[16px]">
                Open Blocks
              </p>
              <p className="font-medium text-[#666d80] text-[16px]">
                {stats.openBlocks}
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/dashboard/classes/requests"
          className="h-[72px] w-[261px] bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow"
        >
          <div className="flex gap-[8px] items-center">
            <div className="bg-[#ffd9d9] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <div className="overflow-clip relative shrink-0 size-[20px]">
                <div className="absolute inset-[8.33%_16.67%]">
                  <div className="absolute inset-[-5%_-6%]">
                    <img
                      alt=""
                      className="block max-w-none size-full"
                      src={imgMaskGroup}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-semibold text-[#272932] text-[16px]">
                Pending Requests
              </p>
              <p className="font-medium text-[#666d80] text-[16px]">
                {stats.pend}
              </p>
            </div>
          </div>
        </Link>
      </div>
      <div
        className={[
          DASHBOARD_PANEL_CLASS,
          "relative -mt-[2px] flex flex-col px-[18px] py-[16px] w-full h-[695px]",
        ].join(" ")}
      >
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-4">
          <div className="flex gap-[6px] items-center flex-1 w-full max-w-xs py-2">
            <div className="relative shrink-0 size-[14px]">
              <img
                alt=""
                className="absolute block inset-0 max-w-none size-full"
                src={imgMaterialSymbolsSearch}
              />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none text-[12px] w-full text-[#0d0d12] bg-transparent"
            />
          </div>
          <div className="flex flex-wrap gap-[16px] items-center w-full sm:w-auto pb-2 sm:pb-0 justify-start sm:justify-end">
            {/* Core Filter */}
            <div className="relative" ref={coreFilterRef}>
              <button
                onClick={() => setIsCoreFilterOpen(!isCoreFilterOpen)}
                className={`bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] shrink-0 cursor-pointer transition-colors ${isCoreFilterOpen ? "ring-2 ring-[#14c1d5] bg-gray-50" : "hover:bg-gray-100"}`}
              >
                <div className="flex items-center justify-center w-[14px] h-[14px] relative">
                  <img
                    alt=""
                    className="w-full h-full object-contain"
                    src={imgVector}
                  />
                </div>
                <p className="text-[12px] text-[#0d0d12]">
                  {programFilterLabel}
                </p>
                <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
              </button>
              {isCoreFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setProgramFilter("all");
                      setIsCoreFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${programFilter === "all" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"}`}
                  >
                    All Classes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgramFilter("core");
                      setIsCoreFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${programFilter === "core" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"}`}
                  >
                    Core Classes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setProgramFilter("enrichment");
                      setIsCoreFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${programFilter === "enrichment" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"}`}
                  >
                    Enrichment Classes
                  </button>
                </div>
              )}
            </div>
            {/* Status Filter */}
            <div className="relative" ref={statusFilterRef}>
              <button
                onClick={() => setIsStatusFilterOpen(!isStatusFilterOpen)}
                className={`bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] shrink-0 cursor-pointer transition-colors ${isStatusFilterOpen ? "ring-2 ring-[#14c1d5] bg-gray-50" : "hover:bg-gray-100"}`}
              >
                <div className="flex items-center justify-center w-[14px] h-[14px] relative">
                  <img
                    alt=""
                    className="w-full h-full object-contain"
                    src={imgVector}
                  />
                </div>
                <p className="text-[12px] text-[#0d0d12]">
                  Schedule Status:
                  {` ${scheduleFilter === "all" ? "All" : scheduleFilter}`}
                </p>
                <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
              </button>
              {isStatusFilterOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleFilter("all");
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${scheduleFilter === "all" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"}`}
                  >
                    All Statuses
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleFilter("Completed");
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${scheduleFilter === "Completed" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"}`}
                  >
                    Completed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScheduleFilter("Incomplete");
                      setIsStatusFilterOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${scheduleFilter === "Incomplete" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"}`}
                  >
                    Incomplete
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={handleSelectAll}
              className={`${selectedStudents.length > 0 ? "bg-[#d2f1f5] text-[#14c1d5]" : "bg-[#fafafa] text-[#0d0d12]"} flex items-center p-[8px] rounded-[8px] shrink-0 cursor-pointer hover:bg-gray-100 transition-colors`}
            >
              <p className="text-[12px]">
                {selectedStudents.length > 0
                  ? `Clear selected (${selectedStudents.length})`
                  : "Select visible"}
              </p>
            </button>
            <Link
              href="/dashboard/students/new"
              className="bg-[#14c1d5] cursor-pointer drop-shadow-[0px_1px_1px_rgba(13,13,18,0.06)] flex gap-[8px] h-[34px] items-center justify-center px-[16px] py-[8px] rounded-[6px] shrink-0 hover:bg-[#12aebd] transition-colors"
            >
              <div className="relative shrink-0 size-[24px]">
                <img
                  alt=""
                  className="absolute block inset-0 max-w-none size-full"
                  src={imgIcRoundPlus}
                />
              </div>
              <p className="font-inter-tight text-[14px] text-white tracking-[0.28px]">
                Create Student
              </p>
            </Link>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="bg-white border border-[#14c1d5]/40 text-[#14c1d5] cursor-pointer flex h-[34px] items-center justify-center px-[14px] py-[8px] rounded-[6px] shrink-0 hover:bg-[#ecfdff] transition-colors text-[14px] font-semibold"
            >
              Bulk import CSV
            </button>
          </div>
        </div>
        <p className="mb-3 text-[12px] text-[#666d80]">
          Showing {visibleRangeStart}-{visibleRangeEnd} of {filteredStudents.length} students
          {filteredStudents.length !== stats.total ? ` (${stats.total} total)` : ""}
        </p>
        <DashboardBulkSelectionBar count={selectedStudents.length} noun="student" onClear={() => setSelectedStudents([])}>
          <button
            type="button"
            onClick={exportStudents}
            className="rounded-[6px] bg-[#14c1d5] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#11adbf]"
          >
            Download selected CSV
          </button>
          <Link
            href={`/dashboard/students/${encodeURIComponent(selectedStudents[0] ?? "")}`}
            className={`rounded-[6px] px-3 py-1.5 text-[12px] font-semibold ${
              selectedStudents.length === 1 ? "bg-white/80 text-[#155e66] ring-1 ring-[#14c1d5]/25 hover:bg-white" : "pointer-events-none bg-white/60 text-[#667085]"
            }`}
          >
            Open selected profile
          </Link>
        </DashboardBulkSelectionBar>
        <div className={DASHBOARD_TABLE_SCROLL_CLASS}>
          <div className="w-[1068px] flex flex-col">
            <div className="border-t border-[#f0f0f0] flex h-[64px] items-start pt-[20px]">
              <div className="w-[194px] pl-[25px] font-semibold text-[#0d0d12] text-[14px] leading-[1.25]">
                Student
              </div>
              <div className="w-[175.333px] font-semibold text-[#0d0d12] text-[14px] leading-[1.25]">
                Parent
              </div>
              <div className="w-[98px] font-semibold text-[#0d0d12] text-[14px] text-center leading-[1.25]">
                Level
              </div>
              <div className="w-[175.333px] font-semibold text-[#0d0d12] text-[14px] text-center leading-[1.25]">
                Core Status
              </div>
              <div className="w-[140px] font-semibold text-[#0d0d12] text-[14px] text-center leading-[1.25]">
                Enrichment
              </div>
              <div className="w-[175.333px] pl-[20px] font-semibold text-[#0d0d12] text-[14px] leading-[1.25]">
                Notes
              </div>
              <div className="w-[110px] font-semibold text-[#0d0d12] text-[14px] text-center leading-[1.25]">
                Action
              </div>
            </div>
            <div className="flex flex-col">
              {filteredStudents.length > 0 ? (
                paginatedStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    studentId={student.id}
                    studentName={student.name}
                    avatar={student.avatar}
                    parentName={student.parent}
                    level={student.level}
                    coreStatus={student.status}
                    enrichment={student.enrichment}
                    notes={student.notes}
                    isSelected={selectedStudents.includes(student.id)}
                    onSelect={handleSelectStudent}
                    activeDropdown={activeDropdown}
                    setActiveDropdown={setActiveDropdown}
                    dropdownRef={dropdownRef}
                    onWarmStudent={warmStudent}
                    onOpenMessage={() =>
                      setMessageTarget({
                        id: student.id,
                        name: student.name,
                        parent: student.parent,
                        parentEmail: student.parentEmail,
                      })
                    }
                    onRequestRemove={() => setRemoveTargetId(student.id)}
                  />
                ))
              ) : (
                <div className="py-[32px] text-center text-[#666d80]">
                  {searchQuery.trim()
                    ? `No students found matching "${searchQuery}"`
                    : "No students match the current filters."}
                </div>
              )}
            </div>
          </div>
        </div>
        {totalPages > 1 ? (
          <div className="flex justify-between items-center mt-[10px]">
            <div className="flex gap-[12px] items-center mx-auto">
              <button
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                className={`flex items-center justify-center size-[18px] rounded-full transition-colors ${safePage === 1 ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"}`}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
              </button>
              <div className="flex gap-[3px] items-center">
                {visiblePages.map((page, index) =>
                  page === "ellipsis" ? (
                    <div
                      key={`ellipsis-${index}`}
                      className="flex flex-col items-center justify-center px-[5px] py-[9px] rounded-[9px] size-[18px]"
                    >
                      <p className="font-semibold text-[12px] text-center leading-[0] text-[#666d80]">...</p>
                    </div>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => handlePageChange(page)}
                      className={`transition-colors flex flex-col items-center justify-center px-[5px] py-[9px] rounded-[9px] size-[18px] ${safePage === page ? "bg-[#14c1d5] hover:bg-[#12aebd]" : "hover:bg-gray-100"}`}
                    >
                      <p
                        className={`font-semibold text-[12px] text-center leading-[0] ${safePage === page ? "text-white" : "text-[#666d80]"}`}
                      >
                        {page}
                      </p>
                    </button>
                  ),
                )}
              </div>
              <button
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages}
                className={`flex items-center justify-center size-[18px] rounded-full transition-colors ${safePage === totalPages ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"}`}
                aria-label="Next page"
              >
                <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
              </button>
            </div>
          </div>
        ) : null}
        <div
          className="absolute flex flex-col items-end gap-2"
          style={{ right: 38, bottom: 20 }}
        >
          {spreadsheetBanner && (
            <p className="text-xs text-[#3d5a45] bg-[#f0f7f2] px-3 py-1.5 rounded-md border border-[#c5ddcc] max-w-md text-right">
              {spreadsheetBanner}
            </p>
          )}
          <button
            type="button"
            onClick={exportStudents}
            className="bg-[#d2f1f5] shadow-sm flex gap-[8px] items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#bce6ec] transition-colors cursor-pointer"
          >
            <p className="font-inter-tight text-[#14c1d5] text-[16px] tracking-[0.32px]">
              Download CSV
            </p>
          </button>
        </div>
      </div>
      {messageTarget && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#0d0d12]">
              Email parent
            </h2>
            {messageTarget.parentEmail ? (
              <p className="mt-2 text-sm text-[#666d80]">
                Open a mail draft to <span className="font-semibold">{messageTarget.parent}</span> at{" "}
                <span className="font-semibold">{messageTarget.parentEmail}</span> about{" "}
                <span className="font-semibold">{messageTarget.name}</span>. Nothing is sent until you send it.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                <p className="text-sm text-[#8a5a00]">
                  No parent email is linked to <span className="font-semibold">{messageTarget.name}</span>.
                </p>
                <label className="flex flex-col gap-2 text-sm font-semibold text-[#272932]">
                  Parent email
                  <input
                    type="email"
                    value={parentEmailDraft}
                    onChange={(event) => setParentEmailDraft(event.target.value)}
                    placeholder="parent@example.com"
                    className="rounded-lg border border-gray-200 px-3 py-2 font-normal outline-none focus:border-[#14c1d5]"
                  />
                </label>
              </div>
            )}
            {messageHint ? (
              <p className="mt-3 rounded-md border border-[#e8e9ed] bg-[#fafafa] px-3 py-2 text-xs text-[#525a63]">
                {messageHint}
              </p>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setMessageTarget(null)}
              >
                Close
              </button>
              {messageTarget.parentEmail ? (
                <a
                  className="rounded-md bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebd]"
                  href={mailtoHref({
                    to: messageTarget.parentEmail,
                    subject: `Message about ${messageTarget.name}`,
                    body: `Hi ${messageTarget.parent},\n\nRegarding ${messageTarget.name}:\n\n`,
                  })}
                >
                  Open mail draft
                </a>
              ) : (
                <button
                  type="button"
                  disabled={savingParentEmail}
                  onClick={saveParentEmail}
                  className="rounded-md bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                >
                  {savingParentEmail ? "Saving..." : "Save email"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {removeTargetId !== null && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#272932]">
              Remove student?
            </h2>
            <p className="mt-2 text-sm text-[#666d80]">
              Remove this student from the directory? If the server rejects the
              change, refresh to restore the row.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md bg-[#fafafa] px-4 py-2 text-sm font-semibold text-[#0d0d12]"
                onClick={() => setRemoveTargetId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#d80509] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c00408]"
                onClick={async () => {
                  if (removeTargetId === null) return;
                  const id = removeTargetId;
                  const removed = students.find((s) => s.id === id);
                  setStudents((prev) => prev.filter((s) => s.id !== id));
                  setSelectedStudents((prev) =>
                    prev.filter((sid) => sid !== id),
                  );
                  setRemoveTargetId(null);
                  const res = await fetch(
                    `/api/data/students?id=${encodeURIComponent(String(id))}`,
                    { method: "DELETE" },
                  );
                  if (!res.ok && removed) {
                    setStudents((prev) =>
                      [...prev, removed].sort((a, b) =>
                        String(a.id).localeCompare(String(b.id)),
                      ),
                    );
                    setSyncHint(
                      `Could not remove (${await readApiError(res)}).`,
                    );
                  } else {
                    invalidateDashboardData(["/api/data/students", "/api/dashboard-presentation"]);
                  }
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
      <DashboardBulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk import students"
        entityLabel="student"
        filename="students-import-template.csv"
        columns={[
          { key: "name", label: "Name", required: true, sample: "New Student" },
          { key: "parent", label: "Parent", sample: "Parent Name" },
          { key: "parentEmail", label: "Parent Email", sample: "parent@example.com" },
          { key: "level", label: "Level", required: true, sample: "3" },
          { key: "track", label: "Track", sample: "core" },
          { key: "notes", label: "Notes", sample: "Optional support notes" },
        ]}
        onImport={importStudents}
      />
    </div>
  );
}
