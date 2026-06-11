"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import type { ParentSummary, StudentListItem } from "@/lib/data/types";
import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import EntityAvatar from "@/components/entity-avatar";
import { DashboardBulkImportModal, type ParsedImportRow } from "@/components/dashboard-bulk-import-modal";
import { DashboardBulkSelectionBar, DashboardRowActionsMenu } from "@/components/dashboard-row-actions";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Link2,
  Mail,
  Send,
  UserCheck,
  UserPlus,
  Users,
  Users2,
} from "lucide-react";
import { DASHBOARD_PANEL_CLASS } from "@/lib/dashboard-shell-classes";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData, readDashboardData } from "@/lib/client-data-cache";
import { downloadCsv, mailtoHref } from "@/lib/client-directory-actions";
import { fallbackDirectoryBannerText } from "@/lib/product-copy";

const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector = "/images/vector.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";
const imgHugeiconsFamilies = "/images/icon-parent.svg";

export type ParentsDirectoryPageClientProps = {
  initialParents: ParentSummary[];
  dataSource: DataSource;
};

type ParentRow = {
  id: string;
  name: string;
  avatar: string;
  studentsLabel: string;
  email: string;
  phone: string;
  status: string;
  linkedStudents: { id: string; name: string }[];
};

function toDisplayRow(p: ParentSummary): ParentRow {
  const avatar = p.avatar ?? "";
  const status =
    typeof p.status === "string" && p.status.trim() ? p.status.trim() : "Active";
  return {
    id: p.id,
    name: p.name,
    avatar,
    studentsLabel:
      typeof p.studentsLabel === "string" && p.studentsLabel.trim()
        ? p.studentsLabel.trim()
        : "—",
    email: p.email,
    phone: p.phone || "—",
    status,
    linkedStudents:
      Array.isArray(p.linkedStudents) && p.linkedStudents.length > 0
        ? p.linkedStudents
        : [],
  };
}

const PARENTS_TABLE_GRID_TEMPLATE_COLUMNS =
  "28px minmax(0, 1fr) minmax(0, 1.4fr) minmax(0, 1.2fr) minmax(0, 0.6fr) 32px";

const DIRECTORY_PAGE_SIZE = 10;

