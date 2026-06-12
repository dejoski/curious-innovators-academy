"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { DashboardBulkImportModal, type ParsedImportRow } from "@/components/dashboard-bulk-import-modal";
import { useDashboardNavigationProgress } from "@/components/dashboard-navigation-progress";
import { DashboardBulkSelectionBar } from "@/components/dashboard-row-actions";
import { ClassAddExistingStudentModal } from "@/components/class-add-existing-student-modal";
import { RemoveEnrollmentConfirmationModal } from "@/components/remove-enrollment-confirmation-modal";
import { useFixedMenuPlacement } from "@/hooks/use-fixed-menu-placement";
import { readApiError } from "@/lib/client-api-errors";
import { cachedJson, invalidateDashboardData, peekCachedJson, studentDetailDataUrls } from "@/lib/client-data-cache";
import { downloadCsv } from "@/lib/client-directory-actions";
import type {
  ClassRosterStudent,
  ClassRosterStatus,
  SchoolClassRow,
} from "@/lib/data/types";
import { canonicalScheduleSummaryForBlockDay, formatBlockDayLabel } from "@/lib/schedule-slots";

const imgGroup = "/images/icon-group.svg";
const imgGroup2 = "/images/icon-group.svg";
const imgGroup3 = "/images/icon-calendar-linear.svg";
const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector = "/images/vector.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgIcRoundPlus = "/images/icon-plus.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";
const imgWeuiMoreOutlined1 = "/images/icon-more.svg";

type StudentStatus = ClassRosterStatus;

type Student = ClassRosterStudent;

type ClassMeta = {
  teacher: string;
  teacherId?: string;
  blockLevel: string;
  schedule: string;
  semesterName: string;
  room: string;
  scheduleDays: string[];
  minAgeYears?: number;
  maxAgeYears?: number;
  waitlistCount: number;
  seatsRemaining?: number;
  isActive: boolean;
  archivedAt?: string;
  capacityEnrolled: number;
  capacityMax: number;
  pendingCount: number;
};

const EMPTY_CLASS_META: ClassMeta = {
  teacher: "Teacher not assigned",
  blockLevel: "Block not set",
  schedule: "Schedule not set",
  semesterName: "",
  room: "",
  scheduleDays: [],
  waitlistCount: 0,
  isActive: true,
  capacityEnrolled: 0,
  capacityMax: 1,
  pendingCount: 0,
};

