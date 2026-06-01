"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { cachedJson, peekCachedJson } from "@/lib/client-data-cache";
import {
  selectedParentStudentIdFromSearchParams,
  withParentStudentParam,
} from "@/lib/parent-student-selection";
import { PARENT_SCHEDULE_DAYS, classSchedulePartsFromFields } from "@/lib/schedule-slots";
import type { SchoolClassRow, StudentProfileBundle } from "@/lib/data/types";
import { ParentClassDetailsDrawer, type ParentClassOption, type ScheduleDisplayParts } from "@/components/parent-class-drawers";
import { parentClassOptionFromRow } from "@/lib/parent-class-options";

const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector3 = "/images/vector.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";

type ParentClassRow = {
  id: string;
  name: string;
  teacher: string;
  level: string;
  block: string;
  day: string;
  time: string;
  location: string;
  status: string;
  current: boolean;
  option: ParentClassOption;
};

function toParentClassRow(row: SchoolClassRow): ParentClassRow {
  const { day, time } = classSchedulePartsFromFields({
    block: row.block,
    level: row.level,
    scheduleSummary: row.schedule,
  });
  return {
    id: row.id,
    name: row.name,
    teacher: row.teacher || "Teacher not assigned",
    level: row.level || "—",
    block: row.block || "—",
    day,
    time,
    location: row.location || "Room not assigned",
    status: "School Assigned",
    current: row.status === "Active",
    option: parentClassOptionFromRow(row),
  };
}

function dataHintFromSource(source?: string) {
  if (source === "fallback") return "Showing starter classes while class records finish loading.";
  if (source === "unavailable") return "Classes are temporarily unavailable.";
  return null;
}

function profileCoreClassKeys(profile?: StudentProfileBundle | null) {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const cls of profile?.coreClasses ?? []) {
    if (cls.id) ids.add(cls.id);
    if (cls.name) names.add(cls.name);
  }
  return { ids, names };
}

function coreRowsForProfile(rows: SchoolClassRow[], profile?: StudentProfileBundle | null) {
  const keys = profileCoreClassKeys(profile);
  if (keys.ids.size === 0 && keys.names.size === 0) return [];
  const coreRows: ParentClassRow[] = [];
  for (const row of rows) {
    if (row.program !== "core") continue;
    if (!keys.ids.has(row.id) && !keys.names.has(row.name)) continue;
    coreRows.push(toParentClassRow(row));
  }
  return coreRows;
}

function readCachedCoreClasses(studentId: string | null) {
  const body = peekCachedJson<{ classes?: SchoolClassRow[]; source?: string }>("/api/data/classes");
  const profile = studentId
    ? peekCachedJson<{ profile?: StudentProfileBundle | null }>(
      `/api/data/students/${encodeURIComponent(studentId)}/profile`,
    )?.profile
    : null;
  return {
    body,
    profile,
    rows: coreRowsForProfile(body?.classes ?? [], profile),
  };
}

