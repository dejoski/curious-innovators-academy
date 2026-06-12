"use client";

import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Info, Lightbulb } from "lucide-react";

import { ParentCatalogStatusBanner } from "@/components/parent-catalog-status-banner";
import {
  ParentClassDetailsDrawer,
  ParentClassSelectionDrawer,
  type ParentClassChoiceKind,
  type ParentClassOption,
  type ParentClassSlotContext,
  type ScheduleDisplayParts,
} from "@/components/parent-class-drawers";
import {
  fallbackParentClassOption,
  hasBlockingScheduleConflict,
  isParentSelectableEnrichmentOption,
  parentClassOptionsForCatalogSlot,
  parentClassOptionFromRow,
  parseStudentAgeYears,
  requestKindForOption,
} from "@/lib/parent-class-options";
import {
  ParentScheduleGrid,
  type ParentScheduleSlotKey,
} from "@/components/parent-schedule-grid";
import { buildParentScheduleBadges } from "@/lib/parent-schedule-badges";
import {
  cachedJson,
  DASHBOARD_CACHE_INVALIDATED_EVENT,
  invalidateClientDataCache,
  invalidateDashboardData,
  readDashboardData,
} from "@/lib/client-data-cache";
import {
  selectedParentStudentIdFromSearchParams,
  withParentStudentParam,
} from "@/lib/parent-student-selection";
import {
  INITIAL_PARENT_CATALOG_REQUESTS,
  catalogChoiceReviews,
  catalogSnapshotFromEnrichmentRequests,
  changedParentCatalogChoiceRequests,
  clearPendingParentCatalogRequests,
  clearSubmittedParentCatalogSnapshot,
  hasParentCatalogChoices,
  localReviewKey,
  mergedParentCatalogScheduleBadgeOverrides,
  mergeParentCatalogChoiceRequests,
  normalizeParentCatalogRequests,
  parentCatalogRequestsForChoice,
  parentCatalogRequestsForSlot,
  readParentCatalogSnapshot,
  remainingParentCatalogDraftAfterSubmit,
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
  type CatalogSlotId,
} from "@/lib/schedule-slots";
import {
  parentScheduleFinalityClasses,
  parentScheduleFinalityFromBadges,
} from "@/lib/parent-schedule-status";
import type { EnrichmentRequestRow, SchoolClassRow, StudentListItem, StudentProfileBundle, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";

type SlotId = CatalogSlotId;

type SlotRequests = ParentCatalogRequests[CatalogSlotId];

const initialRequests = INITIAL_PARENT_CATALOG_REQUESTS as Record<SlotId, SlotRequests>;

function normalizedCatalogRequests(requests?: ParentCatalogRequests | null): Record<SlotId, SlotRequests> {
  return normalizeParentCatalogRequests(requests ?? INITIAL_PARENT_CATALOG_REQUESTS) as Record<SlotId, SlotRequests>;
}

function pendingReviewStatusesForRequests(requests: ParentCatalogRequests | null | undefined): LocalReviewStatuses {
  const normalized = normalizedCatalogRequests(requests);
  const statuses: LocalReviewStatuses = {};

  (Object.entries(normalized) as [SlotId, SlotRequests][]).forEach(([slotId, slot]) => {
    if (slot.firstChoice?.id || slot.firstChoice?.name) statuses[localReviewKey(slotId, "first")] = "Pending";
    if (slot.secondChoice?.id || slot.secondChoice?.name) statuses[localReviewKey(slotId, "second")] = "Pending";
  });

  return statuses;
}

function slotContextFromBadges(badges: StudentScheduleBadge[] | undefined): ParentClassSlotContext {
  const current = normalizeScheduleBadges(badges ?? [])[0];
  return current ? { kind: "change", label: current.label } : { kind: "empty" };
}

type CatalogLegendKind = "core" | "approved" | "pending" | "waitlisted" | "draft" | "empty";

function statusDotClass(kind: CatalogLegendKind) {
  if (kind === "core") return "border-[#14c1d5] bg-[#d2f1f5]";
  if (kind === "approved") return "border-[#004d08] bg-[#004d08]/20";
  if (kind === "pending") return "border-[#d80509] bg-[#ffd9d9]";
  if (kind === "waitlisted") return "border-[#cfa500] bg-[#fff8e6]";
  if (kind === "draft") return "border-[#84adff] bg-[#eef4ff]";
  return "border-[#f0f0f0] bg-[#fafafa]";
}

function LegendItem({ kind, label }: { kind: CatalogLegendKind; label: string }) {
  return (
    <div className="flex items-center gap-[6px]">
      <span className={`size-[17px] rounded-[4px] border ${statusDotClass(kind)}`} />
      <span className="text-[12px] leading-[1.25] text-[#0d0d12]">{label}</span>
    </div>
  );
}

function StepItem({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-[10px]">
      <div className="flex size-[32px] shrink-0 items-center justify-center rounded-full bg-[#f6fcfd] text-[14px] font-semibold text-[#14c1d5]">{n}</div>
      <div className="min-w-0 text-[#666d80]">
        <p className="text-[14px] font-semibold leading-[1.4]">{title}</p>
        <p className="mt-[6px] text-[12px] leading-[1.4]">{body}</p>
      </div>
    </div>
  );
}

function ParentClassesEnrichmentCatalogContent() {
  const searchParams = useSearchParams();
  const requestedStudentId = selectedParentStudentIdFromSearchParams(searchParams);
  const [availableClasses, setAvailableClasses] = useState<ParentClassOption[]>([]);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [activeSlot, setActiveSlot] = useState<SlotId>("block4_day3");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [openChoice, setOpenChoice] = useState<ParentClassChoiceKind | null>(null);
  const [activeSubmitChoice, setActiveSubmitChoice] = useState<ParentClassChoiceKind | null>(null);
  const [requests, setRequests] = useState<Record<SlotId, SlotRequests>>(initialRequests);
  const [serverRequests, setServerRequests] = useState<Record<SlotId, SlotRequests>>(initialRequests);
  const [serverReviewStatuses, setServerReviewStatuses] = useState<LocalReviewStatuses>({});
  const [serverRequestState, setServerRequestState] = useState<"submitted" | null>(null);
  const [editingRequests, setEditingRequests] = useState<Record<SlotId, SlotRequests> | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<{ tone: "success" | "warning"; message: string } | null>(null);
  const [studentSchedule, setStudentSchedule] = useState<StudentScheduleRow | null>(null);
  const [activeStudent, setActiveStudent] = useState<StudentListItem | null>(null);
  const [studentAgeYears, setStudentAgeYears] = useState<number | null>(null);
  const [studentScheduleLoading, setStudentScheduleLoading] = useState(true);
  const [localRequestState, setLocalRequestState] = useState<"draft" | "submitted" | null>(null);
  const [detailClass, setDetailClass] = useState<{ option: ParentClassOption; scheduleDisplay?: ScheduleDisplayParts } | null>(null);
  const requestStateVersion = useRef(0);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setCatalogLoading(true);
      try {
        const body = await cachedJson<{ classes?: SchoolClassRow[]; source?: string }>("/api/data/classes");
        const rows = Array.isArray(body.classes) ? body.classes : [];
        const enrichment = rows.reduce<ParentClassOption[]>((next, row) => {
          if (row.program === "enrichment") next.push(parentClassOptionFromRow(row));
          return next;
        }, []);
        if (cancelled) return;
        setAvailableClasses(enrichment);
        setCatalogHint(
          body.source === "fallback"
            ? "Showing starter offerings while class options finish loading."
            : body.source === "unavailable"
              ? "Class options are temporarily unavailable."
              : null,
        );
      } catch (error) {
        if (!cancelled) {
          setAvailableClasses([]);
          setCatalogHint(`Could not load enrichment offerings: ${error instanceof Error ? error.message : String(error)}.`);
        }
      } finally {
        if (!cancelled) setCatalogLoading(false);
      }
    }
    void loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadActiveStudentSchedule() {
      setStudentScheduleLoading(true);
      try {
        const studentsBody = await cachedJson<{ students?: StudentListItem[] }>("/api/data/students");
        const students = Array.isArray(studentsBody.students) ? studentsBody.students : [];
        const activeStudent =
          students.find((student) => student.id === requestedStudentId) ?? students[0] ?? null;
        if (!activeStudent) {
          if (!cancelled) {
            setActiveStudent(null);
            setStudentSchedule(null);
            setStudentAgeYears(null);
          }
          return;
        }
        const [profileBody, scheduleBody] = await Promise.all([
          cachedJson<{ profile?: StudentProfileBundle | null }>(
            `/api/data/students/${encodeURIComponent(activeStudent.id)}/profile`,
          ),
          cachedJson<{ rows?: StudentScheduleRow[] }>(
            `/api/data/students/${encodeURIComponent(activeStudent.id)}/schedule`,
          ),
        ]);
        if (!cancelled) {
          setActiveStudent(activeStudent);
          setStudentSchedule(Array.isArray(scheduleBody.rows) ? (scheduleBody.rows[0] ?? null) : null);
          setStudentAgeYears(parseStudentAgeYears(profileBody.profile?.details?.age));
        }
      } catch {
        if (!cancelled) {
          setActiveStudent(null);
          setStudentSchedule(null);
          setStudentAgeYears(null);
        }
      } finally {
        if (!cancelled) setStudentScheduleLoading(false);
      }
    }
    void loadActiveStudentSchedule();
    function handleCacheInvalidated(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { url?: string | null } | undefined : undefined;
      const url = detail?.url ?? null;
      const studentId = activeStudent?.id ?? requestedStudentId ?? "";
      if (
        !url ||
        url === "/api/data/students" ||
        url === "/api/data/enrichment-requests" ||
        (studentId && (
          url === `/api/data/students/${encodeURIComponent(studentId)}/profile` ||
          url === `/api/data/students/${encodeURIComponent(studentId)}/schedule`
        ))
      ) {
        void loadActiveStudentSchedule();
      }
    }
    window.addEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleCacheInvalidated);
    return () => {
      cancelled = true;
      window.removeEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleCacheInvalidated);
    };
  }, [activeStudent?.id, requestedStudentId]);

  useEffect(() => {
    if (!activeStudent?.id) {
      setRequests(normalizedCatalogRequests());
      setServerRequests(normalizedCatalogRequests());
      setServerRequestState(null);
      setServerReviewStatuses({});
      setLocalRequestState(null);
      setRestoredDraft(false);
      return;
    }
    const studentForRequests = activeStudent;
    let cancelled = false;
    async function loadRequestState() {
      const loadVersion = ++requestStateVersion.current;
      const draftSnapshot = readParentCatalogSnapshot({
        studentId: studentForRequests.id,
        studentName: studentForRequests.name,
      });
      const draftRequests = draftSnapshot.requests ? normalizedCatalogRequests(draftSnapshot.requests) : null;
      if (!cancelled) {
        setRequests(draftRequests ?? normalizedCatalogRequests());
        setLocalRequestState(draftRequests ? "draft" : null);
        setRestoredDraft(Boolean(draftRequests));
      }

      try {
        const body = await readDashboardData<{ requests?: EnrichmentRequestRow[] }>("/api/data/enrichment-requests");
        const dbSnapshot = catalogSnapshotFromEnrichmentRequests(
          Array.isArray(body.requests) ? body.requests : [],
          studentForRequests.id,
        );
        if (cancelled || requestStateVersion.current !== loadVersion) return;
        const dbRequests = normalizedCatalogRequests(dbSnapshot.requests);
        setServerRequests(dbRequests);
        setServerRequestState(dbSnapshot.state);
        setServerReviewStatuses(dbSnapshot.reviewStatuses);
        if (!draftRequests) {
          setRequests(dbRequests);
          setLocalRequestState(dbSnapshot.state);
          setRestoredDraft(false);
        }
      } catch {
        /* Draft state remains available if the request endpoint is unavailable. */
      }
    }
    void loadRequestState();
    function handleCacheInvalidated(event: Event) {
      const detail = event instanceof CustomEvent ? event.detail as { url?: string | null } | undefined : undefined;
      const url = detail?.url ?? null;
      if (
        !url ||
        url === "/api/data/enrichment-requests" ||
        url === "/api/data/classes" ||
        url === `/api/data/students/${encodeURIComponent(studentForRequests.id)}/profile` ||
        url === `/api/data/students/${encodeURIComponent(studentForRequests.id)}/schedule`
      ) {
        void loadRequestState();
      }
    }
    window.addEventListener("cia-parent-catalog-updated", loadRequestState);
    window.addEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleCacheInvalidated);
    window.addEventListener("storage", loadRequestState);
    return () => {
      cancelled = true;
      window.removeEventListener("cia-parent-catalog-updated", loadRequestState);
      window.removeEventListener(DASHBOARD_CACHE_INVALIDATED_EVENT, handleCacheInvalidated);
      window.removeEventListener("storage", loadRequestState);
    };
  }, [activeStudent?.id, activeStudent?.name]);

  useEffect(() => {
    if (!overlayOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeSelectionDrawer();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [overlayOpen]);

  const catalogIdentity = useMemo<ParentCatalogIdentity>(
    () => ({
      studentId: activeStudent?.id,
      studentName: activeStudent?.name,
      parentName: activeStudent?.parent,
    }),
    [activeStudent],
  );

  const draftOnlyRequests = useMemo(() => {
    if (localRequestState !== "draft") return null;
    return changedParentCatalogChoiceRequests(requests as ParentCatalogRequests, serverRequests as ParentCatalogRequests);
  }, [localRequestState, requests, serverRequests]);
  const renderedRequests = useMemo(
    () => mergeParentCatalogChoiceRequests(serverRequests as ParentCatalogRequests, draftOnlyRequests),
    [draftOnlyRequests, serverRequests],
  );
  const scheduleBadgesBySlot = useMemo(() => {
    return buildParentScheduleBadges(
      studentSchedule,
      mergedParentCatalogScheduleBadgeOverrides(
        serverRequests as ParentCatalogRequests,
        serverReviewStatuses,
        serverRequestState,
        draftOnlyRequests,
      ),
    );
  }, [draftOnlyRequests, serverRequestState, serverRequests, serverReviewStatuses, studentSchedule]);
  const scheduleFinality = useMemo(() => parentScheduleFinalityFromBadges(scheduleBadgesBySlot), [scheduleBadgesBySlot]);
  const localChoiceReviews = useMemo(() => {
    if (localRequestState === "draft") return catalogChoiceReviews(draftOnlyRequests, {});
    return catalogChoiceReviews(serverRequests as ParentCatalogRequests, serverReviewStatuses);
  }, [draftOnlyRequests, localRequestState, serverRequests, serverReviewStatuses]);

  const selectedChoices = useMemo(
    () => selectedChoicesForSubmit((localRequestState === "draft" ? draftOnlyRequests : requests) as ParentCatalogRequests),
    [draftOnlyRequests, localRequestState, requests],
  );
  const drawerRequests = editingRequests ?? renderedRequests;
  const drawerSelectedChoices = useMemo(
    () => selectedChoicesForSubmit(drawerRequests as ParentCatalogRequests),
    [drawerRequests],
  );

  const hasChoices = selectedChoices.length > 0;
  const drawerHasChoices = drawerSelectedChoices.length > 0;
  const activeMeta = SLOT_META[activeSlot];
  const activeRequests = drawerRequests[activeSlot];
  const slotContext = slotContextFromBadges(studentSchedule?.[activeMeta.scheduleSlot]);
  const changedDrawerRequests = changedParentCatalogChoiceRequests(drawerRequests as ParentCatalogRequests, serverRequests as ParentCatalogRequests);
  const activeChangedSlot = changedDrawerRequests?.[activeSlot];
  const activeChangedChoiceKinds = (["firstChoice", "secondChoice"] as ParentClassChoiceKind[]).filter((kind) =>
    Boolean(activeChangedSlot?.[kind]?.id || activeChangedSlot?.[kind]?.name),
  );
  const submitChoiceKind =
    activeSubmitChoice && activeChangedChoiceKinds.includes(activeSubmitChoice)
      ? activeSubmitChoice
      : activeChangedChoiceKinds[0] ?? null;

  function resolveStoredChoice(choice: SlotRequests["firstChoice"] | null | undefined): ParentClassOption | null {
    if (!choice?.name && !choice?.id) return null;
    const found = availableClasses.find((option) => option.id === choice.id || option.name === choice.name);
    return found
      ? { ...found, requestKind: choice.requestKind }
      : fallbackParentClassOption(choice.name ?? "Selected class", choice.id);
  }

  const recommendedClasses = useMemo(() => {
    return parentClassOptionsForCatalogSlot(
      availableClasses.filter((option) =>
        isParentSelectableEnrichmentOption(option, {
          studentAgeYears,
          schedule: studentSchedule,
          allowFullForWaitlist: true,
          allowPendingScheduleSlot: activeMeta.scheduleSlot,
          allowClassIds: [activeRequests.firstChoice?.id, activeRequests.secondChoice?.id].filter(
            (id): id is string => Boolean(id),
          ),
        }),
      ),
      activeMeta,
    );
  }, [activeMeta, activeRequests.firstChoice?.id, activeRequests.secondChoice?.id, availableClasses, studentAgeYears, studentSchedule]);

  const overlayClasses = recommendedClasses;
  const choiceMatchesActiveSlot = (choice: ParentClassOption | null) =>
    Boolean(choice && overlayClasses.some((option) => (option.id || option.name) === (choice.id || choice.name)));
  const storedFirstChoice = resolveStoredChoice(activeRequests.firstChoice);
  const storedSecondChoice = resolveStoredChoice(activeRequests.secondChoice);
  const firstChoice = choiceMatchesActiveSlot(storedFirstChoice) ? storedFirstChoice : null;
  const secondChoice = choiceMatchesActiveSlot(storedSecondChoice) ? storedSecondChoice : null;
  const firstChoiceOptions = overlayClasses.filter((cls) => cls.id !== secondChoice?.id);
  const secondChoiceOptions = overlayClasses.filter((cls) => cls.id !== firstChoice?.id);
  const activeSlotHasChoices = Boolean(firstChoice || secondChoice);

  function openSlot(slotId: SlotId) {
    setActiveSlot(slotId);
    setEditingRequests(renderedRequests as Record<SlotId, SlotRequests>);
    setOverlayOpen(true);
    setOpenChoice(null);
    setActiveSubmitChoice(null);
  }

  function closeSelectionDrawer() {
    setOverlayOpen(false);
    setEditingRequests(null);
    setOpenChoice(null);
    setActiveSubmitChoice(null);
    setDetailClass(null);
  }

  function openScheduleSlot(slot: ParentScheduleSlotKey) {
    const currentBadges = scheduleBadgesBySlot[slot] ?? [];
    if (currentBadges.some((badge) => badge.tone === "core" || badge.tone === "approved")) {
      setSubmitBanner({ tone: "warning", message: "This slot already has a confirmed class. Ask the school team to change it, or use waitlist actions for classes that should not replace the current schedule." });
      return;
    }
    const catalogSlot = catalogSlotIdFromScheduleSlot(slot);
    if (catalogSlot) openSlot(catalogSlot);
  }

  function selectChoice(cls: ParentClassOption, kind: ParentClassChoiceKind) {
    if (hasBlockingScheduleConflict(cls, studentSchedule, { allowPendingScheduleSlot: activeMeta.scheduleSlot })) {
      setSubmitBanner({ tone: "warning", message: "This class conflicts with a confirmed or pending class already visible in the schedule." });
      return;
    }
    const currentRequests = editingRequests ?? (renderedRequests as Record<SlotId, SlotRequests>);
    const currentActive = currentRequests[activeSlot];
    const selectedKind: ParentClassChoiceKind = kind === "secondChoice" && !currentActive.firstChoice ? "firstChoice" : kind;
    setEditingRequests((prev) => {
      const current = prev ?? (renderedRequests as Record<SlotId, SlotRequests>);
      const active = current[activeSlot];
      const targetKind: ParentClassChoiceKind = kind === "secondChoice" && !active.firstChoice ? "firstChoice" : kind;
      const otherKind: ParentClassChoiceKind = targetKind === "firstChoice" ? "secondChoice" : "firstChoice";
      return {
        ...current,
        [activeSlot]: {
          ...active,
          [targetKind]: { ...cls, requestKind: requestKindForOption(cls) },
          [otherKind]: active[otherKind]?.id === cls.id ? null : active[otherKind],
        },
      };
    });
    setActiveSubmitChoice(selectedKind);
    setSubmitBanner(null);
    setOpenChoice(null);
  }

  function saveDraftSelections() {
    const rawDraft = editingRequests ?? (renderedRequests as Record<SlotId, SlotRequests>);
    const draft = changedParentCatalogChoiceRequests(rawDraft as ParentCatalogRequests, serverRequests as ParentCatalogRequests);
    if (!selectedChoicesForSubmit(draft as ParentCatalogRequests).length) return;
    requestStateVersion.current += 1;
    setRequests(draft as Record<SlotId, SlotRequests>);
    setLocalRequestState("draft");
    setRestoredDraft(true);
    try {
      clearSubmittedParentCatalogSnapshot({ studentId: activeStudent?.id });
      writePendingParentCatalogRequests(draft as ParentCatalogRequests, catalogIdentity);
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
    setSubmitBanner({ tone: "success", message: "Draft saved on this device. Submit it to send changes for review." });
    closeSelectionDrawer();
  }

  function discardDraft() {
    requestStateVersion.current += 1;
    try {
      clearPendingParentCatalogRequests({ studentId: activeStudent?.id });
      clearSubmittedParentCatalogSnapshot({ studentId: activeStudent?.id });
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
    setRequests(serverRequests);
    setLocalRequestState(serverRequestState);
    setRestoredDraft(false);
    setEditingRequests(null);
    setSubmitBanner({ tone: "success", message: "Draft discarded. Showing the approved schedule again." });
  }

  function saveFailedSubmitAsDraft(draft: Record<SlotId, SlotRequests>) {
    const changedDraft = changedParentCatalogChoiceRequests(draft as ParentCatalogRequests, serverRequests as ParentCatalogRequests);
    if (!changedDraft) return;
    setRequests(changedDraft as Record<SlotId, SlotRequests>);
    setLocalRequestState("draft");
    setRestoredDraft(true);
    try {
      clearSubmittedParentCatalogSnapshot({ studentId: activeStudent?.id });
      writePendingParentCatalogRequests(changedDraft, catalogIdentity);
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
  }

  async function submitSelections(scope: "all-drafts" | "active-choice" | "active-slot" = "all-drafts") {
    const rawSubmissionRequests = editingRequests ?? (localRequestState === "draft" ? renderedRequests : requests);
    const changedDraft = changedParentCatalogChoiceRequests(
      rawSubmissionRequests as ParentCatalogRequests,
      serverRequests as ParentCatalogRequests,
    );
    if (!changedDraft || submitting) return;
    const submissionRequests =
      scope === "active-choice" && submitChoiceKind
        ? parentCatalogRequestsForChoice(changedDraft, activeSlot, submitChoiceKind)
        : scope === "active-slot"
          ? parentCatalogRequestsForSlot(changedDraft, activeSlot)
          : changedDraft;
    const choices = selectedChoicesForSubmit(submissionRequests as ParentCatalogRequests);
    if (!submissionRequests || !choices.length) return;
    requestStateVersion.current += 1;
    setSubmitting(true);
    setSubmitBanner(null);
    try {
      const res = await fetch("/api/data/enrichment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: activeStudent?.id, choices, submitScope: scope === "active-slot" ? "slot" : "choice" }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        saveFailedSubmitAsDraft(changedDraft as Record<SlotId, SlotRequests>);
        setSubmitBanner({ tone: "warning", message: `Could not submit selections: ${body?.error ?? res.statusText}. Your draft is still saved.` });
        closeSelectionDrawer();
        return;
      }
      const body = (await res.json().catch(() => null)) as { requests?: EnrichmentRequestRow[] } | null;
      const dbSnapshot = catalogSnapshotFromEnrichmentRequests(
        Array.isArray(body?.requests) ? body.requests : [],
        activeStudent?.id,
      );
      const submittedRequests = mergeParentCatalogChoiceRequests(submissionRequests, dbSnapshot.requests);
      const nextRequests = normalizedCatalogRequests(mergeParentCatalogChoiceRequests(serverRequests as ParentCatalogRequests, submittedRequests));
      const nextReviewStatuses = {
        ...serverReviewStatuses,
        ...pendingReviewStatusesForRequests(submissionRequests),
        ...dbSnapshot.reviewStatuses,
      };
      const nextRequestState = hasParentCatalogChoices(nextRequests as ParentCatalogRequests) ? "submitted" : null;
      const remainingDraft = remainingParentCatalogDraftAfterSubmit(
        changedDraft,
        submissionRequests,
        nextRequests as ParentCatalogRequests,
      );
      setServerRequests(nextRequests);
      setServerRequestState(nextRequestState);
      setServerReviewStatuses(nextReviewStatuses);
      if (remainingDraft) {
        setRequests(remainingDraft as Record<SlotId, SlotRequests>);
        setLocalRequestState("draft");
        setRestoredDraft(true);
        try {
          clearSubmittedParentCatalogSnapshot({ studentId: activeStudent?.id });
          writePendingParentCatalogRequests(remainingDraft, catalogIdentity);
        } catch {
          /* Browser storage can be unavailable in privacy modes. */
        }
        setSubmitBanner({ tone: "success", message: "Selection submitted for school review. Other draft choices are still saved." });
      } else {
        clearPendingParentCatalogRequests({ studentId: activeStudent?.id });
        setRequests(nextRequests);
        setLocalRequestState(nextRequestState);
        setRestoredDraft(false);
        setSubmitBanner({ tone: "success", message: "Selections submitted for school review." });
      }
      invalidateDashboardData("/api/data/enrichment-requests");
      invalidateClientDataCache("/api/data/classes");
      if (activeStudent?.id) {
        invalidateClientDataCache(`/api/data/students/${encodeURIComponent(activeStudent.id)}/profile`);
        invalidateClientDataCache(`/api/data/students/${encodeURIComponent(activeStudent.id)}/schedule`);
      }
      closeSelectionDrawer();
    } catch (error) {
      saveFailedSubmitAsDraft(changedDraft as Record<SlotId, SlotRequests>);
      setSubmitBanner({ tone: "warning", message: `Could not submit selections: ${error instanceof Error ? error.message : String(error)}. Your draft is still saved.` });
      closeSelectionDrawer();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative mx-auto flex w-full max-w-[1104px] flex-col px-4 py-8 font-sans md:px-0">
      <div className="flex flex-col gap-[4px]">
        <h1 className="text-[28px] font-bold leading-[1.1] text-[#272932]">Class Selection</h1>
        <p className="text-[16px] leading-[1.4] text-[#666d80]">Pick enrichment classes for your available blocks. You can select a first and second preference.</p>
      </div>

      <div className="mt-[33px] flex flex-wrap items-center gap-[10px]">
        <LegendItem kind="core" label="Core (School assigned)" />
        <LegendItem kind="approved" label="Enrichment approved" />
        <LegendItem kind="pending" label="Enrichment pending" />
        <LegendItem kind="waitlisted" label="Waitlisted" />
        {localRequestState === "draft" && hasChoices ? <LegendItem kind="draft" label="Draft selection" /> : null}
        <LegendItem kind="empty" label="Empty" />
      </div>

      {(catalogHint || submitBanner) && (
        <div className="mt-4 flex flex-col gap-2">
          {catalogHint ? <p className="rounded-[12px] border border-[#ead9a8] bg-[#fffaf0] px-4 py-3 text-sm leading-[1.55] text-[#665528]">{catalogHint}</p> : null}
          {submitBanner ? (
            <output className={`flex flex-col gap-3 rounded-[12px] border px-4 py-3 text-sm leading-[1.55] sm:flex-row sm:items-center sm:justify-between ${submitBanner.tone === "success" ? "border-[#b7dfbf] bg-[#f8fcf9] text-[#235a2d]" : "border-[#ead9a8] bg-[#fffaf0] text-[#665528]"}`}>
              <span>{submitBanner.message}</span>
            </output>
          ) : null}
        </div>
      )}

      <ParentCatalogStatusBanner
        state={localRequestState}
        choices={localChoiceReviews}
        className="mt-4"
        message={restoredDraft && localRequestState === "draft" ? "You have a saved class-selection draft ready to review." : undefined}
        actions={
          <>
            {localRequestState === "draft" && hasChoices ? (
              <button
                type="button"
                onClick={() => submitSelections("all-drafts")}
                disabled={submitting}
                className="inline-flex h-8 items-center justify-center rounded-[6px] bg-[#14c1d5] px-3 text-[12px] font-semibold text-white hover:bg-[#11a9ba] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
              >
                {submitting ? "Submitting..." : "Submit Drafts"}
              </button>
            ) : null}
            {localRequestState === "draft" && hasChoices ? (
              <button
                type="button"
                onClick={discardDraft}
                className="inline-flex h-8 items-center justify-center rounded-[6px] bg-white/70 px-3 text-[12px] font-semibold text-[#155e66] ring-1 ring-[#14c1d5]/30 hover:bg-white"
              >
                Discard draft
              </button>
            ) : null}
          </>
        }
      />

      <div className="mt-6 grid gap-6">
        <div className="grid gap-3">
          {catalogLoading || studentScheduleLoading ? (
              <output className="rounded-[10px] border border-[#d9eef1] bg-white px-4 py-3 text-sm text-[#666d80]">
                Loading class selection data&hellip;
              </output>
          ) : (
            <>
              <div className={`flex flex-col gap-1 rounded-[10px] border px-4 py-3 text-sm min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between ${parentScheduleFinalityClasses(scheduleFinality.state)}`}>
                <span className="font-semibold">{scheduleFinality.label}</span>
                <span>{scheduleFinality.description}</span>
              </div>
              <ParentScheduleGrid badgesBySlot={scheduleBadgesBySlot} onSlotClick={openScheduleSlot} className="w-full" />
            </>
          )}
          </div>

        <section className="w-full rounded-[16px] border border-[#e6e9ef] bg-white px-6 py-5 shadow-sm">
          <h2 className="text-[16px] font-semibold leading-[1.4] text-[#0d0d12]">How it works</h2>
          <div className="mt-[20px] flex flex-col gap-[10px]">
            <StepItem n={1} title="Choose classes for each available block" body="Browse the available enrichment classes and select one option for each open block in your child's schedule." />
            <StepItem n={2} title="Select a 1st and 2nd preference if possible" body="Choosing a second preference helps the school place your child in another option if the first choice becomes full." />
            <StepItem n={3} title="The school reviews and confirms placements" body="After submission, the school team reviews all requests and assigns students based on availability and scheduling." />
            <StepItem n={4} title="Approved classes will appear in the schedule" body="Once confirmed, the approved enrichment classes will automatically be added to your child's weekly schedule." />
          </div>
        </section>
      </div>

      <section className="mt-8 rounded-[16px] border border-[#e6e9ef] bg-white p-5 shadow-sm">
        <div className="flex gap-[8px]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#d2f1f5]">
            <Lightbulb className="size-5 text-[#0d0d12]" aria-hidden />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold leading-[1.4] text-[#272932]">Enrichment Selection Deadline</h2>
            <p className="mt-[4px] text-[14px] leading-[1.6] tracking-[-0.28px] text-[#272932]">
              Please remember to submit your child&apos;s enrichment class requests before the school&apos;s deadline.<br className="hidden sm:block" />
              Submitting on time helps the school organize class groups and ensures your child has the best chance of getting their preferred classes.
            </p>
          </div>
        </div>
      </section>

      <section className="mt-[14px] rounded-[18px] border border-[#f0f0f0] bg-white px-[14px] py-[16px]">
        <div className="flex items-center gap-[8px]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#cfa500]/20">
            <Info className="size-5 text-[#cfa500]" aria-hidden />
          </div>
          <p className="min-w-0 flex-1 text-[16px] font-semibold leading-[1.4] text-[#272932]">
            Enrichment classes allow students to explore interests beyond core subjects such as arts, technology, entrepreneurship and science.
          </p>
          <Link href={withParentStudentParam("/dashboard/parents/students", activeStudent?.id)} className="hidden shrink-0 items-center gap-[8px] text-[16px] font-semibold text-[#272932] sm:inline-flex">
            View profile
            <ArrowRight className="size-[18px]" aria-hidden />
          </Link>
        </div>
      </section>

      {overlayOpen ? (
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
            setActiveSubmitChoice(kind);
            setOpenChoice((open) => (open === kind ? null : kind));
          }}
          onSelectChoice={selectChoice}
          onClose={closeSelectionDrawer}
          onOpenClassDetails={(option, scheduleDisplay) => setDetailClass({ option, scheduleDisplay })}
          onSaveDraft={saveDraftSelections}
          onSubmit={() => submitSelections("active-choice")}
          onSubmitSlotChoices={activeChangedChoiceKinds.length > 1 ? () => submitSelections("active-slot") : undefined}
          saveDraftDisabled={!drawerHasChoices}
          submitDisabled={!activeSlotHasChoices || !submitChoiceKind}
          submitLabel={
            submitChoiceKind === "secondChoice"
              ? "Submit second choice"
              : "Submit first choice"
          }
          submitSlotChoicesLabel="Submit first and second choice"
          submitting={submitting}
          secondChoiceDisabled={!firstChoice}
          optionsLoading={catalogLoading}
        />
      ) : null}
      {detailClass ? (
        <ParentClassDetailsDrawer
          option={detailClass.option}
          scheduleDisplay={detailClass.scheduleDisplay}
          classListHref={withParentStudentParam(
            detailClass.option.program === "core" ? "/dashboard/parents/classes/core" : "/dashboard/parents/classes/enrichment",
            activeStudent?.id,
          )}
          onClose={() => setDetailClass(null)}
        />
      ) : null}
    </div>
  );
}

export default function ParentCatalogClient() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
          Loading class selection&hellip;
        </div>
      }
    >
      <ParentClassesEnrichmentCatalogContent />
    </Suspense>
  );
}
