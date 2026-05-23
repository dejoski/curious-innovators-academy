"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { cachedJson, peekCachedJson } from "@/lib/client-data-cache";
import { splitScheduleLabel } from "@/lib/schedule-slots";
import {
  catalogChoiceReviews,
  readParentCatalogSnapshot,
  type LocalReviewStatuses,
  type ParentCatalogChoice,
  type ParentCatalogRequests,
} from "@/lib/parent-catalog-state";
import type { SchoolClassRow } from "@/lib/data/types";

const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector3 = "/images/vector.svg";
const imgIconCaretDown = "/images/icon-caret-down.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";

type ParentEnrichmentRow = {
  id: string;
  name: string;
  teacher: string;
  level: string;
  block: string;
  day: string;
  time: string;
  location: string;
  availability: string;
  status: string;
  current: boolean;
  requestSource?: "local-draft";
};

type DraftChoiceWithLocalId = ParentCatalogChoice & {
  localId: string;
};

function toParentEnrichmentRow(row: SchoolClassRow): ParentEnrichmentRow {
  const { day, time } = splitScheduleLabel(row.schedule);
  return {
    id: row.id,
    name: row.name,
    teacher: row.teacher || "Teacher not assigned",
    level: row.level || "—",
    block: row.block || "—",
    day,
    time,
    location: row.location || "Room not assigned",
    availability: row.status === "Full" ? "Full" : "Open",
    status: row.pendingCount > 0 ? "Pending" : "--",
    current: row.pendingCount === 0 && row.status === "Active",
  };
}

