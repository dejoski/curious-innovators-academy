"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { DataSource } from "@/lib/data/fetch-source";
import type { StudentListItem } from "@/lib/data/types";
import {
  studentProfileLearningSample,
  studentProfileSupportNotesPlaceholder,
} from "@/lib/product-copy";

const imgEllipse2735 = "/images/anna-lee-avatar.png";
const imgEllipse2736 = "/images/icon-generic.svg";
const imgGroup = "/images/icon-generic.svg";
const imgMaskGroup = "/images/icon-generic.svg";
const imgGroup1 = "/images/icon-generic.svg";
const imgIcRoundPlus = "/images/icon-generic.svg";
const imgVuesaxLinearClipboardText = "/images/icon-generic.svg";
const imgRiParentLine = "/images/icon-generic.svg";
const imgVuesaxOutlineCalendar = "/images/icon-generic.svg";

type StudentDetailsState = {
  name: string;
  age: string;
  level: string;
  learningProfile: string;
  strengths: string;
  supportNotes: string;
};

type TimelineEvent = {
  id: number;
  type: string;
  author: string;
  role: string;
  date: string;
  time: string;
  urgent: boolean;
  title: string;
  content: string;
};

type ClassChip = { id: string; name: string };

type MockStudentBundle = {
  avatar: string;
  details: StudentDetailsState;
  parentName: string;
  parentHref: string;
  coreSummaryLabel: string;
  enrichmentSummaryLabel: string;
  pendingLabel: string;
  attendanceLabel: string;
  coreClasses: ClassChip[];
  enrichmentClasses: ClassChip[];
  events: TimelineEvent[];
  /** When true, class chips and history are deferred to live data sources. */
  directoryDataOnly?: boolean;
};

const defaultEvents: TimelineEvent[] = [
  {
    id: 1,
    type: "Academic",
    author: "Mr. Mendes",
    role: "Academic Coordination",
    date: "02/08/2026",
    time: "16:35 PM",
    urgent: true,
    title: "Dear families,",
    content:
      "Reminder: enrichment selections close soon. Complete choices in the student portal so we can finalize schedules.",
  },
  {
    id: 2,
    type: "Behavioral",
    author: "Mr. Drummond",
    role: "Student Life Coordinator",
    date: "02/02/2026",
    time: "10:35 AM",
    urgent: false,
    title: "Wellness check-in",
    content:
      "Student visited the office with minor discomfort. Family was contacted; early pickup completed with standard dismissal form.",
  },
];

