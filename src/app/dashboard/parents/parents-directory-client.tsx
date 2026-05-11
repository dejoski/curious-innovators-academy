"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import type { ParentSummary } from "@/lib/data/types";
import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  DASHBOARD_PANEL_CLASS,
  DASHBOARD_TABLE_SCROLL_CLASS,
} from "@/lib/dashboard-shell-classes";
import { exportQueuedToast, fallbackDirectoryBannerText, messagingDialogDisclaimer } from "@/lib/product-copy";

const imgEllipse2735 = "https://www.figma.com/api/mcp/asset/0836cdc9-a46a-4af1-9ce4-c2d78a5687b1";
const imgEllipse2736 = "https://www.figma.com/api/mcp/asset/cec90de7-31dd-41ca-a0c6-68bf3eef3409";
const imgMaterialSymbolsSearch = "https://www.figma.com/api/mcp/asset/8b924d8e-9944-4fd7-a143-5b972d23f195";
const imgVector = "https://www.figma.com/api/mcp/asset/c1e2a9ae-b7c1-4a59-ad69-e834d210eae6";
const imgIconCaretDown = "https://www.figma.com/api/mcp/asset/4a484470-f50e-4836-892a-38b8df909232";
const imgWeuiMoreOutlined = "https://www.figma.com/api/mcp/asset/d0d58e57-bc5e-4d6f-9b38-9e46533f037e";
const imgChevronDown2 = "https://www.figma.com/api/mcp/asset/0c634e28-3ff4-4f7e-b080-5090eadc7f40";
const imgChevronDown3 = "https://www.figma.com/api/mcp/asset/0cf12711-502e-41c4-88c5-b14817fda4bc";
const imgHugeiconsFamilies = "https://www.figma.com/api/mcp/asset/7a890e53-59c1-468e-b39e-2bde451a56e3";

export type ParentsDirectoryPageClientProps = {
  initialParents: ParentSummary[];
  dataSource: DataSource;
};

type ParentRow = {
  id: number;
  name: string;
  avatar: string;
  studentsLabel: string;
  email: string;
  phone: string;
  status: string;
  linkedStudents: { id: number; name: string }[];
};

