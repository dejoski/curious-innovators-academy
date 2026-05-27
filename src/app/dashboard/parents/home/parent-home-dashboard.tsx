"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, CalendarDays, ChevronRight } from "lucide-react";

import {
  ParentClassDetailsDrawer,
  ParentClassSelectionDrawer,
  classOptionForScheduleBadge,
  fallbackParentClassOption,
  parentClassOptionsForCatalogSlot,
  parentClassOptionFromRow,
  type ParentClassChoiceKind,
  type ParentClassOption,
} from "@/components/parent-class-drawers";
import {
  buildParentScheduleBadges,
  ParentScheduleGrid,
  type ParentScheduleSlotKey,
} from "@/components/parent-schedule-grid";
import {
  cachedJson,
  invalidateClientDataCache,
  invalidateDashboardData,
  readDashboardData,
} from "@/lib/client-data-cache";
import { parentSafeDashboardHref } from "@/lib/dashboard/role-routes";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";
import {
  selectedParentStudentIdFromSearchParams,
  withParentStudentParam,
} from "@/lib/parent-student-selection";
import {
  INITIAL_PARENT_CATALOG_REQUESTS,
  catalogSnapshotFromEnrichmentRequests,
  catalogChoiceReviews,
  catalogScheduleBadgeOverrides,
  clearPendingParentCatalogRequests,
  clearSubmittedParentCatalogSnapshot,
  hasParentCatalogChoices,
  readParentCatalogSnapshot,
  selectedChoicesForSubmit,
  writePendingParentCatalogRequests,
  type LocalReviewStatus,
  type LocalReviewStatuses,
  type ParentCatalogIdentity,
  type ParentCatalogRequests,
} from "@/lib/parent-catalog-state";
import {
  CATALOG_SLOT_META as SLOT_META,
  catalogSlotIdFromScheduleSlot,
  scheduleBadgeStatusLabel,
  type CatalogSlotId,
} from "@/lib/schedule-slots";
import {
  parentScheduleFinalityClasses,
  parentScheduleFinalityFromBadges,
} from "@/lib/parent-schedule-status";
import type {
  DashboardNotification,
  DataSource,
  EnrichmentRequestRow,
  SchoolClassRow,
  StudentListItem,
  StudentProfileBundle,
  StudentScheduleBadge,
  StudentScheduleRow,
} from "@/lib/data";

const imgHugeiconsStudent1 = "/images/icon-student.svg";
const imgGroup1 = "/images/icon-group.svg";

type LocalRequestState = "draft" | "submitted" | null;
type HomeCatalogRequests = Record<CatalogSlotId, {
  firstChoice: ParentClassOption | null;
  secondChoice: ParentClassOption | null;
}>;

function RowArrow() {
  return (
    <div className="bg-[#fafafa] flex items-center justify-center rounded-[8px] p-2 shrink-0">
      <ChevronRight className="size-[14px] text-[#666d80]" aria-hidden strokeWidth={2} />
    </div>
  );
}

function parentAlertPresentation(item: DashboardNotification): DashboardNotification {
  const href = parentSafeDashboardHref(item.href);
  if (href === item.href) return item;

  if (href === "/dashboard/parents/catalog") {
    return {
      ...item,
      href,
      title: "Class selection update",
      detail: "Review class selections for your child and submit when ready.",
    };
  }

  if (href === "/dashboard/parents/schedule") {
    return {
      ...item,
      href,
      title: "Schedule updated",
      detail: "Your child's schedule has an update.",
    };
  }

  return {
    ...item,
    href,
    title: "Dashboard update",
    detail: "Open your parent dashboard for the latest information.",
  };
}

function AlertRow({ item, studentId }: { item: DashboardNotification; studentId?: string }) {
  const alert = parentAlertPresentation(item);
  const href = studentScopedHref(alert.href, studentId);
  return (
    <Link href={href} className="block w-full hover:opacity-90 transition-opacity">
      <div className="flex gap-6 items-center w-full">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#2f2f2d] text-[14px] leading-snug truncate">
            {alert.title}
          </p>
          <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[14px] leading-snug line-clamp-2">
            {alert.detail}
          </p>
        </div>
        <RowArrow />
      </div>
    </Link>
  );
}

