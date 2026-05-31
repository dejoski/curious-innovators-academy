"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Camera, Filter } from "lucide-react";
import { useSearchParams } from "next/navigation";

import type {
  DataSource,
  StudentListItem,
  StudentProfileBundle,
  StudentProfileTimelineEvent,
} from "@/lib/data";
import { cachedJson, invalidateDashboardData, peekCachedJson, studentDetailDataUrls } from "@/lib/client-data-cache";
import { readApiError } from "@/lib/client-api-errors";
import { PARENT_CATALOG_PENDING_KEY } from "@/lib/parent-dashboard-storage";
import { selectedParentStudentIdFromSearchParams } from "@/lib/parent-student-selection";

const imgLine10 = "/images/icon-divider-students.svg";
const imgMaskGroup = "/images/mask-group.svg";
const imgGroup2 = "/images/icon-group2.svg";
const imgVuesaxLinearClipboardText = "/images/icon-clipboard-text.svg";
const imgHistoryLine = "/images/icon-history-line.svg";
const imgRiParentLine = "/images/icon-parent.svg";
const imgVuesaxOutlineCalendar = "/images/icon-calendar-outline.svg";

const URGENCY_OPTIONS = ["Urgent", "All"] as const;

type UrgencyFilter = (typeof URGENCY_OPTIONS)[number];

function countCatalogPendingSlots(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as {
      requests?: Record<string, { firstChoice?: { name?: string } | null }>;
    };
    const slots = data.requests ?? {};
    return Object.values(slots).filter((s) => s?.firstChoice != null).length;
  } catch {
    return null;
  }
}

function parsePendingCount(label: string): number {
  const match = label.match(/\d+/);
  return match ? Number(match[0]) : 0;
}

function ageLabel(age: string): string {
  const normalized = age.trim();
  if (!normalized || normalized === "—") return "Not set";
  return /^\d+$/.test(normalized) ? `${normalized} years old` : normalized;
}

function sourceHint(source: DataSource | null, error: string | null): string | null {
  if (error) return error;
  if (source === "fallback") return "Showing starter student data while school records finish loading.";
  if (source === "unavailable") return "Student records are temporarily unavailable.";
  return null;
}

function splitEventContent(content: string): { paragraphs: string[]; bullets: string[] } {
  const paragraphs: string[] = [];
  const bullets: string[] = [];
  for (const block of content.split(/\n+/).map((part) => part.trim()).filter(Boolean)) {
    if (block.startsWith("- ")) {
      bullets.push(block.slice(2).trim());
    } else if (block.replace(/:$/, "").toLowerCase() === "key information") {
      continue;
    } else {
      paragraphs.push(block);
    }
  }
  return { paragraphs, bullets };
}

