"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardBulkImportModal, type ParsedImportRow } from "@/components/dashboard-bulk-import-modal";
import { readApiError } from "@/lib/client-api-errors";
import { downloadCsv } from "@/lib/client-directory-actions";
import type { DataSource } from "@/lib/data/fetch-source";
import type { ClassRosterStudent, SchoolClassRow, StudentRosterRow, StudentRosterStatus } from "@/lib/data/types";

const imgGroup = "/images/icon-group.svg";
const imgGroup1 = "/images/icon-search.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";

type SortOption = "None" | "Student A-Z" | "Student Z-A" | "Status";

const STATUS_CYCLE: StudentRosterStatus[] = ["Pending", "Waitlist", "Approved"];

function nextStatus(s: StudentRosterStatus): StudentRosterStatus {
  const i = STATUS_CYCLE.indexOf(s);
  return STATUS_CYCLE[(i + 1) % STATUS_CYCLE.length];
}

const STATUS_ORDER: Record<StudentRosterStatus, number> = {
  Pending: 0,
  Waitlist: 1,
  Approved: 2,
};

const StatusBadge = ({ status }: { status: StudentRosterStatus }) => {
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

function mapClassRosterRows(
  classId: string,
  classInfo: SchoolClassRow | null,
  roster: ClassRosterStudent[],
): StudentRosterRow[] {
  return roster.map((student) => ({
    id: student.id,
    name: student.name,
    parent: student.parent,
    age: student.age,
    status: student.status === "Approved" ? "Approved" : student.status === "Rejected" || student.status === "Waitlisted" ? "Waitlist" : "Pending",
    avatar: "/images/avatars/student-1.png",
    classId,
    classRef: classInfo?.name ?? "Selected class",
    blockRef: classInfo?.block || "Unassigned block",
    levelRef: student.level || classInfo?.level || "Unassigned level",
    preference: "—",
    notes: student.description,
  }));
}

export default function StudentClassRoster() {
  const params = useParams<{ id: string }>();
  const classId = params.id ?? "";

  const [students, setStudents] = useState<StudentRosterRow[]>([]);
  const [source, setSource] = useState<DataSource>("unavailable");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedBlock, setSelectedBlock] = useState("");
  const [selectedLevel, setSelectedLevel] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("None");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [actionHint, setActionHint] = useState<string | null>(null);
  const [notePreview, setNotePreview] = useState<{ student: string; notes: string } | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null);

  const [openDropdown, setOpenDropdown] = useState<"class" | "block" | "level" | null>(null);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [openKebabId, setOpenKebabId] = useState<string | null>(null);
  const classDropdownRef = useRef<HTMLDivElement>(null);
  const blockDropdownRef = useRef<HTMLDivElement>(null);
  const levelDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadRoster() {
      setIsLoading(true);
      try {
        const [classesRes, rosterRes] = await Promise.all([
          fetch("/api/data/classes", { cache: "no-store" }),
          fetch(`/api/data/classes/${encodeURIComponent(classId)}/roster`, { cache: "no-store" }),
        ]);
        if (!classesRes.ok || !rosterRes.ok) throw new Error("Class roster API failed");
        const classesPayload = (await classesRes.json()) as { classes?: SchoolClassRow[] };
        const rosterPayload = (await rosterRes.json()) as { students?: ClassRosterStudent[]; source?: DataSource };
        if (cancelled) return;
        const classRows = Array.isArray(classesPayload.classes) ? classesPayload.classes : [];
        const classInfo = classRows.find((row) => row.id === classId) ?? null;
        setStudents(mapClassRosterRows(classId, classInfo, Array.isArray(rosterPayload.students) ? rosterPayload.students : []));
        setSource(rosterPayload.source ?? "unavailable");
      } catch {
        if (!cancelled) {
          setStudents([]);
          setSource("unavailable");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadRoster();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const classOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.classRef).filter(Boolean))),
    [students],
  );
  const blockOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.blockRef).filter(Boolean))),
    [students],
  );
  const levelOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.levelRef).filter(Boolean))),
    [students],
  );

  useEffect(() => {
    if (!selectedClass && classOptions.length > 0) setSelectedClass(classOptions[0]);
    else if (selectedClass && classOptions.length > 0 && !classOptions.includes(selectedClass)) setSelectedClass(classOptions[0]);
  }, [classOptions, selectedClass]);

  useEffect(() => {
    if (!selectedBlock && blockOptions.length > 0) setSelectedBlock(blockOptions[0]);
    else if (selectedBlock && blockOptions.length > 0 && !blockOptions.includes(selectedBlock)) setSelectedBlock(blockOptions[0]);
  }, [blockOptions, selectedBlock]);

  useEffect(() => {
    if (!selectedLevel && levelOptions.length > 0) setSelectedLevel(levelOptions[0]);
    else if (selectedLevel && levelOptions.length > 0 && !levelOptions.includes(selectedLevel)) setSelectedLevel(levelOptions[0]);
  }, [levelOptions, selectedLevel]);

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
          s.name.toLowerCase().includes(q) ||
          s.parent.toLowerCase().includes(q) ||
          s.notes.toLowerCase().includes(q)
      );
    }
    if (sortOption === "Student A-Z") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "Student Z-A") {
      list = [...list].sort((a, b) => b.name.localeCompare(a.name));
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

  const advanceStudentStatus = useCallback(async (id: string) => {
    const current = students.find((student) => student.id === id);
    if (!current) return;
    const status = nextStatus(current.status);
    if (source === "remote") {
      const res = await fetch(`/api/data/classes/${encodeURIComponent(classId)}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: id, status: status === "Waitlist" ? "Waitlisted" : status }),
      });
      if (!res.ok) {
        setActionHint("Could not update enrollment status. Check your permissions and try again.");
        return;
      }
    }
    setStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status } : s)),
    );
    setActionHint("Enrollment status updated.");
    setOpenKebabId(null);
  }, [classId, source, students]);

  const toggleSelectAllPage = useCallback(() => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(pageRows.map((row) => row.id)));
  }, [pageRows, selectedIds.size]);

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

  const dataHint =
    source === "fallback"
      ? "Showing a starter roster while class records finish loading."
      : source === "unavailable"
        ? "Class roster records are temporarily unavailable."
        : "";

  const exportSpreadsheet = async () => {
    const header = ["Student", "Parent", "Age", "Status", "Preference", "Notes"].join("\t");
    const lines = filteredSorted.map((s) =>
      [s.name, s.parent, String(s.age), s.status, s.preference, s.notes.replace(/\t/g, " ")].join("\t"),
    );
    const tsv = [header, ...lines].join("\n");
    try {
      await navigator.clipboard.writeText(tsv);
      setActionHint(`Copied ${filteredSorted.length} row(s) as TSV.`);
    } catch {
      const url = URL.createObjectURL(new Blob([tsv], { type: "text/tab-separated-values;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `class-roster-${classId || "export"}.tsv`;
      a.click();
      URL.revokeObjectURL(url);
      setActionHint("Clipboard was blocked, so a TSV file was downloaded.");
    }
  };

  const exportSelectedSpreadsheet = async () => {
    const selected = filteredSorted.filter((student) => selectedIds.has(student.id));
    downloadCsv(
      `class-roster-selected-${classId || "export"}.csv`,
      ["Student", "Parent", "Age", "Status", "Preference", "Notes"],
      selected.map((s) => [s.name, s.parent, s.age, s.status, s.preference, s.notes]),
    );
    setActionHint(`Downloaded ${selected.length} selected row(s) as CSV.`);
  };

  const importRosterRows = async (rows: ParsedImportRow[]) => {
    const created: StudentRosterRow[] = [];
    const errors: string[] = [];
    for (const row of rows) {
      const res = await fetch(`/api/data/classes/${encodeURIComponent(classId)}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.values.name,
          parent: row.values.parent,
          age: row.values.age,
          level: row.values.level,
          status: row.values.status,
          description: row.values.description,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { student?: ClassRosterStudent };
        if (body.student) created.push(...mapClassRosterRows(classId, null, [body.student]));
      } else {
        errors.push(`Row ${row.rowNumber}: ${await readApiError(res)}`);
      }
    }
    if (created.length > 0) {
      setStudents((prev) => [...prev, ...created]);
      setActionHint(`Imported ${created.length} roster row(s).`);
    }
    return { created: created.length, errors };
  };

  const removeStudentFromRoster = async (studentId: string) => {
    const student = students.find((row) => row.id === studentId);
    if (!student) return;
    if (source === "remote") {
      const res = await fetch(
        `/api/data/classes/${encodeURIComponent(classId)}/roster?studentId=${encodeURIComponent(student.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setActionHint("Could not remove this enrollment. Check your permissions and try again.");
        setRemoveConfirm(null);
        return;
      }
    }
    setStudents((prev) => prev.filter((s) => s.id !== student.id));
    setOpenKebabId(null);
    setSelectedIds((ids) => {
      const next = new Set(ids);
      next.delete(student.id);
      return next;
    });
    setRemoveConfirm(null);
    setActionHint("Enrollment removed.");
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
            Approvals and seat status for this class.
          </p>
          {dataHint ? <p className="text-xs text-[#6b7280]">{dataHint}</p> : null}
          {actionHint ? <p className="text-xs font-medium text-[#004d08]">{actionHint}</p> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void exportSpreadsheet()}
            className="bg-[#d2f1f5] hover:bg-[#bcecf3] transition-colors text-[#14c1d5] text-[16px] font-medium px-4 py-2 rounded-[6px] shadow-sm flex items-center justify-center"
          >
            Copy TSV
          </button>
          <button
            type="button"
            onClick={() => setIsImportOpen(true)}
            className="rounded-[6px] border border-[#14c1d5]/40 bg-white px-4 py-2 text-[16px] font-semibold text-[#14c1d5] shadow-sm transition-colors hover:bg-[#ecfdff]"
          >
            Bulk import CSV
          </button>
        </div>
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
                <p className="font-normal text-[#0d0d12] text-[16px]">{selectedClass || "No classes"}</p>
              </div>
              <ChevronDown className={`size-[20px] shrink-0 text-[#666d80] transition-transform ${openDropdown === "class" ? "rotate-180" : ""}`} aria-hidden strokeWidth={1.8} />
            </button>
            {openDropdown === "class" && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
                {classOptions.map((opt) => (
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
              <ChevronDown className={`size-[20px] shrink-0 text-[#666d80] transition-transform ${openDropdown === "block" ? "rotate-180" : ""}`} aria-hidden strokeWidth={1.8} />
            </button>
            {openDropdown === "block" && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
                {blockOptions.map((opt) => (
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
              <ChevronDown className={`size-[20px] shrink-0 text-[#666d80] transition-transform ${openDropdown === "level" ? "rotate-180" : ""}`} aria-hidden strokeWidth={1.8} />
            </button>
            {openDropdown === "level" && (
              <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[260px] rounded-[10px] border border-[#f0f0f0] bg-white py-1 shadow-lg">
                {levelOptions.map((opt) => (
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
                <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
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
              <p className="font-normal text-[#0d0d12] text-[12px]">
                {selectedIds.size > 0 ? `Clear selected (${selectedIds.size})` : "Select visible"}
              </p>
            </button>
          </div>
        </div>

        {selectedIds.size > 0 ? (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#14c1d5]/35 bg-[#ecfdff] px-4 py-3 text-sm text-[#155e66]">
            <span className="font-semibold">{selectedIds.size} student{selectedIds.size === 1 ? "" : "s"} selected</span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void exportSelectedSpreadsheet()}
                className="rounded-md bg-[#14c1d5] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#11adbf]"
              >
                Download selected CSV
              </button>
              <button
                type="button"
                onClick={() => setSelectedIds(new Set())}
                className="rounded-[6px] bg-white/80 px-3 py-1.5 text-[12px] font-semibold text-[#155e66] ring-1 ring-[#14c1d5]/25 hover:bg-white"
              >
                Clear selection
              </button>
            </div>
          </div>
        ) : null}

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
          {isLoading ? (
            <p className="py-10 text-center text-[#666d80] text-sm w-full">Loading roster...</p>
          ) : null}
          {!isLoading && pageRows.length === 0 ? (
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
                  <img src={student.avatar} alt={student.name} className="size-[32px] rounded-full object-cover" />
                  <p className="text-[#0d0d12] text-[16px] font-normal">{student.name}</p>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[#0d0d12] text-[16px] font-normal">{student.parent}</p>
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
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => {
                        setNotePreview({ student: student.name, notes: student.notes || "No notes recorded." });
                        setOpenKebabId(null);
                      }}
                    >
                      View notes
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-[#0d0d12] hover:bg-[#fafafa]"
                      onClick={() => void advanceStudentStatus(student.id)}
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
                    <button
                      type="button"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm text-[#d80509] hover:bg-[#fafafa]"
                      onClick={() => {
                        setOpenKebabId(null);
                        setRemoveConfirm({ id: student.id, name: student.name });
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
              className="hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Previous page"
            >
              <ChevronLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
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
              className="hover:bg-gray-100 p-1 rounded transition-colors disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Next page"
            >
              <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
            </button>
          </div>
        </div>
      </div>
      {removeConfirm ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#e8e9ed] bg-white p-5 shadow-xl">
            <h2 className="mb-2 text-[18px] font-semibold text-[#272932]">Remove enrollment</h2>
            <p className="mb-5 text-sm leading-6 text-[#666d80]">
              Remove {removeConfirm.name} from this roster view?
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-[#666d80] hover:bg-[#f5f6f8]"
                onClick={() => setRemoveConfirm(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#d80509] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b90408]"
                onClick={() => void removeStudentFromRoster(removeConfirm.id)}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {notePreview ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-[12px] border border-[#e8e9ed] bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-[18px] font-semibold text-[#272932]">{notePreview.student}</h2>
                <p className="text-sm text-[#666d80]">Roster notes</p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-[#666d80] hover:bg-[#f5f6f8]"
                onClick={() => setNotePreview(null)}
              >
                Close
              </button>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-6 text-[#0d0d12]">{notePreview.notes}</p>
          </div>
        </div>
      ) : null}
      <DashboardBulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk import roster rows"
        entityLabel="student"
        filename="class-roster-import-template.csv"
        columns={[
          { key: "name", label: "Name", required: true, sample: "New Student" },
          { key: "parent", label: "Parent", sample: "Parent Name" },
          { key: "age", label: "Age", sample: "14" },
          { key: "level", label: "Level", sample: "3" },
          { key: "status", label: "Status", sample: "Pending" },
          { key: "description", label: "Description", sample: "Optional roster note" },
        ]}
        onImport={importRosterRows}
      />
    </div>
  );
}
