"use client";

import type { DataSource } from "@/lib/data/fetch-source";
import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  DASHBOARD_PANEL_CLASS,
  DASHBOARD_TABLE_SCROLL_CLASS,
} from "@/lib/dashboard-shell-classes";
import { fallbackDirectoryBannerText, exportQueuedToast, messagingDialogDisclaimer } from "@/lib/product-copy";

const imgMaterialSymbolsSearch = "https://www.figma.com/api/mcp/asset/cb2db90b-2b30-409c-be8b-d29b6c20bdc2";

const imgVector = "https://www.figma.com/api/mcp/asset/827e4416-5636-49fa-a2ec-c005068ebc41";
const imgIconCaretDown = "https://www.figma.com/api/mcp/asset/b35b801d-b00c-47b0-b222-6e5e17bc5d91";
const imgIcRoundPlus = "https://www.figma.com/api/mcp/asset/f9521d8b-9782-4428-8c82-ba25fd8a152d";
const imgWeuiMoreOutlined = "https://www.figma.com/api/mcp/asset/289cd33e-0d75-474a-a765-907c87145ac4";
const imgChevronDown = "https://www.figma.com/api/mcp/asset/0321004a-e7e0-42bd-aefd-a220009368ae";
const imgChevronDown1 = "https://www.figma.com/api/mcp/asset/b67abd41-82b4-48c7-ba4b-ad72a2cc4ec8";
const imgHugeiconsTeacher = "https://www.figma.com/api/mcp/asset/7a890e53-59c1-468e-b39e-2bde451a56e3";

type ProgramKind = "core" | "enrichment";

type TeacherRow = {
  id: string;
  name: string;
  subjects: string;
  email: string;
  phone: string;
  avatar: string;
  program: ProgramKind;
};

export type TeachersTeacherListProps = {
  initialTeachers: TeacherRow[];
  dataSource: DataSource;
};

