"use client";

import Link from "next/link";
import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFixedMenuPlacement } from "@/hooks/use-fixed-menu-placement";

// Figma Image Constants
const imgChevronDown = "/images/icon-chevron-down.svg";
const imgGroup = "/images/icon-group.svg";
const imgChevronDown1 = "/images/icon-chevron-down2.svg";
const imgGroup2 = "/images/icon-group.svg";
const imgGroup3 = "/images/icon-generic2.svg";
const imgMaterialSymbolsSearch = "/images/icon-search.svg";
const imgVector = "/images/vector.png";
const imgIconCaretDown = "/images/icon-caret-down.svg";
const imgFlowbiteSortOutline = "/images/icon-sort.svg";
const imgIcRoundPlus = "/images/icon-plus.svg";
const imgWeuiMoreOutlined = "/images/icon-more.svg";
const imgWeuiMoreOutlined1 = "/images/icon-more.svg";
const imgChevronDown4 = "/images/icon-chevron-down3.svg";
const imgChevronDown5 = "/images/icon-chevron-down4.svg";

type StudentStatus = 'Approved' | 'Pending' | 'Rejected';

interface Student {
  id: string;
  name: string;
  parent: string;
  age: number;
  level: string;
  status: StudentStatus;
  description: string;
}

const INITIAL_STUDENTS: Student[] = [
  { id: '1', name: 'Anna Lee', parent: 'Mary Lee', age: 14, level: '2', status: 'Approved', description: 'Focused and participative in group activities.' },
  { id: '2', name: 'George Lee', parent: 'Mary Lee', age: 12, level: '2', status: 'Pending', description: 'Curious learner, asks thoughtful questions.' },
  { id: '3', name: 'Bruna Lee', parent: 'Mary Lee', age: 14, level: '2', status: 'Approved', description: 'Needs occasional support to stay on task.' },
  { id: '4', name: 'James Smith', parent: 'Patricia Smith', age: 13, level: '3', status: 'Rejected', description: 'Strong collaboration and communication skills.' },
  { id: '5', name: 'Zoe Chen', parent: 'Wei Chen', age: 15, level: '3', status: 'Pending', description: 'Very creative and enjoys problem solving.' },
  { id: '6', name: 'Liam Brown', parent: 'Sarah Brown', age: 12, level: '1', status: 'Approved', description: 'Eager to learn basics of robotics.' },
];

