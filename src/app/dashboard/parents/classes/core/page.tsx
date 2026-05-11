"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

const imgMaterialSymbolsSearch = "/images/icon-generic.svg";
const imgVector3 = "/images/icon-generic.svg";
const imgIconCaretDown = "/images/icon-generic.svg";
const imgFlowbiteSortOutline = "/images/icon-generic.svg";
const imgWeuiMoreOutlined = "/images/icon-generic.svg";
const imgChevronDown2 = "/images/icon-generic.svg";
const imgChevronDown3 = "/images/icon-generic.svg";

const initialClassesData = [
  {
    id: "pc1",
    name: "Math",
    teacher: "Ms. Jonhson",
    level: "3",
    block: "B2",
    day: "Monday",
    time: "8:00 AM - 9:30 AM",
    location: "Room 101",
    status: "School Assigned",
    current: true,
  },
  {
    id: "pc2",
    name: "Science",
    teacher: "Mr. Carter",
    level: "3",
    block: "B2",
    day: "Friday",
    time: "10:30 AM - 12:00 PM",
    location: "Room 302",
    status: "School Assigned",
    current: false,
  },
  {
    id: "pc3",
    name: "English Language Arts.",
    teacher: "Mr. Garcia",
    level: "4",
    block: "B3",
    day: "Monday",
    time: "8:00 AM - 9:30 AM",
    location: "Room 203",
    status: "School Assigned",
    current: true,
  },
  {
    id: "pc4",
    name: "History",
    teacher: "Mr. Garcia",
    level: "4",
    block: "B4",
    day: "Tuesday",
    time: "8:00 AM - 9:30 AM",
    location: "Room 104",
    status: "School Assigned",
    current: false,
  },
  {
    id: "pc5",
    name: "Math",
    teacher: "Ms. Jumper",
    level: "4",
    block: "B2",
    day: "Monday",
    time: "8:00 AM - 9:30 AM",
    location: "Room 905",
    status: "School Assigned",
    current: false,
  },
  {
    id: "pc6",
    name: "Science",
    teacher: "Mr. Carter",
    level: "3",
    block: "B2",
    day: "Friday",
    time: "8:00 AM - 9:30 AM",
    location: "Room 806",
    status: "School Assigned",
    current: false,
  },
  {
    id: "pc7",
    name: "English Language Arts.",
    teacher: "Mr. Garcia",
    level: "4",
    block: "B3",
    day: "Monday",
    time: "8:00 AM - 9:30 AM",
    location: "Room 107",
    status: "School Assigned",
    current: false,
  },
];