function classMetaFromRow(row: SchoolClassRow): ClassMeta {
  return {
    teacher: row.teacher || "Teacher not assigned",
    teacherId: row.teacherId,
    blockLevel: [row.block, row.level ? `L${row.level}` : ""].filter(Boolean).join(" ") || "Block not set",
    schedule: row.schedule || "Schedule not set",
    semesterName: row.semesterName,
    room: row.room || row.location || "",
    scheduleDays: row.scheduleDays,
    minAgeYears: row.minAgeYears,
    maxAgeYears: row.maxAgeYears,
    waitlistCount: row.waitlistCount,
    seatsRemaining: row.seatsRemaining,
    isActive: row.isActive,
    archivedAt: row.archivedAt,
    capacityEnrolled: Math.max(0, row.enrolledCount ?? 0),
    capacityMax: Math.max(1, row.capacity ?? 1),
    pendingCount: row.pendingCount,
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

export default function EnrichmentClassDetail() {
  const router = useRouter();
  const { startNavigation } = useDashboardNavigationProgress();
  const params = useParams();
  const classId = typeof params?.id === "string" ? params.id : "";
  const [students, setStudents] = useState<Student[]>([]);
  const [classTitle, setClassTitle] = useState("Class");
  const [classDescription, setClassDescription] = useState("Loading class details.");
  const [classMeta, setClassMeta] = useState<ClassMeta>(EMPTY_CLASS_META);
  const [dataHint, setDataHint] = useState<string | null>(null);
  const [isLoadingRoster, setIsLoadingRoster] = useState(true);

  // Table Controls State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'All' | StudentStatus>('All');
  const [sortBy, setSortBy] = useState<'None' | 'Name A-Z' | 'Age'>('None');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Dropdown States
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [activeActionDropdown, setActiveActionDropdown] = useState<string | null>(null);

  // Modal States
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isEditClassModalOpen, setIsEditClassModalOpen] = useState(false);
  const [isRemoveClassModalOpen, setIsRemoveClassModalOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [removeStudentDraft, setRemoveStudentDraft] = useState<Student | null>(null);

  const [editClassDraft, setEditClassDraft] = useState({
    title: "",
    description: "",
    teacher: "",
    teacherId: "",
    blockLevel: "",
    schedule: "",
    scheduleDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    capacityMax: 1,
  });
  const [editDay, setEditDay] = useState("1");

  const [editStudentDraft, setEditStudentDraft] = useState<Student | null>(null);
  const [classEditError, setClassEditError] = useState<string | null>(null);
  const [deleteClassError, setDeleteClassError] = useState<string | null>(null);
  const [editStudentError, setEditStudentError] = useState<string | null>(null);
  const [rowActionError, setRowActionError] = useState<string | null>(null);
  const [isSavingClass, setIsSavingClass] = useState(false);
  const [isDeletingClass, setIsDeletingClass] = useState(false);
  const [isSavingStudent, setIsSavingStudent] = useState(false);

  // Refs for click outside
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuPlacement = useFixedMenuPlacement(activeActionDropdown !== null, actionMenuAnchorRef, 128);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    async function loadClassData() {
      setIsLoadingRoster(true);
      try {
        const classRowsUrl = "/api/data/classes";
        const rosterUrl = `/api/data/classes/${encodeURIComponent(classId)}/roster`;
        const cachedClasses = peekCachedJson<{ classes?: SchoolClassRow[] }>(classRowsUrl);
        const cachedRoster = peekCachedJson<{ students?: ClassRosterStudent[] }>(rosterUrl);
        const cachedRow = (cachedClasses?.classes ?? []).find((item) => item.id === classId);
        if (cachedRow) {
          setClassTitle(cachedRow.name);
          setClassDescription(cachedRow.description || "");
          setClassMeta(classMetaFromRow(cachedRow));
        }
        if (Array.isArray(cachedRoster?.students)) setStudents(cachedRoster.students);

        const [classesBody, rosterBody] = await Promise.all([
          cachedJson<{ classes?: SchoolClassRow[]; source?: string }>(classRowsUrl),
          cachedJson<{ students?: ClassRosterStudent[]; source?: string }>(rosterUrl),
        ]);
        if (cancelled) return;
        const row = (classesBody.classes ?? []).find((item) => item.id === classId);
        if (row) {
          setClassTitle(row.name);
          setClassDescription(row.description || "");
          setClassMeta(classMetaFromRow(row));
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
            ? "Class roster records are still syncing from the server."
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
      } finally {
        if (!cancelled) setIsLoadingRoster(false);
      }
    }
    loadClassData();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  useEffect(() => {
    function isInsideStudentActionRoot(node: Node | null, studentId: string): boolean {
      let current: Node | null = node;
      while (current) {
        if (
          current instanceof HTMLElement &&
          current.getAttribute("data-student-action-root") === studentId
        ) {
          return true;
        }
        current = current.parentNode;
      }
      return false;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setIsFilterDropdownOpen(false);
      }
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(target)) {
        setIsSortDropdownOpen(false);
      }
      if (activeActionDropdown !== null && !isInsideStudentActionRoot(target, activeActionDropdown)) {
        setActiveActionDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [activeActionDropdown]);

  // Filter & Sort Logic
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];
    
    // Search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) || 
        s.parent.toLowerCase().includes(query)
      );
    }

    // Filter
    if (filterStatus !== 'All') {
      result = result.filter(s => s.status === filterStatus);
    }

    // Sort
    if (sortBy === 'Name A-Z') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'Age') {
      result.sort((a, b) => a.age - b.age);
    }

    return result;
  }, [students, searchQuery, filterStatus, sortBy]);

  // Pagination Logic
  const totalPages = Math.max(1, Math.ceil(filteredAndSortedStudents.length / itemsPerPage));
  const boundedPage = Math.min(Math.max(currentPage, 1), totalPages);

  const paginatedStudents = useMemo(() => {
    const start = (boundedPage - 1) * itemsPerPage;
    return filteredAndSortedStudents.slice(start, start + itemsPerPage);
  }, [filteredAndSortedStudents, boundedPage, itemsPerPage]);
  const selectedStudents = useMemo(
    () => students.filter((student) => selectedStudentIds.has(student.id)),
    [students, selectedStudentIds],
  );
  const approvedRosterCount = useMemo(
    () => students.filter((student) => student.status === "Approved").length,
    [students],
  );
  const displayedCapacityEnrolled = Math.max(classMeta.capacityEnrolled, approvedRosterCount);

  // Selection Logic
  const handleSelectAll = () => {
    if (selectedStudentIds.size > 0) {
      setSelectedStudentIds(new Set());
      return;
    }
    setSelectedStudentIds(new Set(paginatedStudents.map((student) => student.id)));
  };

  const handleSelectRow = (id: string) => {
    const newSelected = new Set(selectedStudentIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedStudentIds(newSelected);
  };

  const exportSelectedStudents = () => {
    downloadCsv(
      `${classTitle.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "enrichment-class"}-selected-students.csv`,
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

  // Helper for Status Badge
  const getStatusStyles = (status: StudentStatus) => {
    switch (status) {
      case 'Approved':
        return "bg-[rgba(0,77,8,0.2)] border-[rgba(0,77,8,0.5)] text-[#004d08]";
      case 'Pending':
        return "bg-[rgba(207,165,0,0.2)] border-[rgba(207,165,0,0.5)] text-[#cfa500]";
      case 'Waitlisted':
        return "bg-[#fff8e6] border-[#cfa500]/50 text-[#7a5b00]";
      case 'Rejected':
        return "bg-[#ffd9d9] border-[rgba(216,5,9,0.5)] text-[#d80509]";
    }
  };

  function closeAllModals() {
    setIsAddStudentModalOpen(false);
    setIsEditClassModalOpen(false);
    setIsRemoveClassModalOpen(false);
    setEditingStudentId(null);
    setEditStudentDraft(null);
    setRemoveStudentDraft(null);
  }

  const openEditClassModal = () => {
    setEditDay(classMeta.schedule.match(/\bDay\s*([1-3])\b/i)?.[1] ?? "1");
    setEditClassDraft({
      title: classTitle,
      description: classDescription,
      teacher: classMeta.teacher,
      teacherId: classMeta.teacherId ?? "",
      blockLevel: classMeta.blockLevel,
      schedule: classMeta.schedule,
      scheduleDays: classMeta.scheduleDays,
      capacityMax: classMeta.capacityMax,
    });
    setClassEditError(null);
    setIsEditClassModalOpen(true);
  };

  const saveEditClass = async () => {
    const t = editClassDraft.title.trim();
    if (!t) return;
    const { block, level } = splitBlockLevelLabel(editClassDraft.blockLevel);
    const max = editClassDraft.capacityMax <= 0 ? 1 : editClassDraft.capacityMax;
    const schedule = canonicalScheduleSummaryForBlockDay(block, editDay);
    const blockLabel = formatBlockDayLabel(block, editDay, schedule);
    setClassEditError(null);
    setIsSavingClass(true);
    try {
      const res = await fetch("/api/data/classes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: classId,
          name: t,
          teacher: editClassDraft.teacher,
          teacherId: editClassDraft.teacherId || undefined,
          capacity: max,
          schedule,
          status: "Active",
          track: "enrichment",
          description: editClassDraft.description,
          block: blockLabel,
          level,
          room: classMeta.room,
          location: classMeta.room,
          scheduleDays: editClassDraft.scheduleDays,
          minAgeYears: classMeta.minAgeYears,
          maxAgeYears: classMeta.maxAgeYears,
          isActive: classMeta.isActive,
          archivedAt: classMeta.archivedAt,
        }),
      });
      if (!res.ok) {
        setClassEditError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { class?: SchoolClassRow };
      if (body.class) {
        setClassTitle(body.class.name);
        setClassDescription(body.class.description || "");
        setClassMeta(classMetaFromRow(body.class));
      } else {
        setClassTitle(t);
        setClassDescription(editClassDraft.description);
        setClassMeta((prev) => ({
          ...prev,
          title: t,
          description: editClassDraft.description,
          teacher: editClassDraft.teacher,
          teacherId: editClassDraft.teacherId || undefined,
          blockLevel: editClassDraft.blockLevel,
          schedule,
          capacityMax: max,
          scheduleDays: editClassDraft.scheduleDays,
        }));
      }
      invalidateDashboardData([
        "/api/data/classes",
        "/api/data/class-options",
        "/api/dashboard-presentation",
      ]);
      setIsEditClassModalOpen(false);
    } catch (error) {
      setClassEditError(error instanceof Error ? error.message : "Class could not be saved.");
    } finally {
      setIsSavingClass(false);
    }
  };

  useEffect(() => {
    const anyOpen =
      isAddStudentModalOpen ||
      isEditClassModalOpen ||
      isRemoveClassModalOpen ||
      editingStudentId !== null ||
      removeStudentDraft !== null;

    if (!anyOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsAddStudentModalOpen(false);
        setIsEditClassModalOpen(false);
        setIsRemoveClassModalOpen(false);
        setEditingStudentId(null);
        setEditStudentDraft(null);
        setRemoveStudentDraft(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isAddStudentModalOpen, isEditClassModalOpen, isRemoveClassModalOpen, editingStudentId, removeStudentDraft]);

  async function handleSaveAddStudent(input: { studentIds: string[]; status: Exclude<StudentStatus, "Pending"> }) {
    const studentIds = [...new Set(input.studentIds)].filter(Boolean);
    if (studentIds.length === 0) return;
    if (input.status === "Approved") {
      const seatsLeft = Math.max(0, classMeta.capacityMax - displayedCapacityEnrolled);
      if (studentIds.length > seatsLeft) {
        throw new Error(
          seatsLeft === 0
            ? "This class is full. Add students as waitlisted or increase capacity first."
            : `Only ${seatsLeft} approved seat${seatsLeft === 1 ? "" : "s"} left. Add fewer students or use waitlist.`,
        );
      }
    }
    const added: Student[] = [];
    const errors: string[] = [];
    try {
      for (const studentId of studentIds) {
        const res = await fetch(`/api/data/classes/${encodeURIComponent(classId)}/roster`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            status: input.status,
          }),
        });
        if (!res.ok) {
          errors.push(`${studentId}: ${await readApiError(res)}`);
          continue;
        }
        const body = (await res.json()) as { student?: Student };
        if (body.student) added.push(body.student);
        else errors.push(`${studentId}: Student could not be added to this class.`);
      }

      if (added.length > 0) {
        setStudents((prev) => [...prev, ...added]);
        const approvedAdded = added.filter((student) => student.status === "Approved").length;
        if (approvedAdded > 0) {
          setClassMeta((prev) => ({ ...prev, capacityEnrolled: prev.capacityEnrolled + approvedAdded }));
        }
        invalidateDashboardData([
          `/api/data/classes/${encodeURIComponent(classId)}/roster`,
          "/api/data/students",
          "/api/data/classes",
          "/api/data/class-options",
          "/api/dashboard-presentation",
          ...studentIds.flatMap((studentId) => studentDetailDataUrls(studentId)),
        ]);
      }

      if (errors.length > 0) {
        throw new Error(`Added ${added.length} of ${studentIds.length} student(s). ${errors[0]}`);
      }
      setCurrentPage(1);
      setIsAddStudentModalOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Students could not be added to this class.";
      throw new Error(message);
    }
  }

  async function handleSaveEditStudent() {
    if (!editStudentDraft || editingStudentId !== editStudentDraft.id) return;
    setEditStudentError(null);
    if (editStudentDraft.status === "Pending") {
      setEditStudentError("Pending class workflow must be created as a class request. Choose Approved, Waitlisted, or Rejected for roster enrollment edits.");
      return;
    }
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
      const previous = students.find((s) => s.id === saved.id);
      setStudents((prev) =>
        prev.map((s) => (s.id === saved.id ? saved : s)),
      );
      if (previous?.status !== saved.status) {
        const delta = saved.status === "Approved" ? 1 : previous?.status === "Approved" ? -1 : 0;
        if (delta !== 0) {
          setClassMeta((prev) => ({ ...prev, capacityEnrolled: Math.max(0, prev.capacityEnrolled + delta) }));
        }
      }
      setEditingStudentId(null);
      setEditStudentDraft(null);
    } catch (error) {
      setEditStudentError(error instanceof Error ? error.message : "Student enrollment could not be saved.");
    } finally {
      setIsSavingStudent(false);
    }
  }

  async function removeStudentById(studentId: string) {
    setRowActionError(null);
    setActiveActionDropdown(null);
    try {
      const res = await fetch(
        `/api/data/classes/${encodeURIComponent(classId)}/roster?studentId=${encodeURIComponent(studentId)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setRowActionError(await readApiError(res));
        return;
      }
      const removed = students.find((s) => s.id === studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      setRemoveStudentDraft(null);
      if (removed?.status === "Approved") {
        setClassMeta((prev) => ({ ...prev, capacityEnrolled: Math.max(0, prev.capacityEnrolled - 1) }));
      }
      setSelectedStudentIds((prev) => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    } catch (error) {
      setRowActionError(error instanceof Error ? error.message : "Student could not be removed.");
    }
  }

  async function removeClass() {
    setDeleteClassError(null);
    setIsDeletingClass(true);
    try {
      const res = await fetch(`/api/data/classes?id=${encodeURIComponent(classId)}`, { method: "DELETE" });
      if (!res.ok) {
        setDeleteClassError(await readApiError(res));
        return;
      }
      setIsRemoveClassModalOpen(false);
      startNavigation("/dashboard/classes");
      router.push("/dashboard/classes");
    } catch (error) {
      setDeleteClassError(error instanceof Error ? error.message : "Class could not be removed.");
    } finally {
      setIsDeletingClass(false);
    }
  }

  return (
    <div className="flex flex-col gap-8 p-8 w-full max-w-[1200px] mx-auto">
      {/* Alert Banner */}
      <div className="flex items-center gap-2 bg-white border border-[#f0f0f0] rounded-[18px] p-3 shadow-sm">
        <div className="bg-[rgba(207,165,0,0.2)] rounded-[10px] w-10 h-10 flex items-center justify-center shrink-0">
          <img src={imgGroup} alt="Alert" className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-between w-full ml-2">
          <p className="font-semibold text-[#272932] text-[16px]">
            {classMeta.pendingCount} Requests waiting for approval for this class
          </p>
	          <Link
	            href={`/dashboard/classes/requests?classId=${encodeURIComponent(classId)}`}
            className="flex items-center gap-2 font-semibold text-[#272932] text-[16px] hover:text-[#14c1d5] transition-colors"
          >
            Review Requests
            <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
          </Link>
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

      {/* Header Info */}
	      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
	        <div className="flex min-w-0 flex-col gap-2">
        <h1 className="font-bold text-[#272932] text-[28px] leading-[1.1]">
            {classTitle}
          </h1>
          <p className="font-normal text-[#666d80] text-[16px] leading-[1.4]">
            {classDescription}
          </p>
        </div>
	        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
          <button 
            type="button"
            onClick={openEditClassModal}
	            className="h-[42px] min-w-[86px] whitespace-nowrap rounded-[6px] bg-[#d2f1f5] px-4 text-[14px] font-semibold text-[#14c1d5] transition-colors hover:bg-[#bceef4]"
          >
            Edit Info
          </button>
          <button 
            type="button"
            onClick={() => setIsRemoveClassModalOpen(true)}
	            className="h-[42px] min-w-[116px] whitespace-nowrap rounded-[6px] bg-[#ffd9d9] px-4 text-[14px] font-semibold text-[#d80509] transition-colors hover:bg-[#ffc2c2]"
          >
            Remove Class
          </button>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Teacher */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-3 flex items-center gap-3">
          <div className="bg-[#d2f1f5] rounded-[10px] w-10 h-10 flex items-center justify-center shrink-0">
            <img src={imgGroup2} alt="Teacher" className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#272932] text-[16px]">Teacher</span>
            <span className="font-medium text-[#666d80] text-[16px]">{classMeta.teacher}</span>
          </div>
        </div>

        {/* Block & Class Level */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-3 flex items-center gap-3">
          <div className="bg-[#d2f1f5] rounded-[10px] w-10 h-10 flex items-center justify-center shrink-0">
            <img src={imgGroup2} alt="Level" className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#272932] text-[16px]">Block & Class Level</span>
            <span className="font-medium text-[#666d80] text-[16px]">{classMeta.blockLevel}</span>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-3 flex items-center gap-3">
          <div className="bg-[#d2f1f5] rounded-[10px] w-10 h-10 flex items-center justify-center shrink-0">
            <img src={imgGroup3} alt="Schedule" className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#272932] text-[16px]">Schedule</span>
            <span className="font-medium text-[#666d80] text-[16px]">{classMeta.schedule}</span>
          </div>
        </div>

        {/* Capacity */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex flex-col justify-center gap-2">
          <div className="flex justify-between items-center w-full leading-[1.4]">
            <span className="font-semibold text-[#272932] text-[16px]">Capacity</span>
            <span className="font-semibold text-[#cfa500] text-[16px]">{classMeta.pendingCount} Pending</span>
          </div>
          <div className="flex items-center gap-4 w-full justify-between">
            <div className="w-full bg-[rgba(0,77,8,0.2)] h-2 rounded-[41px] relative">
              <div
                className="absolute top-0 left-0 bg-[#004d08] h-2 rounded-[41px]"
                style={{
                  width: `${Math.min(
                    100,
	                    Math.max(0, (displayedCapacityEnrolled / Math.max(1, classMeta.capacityMax)) * 100),
                  )}%`,
                }}
              />
            </div>
            <span className="font-medium text-[#666d80] text-[16px] whitespace-nowrap">
	              {displayedCapacityEnrolled}/{classMeta.capacityMax}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-3 rounded-[18px] border border-[#f0f0f0] bg-white p-4 font-sans text-[14px] text-[#666d80] md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="font-semibold text-[#272932]">Term</div>
          <div>{classMeta.semesterName || "—"}</div>
        </div>
        <div>
          <div className="font-semibold text-[#272932]">Room / location</div>
          <div>{classMeta.room || "—"}</div>
        </div>
        <div>
          <div className="font-semibold text-[#272932]">Meeting days</div>
          <div>{classMeta.scheduleDays.length > 0 ? classMeta.scheduleDays.join(", ") : "—"}</div>
        </div>
        <div>
          <div className="font-semibold text-[#272932]">Visibility</div>
          <div>{classMeta.isActive && !classMeta.archivedAt ? "Parent-visible" : "Parent-hidden"}</div>
        </div>
        <div>
          <div className="font-semibold text-[#272932]">Pending / waitlist</div>
          <div>{classMeta.pendingCount} pending, {classMeta.waitlistCount} waitlisted</div>
        </div>
        <div>
          <div className="font-semibold text-[#272932]">Remaining seats</div>
          <div>{classMeta.seatsRemaining ?? "—"}</div>
        </div>
        <div>
          <div className="font-semibold text-[#272932]">Age limits</div>
          <div>
            {classMeta.minAgeYears != null || classMeta.maxAgeYears != null
              ? `${classMeta.minAgeYears ?? "Any"}-${classMeta.maxAgeYears ?? "Any"} years`
              : "—"}
          </div>
        </div>
        <div>
          <div className="font-semibold text-[#272932]">Archive state</div>
          <div>{classMeta.archivedAt ? `Archived ${new Date(classMeta.archivedAt).toLocaleDateString()}` : "Not archived"}</div>
        </div>
      </div>

      {/* Enrolled Students Section */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-[#272932] text-[20px] leading-[1.25]">Enrolled Students</h2>

        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-5 flex flex-col gap-5 shadow-sm">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={imgMaterialSymbolsSearch} alt="Search" className="w-[14px] h-[14px]" />
              <input 
                type="text" 
                placeholder="Search by student or parent..." 
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="text-[12px] text-[#0d0d12] outline-none placeholder:text-[#666d80] bg-transparent w-[200px]" 
              />
            </div>
            <div className="flex flex-wrap items-center gap-4">
              
              {/* Filter Dropdown */}
              <div className="relative" ref={filterDropdownRef}>
                <button 
                  type="button"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  className="bg-[#fafafa] flex items-center gap-1 p-2 rounded-[8px] hover:bg-gray-100 transition-colors"
                >
                  <img src={imgVector} alt="Filter" className="w-[14px] h-[14px]" />
                  <span className="text-[12px] text-[#0d0d12]">Filter by: {filterStatus}</span>
                  <ChevronDown className={`size-[14px] shrink-0 text-[#666d80] transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} aria-hidden strokeWidth={1.8} />
                </button>
                {isFilterDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-[#f0f0f0] rounded-[8px] shadow-lg z-10 py-1">
                    {(['All', 'Approved', 'Pending', 'Waitlisted', 'Rejected'] as const).map(status => (
                      <button 
                        key={status}
                        type="button"
                        onClick={() => { setFilterStatus(status); setIsFilterDropdownOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 ${filterStatus === status ? 'font-semibold text-[#14c1d5]' : 'text-[#0d0d12]'}`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative" ref={sortDropdownRef}>
                <button 
                  type="button"
                  onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                  className="bg-[#fafafa] flex items-center gap-1 p-2 rounded-[8px] hover:bg-gray-100 transition-colors"
                >
                  <img src={imgFlowbiteSortOutline} alt="Sort" className="w-[14px] h-[14px]" />
                  <span className="text-[12px] text-[#0d0d12]">Sort{sortBy !== 'None' ? `: ${sortBy}` : ''}</span>
                  <ChevronDown className={`size-[14px] shrink-0 text-[#666d80] transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} aria-hidden strokeWidth={1.8} />
                </button>
                {isSortDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-[#f0f0f0] rounded-[8px] shadow-lg z-10 py-1">
                    {(['None', 'Name A-Z', 'Age'] as const).map(option => (
                      <button 
                        key={option}
                        type="button"
                        onClick={() => { setSortBy(option); setIsSortDropdownOpen(false); setCurrentPage(1); }}
                        className={`w-full text-left px-3 py-2 text-[12px] hover:bg-gray-50 ${sortBy === option ? 'font-semibold text-[#14c1d5]' : 'text-[#0d0d12]'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button 
                type="button"
                onClick={handleSelectAll}
                className="bg-[#fafafa] p-2 rounded-[8px] text-[12px] text-[#0d0d12] hover:bg-gray-100 transition-colors"
              >
                {selectedStudentIds.size > 0 ? `Clear selected (${selectedStudentIds.size})` : "Select visible"}
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  setIsAddStudentModalOpen(true);
                }}
                className="bg-[#14c1d5] shadow-sm flex items-center gap-2 px-4 py-2 rounded-[6px] hover:bg-[#11a9bb] transition-colors"
              >
                <img src={imgIcRoundPlus} alt="Add" className="w-6 h-6" />
                <span className="font-semibold text-[14px] text-white tracking-[0.28px]">Add Student</span>
              </button>
              <button
                type="button"
                onClick={() => setIsImportOpen(true)}
                className="rounded-[6px] border border-[#14c1d5]/40 bg-white px-4 py-2 text-[14px] font-semibold text-[#14c1d5] transition-colors hover:bg-[#ecfdff]"
              >
                Bulk import CSV
              </button>
            </div>
          </div>

          <DashboardBulkSelectionBar count={selectedStudentIds.size} noun="student" onClear={() => setSelectedStudentIds(new Set())}>
            <button
              type="button"
              onClick={exportSelectedStudents}
              className="rounded-md bg-[#14c1d5] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#11adbf]"
            >
              Download selected CSV
            </button>
          </DashboardBulkSelectionBar>

          {/* Table */}
          <div className="w-full min-w-0 overflow-x-auto pb-2 min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-t border-b border-[#f0f0f0]">
                  <th className="py-4 px-3 font-semibold text-[14px] text-[#0d0d12] whitespace-nowrap">Student Name</th>
                  <th className="py-4 px-3 font-semibold text-[14px] text-[#0d0d12] whitespace-nowrap">Parent</th>
                  <th className="py-4 px-3 font-semibold text-[14px] text-[#0d0d12] text-center whitespace-nowrap">Age</th>
                  <th className="py-4 px-3 font-semibold text-[14px] text-[#0d0d12] text-center whitespace-nowrap">Student Level</th>
                  <th className="py-4 px-3 font-semibold text-[14px] text-[#0d0d12] text-center whitespace-nowrap">Request Status</th>
                  <th className="py-4 px-3 font-semibold text-[14px] text-[#0d0d12] whitespace-nowrap">Description</th>
                  <th className="py-4 px-3 font-semibold text-[14px] text-[#0d0d12] text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
	            <tbody className="text-[13px] text-[#0d0d12]">
                {paginatedStudents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#666d80]">
                      {isLoadingRoster ? "Loading roster..." : "No students found matching your criteria."}
                    </td>
                  </tr>
                )}
                {paginatedStudents.map(student => {
                  const isSelected = selectedStudentIds.has(student.id);
                  
                  return (
                    <tr key={student.id} className="border-b border-[#f0f0f0] hover:bg-gray-50/50 transition-colors">
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => handleSelectRow(student.id)}
                            className={`w-[14px] h-[14px] flex items-center justify-center rounded-[4px] shrink-0 border transition-colors ${
                              isSelected 
                                ? 'bg-[#14c1d5] border-[#14c1d5]' 
                                : 'bg-[#d2f1f5] border-[#14c1d5] opacity-50 hover:opacity-100'
                            }`}
                          >
                            {isSelected && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                          <span className="whitespace-nowrap text-[13px]">{student.name}</span>
                        </div>
                      </td>
	                      <td className="whitespace-nowrap px-3 py-4 text-[13px]">{student.parent}</td>
	                      <td className="whitespace-nowrap px-3 py-4 text-center text-[13px]">{student.age} years</td>
	                      <td className="px-3 py-4 text-center text-[13px]">{student.level}</td>
                      <td className="py-4 px-3 text-center">
                        <span className={`inline-block border text-[10px] px-2 py-1 rounded-[6px] ${getStatusStyles(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
	                      <td className="min-w-[200px] px-3 py-4 text-[13px] text-[#666d80]">{student.description}</td>
                      <td
                        data-student-action-root={student.id}
                        className="py-4 px-3 text-center"
                      >
                        <div className="relative inline-flex items-center justify-center">
                        <button 
                          type="button"
                          ref={activeActionDropdown === student.id ? actionMenuAnchorRef : null}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveActionDropdown(activeActionDropdown === student.id ? null : student.id);
                          }}
                          className="inline-flex items-center justify-center p-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          <img src={student.status === 'Rejected' ? imgWeuiMoreOutlined1 : imgWeuiMoreOutlined} alt="More" className="w-6 h-6" />
                        </button>
                        
                        {/* Action Dropdown Menu */}
                        {activeActionDropdown === student.id && actionMenuPlacement && (
                          <div
                            className="fixed z-[70] w-32 bg-white border border-[#f0f0f0] rounded-[8px] shadow-lg py-1"
                            style={{
                              top: actionMenuPlacement.top,
                              left: actionMenuPlacement.left,
                            }}
                          >
                            <button 
                              type="button"
                              onClick={() => {
                                setEditStudentError(null);
                                setActiveActionDropdown(null);
                                setEditingStudentId(student.id);
                                setEditStudentDraft({ ...student });
                              }}
                              className="w-full text-left px-4 py-2 text-[14px] text-[#0d0d12] hover:bg-gray-50"
                            >
                              Edit
                            </button>
                            <button 
                              type="button"
                              onClick={() => {
                                setRowActionError(null);
                                setActiveActionDropdown(null);
                                setRemoveStudentDraft(student);
                              }}
                              className="w-full text-left px-4 py-2 text-[14px] text-[#d80509] hover:bg-gray-50"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 0 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button 
                type="button"
                onClick={() => setCurrentPage(Math.max(1, boundedPage - 1))}
                disabled={boundedPage === 1}
                className="w-[18px] h-[18px] flex items-center justify-center disabled:opacity-30 hover:opacity-70 transition-opacity"
                aria-label="Previous page"
              >
                <ChevronLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <button 
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={`w-[28px] h-[28px] rounded-[9px] flex items-center justify-center text-[12px] font-semibold transition-colors ${
                      boundedPage === page 
                        ? 'bg-[#14c1d5] text-white' 
                        : 'text-[#666d80] hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button 
                type="button"
                onClick={() => setCurrentPage(Math.min(totalPages, boundedPage + 1))}
                disabled={boundedPage === totalPages}
                className="w-[18px] h-[18px] flex items-center justify-center disabled:opacity-30 hover:opacity-70 transition-opacity"
                aria-label="Next page"
              >
                <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}

      <ClassAddExistingStudentModal
        open={isAddStudentModalOpen}
        existingStudentIds={students.map((student) => student.id)}
        classNameLabel={classTitle}
        onClose={() => setIsAddStudentModalOpen(false)}
        onSubmit={handleSaveAddStudent}
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

      {/* Edit Class Info Modal */}
      {isEditClassModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeAllModals();
            }
          }}
        >
          <div
            className="bg-white rounded-[18px] p-6 w-full max-w-md shadow-xl flex flex-col gap-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-[#272932] text-[18px] leading-[1.25]">Edit Class Info</h3>
            <p className="text-[#666d80] text-[14px]">Update the details for this class.</p>
            {classEditError ? (
              <div role="alert" className="rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {classEditError}
              </div>
            ) : null}
            <div className="flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#666d80]">
                Title
                <input
                  type="text"
                  value={editClassDraft.title}
                  onChange={(e) => setEditClassDraft((d) => ({ ...d, title: e.target.value }))}
                  className="rounded-[8px] border border-[#f0f0f0] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#666d80]">
                Description
                <textarea
                  value={editClassDraft.description}
                  onChange={(e) => setEditClassDraft((d) => ({ ...d, description: e.target.value }))}
                  className="h-24 resize-none rounded-[8px] border border-[#f0f0f0] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#666d80]">
                Teacher
                <input
                  value={editClassDraft.teacher}
                  onChange={(e) => setEditClassDraft((d) => ({ ...d, teacher: e.target.value, teacherId: "" }))}
                  className="rounded-[8px] border border-[#f0f0f0] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
                />
              </label>
              <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#666d80]">
                Block & level
                <input
                  value={editClassDraft.blockLevel}
                  onChange={(e) =>
                    setEditClassDraft((d) => {
                      const nextBlockLevel = e.target.value;
                      const { block } = splitBlockLevelLabel(nextBlockLevel);
                      return {
                        ...d,
                        blockLevel: nextBlockLevel,
                        schedule: canonicalScheduleSummaryForBlockDay(block, editDay),
                      };
                    })
                  }
                  className="rounded-[8px] border border-[#f0f0f0] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#666d80]">
                  Day
                  <select
                    value={editDay}
                    onChange={(e) => {
                      const nextDay = e.target.value;
                      setEditDay(nextDay);
                      setEditClassDraft((d) => {
                        const { block } = splitBlockLevelLabel(d.blockLevel);
                        return { ...d, schedule: canonicalScheduleSummaryForBlockDay(block, nextDay) };
                      });
                    }}
                    className="rounded-[8px] border border-[#f0f0f0] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
                  >
                    <option value="1">Day 1</option>
                    <option value="2">Day 2</option>
                    <option value="3">Day 3</option>
                  </select>
                </label>
                <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#666d80]">
                  Schedule
                  <input
                    value={editClassDraft.schedule}
                    readOnly
                    className="rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-[14px] text-[#8a8f9f]"
                  />
                </label>
              </div>
              <label className="flex flex-col gap-1 text-[13px] font-semibold text-[#666d80]">
                Meeting days
                <div className="mt-1 flex flex-wrap gap-2">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() =>
                        setEditClassDraft((d) => ({
                          ...d,
                          scheduleDays: d.scheduleDays.includes(day)
                            ? d.scheduleDays.filter((value) => value !== day)
                            : [...d.scheduleDays, day],
                        }))
                      }
                      className={`rounded-[8px] border px-3 py-1 text-[13px] font-semibold ${
                        editClassDraft.scheduleDays.includes(day)
                          ? "border-[#14c1d5] bg-[#d2f1f5] text-[#0d0d12]"
                          : "border-[#f0f0f0] bg-white text-[#666d80]"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </label>
              <div className="flex gap-3">
                <label className="flex-1 text-[13px] font-semibold text-[#666d80]">
                  Enrolled (derived)
                  <input
                    type="number"
                    min={0}
                    value={String(classMeta.capacityEnrolled)}
                    disabled
                    readOnly
                    className="mt-1 w-full rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] px-3 py-2 text-[14px] text-[#8a8f9f]"
                  />
                </label>
                <label className="flex-1 text-[13px] font-semibold text-[#666d80]">
                  Max seats
                  <input
                    type="number"
                    min={1}
                    value={String(editClassDraft.capacityMax)}
                    onChange={(e) => setEditClassDraft((d) => ({ ...d, capacityMax: Number.parseInt(e.target.value, 10) || 0 }))}
                    className="mt-1 w-full rounded-[8px] border border-[#f0f0f0] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
                  />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsEditClassModalOpen(false)}
                className="px-4 py-2 text-[#666d80] font-medium text-[14px] hover:bg-gray-50 rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEditClass}
                disabled={isSavingClass}
                className="bg-[#14c1d5] text-white font-semibold text-[14px] px-4 py-2 rounded-[6px] hover:bg-[#11a9bb] transition-colors disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
              >
                {isSavingClass ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Student Modal (from row Action → Edit) */}
      {editStudentDraft !== null && editingStudentId !== null && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeAllModals();
            }
          }}
        >
          <div
            className="bg-white rounded-[18px] p-6 w-full max-w-md shadow-xl flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-[#272932] text-[18px] leading-[1.25]">Edit Student</h3>
            <p className="text-[#666d80] text-[14px]">Update this student&apos;s enrollment details.</p>
            {editStudentError ? (
              <div role="alert" className="rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {editStudentError}
              </div>
            ) : null}
            <div className="flex flex-col gap-3">
              <label className="text-[12px] font-semibold text-[#666d80] uppercase tracking-wide">Student Name</label>
              <input
                type="text"
                value={editStudentDraft.name}
                onChange={(e) => setEditStudentDraft({ ...editStudentDraft, name: e.target.value })}
                className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
              />
              <label className="text-[12px] font-semibold text-[#666d80] uppercase tracking-wide">Parent</label>
              <input
                type="text"
                value={editStudentDraft.parent}
                onChange={(e) => setEditStudentDraft({ ...editStudentDraft, parent: e.target.value })}
                className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
              />
              <div className="flex gap-3">
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-[#666d80] uppercase tracking-wide">Age</label>
                  <input
                    type="number"
                    min={3}
                    max={18}
                    value={editStudentDraft.age}
                    onChange={(e) =>
                      setEditStudentDraft({
                        ...editStudentDraft,
                        age: Number.parseInt(e.target.value, 10) || editStudentDraft.age,
                      })}
                    className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
                  />
                </div>
                <div className="flex-1 flex flex-col gap-1">
                  <label className="text-[12px] font-semibold text-[#666d80] uppercase tracking-wide">Level</label>
                  <input
                    type="text"
                    value={editStudentDraft.level}
                    onChange={(e) =>
                      setEditStudentDraft({ ...editStudentDraft, level: e.target.value })}
                    className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
                  />
                </div>
              </div>
              <label className="text-[12px] font-semibold text-[#666d80] uppercase tracking-wide">Request Status</label>
              <select
                value={editStudentDraft.status}
                onChange={(e) =>
                  setEditStudentDraft({
                    ...editStudentDraft,
                    status: e.target.value as StudentStatus,
                  })}
                className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
              >
                <option value="Approved">Approved</option>
                {editStudentDraft.status === "Pending" ? (
                  <option value="Pending" disabled>
                    Pending - use class requests
                  </option>
                ) : null}
                <option value="Waitlisted">Waitlisted</option>
                <option value="Rejected">Rejected</option>
              </select>
              <label className="text-[12px] font-semibold text-[#666d80] uppercase tracking-wide">Description</label>
              <textarea
                value={editStudentDraft.description}
                onChange={(e) =>
                  setEditStudentDraft({ ...editStudentDraft, description: e.target.value })}
                className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5] resize-none min-h-[96px]"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => {
                  setEditingStudentId(null);
                  setEditStudentDraft(null);
                }}
                className="px-4 py-2 text-[#666d80] font-medium text-[14px] hover:bg-gray-50 rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditStudent}
                disabled={isSavingStudent}
                className="bg-[#14c1d5] text-white font-semibold text-[14px] px-4 py-2 rounded-[6px] hover:bg-[#11a9bb] transition-colors disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
              >
                {isSavingStudent ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {removeStudentDraft && (
        <RemoveEnrollmentConfirmationModal
          studentName={removeStudentDraft.name}
          className={classTitle}
          error={rowActionError}
          onCancel={() => setRemoveStudentDraft(null)}
          onConfirm={() => void removeStudentById(removeStudentDraft.id)}
        />
      )}

      {/* Remove Class Modal */}
      {isRemoveClassModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeAllModals();
            }
          }}
        >
          <div
            className="bg-white rounded-[18px] p-6 w-full max-w-sm shadow-xl flex flex-col gap-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <h3 className="font-bold text-[#272932] text-[18px] leading-[1.25]">Remove Class?</h3>
            <p className="text-[#666d80] text-[14px]">
              Are you sure you want to remove the <strong>{classTitle}</strong> class? This removes it from the directory for all administrators.
            </p>
            {deleteClassError ? (
              <div role="alert" className="rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {deleteClassError}
              </div>
            ) : null}
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsRemoveClassModalOpen(false)}
                className="px-4 py-2 text-[#666d80] font-medium text-[14px] hover:bg-gray-50 rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={removeClass}
                disabled={isDeletingClass}
                className="bg-[#ffd9d9] text-[#d80509] font-semibold text-[14px] px-4 py-2 rounded-[6px] hover:bg-[#ffc2c2] transition-colors disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletingClass ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
