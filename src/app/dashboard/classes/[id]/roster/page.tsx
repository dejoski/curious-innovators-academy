"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const imgEllipse2735 = "/images/icon-generic.svg";
const imgEllipse2736 = "/images/icon-generic.svg";
const imgEllipse2737 = "/images/icon-generic.svg";
const imgEllipse2738 = "/images/icon-generic.svg";
const imgEllipse2739 = "/images/icon-generic.svg";
const imgEllipse2740 = "/images/icon-generic.svg";
const imgGroup = "/images/icon-generic.svg";
const imgIcon = "/images/icon-generic.svg";
const imgGroup1 = "/images/icon-generic.svg";
const imgFlowbiteSortOutline = "/images/icon-generic.svg";
const imgIconCaretDown = "/images/icon-generic.svg";
const imgWeuiMoreOutlined = "/images/icon-generic.svg";
const imgChevronDown = "/images/icon-generic.svg";
const imgChevronDown1 = "/images/icon-generic.svg";

type RosterStatus = "Pending" | "Waitlist" | "Approved";

const CLASS_OPTIONS = ["Robotics Lab", "Math Lab", "Creative Writing"] as const;
const BLOCK_OPTIONS = ["Block 3", "Block 1", "Block 2"] as const;
const LEVEL_OPTIONS = ["Level 2", "Level 1", "Level 3"] as const;

interface StudentRowProps {
  id: string;
  studentName: string;
  parentName: string;
  age: string;
  status: RosterStatus;
  preference: string;
  notes: string;
  avatarUrl: string;
  classRef: (typeof CLASS_OPTIONS)[number];
  blockRef: (typeof BLOCK_OPTIONS)[number];
  levelRef: (typeof LEVEL_OPTIONS)[number];
}

const INITIAL_STUDENTS: StudentRowProps[] = [
  { id: "1", studentName: "Anna Lee", parentName: "Mr. Lee", age: "14", status: "Pending", preference: "1st", notes: "Waiting for seat confirmation due to high demand.", avatarUrl: imgEllipse2735, classRef: "Robotics Lab", blockRef: "Block 3", levelRef: "Level 2" },
  { id: "2", studentName: "George Lee", parentName: "Mr. Lee", age: "14", status: "Pending", preference: "2nd", notes: "Waiting for seat confirmation due to high demand.", avatarUrl: imgEllipse2736, classRef: "Robotics Lab", blockRef: "Block 3", levelRef: "Level 2" },
  { id: "3", studentName: "Bruna Lee", parentName: "Mr. Lee", age: "13", status: "Waitlist", preference: "1st", notes: "Parent informed and open to alternative class if needed.", avatarUrl: imgEllipse2737, classRef: "Robotics Lab", blockRef: "Block 3", levelRef: "Level 1" },
  { id: "4", studentName: "James Smith", parentName: "Ms. Smith", age: "14", status: "Approved", preference: "1st", notes: "Strong engagement in class activities.", avatarUrl: imgEllipse2738, classRef: "Math Lab", blockRef: "Block 1", levelRef: "Level 2" },
  { id: "5", studentName: "Bruce Collins", parentName: "Ms. Collins", age: "14", status: "Approved", preference: "1st", notes: "Strong engagement in class activities.", avatarUrl: imgEllipse2739, classRef: "Creative Writing", blockRef: "Block 2", levelRef: "Level 3" },
  { id: "6", studentName: "Maria Collins", parentName: "Ms. Collins", age: "13", status: "Approved", preference: "2nd", notes: "Strong engagement in class activities.", avatarUrl: imgEllipse2740, classRef: "Robotics Lab", blockRef: "Block 1", levelRef: "Level 2" },
  { id: "7", studentName: "Nina Park", parentName: "Ms. Park", age: "14", status: "Approved", preference: "1st", notes: "Strong engagement in class activities.", avatarUrl: imgEllipse2738, classRef: "Math Lab", blockRef: "Block 3", levelRef: "Level 2" },
  { id: "8", studentName: "Sam Rivera", parentName: "Mr. Rivera", age: "14", status: "Approved", preference: "2nd", notes: "Strong engagement in class activities.", avatarUrl: imgEllipse2739, classRef: "Creative Writing", blockRef: "Block 1", levelRef: "Level 1" },
];

type SortOption = "None" | "Student A-Z" | "Student Z-A" | "Status";

const STATUS_CYCLE: RosterStatus[] = ["Pending", "Waitlist", "Approved"];