export default function TeachersTeacherList({
  initialTeachers,
  dataSource,
}: TeachersTeacherListProps) {
  const [teachers, setTeachers] = useState<TeacherRow[]>(() => [...initialTeachers]);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTeachers, setSelectedTeachers] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [programFilter, setProgramFilter] = useState<"all" | ProgramKind>("all");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [spreadsheetBanner, setSpreadsheetBanner] = useState<string | null>(null);

  const [viewTeacher, setViewTeacher] = useState<TeacherRow | null>(null);
  const [editTeacher, setEditTeacher] = useState<TeacherRow | null>(null);
  const [editDraft, setEditDraft] = useState({ name: "", subjects: "", email: "", phone: "", program: "core" as ProgramKind });
  const [messageTeacher, setMessageTeacher] = useState<TeacherRow | null>(null);
  const [removeTeacherId, setRemoveTeacherId] = useState<string | null>(null);

  const itemsPerPage = 10;
  const dropdownRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const t = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(t);
  }, [toastMessage]);

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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdown(null);
      }
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredTeachers = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return teachers.filter((teacher) => {
      const matchesSearch =
        teacher.name.toLowerCase().includes(q) || teacher.subjects.toLowerCase().includes(q) || teacher.email.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (programFilter === "all") return true;
      return teacher.program === programFilter;
    });
  }, [teachers, searchQuery, programFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, programFilter, teachers.length]);

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage) || 1;
  const paginatedTeachers = filteredTeachers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSelectAll = () => {
    if (selectedTeachers.length === filteredTeachers.length && filteredTeachers.length > 0) {
      setSelectedTeachers([]);
    } else {
      setSelectedTeachers(filteredTeachers.map((t) => t.id));
    }
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      setActiveDropdown(null);
    }
  };

  const openEdit = (t: TeacherRow) => {
    setEditTeacher(t);
    setEditDraft({
      name: t.name,
      subjects: t.subjects,
      email: t.email,
      phone: t.phone,
      program: t.program,
    });
    setActiveDropdown(null);
  };

  const saveEdit = async () => {
    if (!editTeacher) return;
    const name = editDraft.name.trim();
    if (!name) return;
    const id = editTeacher.id;
    const prevSnapshot = teachers.find((t) => t.id === id);
    const optimistic: TeacherRow = {
      ...editTeacher,
      name,
      subjects: editDraft.subjects.trim() || editTeacher.subjects,
      email: editDraft.email.trim() || editTeacher.email,
      phone: editDraft.phone.trim() || editTeacher.phone,
      program: editDraft.program,
    };
    setTeachers((prev) => prev.map((row) => (row.id === id ? optimistic : row)));
    setEditTeacher(null);
    const res = await fetch("/api/data/teachers", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id,
        name: optimistic.name,
        subjects: optimistic.subjects,
        email: optimistic.email,
        phone: optimistic.phone,
        program: optimistic.program,
      }),
    });
    if (res.ok) {
      const body = (await res.json()) as { teacher: TeacherRow };
      setTeachers((prev) => prev.map((row) => (row.id === body.teacher.id ? body.teacher : row)));
      setToastMessage("Teacher updated.");
      return;
    }
    if (prevSnapshot) {
      setTeachers((prev) => prev.map((row) => (row.id === id ? prevSnapshot : row)));
    }
    setSyncHint(`Could not sync update (${await readApiError(res)}).`);
    setToastMessage("Kept local edit only.");
  };

  const filterLabel =
    programFilter === "all" ? "All classes" : programFilter === "core" ? "Core classes" : "Enrichment classes";

  const stats = useMemo(() => {
    const total = teachers.length;
    const core = teachers.filter((t) => t.program === "core").length;
    const enrichment = teachers.filter((t) => t.program === "enrichment").length;
    const withEmail = teachers.filter((t) => t.email.trim()).length;
    return { total, core, enrichment, withEmail };
  }, [teachers]);

  return (
    <div className="flex flex-col w-full min-h-full px-[32px] py-[32px] gap-[24px] relative">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-[8px]">
          <h1 className="font-['Inter:Bold',sans-serif] font-bold leading-[1.1] text-[#272932] text-[28px]">Teachers</h1>
          <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] text-[#666d80] text-[16px] max-w-3xl">
            Directory of faculty, programs, and contact information.
          </p>
          {dataSource === "fallback" ? (
            <p className="max-w-3xl rounded-md border border-[#e8e9ed] bg-[#f6f7f9] px-3 py-1.5 text-xs text-[#525a63] leading-snug">
              {fallbackDirectoryBannerText()}
            </p>
          ) : null}
          {syncHint ? (
            <p className="max-w-3xl rounded-md border border-amber-200/80 bg-amber-50/90 px-3 py-1.5 text-xs text-amber-950 leading-snug">
              {syncHint}
            </p>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]">
              <img alt="" className="size-[20px]" src={imgHugeiconsTeacher} />
            </div>
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">Total Teachers</p>
              <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[rgba(0,77,8,0.2)] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]" />
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">Core program</p>
              <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">{stats.core}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[rgba(207,165,0,0.2)] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]" />
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">Enrichment program</p>
              <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">{stats.enrichment}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-[#f0f0f0] border-solid flex items-center px-[14px] py-[12px] rounded-[18px] hover:shadow-md transition-shadow">
          <div className="flex gap-[8px] items-center w-full">
            <div className="bg-[#e6f7f9] flex items-center justify-center rounded-[10px] shrink-0 size-[40px]" />
            <div className="flex flex-col gap-[4px] leading-[1.4]">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">With email on file</p>
              <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">{stats.withEmail}</p>
            </div>
          </div>
        </div>
      </div>
      <div className={[DASHBOARD_PANEL_CLASS, "flex flex-col px-[18px] py-[16px] w-full"].join(" ")}>
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 w-full">
            <div className="flex gap-[6px] items-center bg-white border border-[#f0f0f0] px-3 py-2 rounded-lg focus-within:border-[#14c1d5] focus-within:ring-1 focus-within:ring-[#14c1d5] transition-all w-full max-w-xs">
              <div className="relative shrink-0 size-[14px]">
                <img alt="Search" className="absolute block inset-0 max-w-none size-full" src={imgMaterialSymbolsSearch} />
              </div>
              <input
                type="text"
                placeholder="Search teachers…"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[14px] outline-none bg-transparent w-full"
              />
            </div>

            <div className="flex flex-wrap gap-[16px] items-center">
              <div className="relative" ref={filterRef}>
                <button
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                  className={`bg-[#fafafa] transition-colors flex gap-[4px] items-center p-[8px] rounded-[8px] ${
                    isFilterOpen ? "ring-2 ring-[#14c1d5] bg-gray-50" : "hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center pr-[2px] py-[2px]">
                    <div className="relative shrink-0 size-[14px]">
                      <div className="absolute inset-[15.63%_10.2%_8.98%_10.2%]">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector} />
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center px-[2px]">
                    <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] text-[#0d0d12] text-[12px] text-center">
                      Program: {filterLabel}
                    </p>
                  </div>
                  <div className="flex items-center py-[2px]">
                    <div className="relative shrink-0 size-[14px]">
                      <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIconCaretDown} />
                    </div>
                  </div>
                </button>

                {isFilterOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-40">
                    <button
                      type="button"
                      onClick={() => {
                        setProgramFilter("all");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        programFilter === "all" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"
                      }`}
                    >
                      All Classes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProgramFilter("core");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        programFilter === "core" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"
                      }`}
                    >
                      Core Classes
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProgramFilter("enrichment");
                        setIsFilterOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                        programFilter === "enrichment" ? "text-[#14c1d5] bg-blue-50 font-medium" : "text-gray-700"
                      }`}
                    >
                      Enrichment Classes
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={handleSelectAll}
                className={`${selectedTeachers.length > 0 ? "bg-[#d2f1f5] text-[#14c1d5]" : "bg-[#fafafa] text-[#0d0d12]"} hover:bg-gray-100 transition-colors flex items-center p-[8px] rounded-[8px]`}
              >
                <div className="flex items-center px-[2px]">
                  <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] text-[12px] text-center">
                    {selectedTeachers.length > 0 ? `Deselect All (${selectedTeachers.length})` : "Select All"}
                  </p>
                </div>
              </button>

              <Link
                href="/dashboard/teachers/new"
                className="bg-[#14c1d5] hover:bg-[#12aebd] transition-colors cursor-pointer drop-shadow-[0px_1px_1px_rgba(13,13,18,0.06)] flex gap-[8px] items-center justify-center px-[16px] py-[8px] rounded-[6px]"
              >
                <div className="relative shrink-0 size-[24px]">
                  <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgIcRoundPlus} />
                </div>
                <p className="font-['Inter_Tight:SemiBold',sans-serif] leading-[1.5] text-[14px] text-center text-white tracking-[0.28px]">
                  Create Teacher
                </p>
              </Link>
            </div>
          </div>

          <div className={DASHBOARD_TABLE_SCROLL_CLASS}>
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className="border-t border-[#f0f0f0]">
                  <th className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[14px] py-[16px] px-[10px]">Teacher</th>
                  <th className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[14px] py-[16px] px-[10px]">Subjects</th>
                  <th className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[14px] py-[16px] px-[10px]">Email</th>
                  <th className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[14px] py-[16px] px-[10px]">Phone</th>
                  <th className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[14px] py-[16px] px-[10px] text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTeachers.length > 0 ? (
                  paginatedTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className={`border-b border-[#f0f0f0] hover:bg-gray-50 transition-colors ${
                        selectedTeachers.includes(teacher.id) ? "bg-[#f8fdfd]" : ""
                      }`}
                    >
                      <td className="py-[12px] px-[10px]">
                        <div className="flex gap-[12px] items-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedTeachers.includes(teacher.id)) {
                                setSelectedTeachers(selectedTeachers.filter((id) => id !== teacher.id));
                              } else {
                                setSelectedTeachers([...selectedTeachers, teacher.id]);
                              }
                            }}
                            className={`border border-[#14c1d5] border-solid rounded-[4px] shrink-0 size-[14px] flex items-center justify-center transition-colors ${
                              selectedTeachers.includes(teacher.id) ? "bg-[#14c1d5]" : "bg-[#d2f1f5] opacity-50"
                            }`}
                          >
                            {selectedTeachers.includes(teacher.id) && (
                              <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                          <div className="flex gap-[6px] items-center min-w-0">
                            <img alt={teacher.name} className="size-[32px] rounded-full object-cover shrink-0" height="32" src={teacher.avatar} width="32" />
                            <p className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[16px] truncate">{teacher.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-[12px] px-[10px]">
                        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[16px]">{teacher.subjects}</p>
                      </td>
                      <td className="py-[12px] px-[10px]">
                        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[16px]">{teacher.email}</p>
                      </td>
                      <td className="py-[12px] px-[10px]">
                        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[16px]">{teacher.phone}</p>
                      </td>
                      <td className="py-[12px] px-[10px] relative">
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === teacher.id ? null : teacher.id);
                            }}
                            className={`block cursor-pointer size-[24px] hover:opacity-70 transition-opacity rounded-full p-1 ${
                              activeDropdown === teacher.id ? "bg-gray-200" : "hover:bg-gray-200"
                            }`}
                          >
                            <img alt="More" className="block size-full" src={imgWeuiMoreOutlined} />
                          </button>
                        </div>

                        {activeDropdown === teacher.id && (
                          <div ref={dropdownRef} className="absolute right-10 top-10 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-30">
                            <button
                              type="button"
                              onClick={() => {
                                setViewTeacher(teacher);
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              View
                            </button>
                            <Link
                              href="/dashboard/schedule"
                              onClick={() => setActiveDropdown(null)}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              View Schedule
                            </Link>
                            <button
                              type="button"
                              onClick={() => openEdit(teacher)}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Edit Teacher
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMessageTeacher(teacher);
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Message
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              type="button"
                              onClick={() => {
                                setRemoveTeacherId(teacher.id);
                                setActiveDropdown(null);
                              }}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Remove Teacher
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-[32px] text-center text-[#666d80] font-['Inter:Regular',sans-serif]">
                      {searchQuery.trim()
                        ? `No teachers found matching "${searchQuery}"`
                        : "No teachers match the current program filter."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-[12px] items-center justify-center py-[10px] border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={`flex items-center justify-center size-[24px] rotate-90 rounded-full transition-colors ${
                currentPage === 1 ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100 hover:opacity-70"
              }`}
            >
              <img alt="Previous" className="block w-[18px] h-[18px]" src={imgChevronDown} />
            </button>
            <div className="flex gap-[3px] items-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`transition-colors flex flex-col items-center justify-center px-[5px] py-[9px] rounded-[9px] size-[24px] ${
                    currentPage === page ? "bg-[#14c1d5] hover:bg-[#12aebd]" : "hover:bg-gray-100"
                  }`}
                >
                  <p
                    className={`font-['Inter:Semi_Bold',sans-serif] font-semibold text-[12px] text-center leading-[0] ${
                      currentPage === page ? "text-white" : "text-[#666d80]"
                    }`}
                  >
                    {page}
                  </p>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={`flex items-center justify-center size-[24px] -rotate-90 rounded-full transition-colors ${
                currentPage === totalPages ? "opacity-30 cursor-not-allowed" : "hover:bg-gray-100 hover:opacity-70"
              }`}
            >
              <img alt="Next" className="block w-[18px] h-[18px]" src={imgChevronDown1} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 w-full">
        {spreadsheetBanner && (
          <p className="text-xs text-[#3d5a45] bg-[#f0f7f2] px-3 py-1.5 rounded-md border border-[#c5ddcc] w-fit max-w-full">
            {spreadsheetBanner}
          </p>
        )}
        <button
          type="button"
          onClick={() => setSpreadsheetBanner(exportQueuedToast())}
          className="bg-[#d2f1f5] hover:bg-[#bce6ec] transition-colors drop-shadow-[0px_0px_4.8px_rgba(0,0,0,0.12)] flex gap-[8px] items-center justify-center px-[16px] py-[8px] rounded-[6px] w-fit cursor-pointer"
        >
          <p className="font-['Inter_Tight:Medium',sans-serif] leading-[1.5] text-[#14c1d5] text-[16px] text-center tracking-[0.32px]">
            Upload to Spreadsheet
          </p>
        </button>
      </div>

      {toastMessage && (
        <div className="fixed bottom-8 right-8 z-[200] rounded-lg border border-[rgba(20,193,213,0.4)] bg-white px-4 py-3 text-sm text-[#0d0d12] shadow-lg max-w-sm">
          {toastMessage}
        </div>
      )}

      {viewTeacher && (
        <div
          className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#0d0d12]">{viewTeacher.name}</h2>
            <p className="mt-3 text-sm text-[#666d80]">
              <span className="font-semibold text-[#0d0d12]">Subjects:</span> {viewTeacher.subjects}
            </p>
            <p className="mt-2 text-sm text-[#666d80]">
              <span className="font-semibold text-[#0d0d12]">Program:</span> {viewTeacher.program === "core" ? "Core" : "Enrichment"}
            </p>
            <p className="mt-2 text-sm text-[#666d80] break-all">{viewTeacher.email}</p>
            <p className="mt-1 text-sm text-[#666d80]">{viewTeacher.phone}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Link
                href="/dashboard/schedule"
                className="rounded-md px-4 py-2 text-sm font-medium text-[#14c1d5] hover:bg-[#d2f1f5]"
                onClick={() => setViewTeacher(null)}
              >
                Schedule
              </Link>
              <button
                type="button"
                className="rounded-md bg-[#fafafa] px-4 py-2 text-sm font-semibold text-[#0d0d12] hover:bg-gray-100"
                onClick={() => setViewTeacher(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editTeacher && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#272932]">Edit teacher</h2>
            <div className="mt-4 flex flex-col gap-3">
              <label className="text-sm text-gray-700">
                Name
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={editDraft.name}
                  onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </label>
              <label className="text-sm text-gray-700">
                Subjects
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={editDraft.subjects}
                  onChange={(e) => setEditDraft((d) => ({ ...d, subjects: e.target.value }))}
                />
              </label>
              <label className="text-sm text-gray-700">
                Email
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={editDraft.email}
                  onChange={(e) => setEditDraft((d) => ({ ...d, email: e.target.value }))}
                />
              </label>
              <label className="text-sm text-gray-700">
                Phone
                <input
                  className="mt-1 w-full rounded-md border p-2"
                  value={editDraft.phone}
                  onChange={(e) => setEditDraft((d) => ({ ...d, phone: e.target.value }))}
                />
              </label>
              <label className="text-sm text-gray-700">
                Program
                <select
                  className="mt-1 w-full rounded-md border p-2 bg-white"
                  value={editDraft.program}
                  onChange={(e) => setEditDraft((d) => ({ ...d, program: e.target.value as ProgramKind }))}
                >
                  <option value="core">Core</option>
                  <option value="enrichment">Enrichment</option>
                </select>
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" onClick={() => setEditTeacher(null)}>
                Cancel
              </button>
              <button type="button" className="rounded-md bg-[#14c1d5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#12aebd]" onClick={saveEdit}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {messageTeacher && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#0d0d12]">Message teacher</h2>
            <p className="mt-2 text-sm text-[#666d80]">
              A message composer for <span className="font-semibold">{messageTeacher.name}</span> will open when
              messaging is enabled. {messagingDialogDisclaimer()}
            </p>
            <div className="mt-6 flex justify-end">
              <button type="button" className="rounded-md px-4 py-2 text-sm text-gray-600 hover:bg-gray-100" onClick={() => setMessageTeacher(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {removeTeacherId !== null && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-[#272932]">Remove teacher?</h2>
            <p className="mt-2 text-sm text-[#666d80]">
              Remove this teacher from the directory? If the server rejects the change, refresh to restore the row.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md bg-[#fafafa] px-4 py-2 text-sm font-semibold text-[#0d0d12]"
                onClick={() => setRemoveTeacherId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-[#d80509] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c00408]"
                onClick={async () => {
                  if (removeTeacherId === null) return;
                  const id = removeTeacherId;
                  const removed = teachers.find((t) => t.id === id);
                  setTeachers((prev) => prev.filter((t) => t.id !== id));
                  setSelectedTeachers((prev) => prev.filter((tid) => tid !== id));
                  setRemoveTeacherId(null);
                  const res = await fetch(`/api/data/teachers?id=${encodeURIComponent(String(id))}`, {
                    method: "DELETE",
                  });
                  if (!res.ok && removed) {
                    setTeachers((prev) =>
                      [...prev, removed].sort((a, b) => String(a.id).localeCompare(String(b.id))),
                    );
                    setSyncHint(`Could not delete in cloud (${await readApiError(res)}).`);
                    return;
                  }
                  setToastMessage("Teacher removed.");
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