function HistoryCard({ entry }: { entry: StudentProfileTimelineEvent }) {
  const { paragraphs, bullets } = splitEventContent(entry.content);
  return (
    <div className="relative z-10 flex items-start gap-6">
      <div className="relative flex shrink-0 flex-col items-center self-stretch">
        <div className="flex size-[44px] items-center justify-center rounded-[42px] bg-[#f6fcfd]">
          <img alt="" className="size-[22px]" src={imgVuesaxLinearClipboardText} />
        </div>
        <div aria-hidden className="absolute left-[22px] top-[44px] h-full min-h-[120px] w-0">
          <img alt="" className="absolute inset-[0_-1.5px] max-w-none size-full" src={imgHistoryLine} />
        </div>
      </div>

      <div className="flex w-full flex-col gap-6 rounded-[10px] border border-[#dfe1e7] bg-white p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-px flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-[8px]">
              <img alt="" className="size-[18px]" src={imgRiParentLine} />
              <span className="font-['Inter:Medium',sans-serif] text-[14px] font-medium leading-[1.4] text-[#2f2f2d]">
                {entry.author}
              </span>
            </div>
            <span className="font-['Inter:Medium',sans-serif] text-[12px] font-medium leading-[1.5] text-[#4b4d4f]">
              {entry.role}
            </span>
            {entry.urgent ? (
              <div className="rounded-[6px] border border-[rgba(216,5,9,0.5)] bg-[#ffd9d9] px-[8px] py-[2px]">
                <span className="font-['Inter:Regular',sans-serif] text-[10px] leading-[1.4] text-[#d80509]">
                  Urgent
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-[4px]">
            <img alt="" className="size-[14px] shrink-0" src={imgVuesaxOutlineCalendar} />
            <span className="font-['Inter:Medium',sans-serif] text-[12px] font-medium leading-[1.3] tracking-[-0.12px] text-[#625f6e]">
              {entry.date}
            </span>
            <span className="font-['Inter:Medium',sans-serif] text-[12px] font-medium leading-[1.3] tracking-[-0.12px] text-[#625f6e]">
              -
            </span>
            <span className="font-['Inter:Medium',sans-serif] text-[12px] font-medium leading-[1.3] tracking-[-0.12px] text-[#625f6e]">
              {entry.time}
            </span>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-start gap-[12px] text-[12px] leading-[1.5] text-[#2f2f2d]">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold">{entry.title}</p>
          {paragraphs.map((paragraph, index) => (
            <p key={`${entry.id}-paragraph-${index}`} className="font-['Inter:Regular',sans-serif] font-normal">
              {paragraph}
            </p>
          ))}
          {bullets.length ? (
            <div className="flex w-full shrink-0 flex-col items-start gap-[2px]">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.5]">
                Key Information:
              </p>
              <ul className="w-full list-disc font-['Inter:Regular',sans-serif] font-normal">
                {bullets.map((item) => (
                  <li key={item} className="ms-[18px]">
                    <span className="leading-[1.5]">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ParentStudentsProfileContent() {
  const searchParams = useSearchParams();
  const requestedStudentId = selectedParentStudentIdFromSearchParams(searchParams);

  const [studentsSource, setStudentsSource] = useState<DataSource | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [profile, setProfile] = useState<StudentProfileBundle | null>(null);
  const [profileSource, setProfileSource] = useState<DataSource | null>(null);
  const [isStudentsLoading, setIsStudentsLoading] = useState(true);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<UrgencyFilter>("Urgent");
  const [pendingSlots, setPendingSlots] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    async function loadStudents() {
      setIsStudentsLoading(true);
      setLoadError(null);
      try {
        const body = await cachedJson<{
          students?: StudentListItem[];
          source?: DataSource;
        }>("/api/data/students");
        if (cancelled) return;
        const rows = Array.isArray(body.students) ? body.students : [];
        setStudentsSource(body.source ?? null);
        setSelectedStudentId(rows.some((row) => row.id === requestedStudentId) ? requestedStudentId : rows[0]?.id || "");
      } catch (err) {
        if (cancelled) return;
        setStudentsSource(null);
        setSelectedStudentId(requestedStudentId);
        setLoadError(`Could not load students: ${err instanceof Error ? err.message : String(err)}.`);
      } finally {
        if (!cancelled) setIsStudentsLoading(false);
      }
    }
    void loadStudents();
    return () => {
      cancelled = true;
    };
  }, [requestedStudentId]);

  useEffect(() => {
    if (!selectedStudentId) {
      setProfile(null);
      setProfileSource(studentsSource);
      return;
    }
    let cancelled = false;
    async function loadProfile() {
      setIsProfileLoading(true);
      setLoadError(null);
      try {
        const body = await cachedJson<{
          profile?: StudentProfileBundle | null;
          source?: DataSource;
        }>(`/api/data/students/${encodeURIComponent(selectedStudentId)}/profile`);
        if (cancelled) return;
        setProfile(body.profile ?? null);
        setProfileSource(body.source ?? null);
        setPendingSlots(parsePendingCount(body.profile?.pendingLabel ?? ""));
      } catch (err) {
        if (cancelled) return;
        setProfile(null);
        setProfileSource(null);
        setLoadError(`Could not load student profile: ${err instanceof Error ? err.message : String(err)}.`);
      } finally {
        if (!cancelled) setIsProfileLoading(false);
      }
    }
    void loadProfile();
    return () => {
      cancelled = true;
    };
  }, [selectedStudentId, studentsSource]);

  useEffect(() => {
    function refreshPending() {
      if (typeof window === "undefined") return;
      try {
        const raw = window.sessionStorage.getItem(PARENT_CATALOG_PENDING_KEY);
        const n = countCatalogPendingSlots(raw);
        if (n != null) setPendingSlots(n);
      } catch {
        /* ignore */
      }
    }
    refreshPending();
    window.addEventListener("cia-parent-catalog-updated", refreshPending);
    return () => window.removeEventListener("cia-parent-catalog-updated", refreshPending);
  }, []);

  const visibleHistory = useMemo(() => {
    const rows = profile?.events ?? [];
    return urgency === "Urgent" ? rows.filter((entry) => entry.urgent) : rows;
  }, [profile?.events, urgency]);

  const hint = sourceHint(profileSource ?? studentsSource, loadError);
  const isLoading = isStudentsLoading || (isProfileLoading && !profile);
  const warmProfile = selectedStudentId
    ? peekCachedJson<{ profile?: StudentProfileBundle | null }>(`/api/data/students/${encodeURIComponent(selectedStudentId)}/profile`)?.profile
    : null;

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!file || !selectedStudentId || isSavingAvatar) return;
    setAvatarError(null);
    setIsSavingAvatar(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch(`/api/data/students/${encodeURIComponent(selectedStudentId)}/avatar`, {
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
      setProfile((current) => current ? { ...current, avatar: body.avatarUrl ?? current.avatar } : current);
      invalidateDashboardData([
        "/api/data/students",
        "/api/data/student-schedules",
        ...studentDetailDataUrls(selectedStudentId),
      ]);
    } catch (error) {
      setAvatarError(error instanceof Error ? error.message : "Student photo could not be saved.");
    } finally {
      setIsSavingAvatar(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[1104px] flex-col pb-6 pt-8 font-['Inter:Regular',sans-serif]">
      <div className="flex w-[503px] max-w-full flex-col gap-1" style={{ marginBottom: "23px" }}>
        <h1 className="font-['Inter:Bold',sans-serif] text-[28px] font-bold leading-[1.1] text-[#272932]">
          Student Profile
        </h1>
        <p className="font-['Inter:Regular',sans-serif] text-[16px] font-normal leading-[1.4] text-[#666d80]">
          View your child&apos;s profile and current class schedule.
        </p>
      </div>

      {hint && (
        <div className="mb-4 rounded-xl border border-[#cfa500]/35 bg-[#fff8e6] px-4 py-3 text-sm text-[#7a5b00]" role="status">
          {hint}
        </div>
      )}
      {avatarError ? (
        <div className="mb-4 rounded-xl border border-[#f6c8c8] bg-[#fff1f1] px-4 py-3 text-sm font-medium text-[#8c1f1f]" role="alert">
          {avatarError}
        </div>
      ) : null}

      {isLoading && !warmProfile ? (
        <div className="grid gap-4">
          <div className="h-[215px] animate-pulse rounded-[16px] border border-[#f0f0f0] bg-white p-6">
            <div className="h-6 w-40 rounded bg-[#eef1f5]" />
            <div className="mt-6 h-4 w-3/4 rounded bg-[#eef1f5]" />
            <div className="mt-3 h-4 w-2/3 rounded bg-[#eef1f5]" />
            <div className="mt-3 h-4 w-1/2 rounded bg-[#eef1f5]" />
          </div>
          <div className="rounded-[12px] border border-[#f0f0f0] bg-white p-4 text-sm text-[#666d80]">
            Loading student profile and warming classes...
          </div>
        </div>
      ) : !profile ? (
        <div className="rounded-[12px] border border-[#f0f0f0] bg-white p-6 text-sm text-[#666d80]">
          No student profile is available for this account.
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="flex w-full max-w-[719px] flex-col rounded-[16px] border border-[#f0f0f0] bg-white p-6">
              <div className="flex flex-col gap-6 md:flex-row md:gap-[22px]">
                <div className="relative h-24 w-24 shrink-0 md:h-[102px] md:w-[102px]">
                  <img
                    alt={profile.details.name}
                    className="absolute inset-0 h-full w-full rounded-full object-cover"
                    src={profile.avatar}
                  />
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

                <div className="flex min-w-0 flex-col gap-[6px] md:w-[547px]">
                  <h2 className="font-['Inter:Semi_Bold',sans-serif] text-[20px] font-semibold leading-[1.4] text-[#0d0d12]">
                    {profile.details.name}
                  </h2>

                  <div className="flex flex-col gap-[12px] text-[14px] leading-[1.2] text-[#0d0d12]">
                    <div className="flex flex-wrap items-baseline gap-[6px]">
                      <span className="font-['Inter:Regular',sans-serif] shrink-0">Age:</span>
                      <span className="font-['Inter:Semi_Bold',sans-serif] shrink-0 font-semibold text-[#666d80]">
                        {ageLabel(profile.details.age)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-[6px]">
                      <span className="font-['Inter:Regular',sans-serif] shrink-0">Level:</span>
                      <span className="font-['Inter:Semi_Bold',sans-serif] shrink-0 font-semibold text-[#666d80]">
                        {profile.details.level || "Not set"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-[6px]">
                      <span className="font-['Inter:Regular',sans-serif] shrink-0">Learning Profile:</span>
                      <span className="font-['Inter:Semi_Bold',sans-serif] min-w-0 font-semibold text-[#666d80]">
                        {profile.details.learningProfile}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-[6px]">
                      <span className="font-['Inter:Regular',sans-serif] shrink-0">Strengths:</span>
                      <span className="font-['Inter:Semi_Bold',sans-serif] min-w-0 font-semibold text-[#666d80]">
                        {profile.details.strengths}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-baseline gap-[6px]">
                      <span className="font-['Inter:Regular',sans-serif] shrink-0">Support Notes:</span>
                      <span className="font-['Inter:Semi_Bold',sans-serif] min-w-0 font-semibold text-[#666d80]">
                        {profile.details.supportNotes}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex w-full max-w-[353px] shrink-0 flex-col rounded-[16px] border border-[#f0f0f0] bg-white p-6">
              <h2 className="font-['Inter:Semi_Bold',sans-serif] text-[16px] font-semibold leading-[1.4] text-[#272932]">
                Schedule Summary
              </h2>
              <div className="mt-[11px] flex h-px w-full items-center justify-center">
                <div className="flex-none rotate-[-0.19deg]">
                  <div className="relative h-0 w-[305.002px] max-w-full">
                    <img alt="Divider" className="absolute inset-[-1px_0_0_0] max-w-none size-full" src={imgLine10} />
                  </div>
                </div>
              </div>

              <div className="mt-[10px] flex w-full flex-col gap-[10px]">
                {[
                  { label: profile.coreSummaryLabel, complete: true },
                  { label: profile.enrichmentSummaryLabel, complete: false },
                  { label: `Pending Requests: ${pendingSlots}`, complete: false },
                  { label: profile.attendanceLabel, complete: true },
                ].map((item) => (
                  <div key={item.label} className="flex w-full items-center">
                    <div className="flex min-w-px flex-[1_0_0] items-center justify-between">
                      <span className="font-['Inter:Medium',sans-serif] shrink-0 text-[16px] font-medium leading-[1.4] text-[#666d80]">
                        {item.label}
                      </span>
                      <div className="relative size-[16px] shrink-0 overflow-clip">
                        <div className={item.complete ? "absolute inset-[8.33%_8.33%_8.34%_8.33%]" : "absolute inset-[9.38%]"}>
                          <img
                            alt=""
                            className={item.complete ? "absolute inset-[-3.75%] max-w-none size-full" : "absolute inset-[-3.85%] max-w-none size-full"}
                            src={item.complete ? imgMaskGroup : imgGroup2}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-[30px] flex w-full flex-col rounded-[12px]">
            <div className="flex items-center justify-between py-[12px]">
              <h2 className="font-['Inter:Semi_Bold',sans-serif] text-[14px] font-semibold leading-[1.3] text-[#05080b]">
                History
              </h2>

              <div className="flex items-center gap-[10px]">
                {URGENCY_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setUrgency(opt)}
                    className={`flex h-[34px] items-center gap-[6px] rounded-[8px] border px-[10px] py-[8px] transition-colors ${
                      urgency === opt
                        ? "border-[#14c1d5] bg-[#e9fbfd] text-[#0b6f7d]"
                        : "border-[#dfe1e7] bg-white text-[#4b4d4f] hover:bg-[#fafafa]"
                    }`}
                    aria-label={`Filter history by ${opt.toLowerCase()}`}
                    aria-pressed={urgency === opt}
                  >
                    <Filter className="size-[14px] shrink-0" aria-hidden strokeWidth={1.8} />
                    <span className="font-['Inter:Medium',sans-serif] text-[12px] font-medium leading-none tracking-[0.12px]">
                      {opt}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-[16px] flex flex-col gap-[16px]">
              {visibleHistory.length ? (
                visibleHistory.map((entry) => <HistoryCard key={entry.id} entry={entry} />)
              ) : (
                <div className="rounded-[10px] border border-[#dfe1e7] bg-white p-4 text-sm text-[#666d80]">
                  No history entries match the current filter.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function ParentStudentsClient() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1104px] p-6 text-sm text-[#666d80] md:p-8">
          Loading profile...
        </div>
      }
    >
      <ParentStudentsProfileContent />
    </Suspense>
  );
}