function toDisplayRow(p: ParentSummary): ParentRow {
  const avatar =
    p.avatar ??
    (Math.abs(Number(p.id)) % 2 === 1 ? imgEllipse2735 : imgEllipse2736);
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
  "minmax(260px, 1.35fr) minmax(180px, 1.15fr) minmax(200px, 1.05fr) minmax(120px, 0.95fr) minmax(44px, 44px)";

const DIRECTORY_PAGE_SIZE = 10;

export function ParentsAdminDirectory({
  initialParents,
  dataSource,
}: ParentsDirectoryPageClientProps) {
  const [parents, setParents] = useState<ParentSummary[]>(() => [...initialParents]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [editDraft, setEditDraft] = useState<{
    id: number;
    name: string;
    email: string;
    phone: string;
  } | null>(null);
  const [messageFor, setMessageFor] = useState<{ id: number; name: string } | null>(
    null,
  );
  const [studentsForParent, setStudentsForParent] = useState<{
    parentName: string;
    rows: { id: number; name: string }[];
  } | null>(null);
  const [spreadsheetBanner, setSpreadsheetBanner] = useState<string | null>(null);

  const filterRef = React.useRef<HTMLDivElement>(null);
  const actionRef = React.useRef<HTMLDivElement>(null);

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
    const inactive = rows.filter((p) => p.status === "Inactive").length;
    const studentLinks = rows.reduce((acc, p) => acc + p.linkedStudents.length, 0);
    return { total, active, inactive, studentLinks };
  }, [displayRows]);

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
    if (
      filteredIds.length > 0 &&
      filteredIds.every((id) => selectedIds.includes(id))
    ) {
      setSelectedIds((prev) => prev.filter((id) => !filteredIds.includes(id)));
    } else {
      setSelectedIds((prev) => {
        const s = new Set(prev);
        for (const id of filteredIds) s.add(id);
        return [...s];
      });
    }
  };

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id],
    );
  };

  const handlePageChange = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) setCurrentPage((c) => c - 1);
    if (direction === "next" && currentPage < totalPages) setCurrentPage((c) => c + 1);
  };

  const saveEdit = () => {
    if (!editDraft) return;
    const name = editDraft.name.trim();
    if (!name) return;
    setParents((prev) =>
      prev.map((p) =>
        p.id === editDraft.id
          ? {
              ...p,
              name,
              email: editDraft.email.trim() || p.email,
              phone: editDraft.phone.trim() || p.phone,
            }
          : p,
      ),
    );
    setEditDraft(null);
  };

  return (
    <div className="flex flex-col w-full min-h-full px-[32px] py-[32px] gap-[24px] font-sans relative">
      <div className="flex flex-col gap-[8px]">
        <h1 className="font-['Inter:Bold',sans-serif] font-bold leading-[1.1] text-[#272932] text-[28px]">
          Parents
        </h1>
        <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] text-[#666d80] text-[16px] max-w-3xl">
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
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">
                Total families
              </p>
              <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
                {stats.total}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[rgba(0,77,8,0.2)] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]" />
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">
                Active
              </p>
              <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
                {stats.active}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[rgba(207,165,0,0.2)] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]" />
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">
                Inactive
              </p>
              <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
                {stats.inactive}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[#e6f7f9] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]" />
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">
                Student links
              </p>
              <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
                {stats.studentLinks}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className={[DASHBOARD_PANEL_CLASS, "flex flex-col w-full overflow-hidden"].join(" ")}>
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
              className="outline-none text-[14px] w-full text-[#0d0d12] font-['Inter:Regular',sans-serif] bg-transparent placeholder:text-[#666d80]"
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
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px]">
                  Status: {statusFilter === "All" ? "All" : statusFilter}
                </span>
                <div className="size-[14px]">
                  <img alt="" className="size-full" src={imgIconCaretDown} />
                </div>
              </button>

              {isFilterDropdownOpen && (
                <div
                  className="absolute top-full right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50"
                  onClick={(e) => e.stopPropagation()}
                >
                  {(["All", "Active", "Inactive"] as const).map((status) => (
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
              <p className="font-['Inter:Regular',sans-serif] text-[12px]">
                {selectedIds.length > 0 ? `Deselect All (${selectedIds.length})` : "Select All"}
              </p>
            </button>
          </div>
        </div>

        <div
          style={{ gridTemplateColumns: PARENTS_TABLE_GRID_TEMPLATE_COLUMNS }}
          className="grid gap-x-2 border-t border-[#f0f0f0] py-[16px] px-[18px] w-full items-center"
        >
          <div className="flex justify-start min-w-0 text-[#0d0d12] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[14px]">
            Parent
          </div>
          <div className="flex justify-center text-[#0d0d12] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[14px]">
            Students
          </div>
          <div className="flex justify-center text-[#0d0d12] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[14px]">
            Email
          </div>
          <div className="flex justify-center text-[#0d0d12] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[14px]">
            Phone
          </div>
          <div className="flex justify-center text-[#0d0d12] font-['Inter:Semi_Bold',sans-serif] font-semibold text-[14px]">
            Action
          </div>
        </div>

        <div className={`${DASHBOARD_TABLE_SCROLL_CLASS} flex flex-col w-full pb-4`}>
          {paginatedData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-[32px] px-[18px]">
              <span className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[14px] text-center leading-snug max-w-lg">
                {parents.length === 0 && dataSource === "remote"
                  ? "No parent contacts yet. Add guardians in your database or connect the parents roster."
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
                <div className="flex gap-[12px] items-center min-w-0">
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
                  <div className="flex min-w-0 flex-1 gap-[6px] items-center">
                    <img alt="" className="size-[32px] shrink-0 rounded-full object-cover" src={parent.avatar} />
                    <span
                      className="min-w-0 font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px] leading-snug"
                      title={parent.name}
                    >
                      {parent.name}
                    </span>
                  </div>
                </div>

                <div className="flex min-w-0 items-center justify-center">
                  <span className="line-clamp-2 min-w-0 text-center font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px]">
                    {parent.studentsLabel}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-center">
                  <span
                    className="min-w-0 truncate font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px]"
                    title={parent.email}
                  >
                    {parent.email}
                  </span>
                </div>

                <div className="flex min-w-0 items-center justify-center">
                  <span className="min-w-0 truncate font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px]">
                    {parent.phone}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-center relative ${openActionId === parent.id ? "z-[100]" : ""}`}
                  ref={openActionId === parent.id ? actionRef : null}
                >
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsFilterDropdownOpen(false);
                      setOpenActionId(openActionId === parent.id ? null : parent.id);
                    }}
                    className={`cursor-pointer relative size-[24px] hover:opacity-70 transition-opacity rounded-full p-1 ${openActionId === parent.id ? "bg-gray-200" : "hover:bg-gray-200"}`}
                  >
                    <img alt="" className="block size-full" src={imgWeuiMoreOutlined} />
                  </button>

                  {openActionId === parent.id && (
                    <div
                      className="absolute right-[32px] top-full mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-[100]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setEditDraft({
                            id: parent.id,
                            name: parent.name,
                            email: parent.email,
                            phone: parent.phone.replace(/^—$/, ""),
                          });
                          setOpenActionId(null);
                        }}
                      >
                        Edit contact
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setMessageFor({ id: parent.id, name: parent.name });
                          setOpenActionId(null);
                        }}
                      >
                        Message
                      </button>
                      <button
                        type="button"
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        onClick={() => {
                          setStudentsForParent({ parentName: parent.name, rows: parent.linkedStudents });
                          setOpenActionId(null);
                        }}
                      >
                        View Students
                      </button>
                    </div>
                  )}
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
            className={`flex items-center justify-center size-[24px] rotate-90 rounded-full transition-colors ${
              currentPage === 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100 hover:opacity-70"
            }`}
          >
            <img alt="" className="w-[18px] h-[18px]" src={imgChevronDown2} />
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
                  className={`font-['Inter:Semi_Bold',sans-serif] font-semibold text-[12px] leading-[0] ${
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
            className={`flex items-center justify-center size-[24px] -rotate-90 rounded-full transition-colors ${
              currentPage === totalPages || totalPages === 0
                ? "opacity-30 cursor-not-allowed"
                : "hover:bg-gray-100 hover:opacity-70"
            }`}
          >
            <img alt="" className="w-[18px] h-[18px]" src={imgChevronDown3} />
          </button>
        </div>
      </div>

      <div className="flex justify-end w-full flex-col items-end gap-2">
        {spreadsheetBanner && (
          <p className="text-xs text-[#3d5a45] bg-[#f0f7f2] px-3 py-1.5 rounded-md border border-[#c5ddcc] max-w-md text-right font-['Inter:Regular',sans-serif]">
            {spreadsheetBanner}
          </p>
        )}
        <button
          type="button"
          onClick={() => setSpreadsheetBanner(exportQueuedToast())}
          className="bg-[#d2f1f5] shadow-sm flex gap-[8px] items-center justify-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#bce6ec] transition-colors cursor-pointer"
        >
          <p className="font-['Inter_Tight:Medium',sans-serif] text-[#14c1d5] text-[16px] tracking-[0.32px]">
            Upload to Spreadsheet
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
              <label className="text-sm text-gray-700 font-['Inter:Regular',sans-serif]">
                Name
                <input
                  className="mt-1 w-full rounded-md border border-gray-200 p-2 outline-none focus:border-[#14c1d5] focus:ring-1 focus:ring-[#14c1d5] font-normal"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, name: e.target.value } : d))}
                />
              </label>
              <label className="text-sm text-gray-700 font-['Inter:Regular',sans-serif]">
                Email
                <input
                  type="email"
                  className="mt-1 w-full rounded-md border border-gray-200 p-2 outline-none focus:border-[#14c1d5] focus:ring-1 focus:ring-[#14c1d5] font-normal"
                  value={editDraft.email}
                  onChange={(e) => setEditDraft((d) => (d ? { ...d, email: e.target.value } : d))}
                />
              </label>
              <label className="text-sm text-gray-700 font-['Inter:Regular',sans-serif]">
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
                onClick={saveEdit}
              >
                Save
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
              A message composer for <span className="font-semibold">{messageFor.name}</span> will open when
              messaging is enabled. {messagingDialogDisclaimer()}
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setMessageFor(null)}
              >
                Close
              </button>
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
    </div>
  );
}
