"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Info, Lightbulb } from "lucide-react";

import {
  ParentClassSelectionDrawer,
  parentClassOptionFromRow,
  type ParentClassChoiceKind,
  type ParentClassOption,
} from "@/components/parent-class-drawers";
import {
  buildParentScheduleBadges,
  ParentScheduleGrid,
  type ParentScheduleBadges,
  type ParentScheduleSlotKey,
} from "@/components/parent-schedule-grid";
import { cachedJson } from "@/lib/client-data-cache";
import {
  selectedParentStudentIdFromSearchParams,
  withParentStudentParam,
} from "@/lib/parent-student-selection";
import {
  INITIAL_PARENT_CATALOG_REQUESTS,
  clearPendingParentCatalogRequests,
  clearSubmittedParentCatalogSnapshot,
  hasParentCatalogChoices,
  localReviewKey,
  readLocalReviewStatuses,
  readParentCatalogSnapshot,
  selectedChoicesForSubmit,
  writePendingParentCatalogRequests,
  writeSubmittedParentCatalogSnapshot,
  type LocalReviewStatus,
  type LocalReviewStatuses,
  type ParentCatalogIdentity,
  type ParentCatalogRequests,
} from "@/lib/parent-catalog-state";
import {
  CATALOG_SLOT_META as SLOT_META,
  catalogSlotIdFromScheduleSlot,
  type CatalogSlotId,
} from "@/lib/schedule-slots";
import type { SchoolClassRow, StudentListItem, StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";

type SlotId = CatalogSlotId;

type SlotRequests = {
  firstChoice: ParentClassOption | null;
  secondChoice: ParentClassOption | null;
};

const initialRequests = INITIAL_PARENT_CATALOG_REQUESTS as Record<SlotId, SlotRequests>;

function statusDotClass(kind: "core" | "approved" | "pending" | "draft" | "empty") {
  if (kind === "core") return "border-[#14c1d5] bg-[#d2f1f5]";
  if (kind === "approved") return "border-[#004d08] bg-[#004d08]/20";
  if (kind === "pending") return "border-[#d80509] bg-[#ffd9d9]";
  if (kind === "draft") return "border-[#84adff] bg-[#eef4ff]";
  return "border-[#f0f0f0] bg-[#fafafa]";
}

function LegendItem({ kind, label }: { kind: "core" | "approved" | "pending" | "draft" | "empty"; label: string }) {
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
  const [activeSlot, setActiveSlot] = useState<SlotId>("block4_day3");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [openChoice, setOpenChoice] = useState<ParentClassChoiceKind | null>(null);
  const [requests, setRequests] = useState<Record<SlotId, SlotRequests>>(initialRequests);
  const [localReviewStatuses, setLocalReviewStatuses] = useState<LocalReviewStatuses>({});
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [localSubmittedAt, setLocalSubmittedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<{ tone: "success" | "warning"; message: string } | null>(null);
  const [studentSchedule, setStudentSchedule] = useState<StudentScheduleRow | null>(null);
  const [activeStudent, setActiveStudent] = useState<StudentListItem | null>(null);
  const [localRequestState, setLocalRequestState] = useState<"draft" | "submitted" | null>(null);
  const [catalogStorageReadyFor, setCatalogStorageReadyFor] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
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
      }
    }
    void loadActiveStudentSchedule();
    return () => {
      cancelled = true;
    };
  }, [requestedStudentId]);

  useEffect(() => {
    function readReviewStatuses() {
      setLocalReviewStatuses(readLocalReviewStatuses());
    }

    readReviewStatuses();
    window.addEventListener("storage", readReviewStatuses);
    window.addEventListener("cia-parent-catalog-updated", readReviewStatuses);
    return () => {
      window.removeEventListener("storage", readReviewStatuses);
      window.removeEventListener("cia-parent-catalog-updated", readReviewStatuses);
    };
  }, []);

  useEffect(() => {
    if (!activeStudent?.id) return;
    const snapshot = readParentCatalogSnapshot({
      studentId: activeStudent.id,
      studentName: activeStudent.name,
    });
    setRequests((snapshot.requests ?? INITIAL_PARENT_CATALOG_REQUESTS) as Record<SlotId, SlotRequests>);
    setLocalSubmittedAt(snapshot.submittedAt);
    setLocalRequestState(snapshot.state);
    setLocalReviewStatuses(snapshot.reviewStatuses);
    setRestoredDraft(Boolean(snapshot.requests));
    setCatalogStorageReadyFor(activeStudent.id);
  }, [activeStudent?.id, activeStudent?.name]);

  useEffect(() => {
    if (!overlayOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOverlayOpen(false);
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

  useEffect(() => {
    if (!activeStudent?.id || catalogStorageReadyFor !== activeStudent.id) return;
    try {
      if (hasParentCatalogChoices(requests as ParentCatalogRequests)) {
        writePendingParentCatalogRequests(requests as ParentCatalogRequests, catalogIdentity);
      } else {
        clearPendingParentCatalogRequests({ studentId: activeStudent.id });
      }
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
  }, [activeStudent?.id, catalogIdentity, catalogStorageReadyFor, requests]);

  function draftSlotBadges(slot: SlotRequests, slotId: SlotId): StudentScheduleBadge[] {
    const badges: StudentScheduleBadge[] = [];
    const isSubmitted = localRequestState === "submitted";
    const firstStatus = localReviewStatuses[localReviewKey(slotId, "first")] ?? "Pending";
    const secondStatus = localReviewStatuses[localReviewKey(slotId, "second")] ?? "Pending";
    if (slot.firstChoice) {
      badges.push({
        label: isSubmitted && firstStatus === "Rejected" ? `Rejected: ${slot.firstChoice.name}` : slot.firstChoice.name,
        tone: isSubmitted ? (firstStatus === "Approved" ? "approved" : "pending") : "draft",
      });
    }
    if (slot.secondChoice) {
      badges.push({
        label: `${isSubmitted && secondStatus === "Rejected" ? "Rejected" : "2nd"}: ${slot.secondChoice.name}`,
        tone: isSubmitted ? (secondStatus === "Approved" ? "approved" : "pending") : "draft",
      });
    }
    return badges;
  }

  const scheduleBadgesBySlot = useMemo<ParentScheduleBadges>(() => {
    const block3 = draftSlotBadges(requests.block3_day3, "block3_day3");
    const block4 = draftSlotBadges(requests.block4_day3, "block4_day3");
    return buildParentScheduleBadges(studentSchedule, {
      ...(block3.length ? { b3Thu: block3 } : {}),
      ...(block4.length ? { b4Thu: block4 } : {}),
    });
  }, [localRequestState, localReviewStatuses, requests, studentSchedule]);

    const selectedChoices = useMemo(
      () => selectedChoicesForSubmit(requests as ParentCatalogRequests),
      [requests],
    );

  const hasChoices = selectedChoices.length > 0;
  const activeMeta = SLOT_META[activeSlot];
  const activeRequests = requests[activeSlot];

  const recommendedClasses = useMemo(() => {
    if (availableClasses.length <= 3) return availableClasses;
    const blockNumber = activeMeta.block.replace("B", "");
    const direct = availableClasses.filter((cls) => cls.block.includes(blockNumber));
    return direct.length ? direct : availableClasses;
  }, [activeMeta.block, availableClasses]);

  const overlayClasses = recommendedClasses.length ? recommendedClasses : availableClasses;
  const firstChoice = activeRequests.firstChoice;
  const secondChoice = activeRequests.secondChoice;
  const firstChoiceOptions = overlayClasses.filter((cls) => cls.id !== activeRequests.secondChoice?.id);
  const secondChoiceOptions = overlayClasses.filter((cls) => cls.id !== activeRequests.firstChoice?.id);
  const activeSlotHasChoices = Boolean(activeRequests.firstChoice || activeRequests.secondChoice);

  function openSlot(slotId: SlotId) {
    setActiveSlot(slotId);
    setOverlayOpen(true);
    setOpenChoice(null);
  }

    function openScheduleSlot(slot: ParentScheduleSlotKey) {
      const catalogSlot = catalogSlotIdFromScheduleSlot(slot);
      if (catalogSlot) openSlot(catalogSlot);
    }

    function clearSubmittedSnapshot() {
      try {
        clearSubmittedParentCatalogSnapshot({ studentId: activeStudent?.id });
      } catch {
        /* ignore storage failures */
      }
    setLocalSubmittedAt(null);
    setLocalRequestState("draft");
    setLocalReviewStatuses({});
  }

  function selectChoice(cls: ParentClassOption, kind: ParentClassChoiceKind) {
    setRequests((prev) => {
      const otherKind: ParentClassChoiceKind = kind === "firstChoice" ? "secondChoice" : "firstChoice";
      const active = prev[activeSlot];
      return {
        ...prev,
        [activeSlot]: {
          ...active,
          [kind]: cls,
          [otherKind]: active[otherKind]?.id === cls.id ? null : active[otherKind],
        },
      };
    });
    setSubmitBanner(null);
    setOpenChoice(null);
    clearSubmittedSnapshot();
  }

    function persistSubmittedSnapshot() {
      let submittedAt: string | null = null;
      try {
        submittedAt = writeSubmittedParentCatalogSnapshot(requests as ParentCatalogRequests, catalogIdentity);
      } catch {
        /* Saved draft still exists under PARENT_CATALOG_PENDING_KEY. */
      }
    setLocalSubmittedAt(submittedAt);
    setLocalRequestState("submitted");
    setLocalReviewStatuses({});
  }

  async function submitSelections() {
    if (!hasChoices || submitting) return;
    setSubmitting(true);
    setSubmitBanner(null);
    try {
      const res = await fetch("/api/data/enrichment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: activeStudent?.id, choices: selectedChoices }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        persistSubmittedSnapshot();
        setSubmitBanner({ tone: "warning", message: `Request saved locally for review. Cloud submission failed: ${body?.error ?? res.statusText}.` });
        setOverlayOpen(false);
        return;
      }
      persistSubmittedSnapshot();
      setSubmitBanner({ tone: "success", message: "Selections submitted for school review." });
      setOverlayOpen(false);
    } catch (error) {
      persistSubmittedSnapshot();
      setSubmitBanner({ tone: "warning", message: `Request saved locally for review. Cloud submission failed: ${error instanceof Error ? error.message : String(error)}.` });
      setOverlayOpen(false);
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
        {localRequestState === "draft" && hasChoices ? <LegendItem kind="draft" label="Draft selection" /> : null}
        <LegendItem kind="empty" label="Empty" />
      </div>

      {(catalogHint || submitBanner || restoredDraft) && (
        <div className="mt-4 flex flex-col gap-2">
          {catalogHint ? <p className="rounded-[8px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">{catalogHint}</p> : null}
          {restoredDraft && !submitBanner ? (
            <p className="rounded-[8px] border border-[#14c1d5]/30 bg-[#ecfdff] px-4 py-2 text-sm text-[#155e66]">
              {localSubmittedAt ? "Restored your submitted class request." : "Restored your saved class-selection draft."}
            </p>
          ) : null}
          {submitBanner ? (
            <p role="status" className={`rounded-[8px] border px-4 py-2 text-sm ${submitBanner.tone === "success" ? "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]" : "border-[#cfa500]/40 bg-[#fff8e6] text-[#7a5b00]"}`}>
              {submitBanner.message}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-6 grid gap-6">
        <ParentScheduleGrid badgesBySlot={scheduleBadgesBySlot} onSlotClick={openScheduleSlot} className="w-full" />

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
          firstChoice={firstChoice}
          secondChoice={secondChoice}
          firstChoiceOptions={firstChoiceOptions}
          secondChoiceOptions={secondChoiceOptions}
          openChoice={openChoice}
          onToggleChoice={(kind) => setOpenChoice((open) => (open === kind ? null : kind))}
          onSelectChoice={selectChoice}
          onClose={() => setOverlayOpen(false)}
          onSubmit={submitSelections}
          submitDisabled={!activeSlotHasChoices}
          submitting={submitting}
        />
      ) : null}
    </div>
  );
}

export default function ParentClassesEnrichmentCatalog() {
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
