"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useFixedMenuPlacement } from "@/hooks/use-fixed-menu-placement";

const imgGroup1 = "https://www.figma.com/api/mcp/asset/983aedea-1819-48f3-8de8-d9bb3bf8cd91";
const imgGroup2 = "https://www.figma.com/api/mcp/asset/2e599a04-0124-468a-9455-7136fc5b54d0";
const imgMaterialSymbolsSearch = "https://www.figma.com/api/mcp/asset/1b3186b9-b54d-409c-88d1-5cc750a989ca";
const imgVector = "https://www.figma.com/api/mcp/asset/617040ed-7fed-47d3-b8c1-7431ef76cf6f";
const imgIconCaretDown = "https://www.figma.com/api/mcp/asset/4001d44d-778e-4ce7-a14b-10e63d550478";
const imgFlowbiteSortOutline = "https://www.figma.com/api/mcp/asset/e776b74b-3a8a-4056-b267-6477019cf050";
const imgIcRoundPlus = "https://www.figma.com/api/mcp/asset/75fef1d1-165b-47aa-bc79-9891cad1239f";
const imgWeuiMoreOutlined = "https://www.figma.com/api/mcp/asset/708af1a1-62ea-4c98-b771-ceeb2abd2b07";
const imgChevronDown3 = "https://www.figma.com/api/mcp/asset/b4801efa-7612-4f6e-bd2c-172be8f337ef";
const imgChevronDown4 = "https://www.figma.com/api/mcp/asset/42ef1e2b-5c32-4931-a90d-a9234d5dc873";
const imgChevronDown = "https://www.figma.com/api/mcp/asset/4b7708a1-5b38-460a-8c49-b763ef8c6d17";

type Status = "Approved" | "Pending" | "Rejected";

type SortOption = "None" | "Name A-Z" | "Name Z-A" | "Age Low-High" | "Age High-Low";

type Student = {
  id: string;
  name: string;
  parent: string;
  age: number;
  level: number;
  status: Status;
  description: string;
};

const initialStudents: Student[] = [
  { id: "1", name: "Anna Lee", parent: "Mary Lee", age: 14, level: 2, status: "Approved", description: "Focused and participative in group activities." },
  { id: "2", name: "George Lee", parent: "Mary Lee", age: 12, level: 2, status: "Pending", description: "Curious learner, asks thoughtful questions." },
  { id: "3", name: "Bruna Lee", parent: "Mary Lee", age: 14, level: 2, status: "Approved", description: "Needs occasional support to stay on task." },
  { id: "4", name: "James Smith", parent: "Patricia Smith", age: 13, level: 3, status: "Rejected", description: "Strong collaboration and communication skills." },
  { id: "5", name: "James Smith 2", parent: "Patricia Smith", age: 13, level: 3, status: "Rejected", description: "Strong collaboration and communication skills." },
];

type ClassMeta = {
  title: string;
  description: string;
  teacher: string;
  blockLevel: string;
  schedule: string;
  capacityEnrolled: number;
  capacityMax: number;
};

const INITIAL_CLASS_META: ClassMeta = {
  title: "Math",
  description: "Builds strong foundations in arithmetic, problem-solving, and logical reasoning.",
  teacher: "Ms. Johnson",
  blockLevel: "B2 L3",
  schedule: "8:00 AM - 9:30AM",
  capacityEnrolled: 18,
  capacityMax: 20,
};