function QuickRow({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-3 w-full hover:opacity-90 transition-opacity">
      <div className="flex gap-6 items-center w-full">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#2f2f2d] text-[14px]">
            {title}
          </p>
          <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[14px] leading-snug">
            {body}
          </p>
        </div>
        <RowArrow />
      </div>
    </Link>
  );
}

function firstNumber(label: string, fallback = "0"): string {
  return label.match(/\d+(\.\d+)?/)?.[0] ?? fallback;
}

function metricValue(label: string, fallback: string): string {
  const value = label.split(":").slice(1).join(":").trim();
  return value || fallback;
}

function sourceHint(source: DataSource | null): string | null {
  if (source === "fallback") return "Showing sample parent dashboard data because cloud data is unavailable.";
  if (source === "unavailable") return null;
  return null;
}

function reviewPillClasses(status: LocalReviewStatus): string {
  if (status === "Approved") return "border-[#004d08]/35 bg-[#004d08]/15 text-[#004d08]";
  if (status === "Waitlisted") return "border-[#cfa500]/45 bg-[#fff8e6] text-[#7a5b00]";
  if (status === "Rejected") return "border-[#d80509]/35 bg-[#ffd9d9] text-[#d80509]";
  return "border-[#cfa500]/45 bg-[#fff8e6] text-[#7a5b00]";
}

function reviewPillLabel(status: LocalReviewStatus, state: LocalRequestState): string {
  return state === "draft" ? "Draft" : status;
}

function parentClassListHref(option: ParentClassOption): string {
  return option.program === "core" ? "/dashboard/parents/classes/core" : "/dashboard/parents/classes/enrichment";
}

function resolveRequestedStudent(students: StudentListItem[], requestedStudentId: string): StudentListItem | null {
  return students.find((row) => row.id === requestedStudentId) ?? students[0] ?? null;
}

function studentScopedHref(href: string, studentId: string | undefined): string {
  return withParentStudentParam(href, studentId);
}

