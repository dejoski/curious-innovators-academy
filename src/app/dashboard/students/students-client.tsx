"use client";
import type { DataSource } from "@/lib/data/fetch-source";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DASHBOARD_PANEL_CLASS,
  DASHBOARD_TABLE_SCROLL_CLASS,
} from "@/lib/dashboard-shell-classes";
import {
  exportQueuedToast,
  messagingDialogDisclaimer,
} from "@/lib/product-copy";
const imgEllipse2735 = "/images/figma-ellipse2735.png";
const imgEllipse2736 = "/images/figma-ellipse2736.png";
const imgEllipse2737 = "/images/figma-ellipse2737.png";
const imgEllipse2738 = "/images/figma-ellipse2738.png";
const imgEllipse2739 = "/images/figma-ellipse2739.png";
const imgEllipse2740 = "/images/figma-ellipse2740.png";
const imgHugeiconsStudent1 = "/images/figma-icon-student.svg";
const imgMaskGroup = "/images/figma-icon-pending-mask.svg";
const imgGroup2 = "/images/figma-icon-fully-scheduled.svg";
const imgGroup3 = "/images/figma-icon-open-blocks.svg";
const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector = "/images/vector.svg";
const imgIconCaretDown = "/images/icon-caret-down.svg";
const imgIcRoundPlus = "/images/icon-plus.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";
const imgChevronDown2 = "/images/icon-chevron-down2.svg";
const imgChevronDown3 = "/images/icon-chevron-down3.svg";
const figmaAvatarByName: Record<string, string> = {
  "Anna Lee": imgEllipse2735,
  "George Lee": imgEllipse2736,
  "Bruna Lee": imgEllipse2737,
  "James Smith": imgEllipse2738,
  "Bruce Collins": imgEllipse2739,
  "Maria Collins": imgEllipse2740,
};
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
}) {
  const isCompleted = coreStatus === "Completed";
  return (
    <div
      className={`border-[#f0f0f0] border-t flex h-[63.857px] items-start transition-colors ${isSelected ? "bg-[#f8fdfd]" : "hover:bg-gray-50"}`}
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
            className="text-[#0d0d12] text-[16px] hover:text-[#14c1d5] transition-colors"
          >
            {studentName}
          </Link>
        </div>
      </div>
      <div className="w-[175.333px] pt-[8px] text-[#0d0d12] text-[16px]">
        {parentName}
      </div>
      <div className="w-[98px] pt-[8px] text-[#0d0d12] text-[16px] text-center">
        {level}
      </div>
      <div className="w-[175.333px] flex justify-center pt-[8px]">
        <div
          className={`border content-stretch flex h-[20px] items-center px-[8px] rounded-[6px] ${isCompleted ? "bg-[rgba(0,77,8,0.2)] border-[rgba(0,77,8,0.5)] text-[#004d08]" : "bg-[#ffd9d9] border-[rgba(216,5,9,0.5)] text-[#d80509]"}`}
        >
          <p className="text-[10px] leading-[1.4]">{coreStatus}</p>
        </div>
      </div>
      <div className="w-[140px] pt-[8px] text-[#0d0d12] text-[16px] text-center">
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
type ProgramTrack = "core" | "enrichment";
type StudentItem = {
  id: string;
  name: string;
  avatar: string;
  parent: string;
  level: string;
  status: "Incomplete" | "Completed";
  enrichment: string;
  notes: string;
  track: ProgramTrack;
};
export type StudentsStudentsListProps = {
  initialStudents: StudentItem[];
  dataSource: DataSource;
};
export default function StudentsStudentsList({
  initialStudents,
  dataSource,
}: StudentsStudentsListProps) {
  const [students, setStudents] = useState<StudentItem[]>(() => [
    ...initialStudents,
  ]);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
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
    name: string;
    parent: string;
  } | null>(null);
  const [removeTargetId, setRemoveTargetId] = useState<string | null>(null);
  const [spreadsheetBanner, setSpreadsheetBanner] = useState<string | null>(
    null,
  );
  const itemsPerPage = 10;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const coreFilterRef = useRef<HTMLDivElement>(null);
  const statusFilterRef = useRef<HTMLDivElement>(null);
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
  async function readApiError(res: Response): Promise<string> {
    try {
      const j = (await res.json()) as { error?: string };
      return j.error ?? res.statusText;
    } catch {
      return res.statusText;
    }
  }
  const stats = useMemo(
    () => ({ total: 70, completed: 52, openBlocks: 14, pct: 72, pend: 18 }),
    [],
  );
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
  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveDropdown(null);
    }
  };
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
                  {programFilter === "all"
                    ? "Core"
                    : programFilter === "core"
                      ? "Core"
                      : "Enrichment"}
                </p>
                <div className="relative shrink-0 size-[14px]">
                  <img
                    alt=""
                    className="absolute block inset-0 max-w-none size-full"
                    src={imgIconCaretDown}
                  />
                </div>
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
                <div className="relative shrink-0 size-[14px]">
                  <img
                    alt=""
                    className="absolute block inset-0 max-w-none size-full"
                    src={imgIconCaretDown}
                  />
                </div>
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
                  ? `Deselect All (${selectedStudents.length})`
                  : "Select All"}
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
          </div>
        </div>
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
                    avatar={figmaAvatarByName[student.name] ?? student.avatar}
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
                    onOpenMessage={() =>
                      setMessageTarget({
                        name: student.name,
                        parent: student.parent,
                      })
                    }
                    onRequestRemove={() => setRemoveTargetId(student.id)}
                  />
                ))
              ) : (
                <div className="py-[32px] text-center text-[#666d80] ">
                  {searchQuery.trim()
                    ? `No students found matching "${searchQuery}"`
                    : "No students match the current filters."}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mt-[10px]">
          <div className="flex gap-[12px] items-center mx-auto">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`flex items-center justify-center size-[18px] rotate-90 rounded-full transition-colors ${currentPage === 1 ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"}`}
            >
              <img alt="" className="w-[18px] h-[18px]" src={imgChevronDown2} />
            </button>
            <div className="flex gap-[3px] items-center">
              {[1, 2, 3].map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`transition-colors flex flex-col items-center justify-center px-[5px] py-[9px] rounded-[9px] size-[18px] ${currentPage === page ? "bg-[#14c1d5] hover:bg-[#12aebd]" : "hover:bg-gray-100"}`}
                >
                  <p
                    className={`font-semibold text-[12px] text-center leading-[0] ${currentPage === page ? "text-white" : "text-[#666d80]"}`}
                  >
                    {page}
                  </p>
                </button>
              ))}
              <div className="flex flex-col items-center justify-center px-[5px] py-[9px] rounded-[9px] size-[18px]">
                <p className="font-semibold text-[12px] text-center leading-[0] text-[#666d80]">
                  ...
                </p>
              </div>
              <button
                type="button"
                onClick={() => handlePageChange(9)}
                className="transition-colors flex flex-col items-center justify-center px-[5px] py-[9px] rounded-[9px] size-[18px] hover:bg-gray-100"
              >
                <p className="font-semibold text-[12px] text-center leading-[0] text-[#666d80]">
                  9
                </p>
              </button>
            </div>
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`flex items-center justify-center size-[18px] -rotate-90 rounded-full transition-colors ${currentPage === totalPages ? "opacity-30 cursor-not-allowed" : "hover:opacity-70"}`}
            >
              <img alt="" className="w-[18px] h-[18px]" src={imgChevronDown3} />
            </button>
          </div>
        </div>
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
            onClick={() => setSpreadsheetBanner(exportQueuedToast())}
            className="bg-[#d2f1f5] shadow-sm flex gap-[8px] items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#bce6ec] transition-colors cursor-pointer"
          >
            <p className="font-inter-tight text-[#14c1d5] text-[16px] tracking-[0.32px]">
              Upload to Spreadsheet
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
              Message parent
            </h2>
            <p className="mt-2 text-sm text-[#666d80]">
              A message composer for
              <span className="font-semibold">{messageTarget.parent}</span>
              about <span className="font-semibold">{messageTarget.name}</span>
              will open when messaging is enabled.
              {messagingDialogDisclaimer()}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setMessageTarget(null)}
              >
                Close
              </button>
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
                      `Could not remove in cloud (${await readApiError(res)}).`,
                    );
                  }
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
