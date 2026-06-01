"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Camera } from "lucide-react";
import type { DataSource } from "@/lib/data/fetch-source";
import { readApiError } from "@/lib/client-api-errors";
import { invalidateDashboardData, studentDetailDataUrls } from "@/lib/client-data-cache";
import type {
  StudentProfileBundle,
  StudentProfileDetails,
  StudentProfileTimelineEvent,
  StudentProfileTimelineEventType,
} from "@/lib/data/types";
import {
  STUDENT_PROFILE_TIMELINE_EVENT_TYPES,
  isStudentProfileTimelineEventType,
} from "@/lib/data/types";

const imgMaskGroup = "/images/icon-group.svg";
const imgGroup1 = "/images/icon-notification-bell.svg";
const imgIcRoundPlus = "/images/icon-plus.svg";
const imgVuesaxLinearClipboardText = "/images/icon-dashboard.svg";
const imgRiParentLine = "/images/icon-parent.svg";
const imgVuesaxOutlineCalendar = "/images/icon-dashboard.svg";

type StudentDetailsState = StudentProfileDetails;
type TimelineEvent = StudentProfileTimelineEvent;
const ALL_HISTORY_FILTER = "All" as const;
type HistoryFilterType = typeof ALL_HISTORY_FILTER | StudentProfileTimelineEventType;

const HISTORY_TYPE_BADGE_CLASSES: Record<StudentProfileTimelineEventType, string> = {
  Academic: "bg-blue-100 text-blue-700",
  Behavioral: "bg-orange-100 text-orange-700",
  General: "bg-slate-100 text-slate-700",
};

function historyTypeBadgeClasses(type: StudentProfileTimelineEventType) {
  return HISTORY_TYPE_BADGE_CLASSES[type];
}

export type StudentProfileClientProps = {
  studentId: string;
  profile: StudentProfileBundle | null;
  dataSource: DataSource;
};

