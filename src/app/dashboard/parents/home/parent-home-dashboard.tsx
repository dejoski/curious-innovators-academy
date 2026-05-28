"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, CalendarDays, ChevronRight } from "lucide-react";

import { ParentCatalogStatusBanner } from "@/components/parent-catalog-status-banner";
import {
  ParentClassDetailsDrawer,
  ParentClassSelectionDrawer,
  classOptionForScheduleBadge,
  fallbackParentClassOption,
  parentClassOptionsForCatalogSlot,
  parentClassOptionFromRow,
  type ParentClassChoiceKind,
  type ParentClassOption,
  type ParentClassSlotContext,
} from "@/components/parent-class-drawers";
import {
  buildParentScheduleBadges,
  ParentScheduleGrid,
  type ParentScheduleSlotKey,
} from "@/components/parent-schedule-grid";
import {
  cachedJson,
  DASHBOARD_CACHE_INVALIDATED_EVENT,
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
  changedParentCatalogRequests,
  clearPendingParentCatalogRequests,
  clearSubmittedParentCatalogSnapshot,
  hasParentCatalogChoices,
  mergedParentCatalogScheduleBadgeOverrides,
  mergeParentCatalogRequests,
  readParentCatalogSnapshot,
  selectedChoicesForSubmit,
  writePendingParentCatalogRequests,
  type LocalReviewStatuses,
  type ParentCatalogIdentity,
  type ParentCatalogRequests,
} from "@/lib/parent-catalog-state";
import {
  CATALOG_SLOT_META as SLOT_META,
  catalogSlotIdFromScheduleSlot,
  normalizeScheduleBadges,
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

function normalizedHomeCatalogRequests(requests?: ParentCatalogRequests | null): HomeCatalogRequests {
  return {
    ...INITIAL_PARENT_CATALOG_REQUESTS,
    ...(requests ?? {}),
  } as HomeCatalogRequests;
}

function slotContextFromBadges(badges: StudentScheduleBadge[] | undefined): ParentClassSlotContext {
  const current = normalizeScheduleBadges(badges ?? [])[0];
  return current ? { kind: "change", label: current.label } : { kind: "empty" };
}

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
  if (source === "fallback") return "Showing starter dashboard data while school records finish loading.";
  if (source === "unavailable") return null;
  return null;
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
  const [serverCatalogDraft, setServerCatalogDraft] = useState<ParentCatalogRequests | null>(null);
  const [serverLocalRequestState, setServerLocalRequestState] = useState<Exclude<LocalRequestState, "draft">>(null);
  const [serverLocalReviewStatuses, setServerLocalReviewStatuses] = useState<LocalReviewStatuses>({});
  const [editingCatalogDraft, setEditingCatalogDraft] = useState<HomeCatalogRequests | null>(null);
  const [localRequestState, setLocalRequestState] = useState<LocalRequestState>(null);
  const [, setLocalReviewStatuses] = useState<LocalReviewStatuses>({});
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
          setServerCatalogDraft(null);
          setServerLocalRequestState(null);
          setServerLocalReviewStatuses({});
          setEditingCatalogDraft(null);
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
    function handleCacheInvalidated(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { url?: string | null } | undefined : undefined;
      const url = detail?.url ?? null;
      if (
        !url ||
        url === "/api/data/students" ||
        url === "/api/data/classes" ||
        url === "/api/data/enrichment-requests" ||
        url.startsWith("/api/data/students/")
      ) {
        void loadParentHome();
      }
    }
    window.addEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleCacheInvalidated);
    return () => {
      cancelled = true;
      window.removeEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleCacheInvalidated);
    };
  }, [requestedStudentId]);

  useEffect(() => {
    if (!student?.id) {
      setCatalogDraft(null);
      setServerCatalogDraft(null);
      setServerLocalRequestState(null);
      setServerLocalReviewStatuses({});
      setLocalRequestState(null);
      setLocalReviewStatuses({});
      return;
    }
    const activeStudent = student;
    let cancelled = false;

    async function syncCatalogRequestState() {
      const snapshot = readParentCatalogSnapshot({
        studentId: activeStudent.id,
        studentName: activeStudent.name,
      });
      if (snapshot.requests) {
        setCatalogDraft(snapshot.requests);
        setLocalRequestState("draft");
        setLocalReviewStatuses({});
      }
      try {
        const body = await readDashboardData<{ requests?: EnrichmentRequestRow[] }>("/api/data/enrichment-requests");
        const snapshot = catalogSnapshotFromEnrichmentRequests(
          Array.isArray(body.requests) ? body.requests : [],
          activeStudent.id,
        );
        if (cancelled) return;
        setServerCatalogDraft(snapshot.requests);
        setServerLocalRequestState(snapshot.state);
        setServerLocalReviewStatuses(snapshot.reviewStatuses);
        if (!readParentCatalogSnapshot({ studentId: activeStudent.id, studentName: activeStudent.name }).requests) {
          setCatalogDraft(snapshot.requests);
          setLocalRequestState(snapshot.state);
          setLocalReviewStatuses(snapshot.reviewStatuses);
        }
      } catch {
        /* Local draft state remains visible when request rows cannot be loaded. */
      }
    }

    void syncCatalogRequestState();
    function handleCacheInvalidated(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { url?: string | null } | undefined : undefined;
      const url = detail?.url ?? null;
      if (
        !url ||
        url === "/api/data/enrichment-requests" ||
        url === "/api/data/classes" ||
        url === `/api/data/students/${encodeURIComponent(activeStudent.id)}/profile` ||
        url === `/api/data/students/${encodeURIComponent(activeStudent.id)}/schedule`
      ) {
        void syncCatalogRequestState();
      }
    }

    window.addEventListener("cia-parent-catalog-updated", syncCatalogRequestState);
    window.addEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleCacheInvalidated);
    window.addEventListener("storage", syncCatalogRequestState);
    return () => {
      cancelled = true;
      window.removeEventListener("cia-parent-catalog-updated", syncCatalogRequestState);
      window.removeEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleCacheInvalidated);
      window.removeEventListener("storage", syncCatalogRequestState);
    };
  }, [student?.id, student?.name]);

  useEffect(() => {
    if (!selectionDrawerOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeSelectionDrawer();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectionDrawerOpen]);

  const draftOnlyCatalogRequests = useMemo(() => {
    if (localRequestState !== "draft") return null;
    return changedParentCatalogRequests(catalogDraft, serverCatalogDraft);
  }, [catalogDraft, localRequestState, serverCatalogDraft]);

  const localChoiceReviews = useMemo(() => {
    if (localRequestState === "draft") return catalogChoiceReviews(draftOnlyCatalogRequests, {});
    return catalogChoiceReviews(serverCatalogDraft, serverLocalReviewStatuses);
  }, [draftOnlyCatalogRequests, localRequestState, serverCatalogDraft, serverLocalReviewStatuses]);

  const localPendingChoices = localChoiceReviews.filter((choice) => choice.status === "Pending").length;
  const showCatalogStatusBanner = localRequestState === "draft" || localPendingChoices > 0;

  const attendance = isStudentDataLoading ? "--" : profile ? metricValue(profile.attendanceLabel, "--") : "--";
  const basePendingRequests = Number(!isStudentDataLoading && profile ? firstNumber(profile.pendingLabel, "0") : "0");
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
      mergedParentCatalogScheduleBadgeOverrides(
        serverCatalogDraft,
        serverLocalReviewStatuses,
        serverLocalRequestState,
        draftOnlyCatalogRequests,
      ),
    );
  }, [draftOnlyCatalogRequests, selectedSchedule, serverCatalogDraft, serverLocalRequestState, serverLocalReviewStatuses]);
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
    () => normalizedHomeCatalogRequests(mergeParentCatalogRequests(serverCatalogDraft, draftOnlyCatalogRequests)),
    [draftOnlyCatalogRequests, serverCatalogDraft],
  );
  const drawerCatalogRequests = editingCatalogDraft ?? homeCatalogRequests;

  const activeMeta = SLOT_META[activeSlot];
  const activeRequests = drawerCatalogRequests[activeSlot];
  const slotContext = slotContextFromBadges(schedule?.[activeMeta.scheduleSlot]);
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

  const recommendedClasses = useMemo(() => {
    return parentClassOptionsForCatalogSlot(enrichmentOptions, activeMeta);
  }, [activeMeta, enrichmentOptions]);
  const overlayClasses = recommendedClasses;
  const choiceMatchesActiveSlot = (choice: ParentClassOption | null) =>
    Boolean(choice && overlayClasses.some((option) => (option.id || option.name) === (choice.id || choice.name)));
  const storedFirstChoice = resolveStoredChoice(activeRequests.firstChoice);
  const storedSecondChoice = resolveStoredChoice(activeRequests.secondChoice);
  const firstChoice = choiceMatchesActiveSlot(storedFirstChoice) ? storedFirstChoice : null;
  const secondChoice = choiceMatchesActiveSlot(storedSecondChoice) ? storedSecondChoice : null;
  const firstChoiceOptions = overlayClasses.filter((option) => option.id !== secondChoice?.id);
  const secondChoiceOptions = overlayClasses.filter((option) => option.id !== firstChoice?.id);
  const activeSlotHasChoices = Boolean(firstChoice || secondChoice);
  const hasCatalogChoices =
    localRequestState === "draft"
      ? hasParentCatalogChoices(draftOnlyCatalogRequests as ParentCatalogRequests)
      : hasParentCatalogChoices(homeCatalogRequests as ParentCatalogRequests);
  const drawerHasCatalogChoices = hasParentCatalogChoices(drawerCatalogRequests as ParentCatalogRequests);
  const activeStudentId = student?.id;

  function persistHomeDraft(next: ParentCatalogRequests) {
    const changedDraft = changedParentCatalogRequests(next, serverCatalogDraft);
    if (!changedDraft) return false;
    setCatalogDraft(changedDraft);
    setLocalRequestState("draft");
    setLocalReviewStatuses({});
    try {
      clearSubmittedParentCatalogSnapshot({ studentId: student?.id });
      writePendingParentCatalogRequests(changedDraft, catalogIdentity);
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
    return true;
  }

  function saveHomeDraft() {
    const draft = editingCatalogDraft ?? homeCatalogRequests;
    if (!hasParentCatalogChoices(draft as ParentCatalogRequests)) return;
    if (!persistHomeDraft(draft)) return;
    setSelectionDrawerOpen(false);
    setOpenChoice(null);
    setEditingCatalogDraft(null);
    setLoadError(null);
  }

  function discardHomeDraft() {
    try {
      clearPendingParentCatalogRequests({ studentId: activeStudentId });
      clearSubmittedParentCatalogSnapshot({ studentId: activeStudentId });
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
    setCatalogDraft(serverCatalogDraft);
    setLocalRequestState(serverLocalRequestState);
    setLocalReviewStatuses(serverLocalReviewStatuses);
    setEditingCatalogDraft(null);
    setDetailClass(null);
    setLoadError(null);
  }

  function openSelectionForSlot(slot: ParentScheduleSlotKey) {
    const catalogSlot = catalogSlotIdFromScheduleSlot(slot);
    if (!catalogSlot) return;
    setActiveSlot(catalogSlot);
    setEditingCatalogDraft(homeCatalogRequests);
    setSelectionDrawerOpen(true);
    setOpenChoice(null);
  }

  function closeSelectionDrawer() {
    setSelectionDrawerOpen(false);
    setEditingCatalogDraft(null);
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
    setEditingCatalogDraft(homeCatalogRequests);
    setDetailClass(null);
    setSelectionDrawerOpen(true);
    setOpenChoice(null);
  }

  function selectHomeChoice(cls: ParentClassOption, kind: ParentClassChoiceKind) {
    setEditingCatalogDraft((prev) => {
      const current = prev ?? homeCatalogRequests;
      const active = current[activeSlot];
      const targetKind: ParentClassChoiceKind = kind === "secondChoice" && !active.firstChoice ? "firstChoice" : kind;
      const otherKind: ParentClassChoiceKind = targetKind === "firstChoice" ? "secondChoice" : "firstChoice";
      return {
        ...current,
        [activeSlot]: {
          ...active,
          [targetKind]: cls,
          [otherKind]: active[otherKind]?.id === cls.id ? null : active[otherKind],
        },
      };
    });
    setOpenChoice(null);
  }

  async function submitHomeSelections() {
    const rawSubmissionRequests = editingCatalogDraft ?? homeCatalogRequests;
    const submissionRequests = changedParentCatalogRequests(
      rawSubmissionRequests as ParentCatalogRequests,
      serverCatalogDraft,
    );
    if (!submissionRequests || !hasParentCatalogChoices(submissionRequests as ParentCatalogRequests) || submitting) return;
    const choices = selectedChoicesForSubmit(submissionRequests as ParentCatalogRequests);
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
        persistHomeDraft(submissionRequests);
        setLoadError(`Cloud submission failed: ${body?.error ?? res.statusText}. Your draft is still saved.`);
        closeSelectionDrawer();
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
      setServerCatalogDraft(snapshot.requests);
      setServerLocalRequestState(snapshot.state);
      setServerLocalReviewStatuses(snapshot.reviewStatuses);
      setCatalogDraft(snapshot.requests);
      setLocalRequestState(snapshot.state);
      setLocalReviewStatuses(snapshot.reviewStatuses);
      closeSelectionDrawer();
      setDetailClass(null);
      setLoadError(null);
    } catch (error) {
      persistHomeDraft(submissionRequests);
      setLoadError(`Cloud submission failed: ${error instanceof Error ? error.message : String(error)}. Your draft is still saved.`);
      closeSelectionDrawer();
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

      {showCatalogStatusBanner ? (
        <ParentCatalogStatusBanner
          state={localRequestState}
          choices={localChoiceReviews}
          actions={
            <>
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
              {localRequestState === "draft" && hasCatalogChoices ? (
                <button
                  type="button"
                  onClick={discardHomeDraft}
                  className="inline-flex h-8 items-center justify-center rounded-[6px] bg-white/70 px-3 text-[12px] font-semibold text-[#155e66] ring-1 ring-[#14c1d5]/30 hover:bg-white"
                >
                  Discard draft
                </button>
              ) : null}
              <Link
                href={studentScopedHref("/dashboard/parents/catalog", activeStudentId)}
                className="inline-flex h-8 items-center justify-center rounded-[6px] bg-white/70 px-3 text-[12px] font-semibold text-[#155e66] ring-1 ring-[#14c1d5]/30 hover:bg-white"
              >
                Review Class Selection
              </Link>
            </>
          }
        />
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
          slotContext={slotContext}
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
          onClose={closeSelectionDrawer}
          onSaveDraft={saveHomeDraft}
          onSubmit={submitHomeSelections}
          saveDraftDisabled={!drawerHasCatalogChoices}
          submitDisabled={!activeSlotHasChoices}
          submitting={submitting}
          secondChoiceDisabled={!firstChoice}
          optionsLoading={isStudentDataLoading}
        />
      ) : null}
      {detailClass ? (
        <ParentClassDetailsDrawer
          option={detailClass.option}
          statusLabel={detailClass.statusLabel}
          classListHref={parentClassListHref(detailClass.option)}
          canSubmitDraft={detailClass.statusLabel.startsWith("Draft") && localRequestState === "draft" && hasCatalogChoices}
          submitting={submitting}
          onEditSelection={detailClass.statusLabel.startsWith("Draft") && detailClass.catalogSlot ? editDetailSelection : undefined}
          onSubmitDraft={submitHomeSelections}
          onClose={() => setDetailClass(null)}
        />
      ) : null}
    </div>
  );
}
