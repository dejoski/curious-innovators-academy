"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Info, Lightbulb } from "lucide-react";

import { ParentCatalogStatusBanner } from "@/components/parent-catalog-status-banner";
import {
  ParentClassSelectionDrawer,
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
  changedParentCatalogRequests,
  clearPendingParentCatalogRequests,
  clearSubmittedParentCatalogSnapshot,
  hasParentCatalogChoices,
  mergedParentCatalogScheduleBadgeOverrides,
  mergeParentCatalogRequests,
  normalizeParentCatalogRequests,
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
  type CatalogSlotId,
} from "@/lib/schedule-slots";
import {
  parentScheduleFinalityClasses,
  parentScheduleFinalityFromBadges,
} from "@/lib/parent-schedule-status";
import type { EnrichmentRequestRow, SchoolClassRow, StudentListItem, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";

type SlotId = CatalogSlotId;

type SlotRequests = {
  firstChoice: ParentClassOption | null;
  secondChoice: ParentClassOption | null;
};

const initialRequests = INITIAL_PARENT_CATALOG_REQUESTS as Record<SlotId, SlotRequests>;

function normalizedCatalogRequests(requests?: ParentCatalogRequests | null): Record<SlotId, SlotRequests> {
  return normalizeParentCatalogRequests(requests ?? INITIAL_PARENT_CATALOG_REQUESTS) as Record<SlotId, SlotRequests>;
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
  const [requests, setRequests] = useState<Record<SlotId, SlotRequests>>(initialRequests);
  const [serverRequests, setServerRequests] = useState<Record<SlotId, SlotRequests>>(initialRequests);
  const [serverReviewStatuses, setServerReviewStatuses] = useState<LocalReviewStatuses>({});
  const [serverRequestState, setServerRequestState] = useState<"submitted" | null>(null);
  const [editingRequests, setEditingRequests] = useState<Record<SlotId, SlotRequests> | null>(null);
  const [, setLocalReviewStatuses] = useState<LocalReviewStatuses>({});
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<{ tone: "success" | "warning"; message: string } | null>(null);
  const [studentSchedule, setStudentSchedule] = useState<StudentScheduleRow | null>(null);
  const [activeStudent, setActiveStudent] = useState<StudentListItem | null>(null);
  const [studentScheduleLoading, setStudentScheduleLoading] = useState(true);
  const [localRequestState, setLocalRequestState] = useState<"draft" | "submitted" | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      setCatalogLoading(true);
      try {
        const body = await cachedJson<{ classes?: SchoolClassRow[]; source?: string }>("/api/data/classes");
        const rows = Array.isArray(body.classes) ? body.classes : [];
        const enrichment = rows.filter((row) => row.program === "enrichment").map(parentClassOptionFromRow);
        if (cancelled) return;
        setAvailableClasses(enrichment);
        setCatalogHint(
          body.source === "fallback"
            ? "Showing sample offerings because cloud data is unavailable."
            : body.source === "unavailable"
              ? "Cloud offerings are unavailable. Ask an administrator to configure Supabase."
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
          }
          return;
        }
        const scheduleBody = await cachedJson<{ rows?: StudentScheduleRow[] }>(
          `/api/data/students/${encodeURIComponent(activeStudent.id)}/schedule`,
        );
        if (!cancelled) {
          setActiveStudent(activeStudent);
          setStudentSchedule(Array.isArray(scheduleBody.rows) ? (scheduleBody.rows[0] ?? null) : null);
        }
      } catch {
        if (!cancelled) {
          setActiveStudent(null);
          setStudentSchedule(null);
        }
      } finally {
        if (!cancelled) setStudentScheduleLoading(false);
      }
    }
    void loadActiveStudentSchedule();
    return () => {
      cancelled = true;
    };
  }, [requestedStudentId]);

  useEffect(() => {
    function clearLegacyStatuses() {
      setLocalReviewStatuses({});
    }

    clearLegacyStatuses();
    window.addEventListener("storage", clearLegacyStatuses);
    window.addEventListener("cia-parent-catalog-updated", clearLegacyStatuses);
    return () => {
      window.removeEventListener("storage", clearLegacyStatuses);
      window.removeEventListener("cia-parent-catalog-updated", clearLegacyStatuses);
    };
  }, []);

  useEffect(() => {
    if (!activeStudent?.id) {
      setRequests(normalizedCatalogRequests());
      setServerRequests(normalizedCatalogRequests());
      setServerRequestState(null);
      setServerReviewStatuses({});
      setLocalRequestState(null);
      setLocalReviewStatuses({});
      setRestoredDraft(false);
      return;
    }
    const studentForRequests = activeStudent;
    let cancelled = false;
    async function loadRequestState() {
      const draftSnapshot = readParentCatalogSnapshot({
        studentId: studentForRequests.id,
        studentName: studentForRequests.name,
      });
      const draftRequests = draftSnapshot.requests ? normalizedCatalogRequests(draftSnapshot.requests) : null;
      if (!cancelled) {
        setRequests(draftRequests ?? normalizedCatalogRequests());
        setLocalRequestState(draftRequests ? "draft" : null);
        setLocalReviewStatuses({});
        setRestoredDraft(Boolean(draftRequests));
      }

      try {
        const body = await readDashboardData<{ requests?: EnrichmentRequestRow[] }>("/api/data/enrichment-requests");
        const dbSnapshot = catalogSnapshotFromEnrichmentRequests(
          Array.isArray(body.requests) ? body.requests : [],
          studentForRequests.id,
        );
        if (cancelled) return;
        const dbRequests = normalizedCatalogRequests(dbSnapshot.requests);
        setServerRequests(dbRequests);
        setServerRequestState(dbSnapshot.state);
        setServerReviewStatuses(dbSnapshot.reviewStatuses);
        if (!draftRequests) {
          setRequests(dbRequests);
          setLocalRequestState(dbSnapshot.state);
          setLocalReviewStatuses(dbSnapshot.reviewStatuses);
          setRestoredDraft(false);
        }
      } catch {
        /* Draft state remains available if the request endpoint is unavailable. */
      }
    }
    void loadRequestState();
    window.addEventListener("cia-parent-catalog-updated", loadRequestState);
    window.addEventListener("storage", loadRequestState);
    return () => {
      cancelled = true;
      window.removeEventListener("cia-parent-catalog-updated", loadRequestState);
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
    return changedParentCatalogRequests(requests as ParentCatalogRequests, serverRequests as ParentCatalogRequests);
  }, [localRequestState, requests, serverRequests]);
  const renderedRequests = useMemo(
    () => mergeParentCatalogRequests(serverRequests as ParentCatalogRequests, draftOnlyRequests),
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

  function resolveStoredChoice(choice: SlotRequests["firstChoice"] | null | undefined): ParentClassOption | null {
    if (!choice?.name && !choice?.id) return null;
    return (
      availableClasses.find((option) => option.id === choice.id || option.name === choice.name) ??
      fallbackParentClassOption(choice.name ?? "Selected class", choice.id)
    );
  }

  const recommendedClasses = useMemo(() => {
    return parentClassOptionsForCatalogSlot(availableClasses, activeMeta);
  }, [activeMeta, availableClasses]);

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
  }

  function closeSelectionDrawer() {
    setOverlayOpen(false);
    setEditingRequests(null);
    setOpenChoice(null);
  }

  function openScheduleSlot(slot: ParentScheduleSlotKey) {
    const catalogSlot = catalogSlotIdFromScheduleSlot(slot);
    if (catalogSlot) openSlot(catalogSlot);
  }

  function selectChoice(cls: ParentClassOption, kind: ParentClassChoiceKind) {
    setEditingRequests((prev) => {
      const current = prev ?? (renderedRequests as Record<SlotId, SlotRequests>);
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
    setSubmitBanner(null);
    setOpenChoice(null);
  }

  function saveDraftSelections() {
    const rawDraft = editingRequests ?? (renderedRequests as Record<SlotId, SlotRequests>);
    const draft = changedParentCatalogRequests(rawDraft as ParentCatalogRequests, serverRequests as ParentCatalogRequests);
    if (!selectedChoicesForSubmit(draft as ParentCatalogRequests).length) return;
    setRequests(draft as Record<SlotId, SlotRequests>);
    setLocalRequestState("draft");
    setLocalReviewStatuses({});
    setRestoredDraft(true);
    try {
      clearSubmittedParentCatalogSnapshot({ studentId: activeStudent?.id });
      writePendingParentCatalogRequests(draft as ParentCatalogRequests, catalogIdentity);
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
    setSubmitBanner({ tone: "success", message: "Draft saved. You can discard it to restore the approved schedule." });
    closeSelectionDrawer();
  }

  function discardDraft() {
    try {
      clearPendingParentCatalogRequests({ studentId: activeStudent?.id });
      clearSubmittedParentCatalogSnapshot({ studentId: activeStudent?.id });
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
    setRequests(serverRequests);
    setLocalRequestState(serverRequestState);
    setLocalReviewStatuses(serverReviewStatuses);
    setRestoredDraft(false);
    setEditingRequests(null);
    setSubmitBanner({ tone: "success", message: "Draft discarded. Showing the database-backed schedule again." });
  }

  function saveFailedSubmitAsDraft(draft: Record<SlotId, SlotRequests>) {
    const changedDraft = changedParentCatalogRequests(draft as ParentCatalogRequests, serverRequests as ParentCatalogRequests);
    if (!changedDraft) return;
    setRequests(changedDraft as Record<SlotId, SlotRequests>);
    setLocalRequestState("draft");
    setLocalReviewStatuses({});
    setRestoredDraft(true);
    try {
      clearSubmittedParentCatalogSnapshot({ studentId: activeStudent?.id });
      writePendingParentCatalogRequests(changedDraft, catalogIdentity);
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
  }

  async function submitSelections() {
    const rawSubmissionRequests = editingRequests ?? (localRequestState === "draft" ? renderedRequests : requests);
    const submissionRequests = changedParentCatalogRequests(
      rawSubmissionRequests as ParentCatalogRequests,
      serverRequests as ParentCatalogRequests,
    );
    const choices = selectedChoicesForSubmit(submissionRequests as ParentCatalogRequests);
    if (!submissionRequests || !choices.length || submitting) return;
    setSubmitting(true);
    setSubmitBanner(null);
    try {
      const res = await fetch("/api/data/enrichment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: activeStudent?.id, choices }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        saveFailedSubmitAsDraft(submissionRequests as Record<SlotId, SlotRequests>);
        setSubmitBanner({ tone: "warning", message: `Could not submit selections: ${body?.error ?? res.statusText}. Your draft is still saved.` });
        closeSelectionDrawer();
        return;
      }
      const body = (await res.json().catch(() => null)) as { requests?: EnrichmentRequestRow[] } | null;
      const dbSnapshot = catalogSnapshotFromEnrichmentRequests(
        Array.isArray(body?.requests) ? body.requests : [],
        activeStudent?.id,
      );
      const nextRequests = normalizedCatalogRequests(dbSnapshot.requests);
      invalidateDashboardData("/api/data/enrichment-requests");
      clearPendingParentCatalogRequests({ studentId: activeStudent?.id });
      invalidateClientDataCache("/api/data/classes");
      if (activeStudent?.id) {
        invalidateClientDataCache(`/api/data/students/${encodeURIComponent(activeStudent.id)}/profile`);
        invalidateClientDataCache(`/api/data/students/${encodeURIComponent(activeStudent.id)}/schedule`);
      }
      setServerRequests(nextRequests);
      setServerRequestState(dbSnapshot.state);
      setServerReviewStatuses(dbSnapshot.reviewStatuses);
      setRequests(nextRequests);
      setLocalRequestState(dbSnapshot.state);
      setLocalReviewStatuses(dbSnapshot.reviewStatuses);
      setRestoredDraft(false);
      setSubmitBanner({ tone: "success", message: "Selections submitted for school review." });
      closeSelectionDrawer();
    } catch (error) {
      saveFailedSubmitAsDraft(submissionRequests as Record<SlotId, SlotRequests>);
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
          {catalogHint ? <p className="rounded-[8px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">{catalogHint}</p> : null}
          {submitBanner ? (
            <div role="status" className={`flex flex-col gap-3 rounded-[8px] border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${submitBanner.tone === "success" ? "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]" : "border-[#cfa500]/40 bg-[#fff8e6] text-[#7a5b00]"}`}>
              <span>{submitBanner.message}</span>
            </div>
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
                onClick={submitSelections}
                disabled={submitting}
                className="inline-flex h-8 items-center justify-center rounded-[6px] bg-[#14c1d5] px-3 text-[12px] font-semibold text-white hover:bg-[#11a9ba] disabled:cursor-not-allowed disabled:bg-[#8fdce5]"
              >
                {submitting ? "Submitting..." : "Submit Draft"}
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
            <div className="rounded-[10px] border border-[#d9eef1] bg-white px-4 py-3 text-sm text-[#666d80]" role="status">
              Loading class selection data...
            </div>
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

      <section className="mt-8 rounded-[16px] border border-[#e6e9ef] bg-white px-5 py-5 shadow-sm">
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
            setOpenChoice((open) => (open === kind ? null : kind));
          }}
          onSelectChoice={selectChoice}
          onClose={closeSelectionDrawer}
          onSaveDraft={saveDraftSelections}
          onSubmit={submitSelections}
          saveDraftDisabled={!drawerHasChoices}
          submitDisabled={!activeSlotHasChoices}
          submitting={submitting}
          secondChoiceDisabled={!firstChoice}
          optionsLoading={catalogLoading}
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
          Loading class selection...
        </div>
      }
    >
      <ParentClassesEnrichmentCatalogContent />
    </Suspense>
  );
}