function StudentDashboardLoading({ studentName }: { studentName?: string }) {
  return (
    <div
      className="flex min-h-[360px] w-full items-center justify-center rounded-[18px] border border-[#d9eef1] bg-white px-6 py-8 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          className="size-8 animate-spin rounded-full border-[3px] border-[#14c1d5]/25 border-t-[#14c1d5]"
          aria-hidden
        />
        <p className="font-['Inter:Semi_Bold',sans-serif] text-[15px] font-semibold text-[#155e66]">
          Loading {studentName ? `${studentName}'s dashboard` : "student dashboard"}...
        </p>
        <p className="max-w-[360px] text-sm text-[#666d80]">
          Fetching the selected student profile, schedule, and class choices.
        </p>
      </div>
    </div>
  );
}

export default function ParentHomeDashboard() {
  const searchParams = useSearchParams();
  const requestedStudentId = selectedParentStudentIdFromSearchParams(searchParams);
  const [student, setStudent] = useState<StudentListItem | null>(null);
  const [profile, setProfile] = useState<StudentProfileBundle | null>(null);
  const [schedule, setSchedule] = useState<StudentScheduleRow | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [catalogDraft, setCatalogDraft] = useState<ParentCatalogRequests | null>(null);
  const [localRequestState, setLocalRequestState] = useState<LocalRequestState>(null);
  const [localReviewStatuses, setLocalReviewStatuses] = useState<LocalReviewStatuses>({});
  const [classOptions, setClassOptions] = useState<ParentClassOption[]>([]);
  const [isStudentDataLoading, setIsStudentDataLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<CatalogSlotId>("block4_day3");
  const [selectionDrawerOpen, setSelectionDrawerOpen] = useState(false);
  const [openChoice, setOpenChoice] = useState<ParentClassChoiceKind | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [detailClass, setDetailClass] = useState<{
    option: ParentClassOption;
    statusLabel: string;
    catalogSlot: CatalogSlotId | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadParentHome() {
      setLoadError(null);
      setIsStudentDataLoading(true);
      try {
        const [studentsBody, notificationsBody, classesBody] = await Promise.all([
          cachedJson<{ students?: StudentListItem[]; source?: DataSource }>("/api/data/students"),
          cachedJson<{ notifications?: DashboardNotification[]; source?: DataSource }>("/api/data/notifications"),
          cachedJson<{ classes?: SchoolClassRow[]; source?: DataSource }>("/api/data/classes"),
        ]);
        const rows = Array.isArray(studentsBody.students) ? studentsBody.students : [];
        const activeStudent = resolveRequestedStudent(rows, requestedStudentId);
        const classRows = Array.isArray(classesBody.classes) ? classesBody.classes : [];

        if (!cancelled) {
          setStudent(activeStudent);
          setProfile(null);
          setSchedule(null);
          setCatalogDraft(null);
          setLocalRequestState(null);
          setLocalReviewStatuses({});
          setNotifications(Array.isArray(notificationsBody.notifications) ? notificationsBody.notifications.slice(0, 3) : []);
          setClassOptions(classRows.map(parentClassOptionFromRow));
        }

        let profileBody: { profile?: StudentProfileBundle | null; source?: DataSource } = {};
        let scheduleBody: { rows?: StudentScheduleRow[]; source?: DataSource } = {};
        if (activeStudent) {
          [profileBody, scheduleBody] = await Promise.all([
            cachedJson<{ profile?: StudentProfileBundle | null; source?: DataSource }>(
              `/api/data/students/${encodeURIComponent(activeStudent.id)}/profile`,
            ),
            cachedJson<{ rows?: StudentScheduleRow[]; source?: DataSource }>(
              `/api/data/students/${encodeURIComponent(activeStudent.id)}/schedule`,
            ),
          ]);
        }

        if (cancelled) return;
        setStudent(activeStudent);
        setProfile(profileBody.profile ?? null);
        setSchedule(Array.isArray(scheduleBody.rows) ? (scheduleBody.rows[0] ?? null) : null);
        setDataSource(
          profileBody.source === "fallback" || scheduleBody.source === "fallback" || notificationsBody.source === "fallback" || classesBody.source === "fallback"
            ? "fallback"
            : (profileBody.source ?? scheduleBody.source ?? studentsBody.source ?? notificationsBody.source ?? classesBody.source ?? null),
        );
      } catch (err) {
        if (!cancelled) setLoadError(`Could not load parent dashboard: ${err instanceof Error ? err.message : String(err)}.`);
      } finally {
        if (!cancelled) setIsStudentDataLoading(false);
      }
    }
    void loadParentHome();
    return () => {
      cancelled = true;
    };
  }, [requestedStudentId]);

  useEffect(() => {
    if (!student?.id) {
      setCatalogDraft(null);
      setLocalRequestState(null);
      setLocalReviewStatuses({});
      return;
    }
    const activeStudent = student;

    function readCatalogDraft() {
      const snapshot = readParentCatalogSnapshot({
        studentId: activeStudent.id,
        studentName: activeStudent.name,
      });
      setCatalogDraft(snapshot.requests);
      setLocalRequestState(snapshot.state);
      setLocalReviewStatuses({});
    }

    readCatalogDraft();
    window.addEventListener("cia-parent-catalog-updated", readCatalogDraft);
    window.addEventListener("storage", readCatalogDraft);
    return () => {
      window.removeEventListener("cia-parent-catalog-updated", readCatalogDraft);
      window.removeEventListener("storage", readCatalogDraft);
    };
  }, [student?.id, student?.name]);

  useEffect(() => {
    if (!student?.id) return;
    const studentForRequests = student;
    let cancelled = false;
    async function loadDbRequestState() {
      try {
        const body = await readDashboardData<{ requests?: EnrichmentRequestRow[] }>("/api/data/enrichment-requests");
        const snapshot = catalogSnapshotFromEnrichmentRequests(
          Array.isArray(body.requests) ? body.requests : [],
          studentForRequests.id,
        );
        if (cancelled || !snapshot.requests) return;
        clearPendingParentCatalogRequests({ studentId: studentForRequests.id });
        setCatalogDraft(snapshot.requests);
        setLocalRequestState(snapshot.state);
        setLocalReviewStatuses(snapshot.reviewStatuses);
      } catch {
        /* Local draft state remains visible when request rows cannot be loaded. */
      }
    }
    void loadDbRequestState();
    return () => {
      cancelled = true;
    };
  }, [student?.id]);

  const localChoiceReviews = useMemo(() => {
    return catalogChoiceReviews(catalogDraft, localReviewStatuses);
  }, [catalogDraft, localReviewStatuses]);

  const localPendingChoices = localChoiceReviews.filter((choice) => choice.status === "Pending").length;
  const localApprovedChoices = localChoiceReviews.filter((choice) => choice.status === "Approved").length;
  const localWaitlistedChoices = localChoiceReviews.filter((choice) => choice.status === "Waitlisted").length;
  const localRejectedChoices = localChoiceReviews.filter((choice) => choice.status === "Rejected").length;
  const localBannerTone =
    localRequestState === "draft"
      ? "draft"
      : localRejectedChoices && !localPendingChoices && !localApprovedChoices && !localWaitlistedChoices
        ? "rejected"
        : localApprovedChoices && !localPendingChoices && !localRejectedChoices && !localWaitlistedChoices
          ? "approved"
          : localApprovedChoices || localRejectedChoices || localWaitlistedChoices
            ? "mixed"
            : "pending";
  const localBannerClass =
    localBannerTone === "approved"
      ? "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]"
      : localBannerTone === "rejected"
        ? "border-[#d80509]/30 bg-[#fff5f5] text-[#a00408]"
        : localBannerTone === "mixed"
          ? "border-[#cfa500]/40 bg-[#fff8e6] text-[#7a5b00]"
          : "border-[#14c1d5]/30 bg-[#ecfdff] text-[#155e66]";
  const localBannerMessage =
    localRequestState === "draft"
      ? "You have a saved class-selection draft ready to review."
      : localBannerTone === "approved"
        ? "Your enrichment request has been approved. Approved classes are reflected in the schedule."
        : localBannerTone === "rejected"
          ? "Your enrichment request was not approved. Review the class selection page to choose another option."
          : localBannerTone === "mixed"
            ? "Your enrichment request has review updates, including waitlist decisions. Check each class status below."
            : "Your enrichment request is saved and pending school review.";

  const attendance = isStudentDataLoading ? "--" : profile ? metricValue(profile.attendanceLabel, "--") : "--";
  const basePendingRequests = Number(!isStudentDataLoading && profile ? firstNumber(profile.pendingLabel, "0") : "0");
  const localChoiceCount = localChoiceReviews.length;
  const pendingRequests = isStudentDataLoading
    ? "--"
    : String(basePendingRequests || (localRequestState === "submitted" ? localPendingChoices : 0)).padStart(2, "0");
  const hint = loadError ?? sourceHint(dataSource);

  const selectedSchedule = useMemo(() => {
    if (schedule) return schedule;
    return null;
  }, [schedule]);

  const scheduleBadgesBySlot = useMemo(() => {
    return buildParentScheduleBadges(
      selectedSchedule,
      catalogScheduleBadgeOverrides(catalogDraft, localReviewStatuses, localRequestState),
    );
  }, [catalogDraft, localRequestState, localReviewStatuses, selectedSchedule]);
  const scheduleFinality = useMemo(() => parentScheduleFinalityFromBadges(scheduleBadgesBySlot), [scheduleBadgesBySlot]);

  const catalogIdentity = useMemo<ParentCatalogIdentity>(
    () => ({
      studentId: student?.id,
      studentName: student?.name,
      parentName: student?.parent,
    }),
    [student],
  );

  const homeCatalogRequests = useMemo(
    () => ({
      ...INITIAL_PARENT_CATALOG_REQUESTS,
      ...(catalogDraft ?? {}),
    }) as HomeCatalogRequests,
    [catalogDraft],
  );

  const activeMeta = SLOT_META[activeSlot];
  const activeRequests = homeCatalogRequests[activeSlot];
  const enrichmentOptions = useMemo(
    () => classOptions.filter((option) => option.program === "enrichment"),
    [classOptions],
  );

  function resolveStoredChoice(choice: ParentCatalogRequests[CatalogSlotId]["firstChoice"] | null | undefined): ParentClassOption | null {
    if (!choice?.name && !choice?.id) return null;
    return (
      classOptions.find((option) => option.id === choice.id || option.name === choice.name) ??
      fallbackParentClassOption(choice.name ?? "Selected class", choice.id)
    );
  }

  const firstChoice = resolveStoredChoice(activeRequests.firstChoice);
  const secondChoice = resolveStoredChoice(activeRequests.secondChoice);
  const recommendedClasses = useMemo(() => {
    return parentClassOptionsForCatalogSlot(enrichmentOptions, activeMeta);
  }, [activeMeta, enrichmentOptions]);
  const overlayClasses = recommendedClasses.length ? recommendedClasses : enrichmentOptions;
  const firstChoiceOptions = overlayClasses.filter((option) => option.id !== secondChoice?.id);
  const secondChoiceOptions = overlayClasses.filter((option) => option.id !== firstChoice?.id);
  const activeSlotHasChoices = Boolean(firstChoice || secondChoice);
  const hasCatalogChoices = hasParentCatalogChoices(homeCatalogRequests as ParentCatalogRequests);
  const activeStudentId = student?.id;

  function persistHomeDraft(next: HomeCatalogRequests) {
    setCatalogDraft(next as ParentCatalogRequests);
    setLocalRequestState("draft");
    setLocalReviewStatuses({});
    try {
      clearSubmittedParentCatalogSnapshot({ studentId: student?.id });
      writePendingParentCatalogRequests(next as ParentCatalogRequests, catalogIdentity);
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
  }

  function openSelectionForSlot(slot: ParentScheduleSlotKey) {
    const catalogSlot = catalogSlotIdFromScheduleSlot(slot);
    if (!catalogSlot) return;
    setActiveSlot(catalogSlot);
    setSelectionDrawerOpen(true);
    setOpenChoice(null);
  }

  function openClassDetails(slot: ParentScheduleSlotKey, badge: StudentScheduleBadge) {
    if (badge.tone === "empty") return;
    const catalogSlot = catalogSlotIdFromScheduleSlot(slot);
    if (catalogSlot) setActiveSlot(catalogSlot);
    setDetailClass({
      option: classOptionForScheduleBadge(badge, classOptions),
      statusLabel: scheduleBadgeStatusLabel(badge, "compact"),
      catalogSlot,
    });
  }

  function editDetailSelection() {
    if (!detailClass?.catalogSlot) return;
    setActiveSlot(detailClass.catalogSlot);
    setDetailClass(null);
    setSelectionDrawerOpen(true);
    setOpenChoice(null);
  }

  function selectHomeChoice(cls: ParentClassOption, kind: ParentClassChoiceKind) {
    const active = homeCatalogRequests[activeSlot];
    const targetKind: ParentClassChoiceKind = kind === "secondChoice" && !active.firstChoice ? "firstChoice" : kind;
    const otherKind: ParentClassChoiceKind = targetKind === "firstChoice" ? "secondChoice" : "firstChoice";
    persistHomeDraft({
      ...homeCatalogRequests,
      [activeSlot]: {
        ...active,
        [targetKind]: cls,
        [otherKind]: active[otherKind]?.id === cls.id ? null : active[otherKind],
      },
    });
    setOpenChoice(null);
  }

  async function submitHomeSelections() {
    if (!hasCatalogChoices || submitting) return;
    const choices = selectedChoicesForSubmit(homeCatalogRequests as ParentCatalogRequests);
    if (!choices.length) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/data/enrichment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: activeStudentId, choices }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setLocalRequestState("draft");
        setLoadError(`Cloud submission failed: ${body?.error ?? res.statusText}. Your draft is still saved.`);
        setSelectionDrawerOpen(false);
        setDetailClass(null);
        return;
      }
      const body = (await res.json().catch(() => null)) as { requests?: EnrichmentRequestRow[] } | null;
      const snapshot = catalogSnapshotFromEnrichmentRequests(
        Array.isArray(body?.requests) ? body.requests : [],
        activeStudentId,
      );
      invalidateDashboardData("/api/data/enrichment-requests");
      clearPendingParentCatalogRequests({ studentId: activeStudentId });
      invalidateClientDataCache("/api/data/classes");
      if (activeStudentId) {
        invalidateClientDataCache(`/api/data/students/${encodeURIComponent(activeStudentId)}/profile`);
        invalidateClientDataCache(`/api/data/students/${encodeURIComponent(activeStudentId)}/schedule`);
      }
      if (snapshot.requests) {
        setCatalogDraft(snapshot.requests);
        setLocalRequestState(snapshot.state);
        setLocalReviewStatuses(snapshot.reviewStatuses);
      } else {
        setLocalRequestState("submitted");
        setLocalReviewStatuses({});
      }
      setSelectionDrawerOpen(false);
      setDetailClass(null);
      setLoadError(null);
    } catch (error) {
      setLocalRequestState("draft");
      setLoadError(`Cloud submission failed: ${error instanceof Error ? error.message : String(error)}. Your draft is still saved.`);
      setSelectionDrawerOpen(false);
      setDetailClass(null);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 flex flex-col gap-6 font-sans">
      {hint ? (
        <div className="rounded-xl border border-[#cfa500]/35 bg-[#fff8e6] px-4 py-3 text-sm text-[#7a5b00]" role="status">
          {hint}
        </div>
      ) : null}

      {localRequestState && localChoiceCount > 0 ? (
        <div className={`flex flex-col gap-3 rounded-[8px] border px-4 py-3 text-sm ${localBannerClass}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-medium">{localBannerMessage}</span>
            <div className="flex flex-wrap gap-2">
              {localRequestState === "draft" && hasCatalogChoices ? (
                <button
                  type="button"
                  onClick={submitHomeSelections}
                  disabled={submitting}
                  className="inline-flex h-8 items-center justify-center rounded-[6px] bg-[#14c1d5] px-3 text-[12px] font-semibold text-white hover:bg-[#11a9ba] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
                >
                  {submitting ? "Submitting..." : "Submit Draft"}
                </button>
              ) : null}
              <Link
                href={studentScopedHref("/dashboard/parents/catalog", activeStudentId)}
                className="inline-flex h-8 items-center justify-center rounded-[6px] bg-white/70 px-3 text-[12px] font-semibold text-[#155e66] ring-1 ring-[#14c1d5]/30 hover:bg-white"
              >
                Review Class Selection
              </Link>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {localChoiceReviews.map((choice) => (
              <span
                key={choice.id}
                className={`inline-flex max-w-full items-center gap-1 rounded-[999px] border px-2.5 py-1 text-[11px] font-semibold ${reviewPillClasses(choice.status)}`}
                title={`${choice.slot} ${choice.choice}: ${choice.name}`}
              >
                <span>{reviewPillLabel(choice.status, localRequestState)}</span>
                <span className="text-current/70">·</span>
                <span className="truncate">{choice.choice}: {choice.name}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
        <div className="flex-1 min-w-[200px] bg-white border border-[#f0f0f0] rounded-[18px] p-5 flex items-center shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
              <img alt="" className="size-5" src={imgHugeiconsStudent1} />
            </div>
            <p className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[32px] leading-[1.1]">
              {attendance}
            </p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
              Attendance
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-[200px] bg-white border border-[#f0f0f0] rounded-[18px] p-5 flex items-center shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
              <div className="relative size-5 overflow-hidden">
                <div className="absolute inset-[8.33%_16.67%]">
                  <div className="absolute inset-[-4.5%_-5.63%]">
                    <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                  </div>
                </div>
              </div>
            </div>
            <p className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[32px] leading-[1.1]">
              {pendingRequests}
            </p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
              Pending requests
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="w-full xl:flex-1 min-w-0 flex flex-col gap-6">
          <div>
            <div className="mb-4 flex flex-col gap-3 min-[760px]:flex-row min-[760px]:items-start min-[760px]:justify-between">
              <div className="min-w-0">
                <h2 className="font-['Inter:Semi_Bold',sans-serif] text-[16px] font-semibold text-[#0d0d12]">
                  {student ? `${student.name}'s schedule` : "Student schedule"}
                </h2>
                <p className="mt-1 text-sm text-[#666d80]">{scheduleFinality.description}</p>
              </div>
              <span className={`inline-flex w-fit shrink-0 rounded-[999px] border px-3 py-1 text-[12px] font-semibold ${parentScheduleFinalityClasses(scheduleFinality.state)}`}>
                {scheduleFinality.label}
              </span>
            </div>
            {isStudentDataLoading ? (
              <StudentDashboardLoading studentName={student?.name} />
            ) : (
              <ParentScheduleGrid
                badgesBySlot={scheduleBadgesBySlot}
                onSlotClick={openSelectionForSlot}
                onBadgeClick={openClassDetails}
              />
            )}
          </div>
        </div>

        <div className="w-full xl:w-[355px] shrink-0 flex flex-col gap-6">
          <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
                <Bell className="size-5 text-[#0d0d12]" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[16px]">
                System Alerts
              </p>
            </div>
            <div className="flex flex-col gap-6">
              {isStudentDataLoading ? (
                <p className="text-sm text-[#666d80]">Loading alerts...</p>
              ) : notifications.length ? (
                notifications.map((item) => <AlertRow key={item.id} item={item} studentId={activeStudentId} />)
              ) : (
                <p className="text-sm text-[#666d80]">No system alerts right now.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
                <CalendarDays className="size-5 text-[#0d0d12]" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[16px]">
                Quick Actions
              </p>
            </div>
            <div className="flex flex-col gap-6">
              <QuickRow title="View Schedule" body="See your child's daily and weekly schedule." href={studentScopedHref(PARENT_SCHEDULE_HREF, activeStudentId)} />
              <QuickRow title="Review Class Selection" body="Choose enrichment classes and track pending requests." href={studentScopedHref("/dashboard/parents/catalog", activeStudentId)} />
              <QuickRow title="View Profile" body="Access your child's personal and academic information." href={studentScopedHref("/dashboard/parents/students", activeStudentId)} />
              <QuickRow title="View Classes" body="Explore all enrolled classes and details." href={studentScopedHref("/dashboard/parents/classes/core", activeStudentId)} />
            </div>
          </div>
        </div>
      </div>
      {selectionDrawerOpen ? (
        <ParentClassSelectionDrawer
          title={activeMeta.title}
          time={activeMeta.overlayTime}
          firstChoice={firstChoice}
          secondChoice={secondChoice}
          firstChoiceOptions={firstChoiceOptions}
          secondChoiceOptions={secondChoiceOptions}
          openChoice={openChoice}
          onToggleChoice={(kind) => {
            if (kind === "secondChoice" && !firstChoice) return;
            setOpenChoice((open) => (open === kind ? null : kind));
          }}
          onSelectChoice={selectHomeChoice}
          onClose={() => setSelectionDrawerOpen(false)}
          onSubmit={submitHomeSelections}
          submitDisabled={!activeSlotHasChoices}
          submitting={submitting}
          secondChoiceDisabled={!firstChoice}
        />
      ) : null}
      {detailClass ? (
        <ParentClassDetailsDrawer
          option={detailClass.option}
          statusLabel={detailClass.statusLabel}
          classListHref={parentClassListHref(detailClass.option)}
          canSubmitDraft={detailClass.statusLabel === "Draft choice" && localRequestState === "draft" && hasCatalogChoices}
          submitting={submitting}
          onEditSelection={detailClass.statusLabel === "Draft choice" && detailClass.catalogSlot ? editDetailSelection : undefined}
          onSubmitDraft={submitHomeSelections}
          onClose={() => setDetailClass(null)}
        />
      ) : null}
    </div>
  );
}
