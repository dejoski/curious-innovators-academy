"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronLeft, ChevronRight, X } from "lucide-react";
import { DashboardBulkImportModal, type ParsedImportRow } from "@/components/dashboard-bulk-import-modal";
import { DashboardBulkSelectionBar } from "@/components/dashboard-row-actions";
import { ClassAddExistingStudentModal } from "@/components/class-add-existing-student-modal";
import { useFixedMenuPlacement } from "@/hooks/use-fixed-menu-placement";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData, studentDetailDataUrls } from "@/lib/client-data-cache";
import { downloadCsv } from "@/lib/client-directory-actions";
import type {
  ClassRosterStatus,
  ClassRosterStudent,
  SchoolClassRow,
} from "@/lib/data/types";

const imgGroup1 = "/images/icon-group.svg";
const imgGroup2 = "/images/icon-generic2.svg";
const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector = "/images/vector.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgIcRoundPlus = "/images/icon-plus.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";

type Status = ClassRosterStatus;

type SortOption = "None" | "Name A-Z" | "Name Z-A" | "Age Low-High" | "Age High-Low";

type Student = ClassRosterStudent;

type ClassMeta = {
  title: string;
  description: string;
  teacher: string;
  blockLevel: string;
  schedule: string;
  capacityEnrolled: number;
  capacityMax: number;
};

const EMPTY_CLASS_META: ClassMeta = {
  title: "Class",
  description: "Loading class details.",
  teacher: "Teacher not assigned",
  blockLevel: "Block not set",
  schedule: "Schedule not set",
  capacityEnrolled: 0,
  capacityMax: 1,
};

function parseCapacity(label: string): { enrolled: number; max: number } {
  const match = /^(\d+)\s*\/\s*(\d+)$/.exec(label.trim());
  if (!match) return { enrolled: 0, max: 1 };
  return {
    enrolled: Number(match[1]) || 0,
    max: Math.max(1, Number(match[2]) || 1),
  };
}

function classMetaFromRow(row: SchoolClassRow): ClassMeta {
  const capacity = parseCapacity(row.students);
  return {
    title: row.name,
    description:
      row.description ||
      `${row.name} roster and class setup details are loaded from the class data source.`,
    teacher: row.teacher || "Teacher not assigned",
    blockLevel: [row.block, row.level ? `L${row.level}` : ""].filter(Boolean).join(" ") || "Block not set",
    schedule: row.schedule || "Schedule not set",
    capacityEnrolled: capacity.enrolled,
    capacityMax: capacity.max,
  };
}

function splitBlockLevelLabel(label: string): { block: string; level: string } {
  const trimmed = label.trim();
  const levelMatch = /\bL\s*([A-Za-z0-9-]+)\b/i.exec(trimmed);
  if (!levelMatch) return { block: trimmed, level: "" };
  return {
    block: trimmed.replace(levelMatch[0], "").trim(),
    level: levelMatch[1],
  };
}

