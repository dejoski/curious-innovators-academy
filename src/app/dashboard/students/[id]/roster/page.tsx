"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

const imgEllipse2735 = "/images/anna-lee-avatar.png";
const imgEllipse2736 = "/images/mary-lee-avatar.png";
const imgEllipse2737 = "/images/parent-female-dark-hair.png";
const imgEllipse2738 = "/images/parent-female-light-hair.png";
const imgEllipse2739 = "/images/anna-lee-avatar.png";
const imgEllipse2740 = "/images/mary-lee-avatar.png";
const imgGroup = "/images/icon-group.svg";
const imgIcon = "/images/icon-caret-down.svg";
const imgGroup1 = "/images/icon-search.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgIconCaretDown = "/images/icon-caret-down.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";
const imgChevronDown = "/images/icon-chevron-down.svg";
const imgChevronDown1 = "/images/icon-chevron-down2.svg";

const INITIAL_STUDENTS = [
  { id: "1", name: "Anna Lee", parent: "Mr. Lee", age: 14, status: "Pending" as const, avatar: imgEllipse2735, classRef: "Robotics Lab" as const, blockRef: "Block 3" as const, levelRef: "Level 2" as const },
  { id: "2", name: "George Lee", parent: "Mr. Lee", age: 14, status: "Pending" as const, avatar: imgEllipse2736, classRef: "Robotics Lab" as const, blockRef: "Block 3" as const, levelRef: "Level 2" as const },
  { id: "3", name: "Bruna Lee", parent: "Mr. Lee", age: 13, status: "Waitlist" as const, avatar: imgEllipse2737, classRef: "Robotics Lab" as const, blockRef: "Block 3" as const, levelRef: "Level 1" as const },
  { id: "4", name: "James Smith", parent: "Ms. Smith", age: 14, status: "Approved" as const, avatar: imgEllipse2738, classRef: "Math Lab" as const, blockRef: "Block 1" as const, levelRef: "Level 2" as const },
  { id: "5", name: "Bruce Collins", parent: "Ms. Collins", age: 14, status: "Approved" as const, avatar: imgEllipse2739, classRef: "Creative Writing" as const, blockRef: "Block 2" as const, levelRef: "Level 3" as const },
  { id: "6", name: "Maria Collins", parent: "Ms. Collins", age: 13, status: "Approved" as const, avatar: imgEllipse2740, classRef: "Robotics Lab" as const, blockRef: "Block 1" as const, levelRef: "Level 2" as const },
  { id: "7", name: "Nina Park", parent: "Ms. Park", age: 14, status: "Approved" as const, avatar: imgEllipse2738, classRef: "Math Lab" as const, blockRef: "Block 3" as const, levelRef: "Level 2" as const },
  { id: "8", name: "Sam Rivera", parent: "Mr. Rivera", age: 14, status: "Approved" as const, avatar: imgEllipse2739, classRef: "Creative Writing" as const, blockRef: "Block 1" as const, levelRef: "Level 1" as const },
] as const;

const CLASS_OPTIONS = ["Robotics Lab", "Math Lab", "Creative Writing"] as const;
const BLOCK_OPTIONS = ["Block 3", "Block 1", "Block 2"] as const;
const LEVEL_OPTIONS = ["Level 2", "Level 1", "Level 3"] as const;

type SortOption = "None" | "Name A-Z" | "Name Z-A" | "Age ↑" | "Age ↓";

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "Pending") {
    return <span className="bg-[#ffd9d9] border border-[rgba(216,5,9,0.5)] text-[#d80509] text-[10px] px-2 py-0 rounded-[6px]">Pending</span>;
  }
  if (status === "Waitlist") {
    return <span className="bg-[rgba(207,165,0,0.2)] border border-[rgba(207,165,0,0.5)] text-[#cfa500] text-[10px] px-2 py-0 rounded-[6px]">Waitlist</span>;
  }
  if (status === "Approved") {
    return <span className="bg-[rgba(0,77,8,0.2)] border border-[rgba(0,77,8,0.5)] text-[#004d08] text-[10px] px-2 py-0 rounded-[6px]">Approved</span>;
  }
  return null;
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