export default function EnrichmentClassDetail() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>(INITIAL_STUDENTS);
  const [classTitle, setClassTitle] = useState("Robotics Lab");
  const [classDescription, setClassDescription] = useState(
    "Hands-on robotics and basic programming concepts."
  );

  // Table Controls State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'All' | StudentStatus>('All');
  const [sortBy, setSortBy] = useState<'None' | 'Name A-Z' | 'Age'>('None');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
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

  const [editClassDraft, setEditClassDraft] = useState({ title: "", description: "" });

  const [addStudentName, setAddStudentName] = useState("");
  const [addParentName, setAddParentName] = useState("");
  const [editStudentDraft, setEditStudentDraft] = useState<Student | null>(null);

  // Refs for click outside
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const actionMenuAnchorRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuPlacement = useFixedMenuPlacement(activeActionDropdown !== null, actionMenuAnchorRef, 128);

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

  // Selection Logic
  const handleSelectAll = () => {
    const paginatedIds = paginatedStudents.map(s => s.id);
    const allSelected = paginatedIds.every(id => selectedStudentIds.has(id));
    
    const newSelected = new Set(selectedStudentIds);
    if (allSelected && paginatedIds.length > 0) {
      paginatedIds.forEach(id => newSelected.delete(id));
    } else {
      paginatedIds.forEach(id => newSelected.add(id));
    }
    setSelectedStudentIds(newSelected);
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

  // Helper for Status Badge
  const getStatusStyles = (status: StudentStatus) => {
    switch (status) {
      case 'Approved':
        return "bg-[rgba(0,77,8,0.2)] border-[rgba(0,77,8,0.5)] text-[#004d08]";
      case 'Pending':
        return "bg-[rgba(207,165,0,0.2)] border-[rgba(207,165,0,0.5)] text-[#cfa500]";
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
  }

  const openEditClassModal = () => {
    setEditClassDraft({ title: classTitle, description: classDescription });
    setIsEditClassModalOpen(true);
  };

  const saveEditClass = () => {
    const t = editClassDraft.title.trim();
    if (!t) return;
    setClassTitle(t);
    setClassDescription(editClassDraft.description);
    setIsEditClassModalOpen(false);
  };

  useEffect(() => {
    const anyOpen =
      isAddStudentModalOpen ||
      isEditClassModalOpen ||
      isRemoveClassModalOpen ||
      editingStudentId !== null;

    if (!anyOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsAddStudentModalOpen(false);
        setIsEditClassModalOpen(false);
        setIsRemoveClassModalOpen(false);
        setEditingStudentId(null);
        setEditStudentDraft(null);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isAddStudentModalOpen, isEditClassModalOpen, isRemoveClassModalOpen, editingStudentId]);

  function handleSaveAddStudent() {
    const name = addStudentName.trim();
    if (!name) return;
    const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? `s-${crypto.randomUUID()}` : `s-${Date.now()}`;
    setStudents((prev) => [
      ...prev,
      {
        id,
        name,
        parent: addParentName.trim() || "—",
        age: 10,
        level: "1",
        status: "Pending",
        description: "",
      },
    ]);
    setCurrentPage(1);
    setAddStudentName("");
    setAddParentName("");
    setIsAddStudentModalOpen(false);
  }

  function handleSaveEditStudent() {
    if (!editStudentDraft || editingStudentId !== editStudentDraft.id) return;
    setStudents((prev) =>
      prev.map((s) => (s.id === editStudentDraft.id ? editStudentDraft : s)),
    );
    setEditingStudentId(null);
    setEditStudentDraft(null);
  }

  return (
    <div className="flex flex-col gap-8 p-8 w-full max-w-[1200px] mx-auto font-['Inter',sans-serif]">
      {/* Back Link */}
      <Link href="/dashboard/classes" className="flex items-center gap-4 w-fit">
        <div className="rotate-90 w-[18px] h-[18px]">
          <img src={imgChevronDown} alt="Back" className="w-full h-full object-contain" />
        </div>
        <span className="font-medium text-[#666d80] text-[14px]">Back to class setup</span>
      </Link>

      {/* Alert Banner */}
      <div className="flex items-center gap-2 bg-white border border-[#f0f0f0] rounded-[18px] p-3 shadow-sm">
        <div className="bg-[rgba(207,165,0,0.2)] rounded-[10px] w-10 h-10 flex items-center justify-center shrink-0">
          <img src={imgGroup} alt="Alert" className="w-6 h-6" />
        </div>
        <div className="flex items-center justify-between w-full ml-2">
          <p className="font-semibold text-[#272932] text-[16px]">
            5 Requests waiting for approval for this class
          </p>
          <Link
            href="/dashboard/classes/requests"
            className="flex items-center gap-2 font-semibold text-[#272932] text-[16px] hover:text-[#14c1d5] transition-colors"
          >
            Review Requests
            <img src={imgChevronDown1} alt="" className="w-[18px] h-[18px] -rotate-90" />
          </Link>
        </div>
      </div>

      {/* Header Info */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <h1 className="font-bold text-[#272932] text-[28px] leading-[1.1]">
            {classTitle}
          </h1>
          <p className="font-normal text-[#666d80] text-[16px] leading-[1.4]">
            {classDescription}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={openEditClassModal}
            className="bg-[#d2f1f5] text-[#14c1d5] font-semibold text-[16px] px-4 py-2 rounded-[6px] tracking-[0.32px] hover:bg-[#bceef4] transition-colors"
          >
            Edit Info
          </button>
          <button 
            type="button"
            onClick={() => setIsRemoveClassModalOpen(true)}
            className="bg-[#ffd9d9] text-[#d80509] font-medium text-[16px] px-4 py-2 rounded-[6px] tracking-[0.32px] hover:bg-[#ffc2c2] transition-colors"
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
            <span className="font-medium text-[#666d80] text-[16px]">Ms. Collins</span>
          </div>
        </div>

        {/* Block & Class Level */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-3 flex items-center gap-3">
          <div className="bg-[#d2f1f5] rounded-[10px] w-10 h-10 flex items-center justify-center shrink-0">
            <img src={imgGroup2} alt="Level" className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#272932] text-[16px]">Block & Class Level</span>
            <span className="font-medium text-[#666d80] text-[16px]">B3 L2</span>
          </div>
        </div>

        {/* Schedule */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-3 flex items-center gap-3">
          <div className="bg-[#d2f1f5] rounded-[10px] w-10 h-10 flex items-center justify-center shrink-0">
            <img src={imgGroup3} alt="Schedule" className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-[#272932] text-[16px]">Schedule</span>
            <span className="font-medium text-[#666d80] text-[16px]">9:40 AM - 11:10AM</span>
          </div>
        </div>

        {/* Capacity */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex flex-col justify-center gap-2">
          <div className="flex justify-between items-center w-full leading-[1.4]">
            <span className="font-semibold text-[#272932] text-[16px]">Capacity</span>
            <span className="font-semibold text-[#cfa500] text-[16px]">5 Pending</span>
          </div>
          <div className="flex items-center gap-4 w-full justify-between">
            <div className="w-full bg-[rgba(0,77,8,0.2)] h-2 rounded-[41px] relative">
              <div className="absolute top-0 left-0 bg-[#004d08] h-2 rounded-[41px]" style={{ width: '75%' }}></div>
            </div>
            <span className="font-medium text-[#666d80] text-[16px] whitespace-nowrap">15/20</span>
          </div>
        </div>
      </div>

      {/* Enrolled Students Section */}
      <div className="flex flex-col gap-4">
        <h2 className="font-bold text-[#272932] text-[24px]">Enrolled Students</h2>

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
                  <img src={imgIconCaretDown} alt="Expand" className={`w-[14px] h-[14px] transition-transform ${isFilterDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {isFilterDropdownOpen && (
                  <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-[#f0f0f0] rounded-[8px] shadow-lg z-10 py-1">
                    {(['All', 'Approved', 'Pending', 'Rejected'] as const).map(status => (
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
                  <img src={imgIconCaretDown} alt="Expand" className={`w-[14px] h-[14px] transition-transform ${isSortDropdownOpen ? 'rotate-180' : ''}`} />
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
                {paginatedStudents.length > 0 && paginatedStudents.every(s => selectedStudentIds.has(s.id)) ? 'Deselect All' : 'Select All'}
              </button>
              
              <button 
                type="button"
                onClick={() => {
                  setAddStudentName("");
                  setAddParentName("");
                  setIsAddStudentModalOpen(true);
                }}
                className="bg-[#14c1d5] shadow-sm flex items-center gap-2 px-4 py-2 rounded-[6px] hover:bg-[#11a9bb] transition-colors"
              >
                <img src={imgIcRoundPlus} alt="Add" className="w-6 h-6" />
                <span className="font-semibold text-[14px] text-white tracking-[0.28px]">Add Student</span>
              </button>
            </div>
          </div>

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
              <tbody className="text-[16px] text-[#0d0d12]">
                {paginatedStudents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-[#666d80]">No students found matching your criteria.</td>
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
                          <span className="whitespace-nowrap">{student.name}</span>
                        </div>
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">{student.parent}</td>
                      <td className="py-4 px-3 text-center whitespace-nowrap">{student.age} years</td>
                      <td className="py-4 px-3 text-center">{student.level}</td>
                      <td className="py-4 px-3 text-center">
                        <span className={`inline-block border text-[10px] px-2 py-1 rounded-[6px] ${getStatusStyles(student.status)}`}>
                          {student.status}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-[#666d80] min-w-[200px]">{student.description}</td>
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
                                setActiveActionDropdown(null); 
                                setStudents(students.filter(s => s.id !== student.id));
                                setSelectedStudentIds(prev => {
                                  const next = new Set(prev);
                                  next.delete(student.id);
                                  return next;
                                });
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
                className="w-[18px] h-[18px] flex items-center justify-center rotate-90 disabled:opacity-30 hover:opacity-70 transition-opacity"
              >
                <img src={imgChevronDown4} alt="Prev" className="w-full h-full" />
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
                className="w-[18px] h-[18px] flex items-center justify-center -rotate-90 disabled:opacity-30 hover:opacity-70 transition-opacity"
              >
                <img src={imgChevronDown5} alt="Next" className="w-full h-full" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- Modals --- */}

      {/* Add Student Modal */}
      {isAddStudentModalOpen && (
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
            <h3 className="font-bold text-[#272932] text-xl">Add Student</h3>
            <p className="text-[#666d80] text-[14px]">Enter the new student&apos;s information below.</p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Student Name"
                value={addStudentName}
                onChange={(e) => setAddStudentName(e.target.value)}
                className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
              />
              <input
                type="text"
                placeholder="Parent Name"
                value={addParentName}
                onChange={(e) => setAddParentName(e.target.value)}
                className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
              />
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="px-4 py-2 text-[#666d80] font-medium text-[14px] hover:bg-gray-50 rounded-[6px] transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAddStudent}
                className="bg-[#14c1d5] text-white font-semibold text-[14px] px-4 py-2 rounded-[6px] hover:bg-[#11a9bb] transition-colors"
              >
                Save Student
              </button>
            </div>
          </div>
        </div>
      )}

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
            <h3 className="font-bold text-[#272932] text-xl">Edit Class Info</h3>
            <p className="text-[#666d80] text-[14px]">Update the details for this class. Save applies changes to the page header.</p>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={editClassDraft.title}
                onChange={(e) => setEditClassDraft((d) => ({ ...d, title: e.target.value }))}
                className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5]"
              />
              <textarea
                value={editClassDraft.description}
                onChange={(e) => setEditClassDraft((d) => ({ ...d, description: e.target.value }))}
                className="border border-[#f0f0f0] rounded-[8px] px-3 py-2 text-[14px] outline-none focus:border-[#14c1d5] resize-none h-24"
              />
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
                className="bg-[#14c1d5] text-white font-semibold text-[14px] px-4 py-2 rounded-[6px] hover:bg-[#11a9bb] transition-colors"
              >
                Save Changes
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
            <h3 className="font-bold text-[#272932] text-xl">Edit Student</h3>
            <p className="text-[#666d80] text-[14px]">Update this student&apos;s enrollment details.</p>
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
                <option value="Pending">Pending</option>
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
                className="bg-[#14c1d5] text-white font-semibold text-[14px] px-4 py-2 rounded-[6px] hover:bg-[#11a9bb] transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
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
            <h3 className="font-bold text-[#272932] text-xl">Remove Class?</h3>
            <p className="text-[#666d80] text-[14px]">
              Are you sure you want to remove the <strong>{classTitle}</strong> class? This removes it from the directory for all administrators.
            </p>
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
                onClick={() => {
                  setIsRemoveClassModalOpen(false);
                  router.push("/dashboard/classes");
                }}
                className="bg-[#ffd9d9] text-[#d80509] font-semibold text-[14px] px-4 py-2 rounded-[6px] hover:bg-[#ffc2c2] transition-colors"
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