export default function EnrichmentClassesPage() {
  const [classes, setClasses] = useState<ParentEnrichmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(() => !peekCachedJson<{ classes?: SchoolClassRow[] }>("/api/data/classes"));
  const [catalogDraft, setCatalogDraft] = useState<ParentCatalogRequests | null>(null);
  const [localReviewStatuses, setLocalReviewStatuses] = useState<LocalReviewStatuses>({});
  const [dataHint, setDataHint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("name");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toolbarBanner, setToolbarBanner] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setIsLoading(true);
      try {
        const body = await cachedJson<{ classes?: SchoolClassRow[]; source?: string }>("/api/data/classes");
        const rows = (body.classes ?? [])
          .filter((row) => row.program === "enrichment")
          .map(toParentEnrichmentRow);
        if (cancelled) return;
        setClasses(rows);
        setDataHint(
          body.source === "fallback"
            ? "Showing sample classes because cloud data is unavailable."
            : body.source === "unavailable"
              ? "Cloud classes are unavailable. Ask an administrator to configure Supabase."
              : null,
        );
      } catch (error) {
        if (!cancelled) {
          setClasses([]);
          setDataHint(
            `Could not load classes: ${error instanceof Error ? error.message : String(error)}.`,
          );
        }
      }
    }
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

	  useEffect(() => {
	    function readCatalogDraft() {
	      const snapshot = readParentCatalogSnapshot();
	      setCatalogDraft(snapshot.requests);
	      setLocalReviewStatuses(snapshot.reviewStatuses);
	    }

    readCatalogDraft();
    window.addEventListener("cia-parent-catalog-updated", readCatalogDraft);
    window.addEventListener("storage", readCatalogDraft);
    return () => {
      window.removeEventListener("cia-parent-catalog-updated", readCatalogDraft);
      window.removeEventListener("storage", readCatalogDraft);
    };
  }, []);

	  const filteredAndSortedClasses = useMemo(() => {
	    const draftChoices: DraftChoiceWithLocalId[] = catalogChoiceReviews(catalogDraft, localReviewStatuses).map((choice) => ({
	      id: choice.classId,
	      name: choice.name,
	      localId: choice.id,
	    }));
    const draftIds = new Set(draftChoices.map((choice) => choice.id).filter(Boolean));
    const draftNames = new Set(draftChoices.map((choice) => choice.name).filter(Boolean));

    let result = classes.map((cls) => {
      const isDraftRequest = draftIds.has(cls.id) || draftNames.has(cls.name);
      const matchedDraft = draftChoices.find((choice) => choice.id === cls.id || choice.name === cls.name);
      const reviewedStatus = matchedDraft ? localReviewStatuses[matchedDraft.localId] : undefined;
      return isDraftRequest
        ? {
            ...cls,
            status: reviewedStatus ?? "Pending",
            current: reviewedStatus === "Approved",
            requestSource: "local-draft" as const,
          }
        : cls;
    });

    // Filter by Search Query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (cls) =>
          cls.name.toLowerCase().includes(lowerQuery) ||
          cls.teacher.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by Status
    if (filterStatus !== "All") {
      result = result.filter((cls) => cls.status === filterStatus);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      } else if (sortBy === "teacher") {
        return a.teacher.localeCompare(b.teacher);
      } else if (sortBy === "level") {
        return a.level.localeCompare(b.level);
      }
      return 0;
    });

    return result;
  }, [catalogDraft, classes, localReviewStatuses, searchQuery, filterStatus, sortBy]);

  useEffect(() => {
    if (!toolbarBanner) return;
    const t = window.setTimeout(() => setToolbarBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [toolbarBanner]);

  useEffect(() => {
    function handleDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, []);

  const handleSelectAll = () => {
    const ids = filteredAndSortedClasses.map((c) => c.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setToolbarBanner(null);
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...ids.filter((id) => !prev.includes(id))])]);
    setToolbarBanner(`Selected ${ids.length} enrichment row(s).`);
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const visibleIds = filteredAndSortedClasses.map((c) => c.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const renderStatusBadge = (status: string) => {
    if (status === "Approved") {
      return (
        <div className="inline-flex items-center justify-center px-2 py-1 bg-[#004d08]/20 border border-[#004d08]/50 rounded-md">
          <span className="text-[10px] text-[#004d08]">Approved</span>
        </div>
      );
    }
    if (status === "Pending") {
      return (
        <div className="inline-flex items-center justify-center px-2 py-1 bg-[#ffd9d9] border border-[#d80509]/50 rounded-md">
          <span className="text-[10px] text-[#d80509]">Pending</span>
        </div>
      );
    }
    if (status === "Rejected") {
      return (
        <div className="inline-flex items-center justify-center px-2 py-1 bg-[#ffd9d9] border border-[#d80509]/50 rounded-md">
          <span className="text-[10px] text-[#d80509]">Rejected</span>
        </div>
      );
    }
    return <span className="text-[16px] text-[#0d0d12]">--</span>;
  };

  return (
    <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 flex flex-col gap-8 font-sans">
      {/* Header Section */}
      <div className="flex flex-col gap-[4px] items-start w-full">
        <h1 className="font-bold text-[#272932] text-[28px] leading-[1.1]">
          Enrichment classes
        </h1>
        <p className="font-normal text-[#666d80] text-[16px] leading-[1.4] max-w-3xl">
          Browse enrichment classes, track request status, and see options linked from Catalog.
        </p>
      </div>

      {/* Tabs and Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full border-b border-[#f0f0f0] pb-0">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/parents/classes/core"
            className="bg-[rgba(210,241,245,0.3)] hover:bg-[rgba(210,241,245,0.5)] transition-colors text-[#0d0d12] px-[50px] py-[12px] rounded-t-[8px] font-['Inter:Regular',sans-serif] text-[14px] leading-[1.25] text-center"
          >
            Core
          </Link>
          <Link
            href="/dashboard/parents/classes/enrichment"
            className="bg-[#d2f1f5] text-[#0d0d12] px-[50px] py-[12px] rounded-t-[8px] font-['Inter:Regular',sans-serif] text-[14px] leading-[1.25] text-center"
          >
            Enrichment
          </Link>
        </div>
        <div className="flex items-center gap-[6px] pb-2 sm:pb-0">
          <div className="bg-[#d2f1f5] border border-[#14c1d5] rounded-[4px] shrink-0 size-[17px]" />
          <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px] leading-[1.25]">
            Current classes
          </span>
        </div>
      </div>

      {toolbarBanner && (
        <div className="rounded-[12px] border border-[rgba(0,77,8,0.25)] bg-[rgba(0,77,8,0.06)] px-4 py-3 text-sm text-[#004d08] font-medium">
          {toolbarBanner}
        </div>
      )}

      {dataHint && (
        <div className="rounded-[12px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-3 text-sm text-[#7a5b00] font-medium">
          {dataHint}
        </div>
      )}

      {filteredAndSortedClasses.some((cls) => cls.requestSource === "local-draft") && (
        <div className="rounded-[12px] border border-[#14c1d5]/30 bg-[#ecfdff] px-4 py-3 text-sm text-[#155e66] font-medium">
          Showing request statuses from your saved class-selection flow.
        </div>
      )}

      {/* Table Container */}
      <div className="flex flex-col bg-white border border-[#f0f0f0] rounded-[18px] overflow-hidden shadow-sm w-full">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 w-full">
          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-[#f0f0f0] rounded-lg px-3 py-2 w-full sm:w-auto">
            <img src={imgMaterialSymbolsSearch} className="w-[14px] h-[14px]" alt="Search" />
            <input 
              type="text" 
              placeholder="Search by class or teacher..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-[12px] text-[#0d0d12] placeholder-[#818898] outline-none w-full bg-transparent min-w-[200px]"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="flex items-center gap-1 bg-[#fafafa] hover:bg-[#f0f0f0] px-2 py-2 rounded-lg transition-colors"
              >
                <img src={imgVector3} className="w-[14px] h-[14px]" alt="Filter" />
                <span className="text-[12px] text-[#0d0d12]">Status: {filterStatus}</span>
                <img src={imgIconCaretDown} className="w-[14px] h-[14px]" alt="Dropdown" />
              </button>
              {isFilterOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-10 w-32">
                  {["All", "Approved", "Pending", "Rejected", "--"].map((status) => (
                    <button
                      key={status}
                      onClick={() => { setFilterStatus(status); setIsFilterOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="flex items-center gap-1 bg-[#fafafa] hover:bg-[#f0f0f0] px-2 py-2 rounded-lg transition-colors"
              >
                <img src={imgFlowbiteSortOutline} className="w-[14px] h-[14px]" alt="Sort" />
                <span className="text-[12px] text-[#0d0d12]">
                  Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                </span>
                <img src={imgIconCaretDown} className="w-[14px] h-[14px]" alt="Dropdown" />
              </button>
              {isSortOpen && (
                <div className="absolute top-full right-0 mt-1 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-10 w-32">
                  {["name", "teacher", "level"].map((sortOption) => (
                    <button
                      key={sortOption}
                      onClick={() => { setSortBy(sortOption); setIsSortOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleSelectAll}
              className="bg-[#fafafa] hover:bg-[#f0f0f0] px-3 py-2 rounded-lg transition-colors"
            >
              <span className="text-[12px] text-[#0d0d12]">
                {allVisibleSelected ? "Deselect All" : "Select All"}
              </span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[940px]">
            {/* Headers */}
            <thead>
              <tr className="border-t border-b border-[#f0f0f0]">
                <th className="w-10 py-4 px-1" aria-hidden />
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12]">Class Name</th>
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12]">Teacher</th>
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12] text-center">Level</th>
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12] text-center">Block</th>
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12]">Schedule</th>
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12]">Location</th>
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12] text-center">Availability</th>
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12] text-center">Status</th>
                <th className="py-4 px-2 text-[14px] font-semibold text-[#0d0d12] text-center">Action</th>
              </tr>
            </thead>
            {/* Body */}
            <tbody>
              {filteredAndSortedClasses.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-gray-500 font-sans">
                    No classes found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredAndSortedClasses.map((cls) => (
                  <tr
                    key={cls.id}
                    className={`border-b border-[#f0f0f0] transition-colors ${
                      cls.current ? "bg-[rgba(208,243,247,0.29)] hover:bg-[rgba(208,243,247,0.4)]" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <td className="py-3 px-1 align-middle">
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => toggleRowSelection(cls.id)}
                          className={`size-[14px] rounded-[4px] border flex items-center justify-center transition-colors shrink-0 ${
                            selectedIds.includes(cls.id)
                              ? "bg-[#14c1d5] border-[#14c1d5]"
                              : "bg-white border-[#c2c2c2]"
                          }`}
                          aria-label={selectedIds.includes(cls.id) ? "Deselect row" : "Select row"}
                        >
                          {selectedIds.includes(cls.id) && (
                            <svg width="10" height="8" viewBox="0 0 10 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-[16px] text-[#0d0d12]">{cls.name}</span>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-[16px] text-[#0d0d12]">{cls.teacher}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-[16px] text-[#0d0d12]">{cls.level}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-[16px] text-[#0d0d12]">{cls.block}</span>
                    </td>
                    <td className="py-3 px-2">
                      <div className="flex flex-col">
                        <span className="text-[16px] text-[#0d0d12]">{cls.day}</span>
                        <span className="text-[11px] text-[#666d80]">{cls.time}</span>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-[16px] text-[#0d0d12]">{cls.location}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className="text-[16px] text-[#0d0d12]">{cls.availability}</span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      {renderStatusBadge(cls.status)}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="relative inline-flex justify-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === cls.id ? null : cls.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded-md inline-flex items-center justify-center"
                        >
                          <img src={imgWeuiMoreOutlined} className="w-6 h-6" alt="More" />
                        </button>
                        {openMenuId === cls.id && (
                          <div
                            ref={menuRef}
                            className="absolute right-0 top-full mt-1 z-50 w-52 rounded-md border border-[#f0f0f0] bg-white py-1 shadow-lg text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              className="block w-full px-4 py-2 text-left text-sm text-[#0d0d12] hover:bg-gray-50"
                              onClick={() => {
                                setToolbarBanner(
                                  `Class summary: ${cls.name} · ${cls.block} · ${cls.day}`
                                );
                                setOpenMenuId(null);
                              }}
                            >
                              View class summary
                            </button>
                            <Link
                              href="/dashboard/parents/catalog"
                              className="block w-full px-4 py-2 text-sm font-medium text-[#14c1d5] hover:bg-gray-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Open class catalog
                            </Link>
                            <Link
                              href="/dashboard/parents/students"
                              className="block w-full px-4 py-2 text-sm text-[#0d0d12] hover:bg-gray-50"
                              onClick={() => setOpenMenuId(null)}
                            >
                              Student profile
                            </Link>
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
      </div>
    </div>
  );
}