function nextStatus(s: RosterStatus): RosterStatus {
  const i = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

const STATUS_ORDER: Record<RosterStatus, number> = {
  Pending: 0,
  Waitlist: 1,
  Approved: 2,
};

const StatusBadge = ({ status }: { status: RosterStatus }) => {
  const styles = {
    Pending: "bg-[#ffd9d9] text-[#d80509] border-[rgba(216,5,9,0.5)]",
    Waitlist: "bg-[rgba(207,165,0,0.2)] text-[#cfa500] border-[rgba(207,165,0,0.5)]",
    Approved: "bg-[rgba(0,77,8,0.2)] text-[#004d08] border-[rgba(0,77,8,0.5)]",
  };

  return (
    <div className={`border border-solid flex h-[20px] items-center px-[8px] rounded-[6px] shrink-0 ${styles[status]}`}>
      <p className="font-normal text-[10px] whitespace-nowrap">
        {status}
      </p>
    </div>
  );
};

function paginationSlice(totalPages: number, page: number): (number | "ellipsis")[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (page <= 3) {
    return [1, 2, 3, "ellipsis", totalPages];
  }
  if (page >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, "ellipsis", page, "ellipsis", totalPages];
}

export default function StudentClassRoster() {
  const params = useParams();
  const classId = String(params.id ?? "");

  const [students, setStudents] = useState<StudentRowProps[]>(INITIAL_STUDENTS);
  const [selectedClass, setSelectedClass] = useState<(typeof CLASS_OPTIONS)[number]>("Robotics Lab");
  const [selectedBlock, setSelectedBlock] = useState<(typeof BLOCK_OPTIONS)[number]>("Block 3");
  const [selectedLevel, setSelectedLevel] = useState<(typeof LEVEL_OPTIONS)[number]>("Level 2");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("None");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [openDropdown, setOpenDropdown] = useState<"class" | "block" | "level" | null>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const blockDropdownRef = useRef<HTMLDivElement>(null);
  const levelDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const t = event.target as Node;
      const insideClassBlockLevel =
        Boolean(classDropdownRef.current?.contains(t)) ||
        Boolean(blockDropdownRef.current?.contains(t)) ||
        Boolean(levelDropdownRef.current?.contains(t));
      if (!insideClassBlockLevel) setOpenDropdown(null);
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(t)) setIsSortOpen(false);
      const el = event.target as HTMLElement | null;
      if (el && !el.closest("[data-class-roster-kebab]")) setOpenKebabId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSorted = useMemo(() => {
    let list = students.filter(
      (s) => s.classRef === selectedClass && s.blockRef === selectedBlock && s.levelRef === selectedLevel
    );
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          s.parentName.toLowerCase().includes(q) ||
          s.notes.toLowerCase().includes(q)
      );
    }
    if (sortOption === "Student A-Z") {
      list = [...list].sort((a, b) => a.studentName.localeCompare(b.studentName));
    } else if (sortOption === "Student Z-A") {
      list = [...list].sort((a, b) => b.studentName.localeCompare(a.studentName));
    } else if (sortOption === "Status") {
      list = [...list].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
    }
    return list;
  }, [students, searchQuery, sortOption, selectedClass, selectedBlock, selectedLevel]);

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / itemsPerPage));
  const displayPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageSlice = paginationSlice(totalPages, displayPage);

  const pageRows = useMemo(() => {
    const start = (displayPage - 1) * itemsPerPage;
    return filteredSorted.slice(start, start + itemsPerPage);
  }, [filteredSorted, displayPage, itemsPerPage]);

  const toggleRow = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** LOCAL-ONLY: mutates demo state; no roster PATCH API wired yet */
  const advanceStudentStatus = useCallback((id: string) => {
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: nextStatus(s.status) } : s)),
    );
    setOpenKebabId(null);
  }, []);

  const toggleSelectAllPage = useCallback(() => {
    const pageIds = pageRows.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        pageIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }, [pageRows, selectedIds]);

  const rosterStats = useMemo(() => {
    const slice = students.filter(
      (s) => s.classRef === selectedClass && s.blockRef === selectedBlock && s.levelRef === selectedLevel,
    );
    const pending = slice.filter((s) => s.status === "Pending").length;
    const waitlist = slice.filter((s) => s.status === "Waitlist").length;
    const enrolled = slice.filter((s) => s.status === "Approved").length;
    const capacity = Math.max(18, enrolled + pending + waitlist);
    return { pending, waitlist, enrolled, capacity };
  }, [students, selectedClass, selectedBlock, selectedLevel]);

  const exportSpreadsheet = async () => {
    const header = ["Student", "Parent", "Age", "Status", "Preference", "Notes"].join("\t");
    const lines = filteredSorted.map((s) =>
      [s.studentName, s.parentName, s.age, s.status, s.preference, s.notes.replace(/\t/g, " ")].join("\t"),
    );
    const tsv = [header, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      window.alert(`Copied ${filteredSorted.length} row(s) as TSV. Paste into Numbers or Excel.`);
    } catch {
      window.alert("Clipboard blocked. Here's a one-line preview:\n" + header + "\n" + (lines[0] ?? ""));
    }
  };

  return (
    <div className="flex flex-col w-full min-h-full bg-[#fafafa] p-8 gap-8 font-sans">
      <div className="flex justify-between items-start w-full flex-wrap gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            {classId ? (
              <>
                <Link
                  href={`/dashboard/classes/core/${classId}`}
                  className="text-sm font-medium text-[#14c1d5] hover:text-[#12aebd] transition-colors w-fit"
                >
                  ← Back to class profile
                </Link>
                <span className="text-[#e5e5e5]">|</span>
              </>
            ) : null}
            <Link
              href="/dashboard/schedule"
              className="text-sm font-medium text-[#14c1d5] hover:text-[#12aebd] transition-colors w-fit"
            >
              Organization schedule (Month → Day)
            </Link>
          </div>
          <h1 className="text-[#272932] text-[28px] font-bold leading-[1.1]">Class roster</h1>
          <p className="text-[#666d80] text-[16px] leading-[1.4]">
            Approvals and seat status for this class (Figma-aligned table layout).
          </p>
        </div>
        <button
          type="button"
          onClick={() => void exportSpreadsheet()}
          className="bg-[#d2f1f5] hover:bg-[#bcecf3] transition-colors text-[#14c1d5] text-[16px] font-medium px-4 py-2 rounded-[6px] shadow-sm flex items-center justify-center"
        >
          Upload to Spreadsheet
        </button>
      </div>

      <div className="flex items-center justify-between w-full flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative" ref={classDropdownRef}>
            <button
              type="button"
              onClick={() => setOpenDropdown((p) => (p === "class" ? null : "class"))}
              className="bg-white flex h-[48px] items-center justify-between overflow-clip px-[12px] py-[8px] rounded-[10px] shadow-[0px_0px_0px_1px_#f0f0f0] w-[260px] cursor-pointer"
            >
              <div className="flex gap-[12px] items-center">
                <img src={imgGroup} alt="Notebook" className="size-[18px] object-contain" />
                <p className="font-normal text-[#0d0d12] text-[16px]">{selectedClass}</p>
              </div>
              <img src={imgIcon} alt="Chevron" className={`size-[20px] object-contain transition-transform ${openDropdown === "class" ? "rotate-0" : "rotate-180"}`} />
            </button>
            {openDropdown === "class" && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
                {CLASS_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="w-full px-3 py-2 text-left text-[16px] text-[#0d0d12] hover:bg-[#fafafa]"
                    onClick={() => {
                      setSelectedClass(opt);
                      setOpenDropdown(null);
                      setCurrentPage(1);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={blockDropdownRef}>
            <button
              type="button"
              onClick={() => setOpenDropdown((p) => (p === "block" ? null : "block"))}
              className="bg-white flex h-[48px] items-center justify-between overflow-clip px-[12px] py-[8px] rounded-[10px] shadow-[0px_0px_0px_1px_#f0f0f0] w-[260px] cursor-pointer"
            >
              <div className="flex gap-[12px] items-center">
                <img src={imgGroup} alt="Notebook" className="size-[18px] object-contain" />
                <p className="font-normal text-[#0d0d12] text-[16px]">{selectedBlock}</p>
              </div>
              <img src={imgIcon} alt="Chevron" className={`size-[20px] object-contain transition-transform ${openDropdown === "block" ? "rotate-0" : "rotate-180"}`} />
            </button>
            {openDropdown === "block" && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
                {BLOCK_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="w-full px-3 py-2 text-left text-[16px] text-[#0d0d12] hover:bg-[#fafafa]"
                    onClick={() => {
                      setSelectedBlock(opt);
                      setOpenDropdown(null);
                      setCurrentPage(1);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative" ref={levelDropdownRef}>
            <button
              type="button"
              onClick={() => setOpenDropdown((p) => (p === "level" ? null : "level"))}
              className="bg-white flex h-[48px] items-center justify-between overflow-clip px-[12px] py-[8px] rounded-[10px] shadow-[0px_0px_0px_1px_#f0f0f0] w-[260px] cursor-pointer"
            >
              <div className="flex gap-[12px] items-center">
                <img src={imgGroup} alt="Notebook" className="size-[18px] object-contain" />
                <p className="font-normal text-[#0d0d12] text-[16px]">{selectedLevel}</p>
              </div>
              <img src={imgIcon} alt="Chevron" className={`size-[20px] object-contain transition-transform ${openDropdown === "level" ? "rotate-0" : "rotate-180"}`} />
            </button>
            {openDropdown === "level" && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
                {LEVEL_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    className="w-full px-3 py-2 text-left text-[16px] text-[#0d0d12] hover:bg-[#fafafa]"
                    onClick={() => {
                      setSelectedLevel(opt);
                      setOpenDropdown(null);
                      setCurrentPage(1);
                    }}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white flex h-[48px] items-center overflow-clip px-[12px] py-[8px] rounded-[10px] shadow-[0px_0px_0px_1px_#f0f0f0] w-[260px]">
            <div className="flex gap-[12px] items-center w-full">
              <img src={imgGroup1} alt="Search" className="size-[18px] object-contain" />
              <input
                type="text"
                placeholder="Search student..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="font-normal text-[#666d80] text-[16px] outline-none bg-transparent w-full placeholder-[#666d80]"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-[#f0f0f0] flex flex-col items-center p-[16px] rounded-[18px] w-full shadow-sm">
        <div className="flex items-center justify-between w-full mb-4">
          <div className="flex gap-[12px] items-start flex-wrap">
            <div className="bg-[rgba(0,77,8,0.2)] border border-[rgba(0,77,8,0.5)] flex h-[20px] items-center px-[8px] rounded-[6px]">
              <p className="font-normal text-[#004d08] text-[10px]">Enrolled: {rosterStats.enrolled}</p>
            </div>
            <div className="bg-[#ffd9d9] border border-[rgba(216,5,9,0.5)] flex h-[20px] items-center px-[8px] rounded-[6px]">
              <p className="font-normal text-[#d80509] text-[10px]">Pending: {rosterStats.pending}</p>
            </div>
            <div className="bg-[rgba(207,165,0,0.2)] border border-[rgba(207,165,0,0.5)] flex h-[20px] items-center px-[8px] rounded-[6px]">
              <p className="font-normal text-[#cfa500] text-[10px]">Waitlist: {rosterStats.waitlist}</p>
            </div>
            <div className="bg-[#d2f1f5] border border-[rgba(20,193,213,0.5)] flex h-[20px] items-center px-[8px] rounded-[6px]">
              <p className="font-normal text-[#1392a0] text-[10px]">Capacity: {rosterStats.capacity}</p>
            </div>
          </div>

          <div className="flex gap-[24px] items-center">
            <div className="relative" ref={sortDropdownRef}>
              <button
                type="button"
                onClick={() => setIsSortOpen((o) => !o)}
                className="bg-[#fafafa] hover:bg-gray-100 transition-colors flex gap-[4px] items-center p-[8px] rounded-[8px]"
              >
                <img src={imgFlowbiteSortOutline} alt="Sort" className="size-[14px]" />
                <p className="font-normal text-[#0d0d12] text-[12px]">Sort</p>
                <img src={imgIconCaretDown} alt="Caret" className="size-[14px]" />
              </button>
              {isSortOpen && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[160px] rounded-[8px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
                  {(["None", "Student A-Z", "Student Z-A", "Status"] as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      className="w-full px-3 py-2 text-left text-[12px] text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => {
                        setSortOption(opt);
                        setIsSortOpen(false);
                        setCurrentPage(1);
                      }}
                    >
                      {opt === "None" ? "Default" : opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={toggleSelectAllPage}
              className="bg-[#fafafa] hover:bg-gray-100 transition-colors flex items-center p-[8px] rounded-[8px]"
            >
              <p className="font-normal text-[#0d0d12] text-[12px]">Select All</p>
            </button>
          </div>
        </div>

        <div className="border-[#f0f0f0] border-y border-solid flex items-center py-[16px] px-[10px] w-full text-[#0d0d12] text-[14px] font-semibold">
          <div className="w-[194px]">Student</div>
          <div className="flex-1">Parent</div>
          <div className="w-[98px] text-center">Age</div>
          <div className="flex-1 text-center">Status</div>
          <div className="w-[140px] text-center">Preference</div>
          <div className="flex-1 text-center">Notes</div>
          <div className="w-[110px] text-center">Action</div>
        </div>

        <div className="flex flex-col w-full">
          {pageRows.length === 0 ? (
            <p className="py-10 text-center text-[#666d80] text-sm w-full">No students match these filters. Try another class, block, or level.</p>
          ) : null}
          {pageRows.map((student) => (
            <div key={student.id} className="border-[#f0f0f0] border-b border-solid flex items-center min-h-[64px] py-[8px] px-[10px] w-full hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-[12px] w-[194px]">
                <button
                  type="button"
                  aria-pressed={selectedIds.has(student.id)}
                  onClick={() => toggleRow(student.id)}
                  className={`rounded-[4px] size-[14px] shrink-0 border border-[#14c1d5] transition-colors ${selectedIds.has(student.id) ? "bg-[#14c1d5] opacity-100" : "bg-[#d2f1f5] opacity-50"}`}
                />
                <div className="flex items-center gap-[6px]">
                  <img src={student.avatarUrl} alt={student.studentName} className="size-[32px] rounded-full object-cover" />
                  <p className="text-[#0d0d12] text-[16px] font-normal">{student.studentName}</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[#0d0d12] text-[16px] font-normal">{student.parentName}</p>
              </div>
              <div className="w-[98px] flex justify-center">
                <p className="text-[#0d0d12] text-[16px] font-normal">{student.age}</p>
              </div>
              <div className="flex-1 flex justify-center">
                <StatusBadge status={student.status} />
              </div>
              <div className="w-[140px] flex justify-center">
                <p className="text-[#0d0d12] text-[16px] font-normal">{student.preference}</p>
              </div>
              <div className="flex-1 flex justify-center px-4">
                <p className="text-[#666d80] text-[12px] italic text-center leading-[1.25]">{student.notes}</p>
              </div>
              <div className="w-[110px] flex justify-center relative" data-class-roster-kebab>
                <button
                  type="button"
                  aria-expanded={openKebabId === student.id}
                  aria-haspopup="menu"
                  onClick={() => setOpenKebabId((id) => (id === student.id ? null : student.id))}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <img src={imgWeuiMoreOutlined} alt="More" className="size-[24px]" />
                </button>
                {openKebabId === student.id ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-1 z-[100] min-w-[200px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg"
                  >
                    <Link
                      role="menuitem"
                      href={`/dashboard/students/${student.id}`}
                      className="block w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => setOpenKebabId(null)}
                    >
                      View student profile
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/dashboard/students/${student.id}/schedule`}
                      className="block w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => setOpenKebabId(null)}
                    >
                      View student schedule
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/dashboard/students/${student.id}/roster`}
                      className="block w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => setOpenKebabId(null)}
                    >
                      View student roster
                    </Link>
                    {/* LOCAL-ONLY: View notes uses alert until student_notes API exists */}
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => {
                        window.alert(`${student.studentName}\n\n${student.notes}`);
                        setOpenKebabId(null);
                      }}
                    >
                      View notes
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => advanceStudentStatus(student.id)}
                    >
                      Advance status
                    </button>
                    {classId ? (
                      <Link
                        role="menuitem"
                        href={`/dashboard/classes/core/${classId}`}
                        className="block w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                        onClick={() => setOpenKebabId(null)}
                      >
                        Open class profile
                      </Link>
                    ) : null}
                    {/* LOCAL-ONLY: remove updates client state only */}
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-[#d80509] hover:bg-[#fafafa]"
                      onClick={() => {
                        if (!window.confirm(`Remove ${student.studentName} from this roster view?`)) return;
                        setStudents((prev) => prev.filter((s) => s.id !== student.id));
                        setOpenKebabId(null);
                        setSelectedIds((ids) => {
                          const next = new Set(ids);
                          next.delete(student.id);
                          return next;
                        });
                      }}
                    >
                      Remove from roster
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center w-full pt-[24px] pb-[8px]">
          <div className="flex items-center gap-[12px]">
            <button
              type="button"
              disabled={displayPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="rotate-90 hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <img src={imgChevronDown} alt="Previous" className="size-[18px]" />
            </button>
            <div className="flex items-center gap-[3px]">
              {pageSlice.map((item, idx) =>
                item === "ellipsis" ? (
                  <span key={`e-${idx}`} className="text-[#666d80] px-1 text-[12px] font-semibold">
                    ...
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCurrentPage(item)}
                    className={`size-[24px] rounded-[6px] flex items-center justify-center text-[12px] font-semibold transition-colors ${displayPage === item ? "bg-[#14c1d5] text-white" : "text-[#666d80] hover:bg-gray-100"}`}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              disabled={displayPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="-rotate-90 hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
            >
              <img src={imgChevronDown1} alt="Next" className="size-[18px]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