export default function ParentClassesCoreClient() {
  const searchParams = useSearchParams();
  const selectedParentStudentId = selectedParentStudentIdFromSearchParams(searchParams);
  const [classes, setClasses] = useState<ParentClassRow[]>([]);
  const [dataHint, setDataHint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("name");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedClassDetails, setSelectedClassDetails] = useState<{
    option: ParentClassOption;
    statusLabel: string;
    scheduleDisplay: ScheduleDisplayParts;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      const cached = readCachedCoreClasses(selectedParentStudentId);
      if (cached.body && (cached.profile || !selectedParentStudentId)) {
        setClasses(cached.rows);
        setDataHint(dataHintFromSource(cached.body.source));
        setIsLoading(false);
      } else {
        setIsLoading(true);
      }
      try {
        const [body, profileBody] = await Promise.all([
          cachedJson<{ classes?: SchoolClassRow[]; source?: string }>("/api/data/classes"),
          selectedParentStudentId
            ? cachedJson<{ profile?: StudentProfileBundle | null; source?: string }>(
              `/api/data/students/${encodeURIComponent(selectedParentStudentId)}/profile`,
            )
            : Promise.resolve<{ profile?: StudentProfileBundle | null }>({ profile: null }),
        ]);
        const rows = coreRowsForProfile(body.classes ?? [], profileBody.profile ?? null);
        if (cancelled) return;
        setClasses(rows);
        setDataHint(dataHintFromSource(body.source));
      } catch (error) {
        if (!cancelled) {
          setClasses([]);
          setDataHint(
            `Could not load classes: ${error instanceof Error ? error.message : String(error)}.`,
          );
        }
      }
      finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, [selectedParentStudentId]);

  const filteredAndSortedClasses = useMemo(() => {
    let result = [...classes];

    // Filter by Search Query
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(
        (cls) =>
          cls.name.toLowerCase().includes(lowerQuery) ||
          cls.teacher.toLowerCase().includes(lowerQuery)
      );
    }

    // Filter by Day
    if (filterDay !== "All") {
      result = result.filter((cls) => cls.day === filterDay);
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
  }, [classes, searchQuery, filterDay, sortBy]);

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, []);

  return (
    <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-[4px] items-start w-full">
        <h1 className="font-bold text-[#272932] text-[28px] leading-[1.1]">
          Core classes
        </h1>
        <p className="font-normal text-[#666d80] text-[16px] leading-[1.4]">
          View your child’s core academic classes assigned by the school. These classes are fixed and cannot be modified by parents.
        </p>
      </div>

      {/* Tabs & Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full border-b border-[#f0f0f0] pb-0">
        <div className="flex items-center gap-2">
          <Link
            href={withParentStudentParam("/dashboard/parents/classes/core", selectedParentStudentId)}
            className="bg-[#d2f1f5] text-[#0d0d12] px-[50px] py-[12px] rounded-t-[8px] text-[14px] leading-[1.25] text-center"
          >
            Core
          </Link>
          <Link
            href={withParentStudentParam("/dashboard/parents/classes/enrichment", selectedParentStudentId)}
            className="bg-[rgba(210,241,245,0.3)] hover:bg-[rgba(210,241,245,0.5)] transition-colors text-[#0d0d12] px-[50px] py-[12px] rounded-t-[8px] text-[14px] leading-[1.25] text-center"
          >
            Enrichment
          </Link>
        </div>
        <div className="flex items-center gap-[6px] pb-2 sm:pb-0">
          <div className="bg-[#d2f1f5] border border-[#14c1d5] rounded-[4px] shrink-0 size-[17px]" />
          <span className="text-[#0d0d12] text-[12px] leading-[1.25]">
            Current classes
          </span>
        </div>
      </div>

      {dataHint && (
        <div className="rounded-[12px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-3 text-sm text-[#7a5b00] font-medium">
          {dataHint}
        </div>
      )}

      {isLoading && classes.length === 0 && (
        <div className="rounded-[18px] border border-[#f0f0f0] bg-white p-4 shadow-sm">
          <div className="h-5 w-40 animate-pulse rounded bg-[#eef1f5]" />
          <div className="mt-4 space-y-3">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-12 animate-pulse rounded-[8px] bg-[#f7f8fa]" />
            ))}
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className={`bg-white border border-[#f0f0f0] rounded-[18px] flex flex-col shadow-sm w-full overflow-hidden ${isLoading && classes.length === 0 ? "hidden" : ""}`}>
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 w-full gap-4">
          <div className="flex gap-[6px] items-center">
            <div className="size-[14px]">
              <img alt="Search" className="size-full" src={imgMaterialSymbolsSearch} />
            </div>
            <input
              aria-label="Search core classes"
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-[#0d0d12] text-[12px] bg-transparent outline-none placeholder:text-[#0d0d12] min-w-[200px]"
            />
          </div>
          <div className="flex flex-wrap gap-[16px] items-center">
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
              >
                <div className="size-[14px] flex items-center justify-center">
                  <img alt="Filter" className="size-full" src={imgVector3} />
                </div>
                <span className="text-[#0d0d12] text-[12px]">Filter by: {filterDay}</span>
                <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
              </button>
              {isFilterOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-10 w-32">
                  {["All", ...PARENT_SCHEDULE_DAYS].map((day) => (
                    <button
                      type="button"
                      key={day}
                      onClick={() => { setFilterDay(day); setIsFilterOpen(false); }}
                      className="block w-full text-left px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      {day}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
              >
                <div className="size-[14px] flex items-center justify-center">
                  <img alt="Sort" className="size-full" src={imgFlowbiteSortOutline} />
                </div>
                <span className="text-[#0d0d12] text-[12px]">
                  Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                </span>
                <ChevronDown className="size-[14px] shrink-0 text-[#666d80]" aria-hidden strokeWidth={1.8} />
              </button>
              {isSortOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-10 w-32">
                  {["name", "teacher", "level"].map((sortOption) => (
                    <button
                      type="button"
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

            <Link
              href={withParentStudentParam("/dashboard/parents/schedule", selectedParentStudentId)}
              className="bg-[#fafafa] flex items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
            >
              <span className="text-[#0d0d12] text-[12px]">
                View schedule
              </span>
            </Link>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto w-full">
          <div className="min-w-[880px]">
            {/* Table Header Columns */}
            <div className="grid grid-cols-[14fr_12fr_6fr_6fr_15fr_12fr_12fr_6fr] border-t border-[#f0f0f0] py-[16px] px-4 w-full items-center gap-x-2">
              <div className="text-[#0d0d12] font-semibold text-[14px]">Class Name</div>
              <div className="text-[#0d0d12] font-semibold text-[14px]">Teacher</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] text-center">Level</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] text-center">Block</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] text-center">Schedule</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] text-center">Location</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] text-center">Status</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] text-center">Action</div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col w-full">
              {filteredAndSortedClasses.length === 0 ? (
                <div className="py-[32px] text-center text-gray-500 font-sans">
                  {isLoading
                    ? "Loading classes..."
                    : dataHint?.startsWith("Could not load")
                      ? "Class data is unavailable."
                      : "No classes found matching the criteria."}
                </div>
              ) : (
                filteredAndSortedClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className={`grid grid-cols-[14fr_12fr_6fr_6fr_15fr_12fr_12fr_6fr] border-t border-[#f0f0f0] py-[12px] px-4 w-full items-center gap-x-2 transition-colors ${
                      cls.current ? "bg-[rgba(208,243,247,0.29)] hover:bg-[rgba(208,243,247,0.4)]" : "bg-white hover:bg-gray-50"
                    }`}
                  >
                    <div className="text-[#0d0d12] text-[16px] pr-2">
                      {cls.name}
                    </div>
                    <div className="text-[#0d0d12] text-[16px]">
                      {cls.teacher}
                    </div>
                    <div className="text-[#0d0d12] text-[16px] text-center">
                      {cls.level}
                    </div>
                    <div className="text-[#0d0d12] text-[16px] text-center">
                      {cls.block}
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="text-[#0d0d12] text-[16px]">{cls.day}</span>
                      <span className="text-[#666d80] text-[11px]">{cls.time}</span>
                    </div>
                    <div className="text-[#0d0d12] text-[16px] text-center">
                      {cls.location}
                    </div>
                    <div className="flex justify-center">
                      <div className="bg-[#d2f1f5] border border-[rgba(20,193,213,0.5)] px-[8px] py-[2px] rounded-[6px]">
                        <span className="text-[#1392a0] text-[10px] whitespace-nowrap">
                          {cls.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-center relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId(openMenuId === cls.id ? null : cls.id);
                        }}
                        className="size-[24px] hover:opacity-70 transition-opacity"
                      >
                        <img alt="More" className="size-full" src={imgWeuiMoreOutlined} />
                      </button>
                      {openMenuId === cls.id && (
                        <div
                          ref={menuRef}
                          className="absolute right-[28px] top-full mt-1 w-48 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-50 py-1 text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="w-full px-4 py-2 text-sm text-[#0d0d12] hover:bg-gray-50 text-left"
                            onClick={() => {
                              setSelectedClassDetails({
                                option: cls.option,
                                statusLabel: cls.status,
                                scheduleDisplay: { day: cls.day, time: cls.time },
                              });
                              setOpenMenuId(null);
                            }}
                          >
                            View Class
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Pagination */}
        {filteredAndSortedClasses.length > 0 && (
          <div className="flex items-center justify-center py-4 border-t border-[#f0f0f0] gap-3">
            <button type="button" className="size-[18px] flex items-center justify-center hover:opacity-70" aria-label="Previous page">
              <ChevronLeft className="size-[18px]" aria-hidden strokeWidth={1.8} />
            </button>
            <div className="flex items-center gap-1">
              <button type="button" className="bg-[#14c1d5] text-white font-semibold text-[12px] size-[24px] rounded-[6px] flex items-center justify-center">
                1
              </button>
            </div>
            <button type="button" className="size-[18px] flex items-center justify-center hover:opacity-70" aria-label="Next page">
              <ChevronRight className="size-[18px]" aria-hidden strokeWidth={1.8} />
            </button>
          </div>
        )}
      </div>
      {selectedClassDetails ? (
        <ParentClassDetailsDrawer
          option={selectedClassDetails.option}
          statusLabel={selectedClassDetails.statusLabel}
          scheduleDisplay={selectedClassDetails.scheduleDisplay}
          onClose={() => setSelectedClassDetails(null)}
        />
      ) : null}
    </div>
  );
}