export default function StudentStudentRoster() {
  const params = useParams();
  const contextStudentId = String(params.id ?? "");

  const [students] = useState(INITIAL_STUDENTS);
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
      const inside =
        Boolean(classDropdownRef.current?.contains(t)) ||
        Boolean(blockDropdownRef.current?.contains(t)) ||
        Boolean(levelDropdownRef.current?.contains(t));
      if (!inside) setOpenDropdown(null);
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(t)) setIsSortOpen(false);
      const el = event.target as HTMLElement | null;
      if (el && !el.closest("[data-student-roster-kebab]")) setOpenKebabId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSorted = useMemo(() => {
    let list = students
      .map((s) => ({ ...s }))
      .filter(
        (s) =>
          s.classRef === selectedClass && s.blockRef === selectedBlock && s.levelRef === selectedLevel
      );
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.parent.toLowerCase().includes(q) ||
          String(s.age).includes(q)
      );
    }
    if (sortOption === "Name A-Z") list.sort((a, b) => a.name.localeCompare(b.name));
    else if (sortOption === "Name Z-A") list.sort((a, b) => b.name.localeCompare(a.name));
    else if (sortOption === "Age ↑") list.sort((a, b) => a.age - b.age);
    else if (sortOption === "Age ↓") list.sort((a, b) => b.age - a.age);
    return list;
  }, [students, searchQuery, sortOption, selectedClass, selectedBlock, selectedLevel]);

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
    const header = ["Student", "Parent", "Age", "Status"].join("\t");
    const lines = filteredSorted.map((s) => [s.name, s.parent, String(s.age), s.status].join("\t"));
    const tsv = [header, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      window.alert(`Copied ${filteredSorted.length} row(s) as TSV. Paste into Numbers or Excel.`);
    } catch {
      window.alert("Clipboard blocked. Here's a one-line preview:\n" + header + "\n" + (lines[0] ?? ""));
    }
  };

  const itemsPerPage = 10;
  const totalPages = Math.max(1, Math.ceil(filteredSorted.length / itemsPerPage));
  const displayPage = Math.min(Math.max(1, currentPage), totalPages);
  const pageButtons = paginationSlice(totalPages, displayPage);

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

  const toggleSelectAllPage = useCallback(() => {
    const pageIds = pageRows.map((r) => r.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) pageIds.forEach((id) => next.delete(id));
      else pageIds.forEach((id) => next.add(id));
      return next;
    });
  }, [pageRows, selectedIds]);

  return (
    <div className="flex flex-col w-full min-h-full gap-8 p-8 font-sans bg-[#fafafa]">
      <div className="flex flex-wrap items-start justify-between gap-4 w-full">
        <div className="flex flex-col gap-2 max-w-[640px]">
          <div className="flex flex-wrap items-center gap-3">
            {contextStudentId ? (
              <>
                <Link
                  href={`/dashboard/students/${contextStudentId}`}
                  className="text-sm font-medium text-[#14c1d5] hover:text-[#12aebd] transition-colors w-fit"
                >
                  ← Back to student profile
                </Link>
                <span className="text-[#e5e5e5]">|</span>
                <Link
                  href={`/dashboard/students/${contextStudentId}/schedule`}
                  className="text-sm font-medium text-[#14c1d5] hover:text-[#12aebd] transition-colors"
                >
                  Schedule (this student)
                </Link>
              </>
            ) : null}
          </div>
          <h1 className="text-[#272932] text-[28px] font-bold leading-[1.1]">Student roster</h1>
          <p className="text-[#666d80] text-[16px] leading-[1.4]">
            Classes and classmates linked to this student’s filters — aligns with organization roster layouts.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void exportSpreadsheet()}
          className="bg-[#d2f1f5] hover:bg-[#bcecf3] transition-colors text-[#14c1d5] text-[16px] font-medium px-4 py-2 rounded-[6px] shadow-sm flex items-center justify-center shrink-0"
        >
          Upload to Spreadsheet
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative" ref={classDropdownRef}>
          <button
            type="button"
            onClick={() => setOpenDropdown((p) => (p === "class" ? null : "class"))}
            className="bg-white flex h-[48px] items-center justify-between overflow-clip px-[12px] py-[8px] rounded-[10px] shadow-[0px_0px_0px_1px_#f0f0f0] w-[260px] cursor-pointer"
          >
            <div className="flex gap-[12px] items-center">
              <img src={imgGroup} alt="Class" className="size-[18px] object-contain" />
              <span className="text-[#0d0d12] text-[16px] font-normal">{selectedClass}</span>
            </div>
            <img
              src={imgIcon}
              className={`size-[20px] object-contain transition-transform ${openDropdown === "class" ? "rotate-0" : "rotate-180"}`}
              alt="chevron"
            />
          </button>
          {openDropdown === "class" && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
              {CLASS_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="w-full px-3 py-2 text-left text-base text-[#0d0d12] hover:bg-[#fafafa]"
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
              <img src={imgGroup} alt="Block" className="size-[18px] object-contain" />
              <span className="text-[#0d0d12] text-[16px] font-normal">{selectedBlock}</span>
            </div>
            <img
              src={imgIcon}
              className={`size-[20px] object-contain transition-transform ${openDropdown === "block" ? "rotate-0" : "rotate-180"}`}
              alt="chevron"
            />
          </button>
          {openDropdown === "block" && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
              {BLOCK_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="w-full px-3 py-2 text-left text-base text-[#0d0d12] hover:bg-[#fafafa]"
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
              <img src={imgGroup} alt="Level" className="size-[18px] object-contain" />
              <span className="text-[#0d0d12] text-[16px] font-normal">{selectedLevel}</span>
            </div>
            <img
              src={imgIcon}
              className={`size-[20px] object-contain transition-transform ${openDropdown === "level" ? "rotate-0" : "rotate-180"}`}
              alt="chevron"
            />
          </button>
          {openDropdown === "level" && (
            <div className="absolute left-0 top-full z-50 mt-1 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
              {LEVEL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  className="w-full px-3 py-2 text-left text-base text-[#0d0d12] hover:bg-[#fafafa]"
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
            <img src={imgGroup1} className="size-[18px] object-contain" alt="" />
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

      <div className="bg-white border border-[#f0f0f0] flex flex-col items-center p-[16px] rounded-[18px] w-full shadow-sm">
        <div className="flex flex-wrap items-center justify-between w-full mb-4 gap-3">
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
                <img src={imgFlowbiteSortOutline} className="size-[14px]" alt="sort" />
                <p className="font-normal text-[#0d0d12] text-[12px]">Sort</p>
                <img src={imgIconCaretDown} className="size-[14px]" alt="caret" />
              </button>
              {isSortOpen && (
                <div className="absolute right-0 top-[calc(100%+4px)] z-50 min-w-[160px] rounded-[8px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
                  {(["None", "Name A-Z", "Name Z-A", "Age ↑", "Age ↓"] as SortOption[]).map((opt) => (
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
                      {opt}
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

        <div className="border-[#f0f0f0] border-y border-solid grid grid-cols-5 items-center py-[16px] px-[10px] w-full text-[#0d0d12] text-[14px] font-semibold">
          <div className="col-span-1 pl-2">Student</div>
          <div className="col-span-1 text-center">Parent</div>
          <div className="col-span-1 text-center">Age</div>
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-1 text-center">Action</div>
        </div>

        <div className="flex flex-col w-full">
          {pageRows.length === 0 ? (
            <p className="py-10 text-center text-[#666d80] text-sm w-full">No students match these filters. Try another class, block, or level.</p>
          ) : null}
          {pageRows.map((student) => (
            <div
              key={student.id}
              className="border-b border-[#f0f0f0] border-solid grid grid-cols-5 items-center min-h-[64px] py-[8px] px-[10px] w-full hover:bg-gray-50 transition-colors last:border-b-0"
            >
              <div className="col-span-1 flex items-center gap-[12px] pl-2">
                <button
                  type="button"
                  aria-pressed={selectedIds.has(student.id)}
                  onClick={() => toggleRow(student.id)}
                  className={`rounded-[4px] size-[14px] shrink-0 border border-[#14c1d5] transition-colors ${selectedIds.has(student.id) ? "bg-[#14c1d5] opacity-100" : "bg-[#d2f1f5] opacity-50"}`}
                />
                <img src={student.avatar} className="size-[32px] rounded-full object-cover" alt={student.name} />
                <span className="text-[16px] text-[#0d0d12] font-normal">{student.name}</span>
              </div>
              <div className="col-span-1 text-center text-[16px] text-[#0d0d12] font-normal">{student.parent}</div>
              <div className="col-span-1 text-center text-[16px] text-[#0d0d12] font-normal">{student.age}</div>
              <div className="col-span-1 flex justify-center">
                <StatusBadge status={student.status} />
              </div>
              <div className="col-span-1 flex justify-center relative" data-student-roster-kebab>
                <button
                  type="button"
                  aria-expanded={openKebabId === student.id}
                  aria-haspopup="menu"
                  onClick={() => setOpenKebabId((id) => (id === student.id ? null : student.id))}
                  className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <img src={imgWeuiMoreOutlined} className="w-6 h-6" alt="more actions" />
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
                      View schedule
                    </Link>
                    <Link
                      role="menuitem"
                      href={`/dashboard/students/${student.id}/roster`}
                      className="block w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => setOpenKebabId(null)}
                    >
                      View student roster
                    </Link>
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
              <img src={imgChevronDown} className="size-[18px]" alt="previous" />
            </button>

            <div className="flex items-center gap-[3px]">
              {pageButtons.map((item, idx) =>
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
              <img src={imgChevronDown1} className="size-[18px]" alt="next" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