const MOCK_BY_ID: Record<string, MockStudentBundle> = {
  "1": {
    avatar: imgEllipse2735,
    details: {
      name: "Anna Lee",
      age: "14",
      level: "3",
      learningProfile: "Curious and engaged learner who enjoys collaborative activities",
      strengths: "Strong communication and creativity",
      supportNotes: "Benefits from structured guidance on long tasks",
    },
    parentName: "Mr. Lee",
    parentHref: "/dashboard/parents",
    coreSummaryLabel: "Core: 2 / 2",
    enrichmentSummaryLabel: "Enrichment: 4 / 6",
    pendingLabel: "Pending Requests: 2",
    attendanceLabel: "Attendance: 98%",
    coreClasses: [
      { id: "1", name: "Math 101" },
      { id: "2", name: "Science 101" },
    ],
    enrichmentClasses: [
      { id: "1", name: "Art" },
      { id: "2", name: "Music" },
      { id: "3", name: "PE" },
      { id: "4", name: "Coding" },
    ],
    events: [
      {
        id: 1,
        type: "Academic",
        author: "Mr. Mendes",
        role: "Academic Coordination",
        date: "02/08/2026",
        time: "16:35 PM",
        urgent: true,
        title: "Dear Mrs. Mary Lee,",
        content:
          "I hope this message finds you well.\n\nI am writing to remind you that the enrollment deadline for Ana Lee to select her Enrichment classes is approaching quickly.\n\nOur records indicate that her activity choices have not yet been submitted. To ensure that Ana secures a spot in her preferred courses before they reach full capacity, we kindly request that the selection be completed no later than March 12th.\n\nKey Information:\n- Deadline: March 12th, 2026.\n- Procedure: Selections must be made through the student portal.\n\nIf you have already completed this process or require any assistance regarding the available options, please do not hesitate to contact me.\n\nBest regards,",
      },
      {
        id: 2,
        type: "Behavioral",
        author: "Mr. Drummond",
        role: "Student Life Coordinator",
        date: "02/02/2026",
        time: "10:35 AM",
        urgent: false,
        title: "Incident Log",
        content:
          "At 10:15 AM, Ana Lee reported to the coordination office feeling unwell, complaining of abdominal pain and slight dizziness. After resting in the infirmary with no significant improvement, her family was contacted.\n\nOutcome:\nThe student's father, Mr. Johnson, arrived at 11:00 AM to pick her up early. The student was released following the signing of the early dismissal form. The coordination advised the family to keep the school updated should there be a need for an extended absence.",
      },
    ],
  },
  "2": {
    avatar: imgEllipse2736,
    details: {
      name: "George Lee",
      age: "12",
      level: "2",
      learningProfile: "Prefers hands-on projects and pair work",
      strengths: "Quick problem solver in STEM activities",
      supportNotes: "Check in before major assessments",
    },
    parentName: "Mr. Lee",
    parentHref: "/dashboard/parents",
    coreSummaryLabel: "Core: 2 / 2",
    enrichmentSummaryLabel: "Enrichment: 3 / 6",
    pendingLabel: "Pending Requests: 1",
    attendanceLabel: "Attendance: 96%",
    coreClasses: [
      { id: "1", name: "Math 101" },
      { id: "3", name: "ELA Workshop" },
    ],
    enrichmentClasses: [
      { id: "2", name: "Robotics" },
      { id: "3", name: "PE" },
      { id: "5", name: "Debate" },
    ],
    events: defaultEvents,
  },
  "3": {
    avatar: imgEllipse2735,
    details: {
      name: "Bruna Lee",
      age: "14",
      level: "2",
      learningProfile: "Thoughtful reader; benefits from discussion time",
      strengths: "Written expression and peer collaboration",
      supportNotes: "Parent open to alternative enrichment if sections fill",
    },
    parentName: "Mr. Lee",
    parentHref: "/dashboard/parents",
    coreSummaryLabel: "Core: 2 / 2",
    enrichmentSummaryLabel: "Enrichment: 1 / 6",
    pendingLabel: "Pending Requests: 3",
    attendanceLabel: "Attendance: 99%",
    coreClasses: [
      { id: "2", name: "Science 101" },
      { id: "3", name: "ELA Workshop" },
    ],
    enrichmentClasses: [{ id: "1", name: "Art" }],
    events: defaultEvents,
  },
};

function resolveMock(id: string): MockStudentBundle {
  return MOCK_BY_ID[id] ?? {
    avatar: imgEllipse2735,
    details: {
      name: `Student #${id}`,
      age: "13",
      level: "3",
      learningProfile: studentProfileLearningSample(),
      strengths: "Adaptable and punctual",
      supportNotes: studentProfileSupportNotesPlaceholder(),
    },
    parentName: "Directory contact",
    parentHref: "/dashboard/parents",
    coreSummaryLabel: "Core: 1 / 2",
    enrichmentSummaryLabel: "Enrichment: 2 / 6",
    pendingLabel: "Pending Requests: 1",
    attendanceLabel: "Attendance: 95%",
    coreClasses: [{ id: "1", name: "Math 101" }],
    enrichmentClasses: [
      { id: "1", name: "Art" },
      { id: "2", name: "Music" },
    ],
    events: defaultEvents,
  };
}

function buildResolvedBundle(
  studentId: string,
  directoryStudent: StudentListItem | null,
  dataSource: DataSource,
): MockStudentBundle | null {
  if (dataSource === "remote" && !directoryStudent) {
    return null;
  }

  if (dataSource === "remote" && directoryStudent) {
    const notes = directoryStudent.notes.trim();
    return {
      avatar: directoryStudent.avatar || imgEllipse2735,
      details: {
        name: directoryStudent.name,
        age: "—",
        level: directoryStudent.level,
        learningProfile: notes || "—",
        strengths: "—",
        supportNotes: "—",
      },
      parentName: directoryStudent.parent,
      parentHref: "/dashboard/parents",
      coreSummaryLabel:
        directoryStudent.status === "Completed" ? "Core scheduling: complete" : "Core scheduling: in progress",
      enrichmentSummaryLabel: `Enrichment: ${directoryStudent.enrichment}`,
      pendingLabel:
        directoryStudent.status === "Incomplete"
          ? "Action needed: finish core scheduling"
          : "Pending requests: none",
      attendanceLabel: "Attendance: —",
      coreClasses: [],
      enrichmentClasses: [],
      events: [],
      directoryDataOnly: true,
    };
  }

  const base = resolveMock(studentId);
  if (directoryStudent && directoryStudent.id === studentId) {
    return {
      ...base,
      avatar: directoryStudent.avatar || base.avatar,
      details: {
        ...base.details,
        name: directoryStudent.name,
        level: directoryStudent.level,
        learningProfile: directoryStudent.notes.trim()
          ? directoryStudent.notes
          : base.details.learningProfile,
      },
      parentName: directoryStudent.parent,
      enrichmentSummaryLabel: `Enrichment: ${directoryStudent.enrichment}`,
      directoryDataOnly: false,
    };
  }
  return { ...base, directoryDataOnly: false };
}