export function ParentsAdminDirectory({
  initialParents,
  dataSource,
}: ParentsDirectoryPageClientProps) {
  const [parents, setParents] = useState<ParentSummary[]>(() => [...initialParents]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    id: string;
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [messageFor, setMessageFor] = useState<{ id: string; name: string; email: string } | null>(
    null,
  );
  const [linkDraft, setLinkDraft] = useState<{
    parent: ParentRow;
    selectedIds: Set<string>;
    search: string;
    saving: boolean;
    error: string | null;
  } | null>(null);
  const [inviteDraft, setInviteDraft] = useState<{
    parent: ParentRow;
    inviteUrl: string;
    copied: boolean;
  } | null>(null);
  const [deleteDraft, setDeleteDraft] = useState<{
    parent: ParentRow;
    deleting: boolean;
    error: string | null;
  } | null>(null);
  const [allStudents, setAllStudents] = useState<StudentListItem[] | null>(null);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentsForParent, setStudentsForParent] = useState<{
    parentId: string;
    parentName: string;
    rows: { id: string; name: string }[];
  } | null>(null);
  const [spreadsheetBanner, setSpreadsheetBanner] = useState<string | null>(null);

  const filterRef = React.useRef<HTMLDivElement>(null);
  const actionRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    setParents([...initialParents]);
  }, [initialParents]);

  useEffect(() => {
    let cancelled = false;
    void readDashboardData<{ students?: StudentListItem[] }>("/api/data/students")
      .then((body) => {
        if (cancelled) return;
        setAllStudents(Array.isArray(body.students) ? body.students : []);
        setStudentsError(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setStudentsError(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const displayRows = useMemo(() => parents.map(toDisplayRow), [parents]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterDropdownOpen(false);
      }
      if (actionRef.current && !actionRef.current.contains(event.target as Node)) {
        setOpenActionId(null);
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

  const stats = useMemo(() => {
    const rows = displayRows;
    const total = rows.length;
    const active = rows.filter((p) => p.status === "Active").length;
    const needsStudents = rows.filter((p) => p.linkedStudents.length === 0).length;
    const orphanStudents = allStudents
      ? allStudents.filter((student) => (student.parentIds ?? []).length === 0).length
      : null;
    const studentLinks = rows.reduce((acc, p) => acc + p.linkedStudents.length, 0);
    return { total, active, needsStudents, orphanStudents, studentLinks };
  }, [allStudents, displayRows]);

  const filteredData = useMemo(() => {
    return displayRows.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.studentsLabel.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "All" || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [displayRows, searchQuery, statusFilter]);

  const linkableStudents = useMemo(() => {
    if (!linkDraft || !allStudents) return [];
    const q = linkDraft.search.trim().toLowerCase();
    return allStudents.filter((student) => {
      if (!q) return true;
      return (
        student.name.toLowerCase().includes(q) ||
        student.parent.toLowerCase().includes(q) ||
        student.level.toLowerCase().includes(q)
      );
    });
  }, [allStudents, linkDraft]);

  const totalPages = Math.ceil(filteredData.length / DIRECTORY_PAGE_SIZE) || 1;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * DIRECTORY_PAGE_SIZE;
    return filteredData.slice(start, start + DIRECTORY_PAGE_SIZE);
  }, [filteredData, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    } else if (totalPages === 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, parents.length]);

  const handleSelectAll = () => {
    const filteredIds = filteredData.map((p) => p.id);
    if (filteredIds.length === 0) return;
    if (selectedIds.length > 0) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(filteredIds);
  };

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id],
    );
  };

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) setCurrentPage((c) => c - 1);
    if (direction === "next" && currentPage < totalPages) setCurrentPage((c) => c + 1);
  };

  const exportParents = () => {
    const selected = selectedIds.length
      ? filteredData.filter((parent) => selectedIds.includes(parent.id))
      : filteredData;
    downloadCsv(
      "parents-directory.csv",
      ["Name", "Students", "Email", "Phone", "Status"],
      selected.map((parent) => [parent.name, parent.studentsLabel, parent.email, parent.phone, parent.status]),
    );
    setSpreadsheetBanner(`Downloaded ${selected.length} parent row(s) as CSV.`);
  };

  const refreshParents = async () => {
    invalidateDashboardData(["/api/data/parents", "/api/data/students", "/api/dashboard-presentation"]);
    const [parentsBody, studentsBody] = await Promise.all([
      readDashboardData<{ parents?: ParentSummary[] }>("/api/data/parents", undefined, { force: true }),
      readDashboardData<{ students?: StudentListItem[] }>("/api/data/students", undefined, { force: true }),
    ]);
    setParents(Array.isArray(parentsBody.parents) ? parentsBody.parents : []);
    setAllStudents(Array.isArray(studentsBody.students) ? studentsBody.students : []);
  };

  const openLinkManager = (parent: ParentRow) => {
    setLinkDraft({
      parent,
      selectedIds: new Set(parent.linkedStudents.map((student) => student.id)),
      search: "",
      saving: false,
      error: null,
    });
  };

  const saveStudentLinks = async () => {
    if (!linkDraft) return;
    setLinkDraft((draft) => (draft ? { ...draft, saving: true, error: null } : draft));
    const res = await fetch("/api/data/parents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "set-students",
        parentId: linkDraft.parent.id,
        studentIds: [...linkDraft.selectedIds],
      }),
    });
    if (!res.ok) {
      const message = await readApiError(res);
      setLinkDraft((draft) => (draft ? { ...draft, saving: false, error: message } : draft));
      return;
    }
    await refreshParents();
    setLinkDraft(null);
    setSpreadsheetBanner(`Updated student links for ${linkDraft.parent.name}.`);
  };

  const createInviteLink = async (parent: ParentRow) => {
    const res = await fetch("/api/data/parents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "create-invite-link",
        parentId: parent.id,
      }),
    });
    if (!res.ok) {
      setSpreadsheetBanner(`Could not create invite link: ${await readApiError(res)}.`);
      return;
    }
    const body = (await res.json()) as { parent?: ParentSummary; inviteUrl?: string };
    if (!body.inviteUrl) {
      setSpreadsheetBanner("Could not create invite link.");
      return;
    }
    const savedParent = body.parent ? toDisplayRow(body.parent) : parent;
    if (body.parent) {
      setParents((prev) => prev.map((p) => (p.id === body.parent?.id ? body.parent : p)));
      invalidateDashboardData(["/api/data/parents", "/api/dashboard-presentation"]);
    }
    setInviteDraft({ parent: savedParent, inviteUrl: body.inviteUrl, copied: false });
  };

  const importParents = async (rows: ParsedImportRow[]) => {
    const created: ParentSummary[] = [];
    const errors: string[] = [];
    for (const row of rows) {
      const res = await fetch("/api/data/parents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: row.values.name,
          email: row.values.email,
        }),
      });
      if (res.ok) {
        const body = (await res.json()) as { parent?: ParentSummary };
        if (body.parent) created.push(body.parent);
      } else {
        errors.push(`Row ${row.rowNumber}: ${await readApiError(res)}`);
      }
    }
    if (created.length > 0) {
      setParents((prev) => [...prev, ...created]);
      invalidateDashboardData(["/api/data/parents", "/api/dashboard-presentation"]);
      setSpreadsheetBanner(`Imported ${created.length} parent row(s).`);
    }
    return { created: created.length, errors };
  };

  const saveEdit = async () => {
    if (!editDraft) return;
    const name = editDraft.name.trim();
    if (!name) return;
    const res = await fetch("/api/data/parents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "update-parent",
        parentId: editDraft.id,
        name,
        email: editDraft.email,
      }),
    });
    if (!res.ok) {
      setSpreadsheetBanner(`Could not save parent: ${await readApiError(res)}.`);
      return;
    }
    const body = (await res.json()) as { parent?: ParentSummary };
    if (body.parent) {
      setParents((prev) => prev.map((p) => (p.id === body.parent?.id ? body.parent : p)));
      invalidateDashboardData(["/api/data/parents", "/api/dashboard-presentation"]);
      setSpreadsheetBanner(`Saved parent ${body.parent.name}.`);
    }
    setEditDraft(null);
  };

  const deleteParent = async () => {
    if (!deleteDraft || deleteDraft.deleting) return;
    const parent = deleteDraft.parent;
    setDeleteDraft({ parent, deleting: true, error: null });
    const res = await fetch(`/api/data/parents?parentId=${encodeURIComponent(parent.id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setDeleteDraft({ parent, deleting: false, error: await readApiError(res) });
      return;
    }
    setParents((prev) => prev.filter((row) => row.id !== parent.id));
    setSelectedIds((prev) => prev.filter((id) => id !== parent.id));
    invalidateDashboardData(["/api/data/parents", "/api/data/students", "/api/dashboard-presentation"]);
    setDeleteDraft(null);
    setSpreadsheetBanner(`Deleted parent ${parent.name}.`);
  };

  return (
    <div className="flex flex-col w-full min-h-full px-[32px] py-[32px] gap-[24px] font-sans relative">
      <div className="flex flex-col gap-[8px]">
        <h1 className="font-bold leading-[1.1] text-[#272932] text-[28px]">
          Parents
        </h1>
        <p className="font-normal leading-[1.4] text-[#666d80] text-[16px] max-w-3xl">
          Directory of parent and guardian contacts with quick links to students.
        </p>
        {dataSource === "fallback" ? (
          <p className="max-w-3xl rounded-md border border-[#e8e9ed] bg-[#f6f7f9] px-3 py-1.5 text-xs text-[#525a63] leading-snug">
            {fallbackDirectoryBannerText()}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <img alt="" className="size-[20px]" src={imgHugeiconsFamilies} />
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-semibold text-[#272932] text-[16px]">
                Total families
              </p>
              <p className="font-medium text-[#666d80] text-[16px]">
                {stats.total}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[rgba(0,77,8,0.2)] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <UserCheck aria-hidden className="size-5 text-[#004d08]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-semibold text-[#272932] text-[16px]">
                Active
              </p>
              <p className="font-medium text-[#666d80] text-[16px]">
                {stats.active}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[rgba(207,165,0,0.2)] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <UserPlus aria-hidden className="size-5 text-[#a88400]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-semibold text-[#272932] text-[16px]">
                Need students
              </p>
              <p className="font-medium text-[#666d80] text-[16px]">
                {stats.needsStudents}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[#e6f7f9] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <Users aria-hidden className="size-5 text-[#14c1d5]" strokeWidth={1.75} />
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-semibold text-[#272932] text-[16px]">
                Students needing parents
              </p>
              <p className="font-medium text-[#666d80] text-[16px]">
                {stats.orphanStudents == null ? "Loading" : stats.orphanStudents}
              </p>
            </div>
          </div>
        </div>
      </div>

      {stats.needsStudents > 0 || (stats.orphanStudents ?? 0) > 0 || studentsError ? (
        <div className="rounded-[14px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-3 text-sm text-[#6f5300]">
          {studentsError
            ? `Could not load student link status: ${studentsError}.`
            : `${stats.needsStudents} parent${stats.needsStudents === 1 ? "" : "s"} and ${stats.orphanStudents ?? 0} student${(stats.orphanStudents ?? 0) === 1 ? "" : "s"} need relationship cleanup.`}
        </div>
      ) : null}

      <div className={[DASHBOARD_PANEL_CLASS, "flex flex-col w-full overflow-visible"].join(" ")}>
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-1 px-[18px] pt-[16px] pb-2 w-full flex-wrap">
          <div className="flex gap-[6px] items-center bg-white border border-[#f0f0f0] px-4 py-2 rounded-lg flex-1 w-full max-w-xs focus-within:border-[#14c1d5] focus-within:ring-1 focus-within:ring-[#14c1d5] transition-all">
            <div className="relative shrink-0 size-[14px]">
              <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgMaterialSymbolsSearch} />
            </div>
            <input
              type="text"
              placeholder="Search parents…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="outline-none text-[14px] w-full text-[#0d0d12] bg-transparent placeholder:text-[#666d80]"
            />
          </div>
          <div className="flex flex-wrap gap-[16px] items-center w-full sm:w-auto justify-start sm:justify-end">
            <div className="relative" ref={filterRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsFilterDropdownOpen(!isFilterDropdownOpen);
                  setOpenActionId(null);
                }}
                className={`bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] cursor-pointer transition-colors ${
                  isFilterDropdownOpen ? "ring-2 ring-[#14c1d5] bg-gray-50" : "hover:bg-gray-100"
                }`}
              >
                <div className="size-[14px] flex items-center justify-center">
                  <img alt="" className="size-full" src={imgVector} />
                </div>
                <span className="text-[#0d0d12] text-[12px]">
                  Status: {statusFilter === "All" ? "All" : statusFilter}
                </span>
                <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
              </button>

              {isFilterDropdownOpen && (
                <div
                  className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(["All", "Active", "Needs students"] as const).map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        statusFilter === status ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"
                      }`}
                      onClick={() => {
                        setStatusFilter(status);
                        setIsFilterDropdownOpen(false);
                      }}
                    >
                      {status === "All" ? "All statuses" : `${status} only`}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSelectAll}
              className={`flex items-center p-[8px] rounded-[8px] shrink-0 cursor-pointer transition-colors ${
                selectedIds.length > 0
                  ? "bg-[#d2f1f5] text-[#14c1d5]"
                  : "bg-[#fafafa] text-[#0d0d12] hover:bg-gray-100"
              }`}
            >
              <p className="text-[12px]">
                {selectedIds.length > 0 ? `Clear selected (${selectedIds.length})` : "Select visible"}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="flex items-center rounded-[8px] border border-[#14c1d5]/40 bg-white px-3 py-2 text-[12px] font-semibold text-[#14c1d5] transition-colors hover:bg-[#ecfdff]"
            >
              Bulk import CSV
            </button>
          </div>
        </div>

        <DashboardBulkSelectionBar count={selectedIds.length} noun="parent" onClear={() => setSelectedIds([])}>
          <button
            type="button"
            onClick={exportParents}
            className="rounded-[6px] bg-[#14c1d5] px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-[#11adbf]"
          >
            Download selected CSV
          </button>
        </DashboardBulkSelectionBar>

        <div
          style={{ gridTemplateColumns: PARENTS_TABLE_GRID_TEMPLATE_COLUMNS }}
          className="grid gap-x-2 border-t border-[#f0f0f0] py-[16px] px-[18px] w-full items-center"
        >
          <div aria-hidden className="min-w-0" />
          <div className="min-w-0 text-left text-[#0d0d12] font-semibold text-[14px]">
            Parent
          </div>
          <div className="min-w-0 text-left text-[#0d0d12] font-semibold text-[14px]">
            Students
          </div>
          <div className="min-w-0 text-left text-[#0d0d12] font-semibold text-[14px]">
            Email
          </div>
          <div className="min-w-0 text-left text-[#0d0d12] font-semibold text-[14px]">
            Phone
          </div>
          <div className="min-w-0 text-center text-[#0d0d12] font-semibold text-[14px]">
            Action
          </div>
        </div>

        <div className="flex min-h-[300px] w-full flex-col overflow-visible pb-4">
          {paginatedData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-[32px] px-[18px]">
              <span className="text-[#666d80] text-[14px] text-center leading-snug max-w-lg">
                {parents.length === 0 && dataSource === "remote"
                  ? "No parent contacts yet. Add guardians to the parents roster."
                  : searchQuery.trim()
                    ? `No parents found matching “${searchQuery}”.`
                    : "No parents match the current filters."}
              </span>
            </div>
          ) : (
            paginatedData.map((parent) => (
              <div
                key={parent.id}
                style={{ gridTemplateColumns: PARENTS_TABLE_GRID_TEMPLATE_COLUMNS }}
                className={`grid gap-x-2 border-t border-[#f0f0f0] hover:bg-gray-50 transition-colors py-[12px] px-[18px] w-full items-center ${
                  openActionId === parent.id ? "relative z-50" : ""
                }`}
              >
                <div className="flex min-w-0 items-center justify-start">
                  <button
                    type="button"
                    onClick={() => toggleSelection(parent.id)}
                    className={`border border-[#14c1d5] border-solid rounded-[4px] shrink-0 size-[14px] flex items-center justify-center transition-colors ${
                      selectedIds.includes(parent.id) ? "bg-[#14c1d5]" : "bg-[#d2f1f5] opacity-50"
                    }`}
                  >
                    {selectedIds.includes(parent.id) && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                </div>

                <div className="flex min-w-0 items-center gap-[8px]">
                  <EntityAvatar name={parent.name} src={parent.avatar} className="size-8" />
                  <span
                    className="min-w-0 truncate text-[#0d0d12] text-[14px] leading-snug"
                    title={parent.name}
                  >
                    {parent.name}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-start">
                  <span className="line-clamp-2 min-w-0 text-left text-[#0d0d12] text-[14px] leading-snug">
                    {parent.studentsLabel}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-start">
                  <span
                    className="min-w-0 truncate text-[#0d0d12] text-[14px]"
                    title={parent.email}
                  >
                    {parent.email}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-start">
                  <span className="min-w-0 truncate text-[#0d0d12] text-[14px]">
                    {parent.phone}
                  </span>
                </div>

                <div className={`flex items-center justify-center relative ${openActionId === parent.id ? "z-[100]" : ""}`} ref={openActionId === parent.id ? actionRef : null}>
                  <DashboardRowActionsMenu
                    label={`Actions for ${parent.name}`}
                    isOpen={openActionId === parent.id}
                    onToggle={() => {
                      setIsFilterDropdownOpen(false);
                      setOpenActionId(openActionId === parent.id ? null : parent.id);
                    }}
                    onClose={() => setOpenActionId(null)}
                    actions={[
                      {
                        label: "Manage students",
                        icon: <Users2 className="size-5" aria-hidden strokeWidth={1.8} />,
                        onClick: () => openLinkManager(parent),
                      },
                      {
                        label: "Create invite link",
                        icon: <Link2 className="size-5" aria-hidden strokeWidth={1.8} />,
                        onClick: () => void createInviteLink(parent),
                      },
                      {
                        label: "Edit contact",
                        onClick: () =>
                          setEditDraft({
                            id: parent.id,
                            name: parent.name,
                            email: parent.email,
                            phone: parent.phone.replace(/^—$/, ""),
                          }),
                      },
                      {
                        label: "Message",
                        icon: <Mail className="size-5" aria-hidden strokeWidth={1.8} />,
                        onClick: () => setMessageFor({ id: parent.id, name: parent.name, email: parent.email }),
                      },
                      {
                        label: "View Students",
                        onClick: () => setStudentsForParent({ parentId: parent.id, parentName: parent.name, rows: parent.linkedStudents }),
                      },
                      {
                        label: "Delete parent",
                        tone: "danger",
                        onClick: () => setDeleteDraft({ parent, deleting: false, error: null }),
                      },
                    ]}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="flex gap-[12px] items-center justify-center py-[10px] border-t border-[#f0f0f0] px-[18px] pb-[16px]">
          <button
            type="button"
            onClick={() => handlePageChange("prev")}
            disabled={currentPage === 1}
            className={`flex items-center justify-center size-[24px] rounded-full transition-colors ${
              currentPage === 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100 hover:opacity-70"
            }`}
            aria-label="Previous page"
          >
            <ChevronLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
          </button>
          <div className="flex gap-[3px] items-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => setCurrentPage(pageNum)}
                className={`transition-colors flex flex-col items-center justify-center px-[5px] py-[9px] rounded-[9px] size-[24px] ${
                  currentPage === pageNum ? "bg-[#14c1d5] hover:bg-[#12aebd]" : "hover:bg-gray-100"
                }`}
              >
                <span
                  className={`font-semibold text-[12px] leading-[0] ${
                    currentPage === pageNum ? "text-white" : "text-[#666d80]"
                  }`}
                >
                  {pageNum}
                </span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handlePageChange("next")}
            disabled={currentPage === totalPages || totalPages === 0}
            className={`flex items-center justify-center size-[24px] rounded-full transition-colors ${
              currentPage === totalPages || totalPages === 0
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-gray-100 hover:opacity-70"
            }`}
            aria-label="Next page"
          >
            <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
          </button>
        </div>
      </div>

      <div className="flex justify-end w-full flex-col items-end gap-2">
        {spreadsheetBanner && (
          <p className="text-xs text-[#3d5a45] bg-[#f0f7f2] px-3 py-1.5 rounded-md border border-[#c5ddcc] max-w-md text-right">
            {spreadsheetBanner}
          </p>
        )}
        <button
          type="button"
          onClick={exportParents}
          className="bg-[#d2f1f5] shadow-sm flex gap-[8px] items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#bce6ec] transition-colors cursor-pointer"
        >
          <p className="font-sans font-medium text-[#14c1d5] text-[16px] tracking-[0.32px]">
            Download CSV
          </p>
        </button>
      </div>

      {editDraft && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#272932]">Edit parent</h2>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm text-gray-700">
                Name
                <input
                  className="mt-1 w-full rounded-md border border-gray-200 p-2 outline-none focus:border-[#14c1d5] focus:ring-1 focus:ring-[#14c1d5] font-normal"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                />
              </label>
              <label className="text-sm text-gray-700">
                Email
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-gray-200 p-2 outline-none focus:border-[#14c1d5] focus:ring-1 focus:ring-[#14c1d5] font-normal"
                  value={editDraft.email}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, email: e.target.value } : d))}
                />
              </label>
              <label className="text-sm text-gray-700">
                Phone
                <input
                  className="mt-1 w-full rounded-md border border-gray-200 p-2 outline-none focus:border-[#14c1d5] focus:ring-1 focus:ring-[#14c1d5] font-normal"
                  value={editDraft.phone}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, phone: e.target.value } : d))}
                />
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setEditDraft(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebd]"
                onClick={() => void saveEdit()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteDraft && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#272932]">Delete parent</h2>
            <p className="mt-2 text-sm leading-6 text-[#666d80]">
              Delete <span className="font-semibold text-[#272932]">{deleteDraft.parent.name}</span>? This removes their parent record, student links, and parent login when it is only a parent account.
            </p>
            {deleteDraft.error ? (
              <div role="alert" className="mt-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {deleteDraft.error}
              </div>
            ) : null}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                disabled={deleteDraft.deleting}
                onClick={() => setDeleteDraft(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#d80509] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b90408] disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deleteDraft.deleting}
                onClick={() => void deleteParent()}
              >
                {deleteDraft.deleting ? "Deleting..." : "Delete parent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {messageFor && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#0d0d12]">Message parent</h2>
            <p className="mt-2 text-sm text-[#666d80]">
              Open a draft to <span className="font-semibold">{messageFor.name}</span>. Nothing is sent until you send
              it from your mail app.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setMessageFor(null)}
              >
                Close
              </button>
              <a
                className="rounded-md bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebd]"
                href={mailtoHref({
                  to: messageFor.email,
                  subject: "Message from Curious Innovators Academy",
                  body: `Hi ${messageFor.name},\n\n`,
                })}
              >
                Open email draft
              </a>
            </div>
          </div>
        </div>
      )}

      {studentsForParent && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#272932]">Students — {studentsForParent.parentName}</h2>
            {studentsForParent.rows.length === 0 ? (
              <p className="mt-4 text-sm text-[#666d80]">No linked students on file.</p>
            ) : (
              <ul className="mt-4 flex flex-col gap-2">
                {studentsForParent.rows.map((s) => (
                  <li key={`${studentsForParent.parentName}-${s.id}`}>
                    <Link
                      href={`/dashboard/students/${s.id}`}
                      className="text-sm font-medium text-[#14c1d5] hover:underline"
                      onClick={() => setStudentsForParent(null)}
                    >
                      {s.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-medium text-[#14c1d5] hover:bg-[#d2f1f5]"
                onClick={() => {
                  const parent = displayRows.find((row) => row.id === studentsForParent.parentId);
                  if (parent) openLinkManager(parent);
                  setStudentsForParent(null);
                }}
              >
                Manage links
              </button>
              <Link
                href="/dashboard/students"
                className="rounded-md px-4 py-2 text-sm font-medium text-[#14c1d5] hover:bg-[#d2f1f5]"
                onClick={() => setStudentsForParent(null)}
              >
                All students
              </Link>
              <button
                type="button"
                className="rounded-md bg-[#fafafa] px-4 py-2 text-sm font-semibold text-[#0d0d12] hover:bg-gray-100"
                onClick={() => setStudentsForParent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {linkDraft && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="flex max-h-[86vh] w-full max-w-2xl flex-col rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-[#272932]">Manage students — {linkDraft.parent.name}</h2>
                <p className="mt-1 text-sm text-[#666d80]">
                  These links control what this parent can see after signing in.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-3 py-1.5 text-sm text-[#666d80] hover:bg-gray-100"
                onClick={() => setLinkDraft(null)}
              >
                Close
              </button>
            </div>

            <div className="mt-4 rounded-[10px] border border-[#f0f0f0] px-3 py-2">
              <input
                value={linkDraft.search}
                onChange={(event) =>
                  setLinkDraft((draft) => (draft ? { ...draft, search: event.target.value } : draft))
                }
                placeholder="Search students..."
                className="w-full bg-transparent text-sm outline-none placeholder:text-[#8b919f]"
              />
            </div>

            {linkDraft.error ? (
              <div className="mt-3 rounded-[10px] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {linkDraft.error}
              </div>
            ) : null}

            <div className="mt-4 min-h-[240px] overflow-y-auto rounded-[12px] border border-[#f0f0f0]">
              {!allStudents ? (
                <div className="p-4 text-sm text-[#666d80]">Loading students...</div>
              ) : linkableStudents.length === 0 ? (
                <div className="p-4 text-sm text-[#666d80]">No students match this search.</div>
              ) : (
                linkableStudents.map((student) => {
                  const checked = linkDraft.selectedIds.has(student.id);
                  const linkedElsewhere = (student.parentIds ?? []).some((id) => id !== linkDraft.parent.id);
                  return (
                    <label
                      key={student.id}
                      className="flex cursor-pointer items-center justify-between gap-3 border-b border-[#f0f0f0] px-4 py-3 last:border-b-0 hover:bg-[#fafafa]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-[#0d0d12]">{student.name}</span>
                        <span className="block truncate text-xs text-[#666d80]">
                          {linkedElsewhere ? `Currently linked to ${student.parent || "another parent"}` : "No other parent link"}
                        </span>
                      </span>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() =>
                          setLinkDraft((draft) => {
                            if (!draft) return draft;
                            const selectedIds = new Set(draft.selectedIds);
                            if (selectedIds.has(student.id)) selectedIds.delete(student.id);
                            else selectedIds.add(student.id);
                            return { ...draft, selectedIds };
                          })
                        }
                        className="size-4 accent-[#14c1d5]"
                      />
                    </label>
                  );
                })
              )}
            </div>

            <div className="mt-5 flex items-center justify-between gap-3">
              <p className="text-sm text-[#666d80]">
                {linkDraft.selectedIds.size} selected
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                  onClick={() => setLinkDraft(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={linkDraft.saving || !allStudents}
                  className="rounded-md bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebd] disabled:opacity-60"
                  onClick={() => void saveStudentLinks()}
                >
                  {linkDraft.saving ? "Saving..." : "Save links"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {inviteDraft && (
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#d2f1f5]">
                <Send className="size-5 text-[#14c1d5]" aria-hidden strokeWidth={1.8} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[#272932]">Invite {inviteDraft.parent.name}</h2>
                <p className="mt-1 text-sm text-[#666d80]">
                  Send this account setup link to the parent. Their student access comes from the saved links on this page.
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-[10px] border border-[#f0f0f0] bg-[#fafafa] p-3 text-xs text-[#0d0d12] break-all">
              {inviteDraft.inviteUrl}
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setInviteDraft(null)}
              >
                Close
              </button>
              <button
                type="button"
                className="rounded-md border border-[#14c1d5]/40 px-4 py-2 text-sm font-semibold text-[#14c1d5] hover:bg-[#ecfdff]"
                onClick={async () => {
                  await navigator.clipboard.writeText(inviteDraft.inviteUrl);
                  setInviteDraft((draft) => (draft ? { ...draft, copied: true } : draft));
                }}
              >
                {inviteDraft.copied ? "Copied" : "Copy link"}
              </button>
              <a
                className="rounded-md bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebd]"
                href={mailtoHref({
                  to: inviteDraft.parent.email,
                  subject: "Your Curious Innovators Academy account",
                  body: `Hi ${inviteDraft.parent.name},\n\nPlease use this account setup link:\n${inviteDraft.inviteUrl}\n\n`,
                })}
              >
                Open email draft
              </a>
            </div>
          </div>
        </div>
      )}
      <DashboardBulkImportModal
        isOpen={isImportOpen}
        onClose={() => setIsImportOpen(false)}
        title="Bulk import parents"
        entityLabel="parent"
        filename="parents-import-template.csv"
        columns={[
          { key: "name", label: "Name", required: true, sample: "New Parent" },
          { key: "email", label: "Email", required: true, sample: "parent@example.com" },
        ]}
        onImport={importParents}
      />
    </div>
  );
}