export default function ClassDetailsPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [classMeta, setClassMeta] = useState<ClassMeta>(INITIAL_CLASS_META);
  const [classMetaDraft, setClassMetaDraft] = useState<ClassMeta>(INITIAL_CLASS_META);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"All" | Status>("All");
  const [sortOption, setSortOption] = useState<SortOption>("None");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [openActionDropdownId, setOpenActionDropdownId] = useState<string | null>(null);
  
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [isEditInfoModalOpen, setIsEditInfoModalOpen] = useState(false);
  const [isRemoveClassModalOpen, setIsRemoveClassModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addParent, setAddParent] = useState("");
  const [addAge, setAddAge] = useState("14");
  const [addLevel, setAddLevel] = useState("2");
  const [addStatus, setAddStatus] = useState<Status>("Pending");
  const [addDescription, setAddDescription] = useState("");
  const [editStudentDraft, setEditStudentDraft] = useState<Student | null>(null);

  const itemsPerPage = 10;

  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLDivElement | null>(null);
  const actionAnchorRef = useRef<HTMLButtonElement | null>(null);
  const actionMenuPlacement = useFixedMenuPlacement(openActionDropdownId !== null, actionAnchorRef, 140);

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

  const toggleRowSelection = (id: string) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === currentStudents.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(currentStudents.map((s) => s.id));
    }
  };

  const getStatusStyles = (status: Status) => {
    switch (status) {
      case "Approved":
        return "bg-green-900/20 text-green-900 border-green-900/50";
      case "Pending":
        return "bg-yellow-500/20 text-yellow-600 border-yellow-500/50";
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
    setIsEditInfoModalOpen(true);
  };

  const saveClassMeta = () => {
    const max = classMetaDraft.capacityMax <= 0 ? 1 : classMetaDraft.capacityMax;
    const enrolled = Math.min(Math.max(0, classMetaDraft.capacityEnrolled), max);
    setClassMeta({ ...classMetaDraft, capacityMax: max, capacityEnrolled: enrolled });
    setIsEditInfoModalOpen(false);
  };

  const submitAddStudent = () => {
    const name = addName.trim();
    if (!name) return;
    const nextNum = Math.max(0, ...students.map((s) => Number.parseInt(s.id, 10) || 0)) + 1;
    const id = String(nextNum);
    setStudents((prev) => [
      ...prev,
      {
        id,
        name,
        parent: addParent.trim() || "—",
        age: Number.parseInt(addAge, 10) || 10,
        level: Number.parseInt(addLevel, 10) || 1,
        status: addStatus,
        description: addDescription.trim(),
      },
    ]);
    setIsAddStudentModalOpen(false);
    setAddName("");
    setAddParent("");
    setAddAge("14");
    setAddLevel("2");
    setAddStatus("Pending");
    setAddDescription("");
  };

  const removeStudentById = (id: string) => {
    setStudents((prev) => prev.filter((s) => s.id !== id));
    setOpenActionDropdownId(null);
    setSelectedRows((rows) => rows.filter((r) => r !== id));
  };

  const saveEditedStudent = () => {
    if (!editStudentDraft) return;
    setStudents((prev) => prev.map((s) => (s.id === editStudentDraft.id ? editStudentDraft : s)));
    setEditStudentDraft(null);
  };

  return (
    <div className="flex flex-col gap-8 p-8 w-full max-w-[1200px] mx-auto">
      {/* Header Section */}
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-2">
          <Link href="/dashboard/classes" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-4">
            <div className="rotate-90 relative w-[18px] h-[18px]">
               <Image src={imgChevronDown} alt="Back" fill />
            </div>
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
                  <div className="relative w-3.5 h-3.5"><Image src={imgIconCaretDown} alt="" fill /></div>
                </button>
                {isFilterDropdownOpen && (
                  <div className="absolute top-full mt-1 right-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-[100] w-32">
                    {["All", "Approved", "Pending", "Rejected"].map((status) => (
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
                  <div className="relative w-3.5 h-3.5"><Image src={imgIconCaretDown} alt="" fill /></div>
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
                {selectedRows.length === currentStudents.length && currentStudents.length > 0 ? "Deselect All" : "Select All"}
              </button>

              <button 
                type="button"
                onClick={() => {
                  setAddName("");
                  setAddParent("");
                  setAddAge("14");
                  setAddLevel("2");
                  setAddStatus("Pending");
                  setAddDescription("");
                  setIsAddStudentModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 text-white rounded-lg font-semibold text-sm hover:bg-cyan-600 transition-colors shadow-sm"
              >
                <div className="relative w-6 h-6"><Image src={imgIcRoundPlus} alt="Add" fill /></div>
                Add Student
              </button>
            </div>
          </div>

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
                                setEditStudentDraft({ ...student });
                                setOpenActionDropdownId(null);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-50"
                              onClick={() => removeStudentById(student.id)}
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
                className="relative w-4 h-4 rotate-90 disabled:opacity-20 hover:opacity-70 transition-opacity"
              >
                <Image src={imgChevronDown3} alt="Previous" fill />
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
                className="relative w-4 h-4 -rotate-90 disabled:opacity-20 hover:opacity-70 transition-opacity"
              >
                <Image src={imgChevronDown4} alt="Next" fill />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isAddStudentModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" role="dialog" aria-modal="true">
          <div className="bg-white p-6 rounded-2xl w-full max-w-md shadow-xl relative">
            <button
              type="button"
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
              onClick={() => setIsAddStudentModalOpen(false)}
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-2 pr-8">Add Student</h3>
            <p className="text-sm text-gray-500 mb-4">Add a row to the roster. Changes here update this view only until enrollments are synced from your SIS.</p>
            <div className="flex flex-col gap-3">
              <input
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder="Student name"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <input
                value={addParent}
                onChange={(e) => setAddParent(e.target.value)}
                placeholder="Parent / guardian"
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <input
                  value={addAge}
                  onChange={(e) => setAddAge(e.target.value)}
                  placeholder="Age"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-1/2"
                />
                <input
                  value={addLevel}
                  onChange={(e) => setAddLevel(e.target.value)}
                  placeholder="Level"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-1/2"
                />
              </div>
              <select
                value={addStatus}
                onChange={(e) => setAddStatus(e.target.value as Status)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
              <textarea
                value={addDescription}
                onChange={(e) => setAddDescription(e.target.value)}
                placeholder="Description"
                rows={2}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsAddStudentModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitAddStudent}
                className="px-4 py-2 text-sm font-semibold bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-sm text-gray-500 mb-4">Changes apply to the summary cards on this page.</p>
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
                className="px-4 py-2 text-sm font-semibold bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
              >
                Save
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
                onClick={() => {
                  setIsRemoveClassModalOpen(false);
                  router.push("/dashboard/classes");
                }}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Remove
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
                  type="number"
                  value={editStudentDraft.level}
                  onChange={(e) =>
                    setEditStudentDraft({
                      ...editStudentDraft,
                      level: Number.parseInt(e.target.value, 10) || 0,
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
                className="px-4 py-2 text-sm font-semibold bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