export default function ClassDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const classId = typeof params?.id === "string" ? params.id : "";
  const [students, setStudents] = useState<Student[]>([]);
  const [classMeta, setClassMeta] = useState<ClassMeta>(EMPTY_CLASS_META);
  const [classMetaDraft, setClassMetaDraft] = useState<ClassMeta>(EMPTY_CLASS_META);
  const [dataHint, setDataHint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | Status>("All");
  const [sortOption, setSortOption] = useState<SortOption>("None");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);
  
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isRemoveClassModalOpen, setIsRemoveClassModalOpen] = useState(false);
  const [editStudentDraft, setEditStudentDraft] = useState<Student | null>(null);
  const [classEditError, setClassEditError] = useState<string | null>(null);
  const [deleteClassError, setDeleteClassError] = useState<string | null>(null);
  const [editStudentError, setEditStudentError] = useState<string | null>(null);
  const [rowActionError, setRowActionError] = useState<string | null>(null);
  const [isSavingClassMeta, setIsSavingClassMeta] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  const itemsPerPage = 10;

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const actionAnchorRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuPlacement = useFixedMenuPlacement(openActionDropdownId !== null, actionAnchorRef, 140);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    async function loadClassData() {
      try {
        const [classesRes, rosterRes] = await Promise.all([
          fetch("/api/data/classes", { cache: "no-store" }),
          fetch(`/api/data/classes/${encodeURIComponent(classId)}/roster`, { cache: "no-store" }),
        ]);
        if (!classesRes.ok) throw new Error(classesRes.statusText);
        if (!rosterRes.ok) throw new Error(rosterRes.statusText);
        const classesBody = (await classesRes.json()) as {
          classes?: SchoolClassRow[];
          source?: string;
        };
        const rosterBody = (await rosterRes.json()) as {
          students?: ClassRosterStudent[];
          source?: string;
        };
        if (cancelled) return;
        const row = (classesBody.classes ?? []).find((item) => item.id === classId);
        if (row) {
          const nextMeta = classMetaFromRow(row);
          setClassMeta(nextMeta);
          setClassMetaDraft(nextMeta);
        }
        setStudents(rosterBody.students ?? []);
        setCurrentPage(1);
        const source = rosterBody.source === "unavailable" || classesBody.source === "unavailable"
          ? "unavailable"
          : rosterBody.source === "fallback" || classesBody.source === "fallback"
            ? "fallback"
            : "remote";
        setDataHint(
          source === "fallback"
            ? "Showing a starter roster while class records finish loading."
            : source === "unavailable"
              ? "Class records are temporarily unavailable."
              : null,
        );
      } catch (error) {
        if (!cancelled) {
          setStudents([]);
          setDataHint(
            `Could not load class roster: ${
              error instanceof Error ? error.message : String(error)
            }.`,
          );
        }
      }
    }
    loadClassData();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  // Click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortDropdownOpen(false);
      }
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setOpenActionDropdownId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    // Search
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (s) => s.name.toLowerCase().includes(lowerQuery) || s.parent.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter
    if (filterStatus !== "All") {
      result = result.filter((s) => s.status === filterStatus);
    }

    // Sort
    if (sortOption === "Name A-Z") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "Name Z-A") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortOption === "Age Low-High") {
      result.sort((a, b) => a.age - b.age);
    } else if (sortOption === "Age High-Low") {
      result.sort((a, b) => b.age - a.age);
    }

    return result;
  }, [students, searchQuery, filterStatus, sortOption]);

  const totalPages = Math.ceil(filteredAndSortedStudents.length / itemsPerPage) || 1;
  const displayPage = Math.min(Math.max(1, currentPage), totalPages);
  const currentStudents = filteredAndSortedStudents.slice(
    (displayPage - 1) * itemsPerPage,
    displayPage * itemsPerPage
  );
  const selectedStudents = useMemo(
    () => students.filter((student) => selectedRows.includes(student.id)),
    [students, selectedRows],
  );

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length > 0) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentStudents.map((s) => s.id));
    }
  };

  const exportSelectedStudents = () => {
    downloadCsv(
      `${classMeta.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "class"}-selected-students.csv`,
      ["Student", "Parent", "Age", "Level", "Status", "Description"],
      selectedStudents.map((student) => [
        student.name,
        student.parent,
        student.age,
        student.level,
        student.status,
        student.description,
      ]),
    );
  };

  const importRosterRows = async (rows: ParsedImportRow[]) => {
    const created: Student[] = [];
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
        const body = (await res.json()) as { student?: Student };
        if (body.student) created.push(body.student);
      } else {
        errors.push(`Row ${row.rowNumber}: ${await readApiError(res)}`);
      }
    }
    if (created.length > 0) {
      setStudents((prev) => [...prev, ...created]);
      setDataHint(`Imported ${created.length} roster row(s).`);
    }
    return { created: created.length, errors };
  };

  const getStatusStyles = (status: Status) => {
    switch (status) {
      case "Approved":
        return "bg-green-900/20 text-green-900 border-green-900/50";
      case "Pending":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/50";
      case "Waitlisted":
        return "bg-[#fff8e6] text-[#7a5b00] border-[#cfa500]/50";
      case "Rejected":
        return "bg-red-100 text-red-600 border-red-600/50";
      default:
        return "";
    }
  };

  const capacityFillPercent = useMemo(() => {
    const max = Math.max(1, classMeta.capacityMax);
    return Math.min(100, Math.max(0, (classMeta.capacityEnrolled / max) * 100));
  }, [classMeta.capacityEnrolled, classMeta.capacityMax]);

  const openEditInfo = () => {
    setClassMetaDraft(classMeta);
    setClassEditError(null);
    setIsEditInfoModalOpen(true);
  };

  const saveClassMeta = async () => {
    const max = classMetaDraft.capacityMax <= 0 ? 1 : classMetaDraft.capacityMax;
    const enrolled = Math.min(Math.max(0, classMetaDraft.capacityEnrolled), max);
    const { block, level } = splitBlockLevelLabel(classMetaDraft.blockLevel);
    setClassEditError(null);
    setIsSavingClassMeta(true);
    try {
      const res = await fetch("/api/data/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: classId,
          name: classMetaDraft.title,
          teacher: classMetaDraft.teacher,
          students: `${enrolled}/${max}`,
          schedule: classMetaDraft.schedule,
          status: "Active",
          track: "core",
          description: classMetaDraft.description,
          block,
          level,
        }),
      });
      if (!res.ok) {
        setClassEditError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { class?: SchoolClassRow };
      const nextMeta = body.class ? classMetaFromRow(body.class) : { ...classMetaDraft, capacityMax: max, capacityEnrolled: enrolled };
      setClassMeta(nextMeta);
      setClassMetaDraft(nextMeta);
      setIsEditInfoModalOpen(false);
    } catch (error) {
      setClassEditError(error instanceof Error ? error.message : "Class could not be saved.");
    } finally {
      setIsSavingClassMeta(false);
    }
  };

  const submitAddStudent = async (input: { studentId: string; status: Exclude<Status, "Pending"> }) => {
    if (!input.studentId) return;
    try {
      const res = await fetch(`/api/data/classes/${encodeURIComponent(classId)}/roster`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: input.studentId,
          status: input.status,
        }),
      });
      if (!res.ok) {
        throw new Error(await readApiError(res));
      }
      const body = (await res.json()) as { student?: Student };
      if (!body.student) {
        throw new Error("Student could not be added to this class.");
      }
      setStudents((prev) => [...prev, body.student as Student]);
      invalidateDashboardData([
        `/api/data/classes/${encodeURIComponent(classId)}/roster`,
        "/api/data/students",
        "/api/data/classes",
        "/api/data/class-options",
        "/api/dashboard-presentation",
        ...studentDetailDataUrls(input.studentId),
      ]);
      setIsAddStudentModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Student could not be added to this class.";
      throw new Error(message);
    }
  };

  const removeStudentById = async (id: string) => {
    setRowActionError(null);
    setOpenActionDropdownId(null);
    try {
      const res = await fetch(
        `/api/data/classes/${encodeURIComponent(classId)}/roster?studentId=${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setRowActionError(await readApiError(res));
        return;
      }
      setStudents((prev) => prev.filter((s) => s.id !== id));
      setSelectedRows((rows) => rows.filter((r) => r !== id));
    } catch (error) {
      setRowActionError(error instanceof Error ? error.message : "Student could not be removed.");
    }
  };

  const saveEditedStudent = async () => {
    if (!editStudentDraft) return;
    setEditStudentError(null);
    setIsSavingStudent(true);
    try {
      const res = await fetch(`/api/data/classes/${encodeURIComponent(classId)}/roster`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: editStudentDraft.id,
          name: editStudentDraft.name,
          parent: editStudentDraft.parent,
          age: editStudentDraft.age,
          level: editStudentDraft.level,
          status: editStudentDraft.status,
          description: editStudentDraft.description,
        }),
      });
      if (!res.ok) {
        setEditStudentError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { student?: Student };
      const saved = body.student ?? editStudentDraft;
      setStudents((prev) => prev.map((s) => (s.id === saved.id ? saved : s)));
      setEditStudentDraft(null);
    } catch (error) {
      setEditStudentError(error instanceof Error ? error.message : "Student enrollment could not be saved.");
    } finally {
      setIsSavingStudent(false);
    }
  };

  const removeClass = async () => {
    setDeleteClassError(null);
    setIsDeletingClass(true);
    try {
      const res = await fetch(`/api/data/classes?id=${encodeURIComponent(classId)}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteClassError(await readApiError(res));
        return;
      }
      setIsRemoveClassModalOpen(false);
      router.push("/dashboard/classes");
    } catch (error) {
      setDeleteClassError(error instanceof Error ? error.message : "Class could not be removed.");
    } finally {
      setIsDeletingClass(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-8 w-full max-w-[1200px] mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/classes" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4">
            <ArrowLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
            <span className="text-sm font-medium">Back to class setup</span>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">{classMeta.title}</h1>
          <p className="text-gray-500 text-base">{classMeta.description}</p>
        </div>
        
        <div className="flex gap-4">
          <Link 
            href="/dashboard/classes/requests"
            className="h-[42px] px-4 rounded-md flex items-center justify-center bg-cyan-500 text-white font-semibold text-base hover:bg-cyan-600 transition-colors"
          >
            Review Requests
          </Link>
          <button 
            type="button"
            onClick={openEditInfo}
            className="h-[42px] px-4 rounded-md bg-cyan-50 text-cyan-500 font-semibold text-base hover:bg-cyan-100 transition-colors"
          >
            Edit Info
          </button>
          <button 
            type="button"
            onClick={() => setIsRemoveClassModalOpen(true)}
            className="h-[42px] px-4 rounded-md bg-red-50 text-red-600 font-medium text-base hover:bg-red-100 transition-colors"
          >
            Remove Class
          </button>
        </div>
      </div>

      {dataHint && (
        <div className="rounded-lg border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
          {dataHint}
        </div>
      )}
      {rowActionError && (
        <div role="alert" className="rounded-lg border border-[#f6c8c8] bg-[#fff1f1] px-4 py-2 text-sm text-[#8c1f1f]">
          {rowActionError}
        </div>
      )}

      {/* Info Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Teacher Card */}
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
             <div className="relative w-5 h-5">
               <Image src={imgGroup1} alt="Teacher" fill />
             </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-900">Teacher</span>
            <span className="text-sm font-medium text-gray-500">{classMeta.teacher}</span>
          </div>
        </div>

        {/* Level Card */}
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
             <div className="relative w-5 h-5">
               <Image src={imgGroup1} alt="Level" fill />
             </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-900">Block & Class Level</span>
            <span className="text-sm font-medium text-gray-500">{classMeta.blockLevel}</span>
          </div>
        </div>

        {/* Schedule Card */}
        <div className="flex items-center gap-4 p-4 bg-white border border-gray-200 rounded-2xl">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center shrink-0">
            <div className="relative w-5 h-5">
               <Image src={imgGroup2} alt="Schedule" fill />
             </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-gray-900">Schedule</span>
            <span className="text-sm font-medium text-gray-500">{classMeta.schedule}</span>
          </div>
        </div>

        {/* Capacity Card */}
        <div className="flex items-center p-4 bg-white border border-gray-200 rounded-2xl">
          <div className="flex flex-col gap-2 w-full">
            <span className="text-sm font-semibold text-gray-900">Capacity</span>
            <div className="flex items-center justify-between gap-4 w-full">
              <div className="flex-1 h-2 bg-green-900/20 rounded-full overflow-hidden relative">
                <div
                  className="absolute top-0 left-0 h-full bg-green-900 rounded-full transition-[width] duration-200"
                  style={{ width: `${capacityFillPercent}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-500 whitespace-nowrap">
                {classMeta.capacityEnrolled}/{classMeta.capacityMax}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enrolled Students Section */}
      <div className="flex flex-col gap-4 mt-4">
        <h2 className="text-2xl font-bold text-gray-900">Enrolled Students</h2>
        
        <div className="flex flex-col bg-white border border-gray-200 rounded-2xl p-4 gap-4 overflow-visible">
          {/* Table Toolbar */}
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 w-64">
               <div className="relative w-3.5 h-3.5 shrink-0">
                   <Image src={imgMaterialSymbolsSearch} alt="Search" fill />
               </div>
               <input 
                 type="text" 
                 placeholder="Search by name or parent..." 
                 className="bg-transparent border-none outline-none text-sm w-full text-gray-900 placeholder-gray-500"
                 value={searchQuery}
                 onChange={(e) => {
                   setSearchQuery(e.target.value);
                   setCurrentPage(1);
                 }}
               />
            </div>
            
            <div className="flex items-center gap-4">
              <div className="relative" ref={filterRef}>
                <button 
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="relative w-3.5 h-3.5"><Image src={imgVector} alt="Filter" fill /></div>
                  <span className="text-xs">Filter by: {filterStatus}</span>
                  <ChevronDown className="size-3.5 shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
                </button>
                {isFilterDropdownOpen && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[100] w-32">
                    {["All", "Approved", "Pending", "Waitlisted", "Rejected"].map((status) => (
                      <button
                        key={status}
                        onClick={() => { setFilterStatus(status as Status); setIsFilterDropdownOpen(false); setCurrentPage(1); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="relative" ref={sortRef}>
                <button 
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="relative w-3.5 h-3.5"><Image src={imgFlowbiteSortOutline} alt="Sort" fill /></div>
                  <span className="text-xs">Sort: {sortOption === "None" ? "" : sortOption}</span>
                  <ChevronDown className="size-3.5 shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
                </button>
                {isSortDropdownOpen && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[100] w-40">
                    {["None", "Name A-Z", "Name Z-A", "Age Low-High", "Age High-Low"].map((opt) => (
                      <button
                        key={opt}
                        onClick={() => {
                          setSortOption(opt as SortOption);
                          setIsSortDropdownOpen(false);
                          setCurrentPage(1);
                        }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                onClick={toggleSelectAll}
                className="px-3 py-2 bg-gray-50 rounded-lg text-xs hover:bg-gray-100 transition-colors"
              >
                {selectedRows.length > 0 ? `Clear selected (${selectedRows.length})` : "Select visible"}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setIsAddStudentModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold text-sm hover:bg-cyan-600 transition-colors shadow-sm"
              >
                <div className="relative w-6 h-6"><Image src={imgIcRoundPlus} alt="Add" fill /></div>
                Add Student
              </button>
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="rounded-lg border border-[#14c1d5]/40 bg-white px-4 py-2 text-sm font-semibold text-[#14c1d5] transition-colors hover:bg-[#ecfdff]"
              >
                Bulk import CSV
              </button>
            </div>
          </div>

          <DashboardBulkSelectionBar count={selectedRows.length} noun="student" onClear={() => setSelectedRows([])}>
            <button
              type="button"
              onClick={exportSelectedStudents}
              className="rounded-md bg-[#14c1d5] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#11adbf]"
            >
              Download selected CSV
            </button>
          </DashboardBulkSelectionBar>

          {/* Table Content */}
          <div className="w-full min-w-0 overflow-x-auto pb-2 min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-3 px-4 text-sm font-semibold text-gray-900">Student Name</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-900">Parent</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-900 text-center">Age</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-900 text-center">Student Level</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-900 text-center">Request Status</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-900">Description</th>
                  <th className="py-3 px-4 text-sm font-semibold text-gray-900 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {currentStudents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-500">
                      No students found.
                    </td>
                  </tr>
                ) : (
                  currentStudents.map((student) => (
                    <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleRowSelection(student.id)}
                            className={`w-3.5 h-3.5 rounded flex items-center justify-center border ${
                              selectedRows.includes(student.id) 
                                ? 'bg-cyan-500 border-cyan-500' 
                                : 'bg-cyan-100 border-cyan-500 opacity-50'
                            }`}
                          >
                            {selectedRows.includes(student.id) && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className="text-base text-gray-900">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-base text-gray-900">{student.parent}</td>
                      <td className="py-3 px-4 text-base text-gray-900 text-center">{student.age} years</td>
                      <td className="py-3 px-4 text-base text-gray-900 text-center">{student.level}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] border ${getStatusStyles(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-base text-gray-500 max-w-[250px] truncate">
                        {student.description}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div
                          className="relative inline-flex items-center justify-center"
                          ref={openActionDropdownId === student.id ? actionRef : null}
                        >
                        <button 
                          ref={openActionDropdownId === student.id ? actionAnchorRef : null}
                          onClick={() => setOpenActionDropdownId(openActionDropdownId === student.id ? null : student.id)}
                          className="relative w-6 h-6 mx-auto hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center"
                        >
                          <Image src={imgWeuiMoreOutlined} alt="More" fill />
                        </button>
                        {openActionDropdownId === student.id && actionMenuPlacement && (
                          <div
                            className="fixed z-[100] min-w-[140px] bg-white border border-gray-200 rounded-lg shadow-lg py-1"
                            style={{
                              top: actionMenuPlacement.top,
                              left: actionMenuPlacement.left,
                            }}
                          >
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50"
                              onClick={() => {
                                setEditStudentError(null);
                                setEditStudentDraft({ ...student });
                                setOpenActionDropdownId(null);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              onClick={() => void removeStudentById(student.id)}
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-center mt-4 pb-2">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={displayPage === 1}
                className="w-4 h-4 disabled:opacity-20 hover:opacity-70 transition-opacity"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" aria-hidden strokeWidth={1.8} />
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button 
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-semibold flex items-center justify-center transition-colors ${
                      displayPage === pageNum 
                        ? 'bg-cyan-500 text-white' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}
              </div>
              
              <button 
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={displayPage === totalPages}
                className="w-4 h-4 disabled:opacity-20 hover:opacity-70 transition-opacity"
                aria-label="Next page"
              >
                <ChevronRight className="size-4" aria-hidden strokeWidth={1.8} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <ClassAddExistingStudentModal
        open={isAddStudentModalOpen}
        existingStudentIds={students.map((student) => student.id)}
        classNameLabel={classMeta.title}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSubmit={submitAddStudent}
      />
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

      {isEditInfoModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" role="dialog" aria-modal="true">
          <div className="bg-white p-6 rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setIsEditInfoModalOpen(false)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2 pr-8">Edit Class Info</h3>
            <p className="text-sm text-gray-500 mb-4">Save writes this class record through the data API.</p>
            {classEditError ? (
              <div role="alert" className="mb-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {classEditError}
              </div>
            ) : null}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-gray-600">
                Title
                <input
                  value={classMetaDraft.title}
                  onChange={(e) => setClassMetaDraft((d) => ({ ...d, title: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-gray-600">
                Description
                <textarea
                  value={classMetaDraft.description}
                  onChange={(e) => setClassMetaDraft((d) => ({ ...d, description: e.target.value }))}
                  rows={3}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
                />
              </label>
              <label className="text-xs font-semibold text-gray-600">
                Teacher
                <input
                  value={classMetaDraft.teacher}
                  onChange={(e) => setClassMetaDraft((d) => ({ ...d, teacher: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-gray-600">
                Block & level
                <input
                  value={classMetaDraft.blockLevel}
                  onChange={(e) => setClassMetaDraft((d) => ({ ...d, blockLevel: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <label className="text-xs font-semibold text-gray-600">
                Schedule
                <input
                  value={classMetaDraft.schedule}
                  onChange={(e) => setClassMetaDraft((d) => ({ ...d, schedule: e.target.value }))}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </label>
              <div className="flex gap-3">
                <label className="text-xs font-semibold text-gray-600 flex-1">
                  Enrolled
                  <input
                    type="number"
                    min={0}
                    value={String(classMetaDraft.capacityEnrolled)}
                    onChange={(e) =>
                      setClassMetaDraft((d) => ({
                        ...d,
                        capacityEnrolled: Number.parseInt(e.target.value, 10) || 0,
                      }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-xs font-semibold text-gray-600 flex-1">
                  Max seats
                  <input
                    type="number"
                    min={1}
                    value={String(classMetaDraft.capacityMax)}
                    onChange={(e) =>
                      setClassMetaDraft((d) => ({
                        ...d,
                        capacityMax: Number.parseInt(e.target.value, 10) || 1,
                      }))}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsEditInfoModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveClassMeta}
                disabled={isSavingClassMeta}
                className="px-4 py-2 text-sm font-semibold bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-cyan-200"
              >
                {isSavingClassMeta ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRemoveClassModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" role="dialog" aria-modal="true">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl relative">
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setIsRemoveClassModalOpen(false)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2 pr-8 text-red-600">Remove Class</h3>
            <p className="text-sm text-gray-500 mb-6">
              Remove <span className="font-semibold">{classMeta.title}</span> from the class directory? Administrators will no longer see this class until it is restored from your source data.
            </p>
            {deleteClassError ? (
              <div role="alert" className="mb-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {deleteClassError}
              </div>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsRemoveClassModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={removeClass}
                disabled={isDeletingClass}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
              >
                {isDeletingClass ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editStudentDraft && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" role="dialog" aria-modal="true">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto relative">
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setEditStudentDraft(null)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4 pr-8">Edit student</h3>
            {editStudentError ? (
              <div role="alert" className="mb-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {editStudentError}
              </div>
            ) : null}
            <div className="flex flex-col gap-3">
              <input
                value={editStudentDraft.name}
                onChange={(e) => setEditStudentDraft({ ...editStudentDraft, name: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Name"
              />
              <input
                value={editStudentDraft.parent}
                onChange={(e) => setEditStudentDraft({ ...editStudentDraft, parent: e.target.value })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Parent"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  value={editStudentDraft.age}
                  onChange={(e) =>
                    setEditStudentDraft({
                      ...editStudentDraft,
                      age: Number.parseInt(e.target.value, 10) || 0,
                    })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-1/2"
                  placeholder="Age"
                />
                <input
                  value={editStudentDraft.level}
                  onChange={(e) =>
                    setEditStudentDraft({
                      ...editStudentDraft,
                      level: e.target.value,
                    })}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-1/2"
                  placeholder="Level"
                />
              </div>
              <select
                value={editStudentDraft.status}
                onChange={(e) =>
                  setEditStudentDraft({ ...editStudentDraft, status: e.target.value as Status })}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Waitlisted">Waitlisted</option>
                <option value="Rejected">Rejected</option>
              </select>
              <textarea
                value={editStudentDraft.description}
                onChange={(e) => setEditStudentDraft({ ...editStudentDraft, description: e.target.value })}
                rows={3}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-y"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setEditStudentDraft(null)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditedStudent}
                disabled={isSavingStudent}
                className="px-4 py-2 text-sm font-semibold bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-cyan-200"
              >
                {isSavingStudent ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