export default function StudentProfileClient({
  studentId,
  profile,
  dataSource,
}: StudentProfileClientProps) {
  const bundle = profile;

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [editModalBaseline, setEditModalBaseline] = useState<StudentDetailsState | null>(null);
  const [filterType, setFilterType] = useState<HistoryFilterType>(ALL_HISTORY_FILTER);
  const [discardPrompt, setDiscardPrompt] = useState<null | "edit" | "note">(null);
  const [profileBanner, setProfileBanner] = useState<null | { tone: "success" | "error"; message: string }>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState<StudentProfileTimelineEventType>("Academic");

  const [studentDetails, setStudentDetails] = useState<StudentDetailsState>(() =>
    bundle
      ? bundle.details
      : { name: "", age: "", level: "", learningProfile: "", strengths: "", supportNotes: "" },
  );
  const [avatarUrl, setAvatarUrl] = useState(() => bundle?.avatar ?? "/images/avatars/student-1.png");
  const [events, setEvents] = useState<TimelineEvent[]>(() => (bundle ? bundle.events : []));

  useEffect(() => {
    if (!bundle) return;
    setStudentDetails(bundle.details);
    setAvatarUrl(bundle.avatar);
    setEvents(bundle.events);
    setFilterType(ALL_HISTORY_FILTER);
    setIsEditModalOpen(false);
    setIsAddNoteModalOpen(false);
    setEditModalBaseline(null);
    setDiscardPrompt(null);
    setProfileBanner(null);
    setEditError(null);
    setNoteError(null);
    setAvatarError(null);
    setIsSavingProfile(false);
    setIsSavingNote(false);
    setIsSavingAvatar(false);
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewNoteType("Academic");
  }, [bundle]);

  const historyFilters = useMemo<HistoryFilterType[]>(() => {
    const presentTypes = new Set<StudentProfileTimelineEventType>();
    events.forEach((event) => {
      if (isStudentProfileTimelineEventType(event.type)) presentTypes.add(event.type);
    });
    return [
      ALL_HISTORY_FILTER,
      ...STUDENT_PROFILE_TIMELINE_EVENT_TYPES.filter((type) => presentTypes.has(type)),
    ];
  }, [events]);

  useEffect(() => {
    if (filterType !== ALL_HISTORY_FILTER && !historyFilters.includes(filterType)) {
      setFilterType(ALL_HISTORY_FILTER);
    }
  }, [filterType, historyFilters]);

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

  const filteredEvents = events.filter((e) => filterType === ALL_HISTORY_FILTER || e.type === filterType);
  const dataHint =
    dataSource === "fallback"
      ? "Showing starter student details while records finish loading."
      : dataSource === "unavailable"
        ? "Student details are temporarily unavailable."
        : "";

  const resetAddNoteForm = () => {
    setNewNoteTitle("");
    setNewNoteContent("");
    setNewNoteType("Academic");
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    setNoteError(null);
    setIsSavingNote(true);
    try {
      const res = await fetch(`/api/data/students/${encodeURIComponent(studentId)}/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newNoteTitle,
          content: newNoteContent,
          type: newNoteType,
        }),
      });
      if (!res.ok) {
        setNoteError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { event?: TimelineEvent | null };
      if (!body.event) {
        setNoteError("Student note could not be saved.");
        return;
      }
      setEvents((prev) => [body.event as TimelineEvent, ...prev]);
      setIsAddNoteModalOpen(false);
      resetAddNoteForm();
      setProfileBanner({ tone: "success", message: "Student note was saved." });
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : "Student note could not be saved.");
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleEditProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    setIsSavingProfile(true);
    try {
      const res = await fetch(`/api/data/students/${encodeURIComponent(studentId)}/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: studentDetails.name,
          age: studentDetails.age,
          level: studentDetails.level,
          learningProfile: studentDetails.learningProfile,
          strengths: studentDetails.strengths,
          supportNotes: studentDetails.supportNotes,
        }),
      });
      if (!res.ok) {
        if (editModalBaseline) setStudentDetails({ ...editModalBaseline });
        setEditError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { profile?: StudentProfileBundle | null };
      if (!body.profile) {
        if (editModalBaseline) setStudentDetails({ ...editModalBaseline });
        setEditError("Student profile could not be saved.");
        return;
      }
      setStudentDetails(body.profile.details);
      setEvents(body.profile.events);
      setIsEditModalOpen(false);
      setEditModalBaseline(null);
      setProfileBanner({ tone: "success", message: "Student profile was saved." });
    } catch (error) {
      if (editModalBaseline) setStudentDetails({ ...editModalBaseline });
      setEditError(error instanceof Error ? error.message : "Student profile could not be saved.");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || isSavingAvatar) return;
    setAvatarError(null);
    setIsSavingAvatar(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/data/students/${encodeURIComponent(studentId)}/avatar`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        setAvatarError(await readApiError(res));
        return;
      }
      const body = (await res.json()) as { avatarUrl?: string };
      if (!body.avatarUrl) {
        setAvatarError("Student photo could not be saved.");
        return;
      }
      setAvatarUrl(body.avatarUrl);
      invalidateDashboardData([
        "/api/data/students",
        "/api/data/student-schedules",
        ...studentDetailDataUrls(studentId),
      ]);
      setProfileBanner({ tone: "success", message: "Student photo was saved." });
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Student photo could not be saved.");
    } finally {
      setIsSavingAvatar(false);
    }
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
    setEditError(null);
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
              className="rounded-[8px] border border-[#dfe3ea] bg-white px-3 py-2 text-sm font-semibold text-[#344054] shadow-sm hover:bg-[#fafafa]"
            >
              ← Student List
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
        {profileBanner ? (
          <div
            role={profileBanner.tone === "error" ? "alert" : "status"}
            className={`mt-2 rounded-[10px] border px-4 py-3 text-sm font-medium ${
              profileBanner.tone === "success"
                ? "border-[#c8f4f0] bg-[#e8fafb] text-[#0d5c56]"
                : "border-[#f6c8c8] bg-[#fff1f1] text-[#8c1f1f]"
            }`}
          >
            {profileBanner.message}
          </div>
        ) : null}
        {mock.directoryDataOnly ? (
          <p className="text-xs text-[#6b7280] max-w-2xl leading-relaxed">
            Directory details are ready; class chips and history will appear as enrollments and notes are linked.
          </p>
        ) : null}
        {dataHint ? <p className="text-xs text-[#6b7280] max-w-2xl leading-relaxed">{dataHint}</p> : null}
        {avatarError ? (
          <div role="alert" className="mt-2 rounded-[10px] border border-[#f6c8c8] bg-[#fff1f1] px-4 py-3 text-sm font-medium text-[#8c1f1f]">
            {avatarError}
          </div>
        ) : null}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 w-full">
        <div className="bg-white border border-[#f0f0f0] rounded-[16px] p-6 flex-1 flex flex-col sm:flex-row items-start gap-8 shadow-sm">
          <div className="relative size-[102px] shrink-0">
            <img alt="Student" className="size-full rounded-full object-cover" src={avatarUrl} />
            <label
              className={`absolute bottom-0 right-0 flex size-[30px] items-center justify-center rounded-full border border-[rgba(20,193,213,0.2)] bg-[#14c1d5] text-white transition-colors hover:bg-[#12aebd] ${
                isSavingAvatar ? "cursor-wait opacity-70" : "cursor-pointer"
              }`}
              title="Change student photo"
            >
              <Camera className="size-[15px]" aria-hidden strokeWidth={2} />
              <span className="sr-only">Change student photo</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                disabled={isSavingAvatar}
                onChange={handleAvatarUpload}
              />
            </label>
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
              {historyFilters.map((type) => (
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
              onClick={() => {
                setNoteError(null);
                setIsAddNoteModalOpen(true);
              }}
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
                      className={`px-2 py-0 rounded-[6px] text-[10px] font-['Inter:Medium',sans-serif] ${historyTypeBadgeClasses(event.type)}`}
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
            {editError ? (
              <div role="alert" className="mb-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {editError}
              </div>
            ) : null}
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
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-4 py-2 bg-[#14c1d5] text-white rounded-md hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
                >
                  {isSavingProfile ? "Saving..." : "Save Changes"}
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
            {noteError ? (
              <div role="alert" className="mb-4 rounded-md border border-[#f6c8c8] bg-[#fff1f1] px-3 py-2 text-sm text-[#8c1f1f]">
                {noteError}
              </div>
            ) : null}
            <form onSubmit={handleAddNote} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={newNoteType}
                  onChange={(e) => {
                    if (isStudentProfileTimelineEventType(e.target.value)) {
                      setNewNoteType(e.target.value);
                    }
                  }}
                  className="w-full border rounded-md p-2"
                >
                  {STUDENT_PROFILE_TIMELINE_EVENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
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
                <button
                  type="submit"
                  disabled={isSavingNote}
                  className="px-4 py-2 bg-[#14c1d5] text-white rounded-md hover:bg-[#12aebd] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
                >
                  {isSavingNote ? "Saving..." : "Add Record"}
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