export type StudentProfileClientProps = {
  studentId: string;
  directoryStudent: StudentListItem | null;
  dataSource: DataSource;
};

export default function StudentProfileClient({
  studentId,
  directoryStudent,
  dataSource,
}: StudentProfileClientProps) {
  const bundle = useMemo(
    () => buildResolvedBundle(studentId, directoryStudent, dataSource),
    [studentId, dataSource, directoryStudent],
  );

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [editModalBaseline, setEditModalBaseline] = useState<StudentDetailsState | null>(null);
  const [filterType, setFilterType] = useState("All");
  const [discardPrompt, setDiscardPrompt] = useState<null | "edit" | "note">(null);

  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState("Academic");

  const [studentDetails, setStudentDetails] = useState<StudentDetailsState>(() =>
    bundle
      ? bundle.details
      : { name: "", age: "", level: "", learningProfile: "", strengths: "", supportNotes: "" },
  );
  const [events, setEvents] = useState<TimelineEvent[]>(() => (bundle ? bundle.events : []));

  useEffect(() => {
    if (!bundle) return;
    setStudentDetails(bundle.details);
    setEvents(bundle.events);
    setFilterType("All");
    setIsEditModalOpen(false);
    setIsAddNoteModalOpen(false);
    setEditModalBaseline(null);
    setDiscardPrompt(null);
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewNoteType("Academic");
  }, [bundle]);

  if (!bundle) {
    return (
      <div className="w-full max-w-[1200px] mx-auto px-8 py-16 flex flex-col gap-4 items-center font-sans text-center">
        <h1 className="text-xl font-semibold text-[#272932]">Student not found</h1>
        <p className="text-sm text-[#666d80] max-w-md">
          No student matches this id in the directory. Return to the list to open a valid profile.
        </p>
        <Link href="/dashboard/students" className="text-sm font-medium text-[#14c1d5] hover:underline">
          ← Back to students
        </Link>
      </div>
    );
  }

  const mock = bundle;

  const filteredEvents = events.filter((e) => filterType === "All" || e.type === filterType);

  const resetAddNoteForm = () => {
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewNoteType("Academic");
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const newEvent: TimelineEvent = {
      id: Date.now(),
      type: newNoteType,
      author: "Admin",
      role: "System Administrator",
      date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" }),
      time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      urgent: false,
      title: newNoteTitle,
      content: newNoteContent,
    };
    setEvents([newEvent, ...events]);
    setIsAddNoteModalOpen(false);
    resetAddNoteForm();
  };

  const handleEditProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditModalOpen(false);
    setEditModalBaseline(null);
  };

  const isEditProfileDirty =
    editModalBaseline !== null &&
    (studentDetails.name !== editModalBaseline.name ||
      studentDetails.age !== editModalBaseline.age ||
      studentDetails.level !== editModalBaseline.level ||
      studentDetails.learningProfile !== editModalBaseline.learningProfile ||
      studentDetails.strengths !== editModalBaseline.strengths ||
      studentDetails.supportNotes !== editModalBaseline.supportNotes);

  const requestCloseEditModal = () => {
    if (!isEditProfileDirty) {
      setIsEditModalOpen(false);
      setEditModalBaseline(null);
      return;
    }
    setDiscardPrompt("edit");
  };

  const handleEditModalBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    requestCloseEditModal();
  };

  const isAddNoteDirty = newNoteTitle.trim() !== "" || newNoteContent.trim() !== "";

  const requestCloseAddNoteModal = () => {
    if (!isAddNoteDirty) {
      setIsAddNoteModalOpen(false);
      resetAddNoteForm();
      return;
    }
    setDiscardPrompt("note");
  };

  const handleAddNoteModalBackdropMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    requestCloseAddNoteModal();
  };

  const openEditModal = () => {
    setEditModalBaseline({ ...studentDetails });
    setIsEditModalOpen(true);
  };

  const confirmDiscard = () => {
    if (discardPrompt === "edit" && editModalBaseline) {
      setStudentDetails({ ...editModalBaseline });
      setIsEditModalOpen(false);
      setEditModalBaseline(null);
    }
    if (discardPrompt === "note") {
      setIsAddNoteModalOpen(false);
      resetAddNoteForm();
    }
    setDiscardPrompt(null);
  };

  const cancelDiscard = () => setDiscardPrompt(null);

  return (
    <div className="w-full max-w-[1200px] mx-auto p-4 md:p-8 flex flex-col gap-8 font-sans">
      <div className="flex flex-col gap-[4px] items-start w-full">
        <div className="flex items-center justify-between w-full flex-wrap gap-3">
          <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[28px] leading-[1.1]">
            Student Profile
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/dashboard/students"
              className="text-sm font-medium text-[#14c1d5] hover:underline px-2 py-1 rounded-md"
            >
              ← All students
            </Link>
            <button
              onClick={openEditModal}
              className="bg-[#d2f1f5] flex gap-[8px] h-[42px] items-center justify-center px-[16px] rounded-[6px] hover:bg-[#bce6ec] transition-colors"
            >
              <span className="font-['Inter_Tight:SemiBold',sans-serif] font-semibold text-[#14c1d5] text-[16px]">
                Edit Profile
              </span>
            </button>
          </div>
        </div>
        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#666d80] text-[16px] leading-[1.4]">
          View and manage the student’s profile, schedule, and notes.
        </p>
        {mock.directoryDataOnly ? (
          <p className="text-xs text-[#6b7280] max-w-2xl leading-relaxed">
            Directory data is live; class chips and history will appear as enrollments and notes are linked in Supabase.
          </p>
        ) : null}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full">
        <div className="bg-white border border-[#f0f0f0] rounded-[16px] p-6 flex-1 flex flex-col sm:flex-row items-start gap-8 shadow-sm">
          <div className="relative size-[102px] shrink-0">
            <img alt="Student" className="size-full rounded-full object-cover" src={mock.avatar} />
            <button
              onClick={openEditModal}
              className="absolute bottom-0 right-0 bg-[#14c1d5] border border-[rgba(20,193,213,0.2)] rounded-full size-[24px] flex items-center justify-center hover:bg-[#12aebd] transition-colors"
            >
              <img alt="Edit" className="size-[12px]" src={imgGroup} />
            </button>
          </div>

          <div className="flex flex-col gap-[6px] w-full min-w-0">
            <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[20px]">
              {studentDetails.name}
            </h2>
            <div className="flex flex-col gap-3 text-[14px] leading-[1.2]">
              <div className="flex gap-2 items-baseline flex-wrap">
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] shrink-0">Parent:</span>
                <Link
                  href={mock.parentHref}
                  className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#14c1d5] hover:underline break-words"
                >
                  {mock.parentName}
                </Link>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12]">Age:</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80]">
                  {studentDetails.age === "—" ? "—" : `${studentDetails.age} years old`}
                </span>
              </div>
              <div className="flex gap-2 items-baseline">
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12]">Level:</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80]">{studentDetails.level}</span>
              </div>
              <div className="flex gap-2 items-baseline flex-wrap">
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] shrink-0">Learning Profile:</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] break-words">
                  {studentDetails.learningProfile}
                </span>
              </div>
              <div className="flex gap-2 items-baseline flex-wrap">
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] shrink-0">Strengths:</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] break-words">
                  {studentDetails.strengths}
                </span>
              </div>
              <div className="flex gap-2 items-baseline flex-wrap">
                <span className="font-['Inter:Regular',sans-serif] text-[#0d0d12] shrink-0">Support Notes:</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] break-words">
                  {studentDetails.supportNotes}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 w-full lg:w-[353px] shrink-0 flex flex-col gap-4 shadow-sm">
          <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">Schedule Summary</h3>
          <div className="h-px w-full bg-[#f0f0f0]" />
          <div className="flex flex-col gap-4 w-full">
            <div className="flex items-center justify-between w-full gap-2">
              <span className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">{mock.coreSummaryLabel}</span>
              <img alt="Check" className="size-[16px] shrink-0" src={imgMaskGroup} />
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              {mock.coreClasses.length > 0 ? (
                mock.coreClasses.map((c) => (
                  <Link
                    key={`core-${c.id}`}
                    href={`/dashboard/classes/core/${c.id}`}
                    className="bg-[#f0f0f0] text-[#0d0d12] px-2 py-1 rounded-[4px] text-[12px] hover:bg-[#e0e0e0] transition-colors"
                  >
                    {c.name}
                  </Link>
                ))
              ) : (
                <span className="text-[12px] text-[#9ca3af]">No core class links for this row yet.</span>
              )}
            </div>
            <div className="flex items-center justify-between w-full gap-2">
              <span className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">{mock.enrichmentSummaryLabel}</span>
              <img alt="Alert" className="size-[16px] shrink-0" src={imgGroup1} />
            </div>
            <div className="flex gap-2 flex-wrap mb-2">
              {mock.enrichmentClasses.length > 0 ? (
                mock.enrichmentClasses.map((c) => (
                  <Link
                    key={`enr-${c.id}`}
                    href={`/dashboard/classes/enrichment/${c.id}`}
                    className="bg-[#e6f7f9] text-[#14c1d5] px-2 py-1 rounded-[4px] text-[12px] hover:bg-[#d2f1f5] transition-colors"
                  >
                    {c.name}
                  </Link>
                ))
              ) : (
                <span className="text-[12px] text-[#9ca3af]">No enrichment class links for this row yet.</span>
              )}
            </div>
            <div className="flex items-center justify-between w-full gap-2">
              <span className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">{mock.pendingLabel}</span>
              <img alt="Alert" className="size-[16px] shrink-0" src={imgGroup1} />
            </div>
            <div className="flex items-center justify-between w-full pt-2">
              <span className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">{mock.attendanceLabel}</span>
            </div>
            <Link
              href={`/dashboard/students/${studentId}/schedule`}
              className="text-center text-sm font-semibold text-[#14c1d5] hover:underline pt-1"
            >
              Open full schedule
            </Link>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 w-full">
        <div className="flex items-center justify-between py-3 flex-wrap gap-4">
          <h3 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#05080b] text-[14px]">History</h3>
          <div className="flex gap-4 items-center flex-wrap">
            <div className="flex bg-[#fafafa] rounded-[8px] p-1 border border-gray-200">
              {["All", "Academic", "Behavioral"].map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-2 rounded-[6px] text-[12px] font-['Inter:Medium',sans-serif] transition-colors ${
                    filterType === type ? "bg-white shadow-sm text-[#0d0d12]" : "text-[#666d80] hover:text-[#0d0d12]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
            <button
              onClick={() => setIsAddNoteModalOpen(true)}
              className="bg-[#14c1d5] flex gap-[8px] items-center px-[16px] py-[8px] rounded-[6px] hover:bg-[#12aebd] transition-colors shadow-sm"
            >
              <img alt="Add" className="size-[24px]" src={imgIcRoundPlus} />
              <span className="font-['Inter_Tight:SemiBold',sans-serif] font-semibold text-white text-[14px]">Create Note</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6 w-full relative">
          <div className="absolute left-[22px] top-[44px] bottom-0 w-px bg-gray-200 z-0" />

          {filteredEvents.map((event) => (
            <div key={event.id} className="flex gap-6 items-start relative z-10">
              <div className="bg-[#f6fcfd] rounded-full size-[44px] flex items-center justify-center shrink-0 border-2 border-white">
                <img alt="History" className="size-[22px]" src={imgVuesaxLinearClipboardText} />
              </div>
              <div className="bg-white border border-[#dfe1e7] rounded-[10px] p-4 flex flex-col gap-6 w-full shadow-sm min-w-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                  <div className="flex flex-wrap gap-2 items-center">
                    <img alt="Parent" className="size-[18px]" src={imgRiParentLine} />
                    <span className="font-['Inter:Medium',sans-serif] font-medium text-[#2f2f2d] text-[14px]">{event.author}</span>
                    <span className="font-['Inter:Medium',sans-serif] font-medium text-[#4b4d4f] text-[12px]">({event.role})</span>
                    {event.urgent && (
                      <span className="bg-[#ffd9d9] text-[#d80509] border border-[rgba(216,5,9,0.5)] px-2 py-0 rounded-[6px] text-[10px] font-['Inter:Regular',sans-serif]">
                        Urgent
                      </span>
                    )}
                    <span
                      className={`px-2 py-0 rounded-[6px] text-[10px] font-['Inter:Medium',sans-serif] ${
                        event.type === "Academic" ? "bg-blue-100 text-blue-700" : "bg-orange-100 text-orange-700"
                      }`}
                    >
                      {event.type}
                    </span>
                  </div>
                  <div className="flex gap-1 items-center text-[#625f6e] text-[12px] font-['Inter:Medium',sans-serif] font-medium shrink-0">
                    <img alt="Calendar" className="size-[14px]" src={imgVuesaxOutlineCalendar} />
                    <span>{event.date}</span>
                    <span>-</span>
                    <span>{event.time}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-4 text-[#2f2f2d] text-[12px] font-['Inter:Regular',sans-serif] leading-[1.5] whitespace-pre-wrap break-words">
                  <div>
                    <p className="font-semibold mb-1">{event.title}</p>
                    <p>{event.content}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredEvents.length === 0 && <div className="pl-16 text-gray-500 text-sm py-4">No events found.</div>}
        </div>
      </div>

      {isEditModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onMouseDown={handleEditModalBackdropMouseDown}
        >
          <div className="bg-white rounded-[16px] p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Edit Profile</h2>
            <form onSubmit={handleEditProfile} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={studentDetails.name}
                  onChange={(e) => setStudentDetails({ ...studentDetails, name: e.target.value })}
                  className="w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Age</label>
                <input
                  type="text"
                  value={studentDetails.age}
                  onChange={(e) => setStudentDetails({ ...studentDetails, age: e.target.value })}
                  className="w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Level</label>
                <input
                  type="text"
                  value={studentDetails.level}
                  onChange={(e) => setStudentDetails({ ...studentDetails, level: e.target.value })}
                  className="w-full border rounded-md p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Learning Profile</label>
                <textarea
                  value={studentDetails.learningProfile}
                  onChange={(e) => setStudentDetails({ ...studentDetails, learningProfile: e.target.value })}
                  className="w-full border rounded-md p-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Strengths</label>
                <textarea
                  value={studentDetails.strengths}
                  onChange={(e) => setStudentDetails({ ...studentDetails, strengths: e.target.value })}
                  className="w-full border rounded-md p-2"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Support Notes</label>
                <textarea
                  value={studentDetails.supportNotes}
                  onChange={(e) => setStudentDetails({ ...studentDetails, supportNotes: e.target.value })}
                  className="w-full border rounded-md p-2"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={requestCloseEditModal} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#14c1d5] text-white rounded-md hover:bg-[#12aebd]">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAddNoteModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onMouseDown={handleAddNoteModalBackdropMouseDown}
        >
          <div className="bg-white rounded-[16px] p-6 w-full max-w-lg shadow-xl">
            <h2 className="text-xl font-bold mb-4">Add Note / Record</h2>
            <form onSubmit={handleAddNote} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newNoteType}
                  onChange={(e) => setNewNoteType(e.target.value)}
                  className="w-full border rounded-md p-2"
                >
                  <option value="Academic">Academic</option>
                  <option value="Behavioral">Behavioral</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newNoteTitle}
                  onChange={(e) => setNewNoteTitle(e.target.value)}
                  className="w-full border rounded-md p-2"
                  placeholder="e.g. Incident Log, Progress Update"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  required
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="w-full border rounded-md p-2"
                  rows={5}
                  placeholder="Enter details here..."
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={requestCloseAddNoteModal} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-[#14c1d5] text-white rounded-md hover:bg-[#12aebd]">
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {discardPrompt !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discard-title"
        >
          <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-lg">
            <h2 id="discard-title" className="text-lg font-semibold text-[#272932]">
              Discard unsaved changes?
            </h2>
            <p className="mt-2 text-sm text-[#666d80]">Your edits will be lost if you continue.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={cancelDiscard}
              >
                Keep editing
              </button>
              <button
                type="button"
                className="rounded-md bg-[#d80509] px-4 py-2 text-sm font-semibold text-white hover:bg-[#c00408]"
                onClick={confirmDiscard}
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