export default function ParentClassesClassListCore() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterDay, setFilterDay] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("name");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const filteredAndSortedClasses = useMemo(() => {
    let result = [...initialClassesData];

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
  }, [searchQuery, filterDay, sortBy]);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [toolbarBanner, setToolbarBanner] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    const visibleIds = filteredAndSortedClasses.map((c) => c.id);
    const allSelected =
      visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      setToolbarBanner(null);
      return;
    }
    setSelectedIds((prev) => [...new Set([...prev, ...visibleIds.filter((id) => !prev.includes(id))])]);
    setToolbarBanner(`Selected ${visibleIds.length} class row(s) on this page.`);
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const visibleIds = filteredAndSortedClasses.map((c) => c.id);
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  return (
    <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 flex flex-col gap-8 font-sans">
      {/* Header */}
      <div className="flex flex-col gap-[4px] items-start w-full">
        <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[28px] leading-[1.1]">
          Core classes
        </h1>
        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#666d80] text-[16px] leading-[1.4]">
          View your child’s core academic classes assigned by the school. These classes are fixed and cannot be modified by parents.
        </p>
      </div>

      {/* Tabs & Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full border-b border-[#f0f0f0] pb-0">
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/parents/classes/core"
            className="bg-[#d2f1f5] text-[#0d0d12] px-[50px] py-[12px] rounded-t-[8px] font-['Inter:Regular',sans-serif] text-[14px] leading-[1.25] text-center"
          >
            Core
          </Link>
          <Link
            href="/dashboard/parents/classes/enrichment"
            className="bg-[rgba(210,241,245,0.3)] hover:bg-[rgba(210,241,245,0.5)] transition-colors text-[#0d0d12] px-[50px] py-[12px] rounded-t-[8px] font-['Inter:Regular',sans-serif] text-[14px] leading-[1.25] text-center"
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

      {/* Main Table Card */}
      <div className="bg-white border border-[#f0f0f0] rounded-[18px] flex flex-col shadow-sm w-full overflow-hidden">
        {/* Table Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 w-full gap-4">
          <div className="flex gap-[6px] items-center">
            <div className="size-[14px]">
              <img alt="Search" className="size-full" src={imgMaterialSymbolsSearch} />
            </div>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px] bg-transparent outline-none placeholder:text-[#0d0d12] min-w-[200px]"
            />
          </div>
          <div className="flex flex-wrap gap-[16px] items-center">
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
              >
                <div className="size-[14px] flex items-center justify-center">
                  <img alt="Filter" className="size-full" src={imgVector3} />
                </div>
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px]">Filter by: {filterDay}</span>
                <div className="size-[14px]">
                  <img alt="Dropdown" className="size-full" src={imgIconCaretDown} />
                </div>
              </button>
              {isFilterOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-10 w-32">
                  {["All", "Monday", "Tuesday", "Friday"].map((day) => (
                    <button
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
                onClick={() => setIsSortOpen(!isSortOpen)}
                className="bg-[#fafafa] flex gap-[4px] items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
              >
                <div className="size-[14px] flex items-center justify-center">
                  <img alt="Sort" className="size-full" src={imgFlowbiteSortOutline} />
                </div>
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px]">
                  Sort: {sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}
                </span>
                <div className="size-[14px]">
                  <img alt="Dropdown" className="size-full" src={imgIconCaretDown} />
                </div>
              </button>
              {isSortOpen && (
                <div className="absolute top-full left-0 mt-1 bg-white border border-[#f0f0f0] rounded-md shadow-lg z-10 w-32">
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
              className="bg-[#fafafa] flex items-center p-[8px] rounded-[8px] hover:bg-gray-100 transition-colors"
            >
              <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[12px]">
                {allVisibleSelected ? "Deselect All" : "Select All"}
              </span>
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto w-full">
          <div className="min-w-[940px]">
            {/* Table Header Columns */}
            <div className="grid grid-cols-[44px_14fr_12fr_6fr_6fr_15fr_12fr_12fr_6fr] border-t border-[#f0f0f0] py-[16px] px-4 w-full items-center gap-x-2">
              <div />
              <div className="text-[#0d0d12] font-semibold text-[14px] font-['Inter:Semi_Bold',sans-serif]">Class Name</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] font-['Inter:Semi_Bold',sans-serif]">Teacher</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] font-['Inter:Semi_Bold',sans-serif] text-center">Level</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] font-['Inter:Semi_Bold',sans-serif] text-center">Block</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] font-['Inter:Semi_Bold',sans-serif] text-center">Schedule</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] font-['Inter:Semi_Bold',sans-serif] text-center">Location</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] font-['Inter:Semi_Bold',sans-serif] text-center">Status</div>
              <div className="text-[#0d0d12] font-semibold text-[14px] font-['Inter:Semi_Bold',sans-serif] text-center">Action</div>
            </div>

            {/* Table Rows */}
            <div className="flex flex-col w-full">
              {filteredAndSortedClasses.length === 0 ? (
                <div className="py-[32px] text-center text-gray-500 font-sans">
                  No classes found matching the criteria.
                </div>
              ) : (
                filteredAndSortedClasses.map((cls) => (
                  <div
                    key={cls.id}
                    className={`grid grid-cols-[44px_14fr_12fr_6fr_6fr_15fr_12fr_12fr_6fr] border-t border-[#f0f0f0] py-[12px] px-4 w-full items-center gap-x-2 transition-colors ${
                      cls.current ? "bg-[rgba(208,243,247,0.29)] hover:bg-[rgba(208,243,247,0.4)]" : "bg-white hover:bg-gray-50"
                    }`}
                  >
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
                    <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px] pr-2">
                      {cls.name}
                    </div>
                    <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px]">
                      {cls.teacher}
                    </div>
                    <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px] text-center">
                      {cls.level}
                    </div>
                    <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px] text-center">
                      {cls.block}
                    </div>
                    <div className="flex flex-col items-center justify-center">
                      <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px]">{cls.day}</span>
                      <span className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[11px]">{cls.time}</span>
                    </div>
                    <div className="font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[16px] text-center">
                      {cls.location}
                    </div>
                    <div className="flex justify-center">
                      <div className="bg-[#d2f1f5] border border-[rgba(20,193,213,0.5)] px-[8px] py-[2px] rounded-[6px]">
                        <span className="font-['Inter:Regular',sans-serif] text-[#1392a0] text-[10px] whitespace-nowrap">
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
                              setToolbarBanner(
                                `Schedule: ${cls.name} · ${cls.day} ${cls.time} · ${cls.location}`
                              );
                              setOpenMenuId(null);
                            }}
                          >
                            View schedule detail
                          </button>
                          <Link
                            href="/dashboard/parents/catalog"
                            className="block w-full px-4 py-2 text-sm text-[#14c1d5] hover:bg-gray-50 font-medium"
                            onClick={() => setOpenMenuId(null)}
                          >
                            Request enrichment change
                          </Link>
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
            <button className="rotate-90 size-[18px] flex items-center justify-center hover:opacity-70">
              <img alt="Previous" className="size-full" src={imgChevronDown2} />
            </button>
            <div className="flex items-center gap-1">
              <button className="bg-[#14c1d5] text-white font-['Inter:Semi_Bold',sans-serif] text-[12px] size-[24px] rounded-[6px] flex items-center justify-center">
                1
              </button>
            </div>
            <button className="-rotate-90 size-[18px] flex items-center justify-center hover:opacity-70">
              <img alt="Next" className="size-full" src={imgChevronDown3} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
