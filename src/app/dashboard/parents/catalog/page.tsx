"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, Info, Lightbulb, Loader2 } from "lucide-react";

import {
  PARENT_CATALOG_PENDING_KEY,
  PARENT_CATALOG_REVIEW_STATUS_KEY,
  PARENT_CATALOG_SUBMITTED_KEY,
} from "@/lib/parent-dashboard-storage";
import type { SchoolClassRow } from "@/lib/data/types";

type EnrichmentClass = {
  id: string;
  name: string;
  teacher: string;
  description: string;
  prerequisites: string;
  block: string;
  level: string;
  seats: string;
};

type SlotId = "block3_day3" | "block4_day3";
type ChoiceKind = "firstChoice" | "secondChoice";
type LocalReviewStatus = "Pending" | "Approved" | "Rejected";
type LocalReviewStatuses = Record<string, LocalReviewStatus>;

type SlotRequests = {
  firstChoice: EnrichmentClass | null;
  secondChoice: EnrichmentClass | null;
};

const SLOT_META: Record<SlotId, { title: string; block: string; level: string; time: string }> = {
  block3_day3: {
    title: "Block 3 / Day 3",
    block: "B3",
    level: "3",
    time: "10:20 - 11:50 am",
  },
  block4_day3: {
    title: "Block 4 / Day 3",
    block: "B4",
    level: "3",
    time: "12:40 - 2:10 pm",
  },
};

const initialRequests: Record<SlotId, SlotRequests> = {
  block3_day3: { firstChoice: null, secondChoice: null },
  block4_day3: { firstChoice: null, secondChoice: null },
};

function catalogClassFromRow(row: SchoolClassRow): EnrichmentClass {
  return {
    id: row.id,
    name: row.name,
    teacher: row.teacher || "Teacher not assigned",
    description:
      row.description ||
      `${row.name} gives students a structured enrichment option with placement managed by the school team.`,
    prerequisites: row.prerequisites || "None listed",
    block: row.block,
    level: row.level,
    seats: row.students,
  };
}

function statusDotClass(kind: "core" | "approved" | "pending" | "empty") {
  if (kind === "core") return "border-[#14c1d5] bg-[#d2f1f5]";
  if (kind === "approved") return "border-[#004d08] bg-[#004d08]/20";
  if (kind === "pending") return "border-[#d80509] bg-[#ffd9d9]";
  return "border-[#dfe1e6] bg-[#fafafa]";
}

function classCardClass(kind: "core" | "approved" | "pending" | "empty") {
  if (kind === "core") return "border-[#14c1d5]/45 bg-[#d2f1f5] text-[#0d0d12]";
  if (kind === "approved") return "border-[#004d08]/35 bg-[#004d08]/20 text-[#0d0d12]";
  if (kind === "pending") return "border-[#d80509]/35 bg-[#ffd9d9] text-[#0d0d12]";
  return "border-[#dfe1e6] bg-[#fafafa] text-[#666d80]";
}

function localReviewKey(slotId: SlotId, kind: "first" | "second") {
  return `local-${slotId}-${kind}`;
}

function reviewKind(status: LocalReviewStatus): "approved" | "pending" {
  return status === "Approved" ? "approved" : "pending";
}

function reviewCaption(status: LocalReviewStatus) {
  if (status === "Approved") return "Enric. Approved";
  if (status === "Rejected") return "Rejected";
  return "Enric. Pending";
}

function LegendItem({ kind, label }: { kind: "core" | "approved" | "pending" | "empty"; label: string }) {
  return (
    <div className="flex items-center gap-[6px]">
      <span className={`size-[17px] rounded-[4px] border ${statusDotClass(kind)}`} />
      <span className="text-[12px] leading-[1.25] text-[#0d0d12]">{label}</span>
    </div>
  );
}

function FixedClassCard({
  title,
  caption,
  kind,
  tall = false,
}: {
  title: string;
  caption: string;
  kind: "core" | "approved" | "pending";
  tall?: boolean;
}) {
  return (
    <div className={`h-full rounded-[6px] border px-[8px] py-[7px] ${classCardClass(kind)}`}>
      <p className="truncate text-[11px] leading-none text-[#0d0d12]">{title}</p>
      <p className={`mt-1 text-[10px] font-bold leading-[1.25] text-[#666d80] ${tall ? "" : "truncate"}`}>
        {caption}
      </p>
    </div>
  );
}

function OpenSlotCard({
  selected,
  firstStatus = "Pending",
  secondStatus = "Pending",
  active,
  label,
  onClick,
  tall = false,
}: {
  selected: SlotRequests;
  firstStatus?: LocalReviewStatus;
  secondStatus?: LocalReviewStatus;
  active: boolean;
  label: string;
  onClick: () => void;
  tall?: boolean;
}) {
  const primary = selected.firstChoice;
  const secondary = selected.secondChoice;
  const dominantStatus = primary ? firstStatus : secondStatus;
  const dominantKind = reviewKind(dominantStatus);

  if (primary || secondary) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`flex h-full w-full flex-col gap-1 rounded-[6px] border px-[8px] py-[7px] text-left transition ${
          active ? "border-[#14c1d5] ring-2 ring-[#14c1d5]/20" : ""
        } ${classCardClass(dominantKind)}`}
      >
        <p className="truncate text-[11px] leading-none text-[#0d0d12]">{primary?.name ?? "Second choice only"}</p>
        <p className="text-[10px] font-bold leading-[1.25] text-[#666d80]">{reviewCaption(dominantStatus)}</p>
        {secondary ? (
          <p className={`truncate text-[10px] leading-[1.25] text-[#666d80] ${tall ? "mt-auto" : ""}`}>
            {secondStatus === "Approved" ? "Approved 2nd" : secondStatus === "Rejected" ? "Rejected 2nd" : "2nd"}: {secondary.name}
          </p>
        ) : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full w-full flex-col justify-center rounded-[6px] border px-[8px] py-[7px] text-left transition ${
        active
          ? "border-[#14c1d5] bg-[#f6fcfd] ring-2 ring-[#14c1d5]/20"
          : "border-dashed border-[#dfe1e6] bg-[#fafafa] hover:border-[#14c1d5]/70 hover:bg-[#f6fcfd]"
      }`}
    >
      <p className="truncate text-[11px] leading-none text-[#0d0d12]">Available slot</p>
      <p className="mt-1 text-[10px] font-bold leading-[1.25] text-[#666d80]">+ Choose class</p>
      <span className="sr-only">{label}</span>
    </button>
  );
}

function StepItem({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="grid grid-cols-[32px_1fr] gap-[10px]">
      <div className="flex size-[32px] items-center justify-center rounded-full bg-[#f6fcfd] text-[14px] font-semibold text-[#14c1d5]">
        {n}
      </div>
      <div className="min-w-0">
        <p className="text-[14px] font-semibold leading-[1.4] text-[#666d80]">{title}</p>
        <p className="mt-[3px] text-[12px] leading-[1.45] text-[#666d80]">{body}</p>
      </div>
    </div>
  );
}

export default function ParentClassesEnrichmentCatalog() {
  const [availableClasses, setAvailableClasses] = useState<EnrichmentClass[]>([]);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotId>("block3_day3");
  const [requests, setRequests] = useState<Record<SlotId, SlotRequests>>(initialRequests);
  const [localReviewStatuses, setLocalReviewStatuses] = useState<LocalReviewStatuses>({});
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [localSubmittedAt, setLocalSubmittedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      try {
        const res = await fetch("/api/data/classes", { cache: "no-store" });
        if (!res.ok) throw new Error(res.statusText);
        const body = (await res.json()) as { classes?: SchoolClassRow[]; source?: string };
        const rows = Array.isArray(body.classes) ? body.classes : [];
        const enrichment = rows
          .filter((row) => row.program === "enrichment")
          .map(catalogClassFromRow);
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
          setCatalogHint(
            `Could not load enrichment offerings: ${
              error instanceof Error ? error.message : String(error)
            }.`,
          );
        }
      }
    }
    void loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function readReviewStatuses() {
      try {
        const raw = window.sessionStorage.getItem(PARENT_CATALOG_REVIEW_STATUS_KEY);
        setLocalReviewStatuses(raw ? (JSON.parse(raw) as LocalReviewStatuses) : {});
      } catch {
        setLocalReviewStatuses({});
      }
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
    try {
      const raw =
        window.sessionStorage.getItem(PARENT_CATALOG_SUBMITTED_KEY) ??
        window.sessionStorage.getItem(PARENT_CATALOG_PENDING_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as { requests?: Record<string, SlotRequests>; submittedAt?: string };
      if (!parsed.requests) return;
      setRequests({
        block3_day3: parsed.requests.block3_day3 ?? initialRequests.block3_day3,
        block4_day3: parsed.requests.block4_day3 ?? initialRequests.block4_day3,
      });
      setLocalSubmittedAt(parsed.submittedAt ?? null);
      setRestoredDraft(true);
    } catch {
      /* Ignore invalid old drafts. */
    }
  }, []);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(PARENT_CATALOG_PENDING_KEY, JSON.stringify({ requests }));
      window.dispatchEvent(new Event("cia-parent-catalog-updated"));
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
  }, [requests]);

  function clearSubmittedSnapshot() {
    try {
      window.sessionStorage.removeItem(PARENT_CATALOG_SUBMITTED_KEY);
      window.sessionStorage.removeItem(PARENT_CATALOG_REVIEW_STATUS_KEY);
      window.dispatchEvent(new Event("cia-parent-catalog-updated"));
    } catch {
      /* ignore storage failures */
    }
    setLocalSubmittedAt(null);
    setLocalReviewStatuses({});
  }

  const selectedChoices = useMemo(
    () =>
      Object.entries(requests).flatMap(([slotId, slot]) => {
        const meta = SLOT_META[slotId as SlotId];
        return ([
          slot.firstChoice
            ? {
                classId: slot.firstChoice.id,
                block: meta.block,
                level: meta.level,
                option: "1st",
              }
            : null,
          slot.secondChoice
            ? {
                classId: slot.secondChoice.id,
                block: meta.block,
                level: meta.level,
                option: "2nd",
              }
            : null,
        ]).filter((choice): choice is { classId: string; block: string; level: string; option: string } => choice !== null);
      }),
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

  function selectChoice(cls: EnrichmentClass, kind: ChoiceKind) {
    setRequests((prev) => ({
      ...prev,
      [activeSlot]: {
        ...prev[activeSlot],
        [kind]: cls,
      },
    }));
    setSubmitBanner(null);
    clearSubmittedSnapshot();
  }

  function clearSlot(slotId: SlotId) {
    setRequests((prev) => ({
      ...prev,
      [slotId]: { firstChoice: null, secondChoice: null },
    }));
    setSubmitBanner(null);
    clearSubmittedSnapshot();
  }

  function persistSubmittedSnapshot() {
    const submittedAt = new Date().toISOString();
    try {
      window.sessionStorage.removeItem(PARENT_CATALOG_REVIEW_STATUS_KEY);
      window.sessionStorage.setItem(
        PARENT_CATALOG_SUBMITTED_KEY,
        JSON.stringify({ requests, submittedAt }),
      );
      window.dispatchEvent(new Event("cia-parent-catalog-updated"));
    } catch {
      /* Saved draft still exists under PARENT_CATALOG_PENDING_KEY. */
    }
    setLocalSubmittedAt(submittedAt);
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
        body: JSON.stringify({ choices: selectedChoices }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        persistSubmittedSnapshot();
        setSubmitBanner({
          tone: "warning",
          message: `Request saved locally for review. Cloud submission failed: ${body?.error ?? res.statusText}.`,
        });
        return;
      }
      persistSubmittedSnapshot();
      setSubmitBanner({
        tone: "success",
        message: "Selections submitted for school review.",
      });
    } catch (error) {
      persistSubmittedSnapshot();
      setSubmitBanner({
        tone: "warning",
        message: `Request saved locally for review. Cloud submission failed: ${
          error instanceof Error ? error.message : String(error)
        }.`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[1104px] flex-col gap-6 px-4 py-6 font-sans sm:px-6 md:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-[760px]">
          <h1 className="text-[28px] font-bold leading-[1.1] text-[#272932]">Class Selection</h1>
          <p className="mt-1 text-[16px] leading-[1.4] text-[#666d80]">
            Pick enrichment classes for your available blocks. You can select a first and second preference.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-[10px]">
          <LegendItem kind="core" label="Core (School assigned)" />
          <LegendItem kind="approved" label="Enrichment approved" />
          <LegendItem kind="pending" label="Enrichment pending" />
          <LegendItem kind="empty" label="Empty" />
        </div>
      </div>

      {(catalogHint || submitBanner || restoredDraft) && (
        <div className="flex flex-col gap-2">
          {catalogHint ? (
            <p className="rounded-[8px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
              {catalogHint}
            </p>
          ) : null}
          {restoredDraft && !submitBanner ? (
            <p className="rounded-[8px] border border-[#14c1d5]/30 bg-[#ecfdff] px-4 py-2 text-sm text-[#155e66]">
              {localSubmittedAt ? "Restored your submitted class request." : "Restored your saved class-selection draft."}
            </p>
          ) : null}
          {submitBanner ? (
            <p
              role="status"
              className={`rounded-[8px] border px-4 py-2 text-sm ${
                submitBanner.tone === "success"
                  ? "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]"
                  : "border-[#cfa500]/40 bg-[#fff8e6] text-[#7a5b00]"
              }`}
            >
              {submitBanner.message}
            </p>
          ) : null}
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,680px)_minmax(320px,1fr)]">
        <section className="rounded-[8px] border border-[#f0f0f0] bg-white p-4 shadow-sm">
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-[16px] font-semibold leading-[1.4] text-[#0d0d12]">Anna Lee's schedule</h2>
              <p className="text-[13px] leading-[1.4] text-[#666d80]">Choose from open enrichment blocks.</p>
            </div>
            <Link
              href="/dashboard/parents/classes/enrichment"
              className="inline-flex h-9 items-center gap-2 rounded-[6px] border border-[#dfe1e6] px-3 text-[13px] font-semibold text-[#272932] hover:bg-[#fafafa]"
            >
              View class list
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>

          <div className="grid gap-3 sm:hidden">
            <div className="rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-bold text-[#625f6e]">Block 3 / Day 3</p>
                  <p className="text-[12px] text-[#625f6e]">{SLOT_META.block3_day3.time}</p>
                </div>
                <span className="rounded-[6px] bg-[#d2f1f5] px-2 py-1 text-[11px] font-semibold text-[#0d0d12]">
                  Open
                </span>
              </div>
              <div className="h-[76px]">
                <OpenSlotCard
                  label={SLOT_META.block3_day3.title}
                  selected={requests.block3_day3}
                  firstStatus={localReviewStatuses[localReviewKey("block3_day3", "first")] ?? "Pending"}
                  secondStatus={localReviewStatuses[localReviewKey("block3_day3", "second")] ?? "Pending"}
                  active={activeSlot === "block3_day3"}
                  onClick={() => setActiveSlot("block3_day3")}
                />
              </div>
            </div>

            <div className="rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] p-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[12px] font-bold text-[#625f6e]">Block 4 / Day 3</p>
                  <p className="text-[12px] text-[#625f6e]">{SLOT_META.block4_day3.time}</p>
                </div>
                <span className="rounded-[6px] bg-[#d2f1f5] px-2 py-1 text-[11px] font-semibold text-[#0d0d12]">
                  Open
                </span>
              </div>
              <div className="h-[86px]">
                <OpenSlotCard
                  label={SLOT_META.block4_day3.title}
                  selected={requests.block4_day3}
                  firstStatus={localReviewStatuses[localReviewKey("block4_day3", "first")] ?? "Pending"}
                  secondStatus={localReviewStatuses[localReviewKey("block4_day3", "second")] ?? "Pending"}
                  active={activeSlot === "block4_day3"}
                  onClick={() => setActiveSlot("block4_day3")}
                  tall
                />
              </div>
            </div>
          </div>

          <div className="hidden overflow-x-auto sm:block">
            <div className="grid min-w-[620px] grid-cols-[128px_repeat(3,minmax(150px,1fr))] gap-2">
              <div className="flex h-[65px] flex-col justify-center rounded-tl-[8px] border border-[#f0f0f0] bg-[#f9fafb] px-4">
                <span className="text-[12px] font-bold leading-[1.3] text-[#625f6e]">90 minutes</span>
                <span className="text-[12px] leading-[1.3] text-[#625f6e]">per block</span>
              </div>
              {[1, 2, 3].map((day) => (
                <div
                  key={day}
                  className={`flex h-[65px] flex-col items-center justify-center border border-[#f0f0f0] bg-[#f9fafb] ${
                    day === 3 ? "rounded-tr-[8px]" : ""
                  }`}
                >
                  <span className="text-[12px] leading-none text-[#020204]">Day</span>
                  <span className="mt-1 text-[14px] font-semibold leading-none text-[#020204]">{day}</span>
                </div>
              ))}

              <div className="flex h-[52px] flex-col justify-center border border-[#f0f0f0] bg-[#f9fafb] px-4">
                <span className="text-[10px] font-bold text-[#625f6e]">Block 1</span>
                <span className="text-[12px] text-[#625f6e]">7:00 - 8:30 am</span>
              </div>
              <FixedClassCard title="Math" caption="School assigned" kind="core" />
              <FixedClassCard title="Math" caption="School assigned" kind="core" />
              <FixedClassCard title="Math" caption="School assigned" kind="core" />

              <div className="flex h-[52px] flex-col justify-center border border-[#f0f0f0] bg-[#f9fafb] px-4">
                <span className="text-[10px] font-bold text-[#625f6e]">Block 2</span>
                <span className="text-[12px] text-[#625f6e]">8:40 - 10:10 am</span>
              </div>
              <FixedClassCard title="ELA - Core" caption="School assigned" kind="core" />
              <FixedClassCard title="ELA - Core" caption="School assigned" kind="core" />
              <FixedClassCard title="ELA - Core" caption="School assigned" kind="core" />

              <div className="flex h-[52px] flex-col justify-center border border-[#f0f0f0] bg-[#f9fafb] px-4">
                <span className="text-[10px] font-bold text-[#625f6e]">Block 3</span>
                <span className="text-[12px] text-[#625f6e]">10:20 - 11:50 am</span>
              </div>
              <FixedClassCard title="Economics & Financial Literacy" caption="Enric. Approved" kind="approved" />
              <FixedClassCard title="Ocean Explorers" caption="Enric. Approved" kind="approved" />
              <OpenSlotCard
                label={SLOT_META.block3_day3.title}
                selected={requests.block3_day3}
                firstStatus={localReviewStatuses[localReviewKey("block3_day3", "first")] ?? "Pending"}
                secondStatus={localReviewStatuses[localReviewKey("block3_day3", "second")] ?? "Pending"}
                active={activeSlot === "block3_day3"}
                onClick={() => setActiveSlot("block3_day3")}
              />

              <div className="flex h-[95px] flex-col justify-center rounded-bl-[8px] border border-[#f0f0f0] bg-[#f9fafb] px-4">
                <span className="text-[10px] font-bold text-[#625f6e]">Block 4</span>
                <span className="text-[12px] text-[#625f6e]">12:40 - 2:10 pm</span>
              </div>
              <div className="flex h-[95px] flex-col gap-1">
                <FixedClassCard title="Force & Motion" caption="Enric. Pending" kind="pending" />
                <FixedClassCard title="Digital Storytelling & Animation" caption="Enric. Pending" kind="pending" />
              </div>
              <FixedClassCard title="Health Sciences Lab" caption="Enric. Approved" kind="approved" tall />
              <OpenSlotCard
                label={SLOT_META.block4_day3.title}
                selected={requests.block4_day3}
                firstStatus={localReviewStatuses[localReviewKey("block4_day3", "first")] ?? "Pending"}
                secondStatus={localReviewStatuses[localReviewKey("block4_day3", "second")] ?? "Pending"}
                active={activeSlot === "block4_day3"}
                onClick={() => setActiveSlot("block4_day3")}
                tall
              />
            </div>
          </div>
        </section>

        <aside className="flex flex-col gap-5">
          <section className="rounded-[8px] border border-[#f0f0f0] bg-white p-4 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold leading-[1.4] text-[#0d0d12]">{activeMeta.title}</h2>
                <p className="text-[13px] leading-[1.4] text-[#666d80]">{activeMeta.time}</p>
              </div>
              <span className="rounded-[6px] bg-[#d2f1f5] px-2 py-1 text-[12px] font-semibold text-[#0d0d12]">
                Open
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-2">
              <div className="rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] p-3">
                <p className="text-[11px] font-semibold uppercase text-[#818898]">1st choice</p>
                <p className="mt-1 truncate text-[13px] font-semibold text-[#272932]">
                  {activeRequests.firstChoice?.name ?? "Not selected"}
                </p>
              </div>
              <div className="rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] p-3">
                <p className="text-[11px] font-semibold uppercase text-[#818898]">2nd choice</p>
                <p className="mt-1 truncate text-[13px] font-semibold text-[#272932]">
                  {activeRequests.secondChoice?.name ?? "Optional"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {recommendedClasses.length ? (
                recommendedClasses.map((cls) => {
                  const selectedAsFirst = activeRequests.firstChoice?.id === cls.id;
                  const selectedAsSecond = activeRequests.secondChoice?.id === cls.id;
                  return (
                    <div key={cls.id} className="rounded-[8px] border border-[#f0f0f0] p-3 transition hover:border-[#14c1d5]/50">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="truncate text-[14px] font-semibold leading-[1.35] text-[#0d0d12]">{cls.name}</h3>
                          <p className="mt-1 text-[12px] leading-[1.4] text-[#666d80]">
                            {cls.teacher} · {cls.seats} · {cls.level}
                          </p>
                        </div>
                        <Lightbulb className="size-4 shrink-0 text-[#14c1d5]" aria-hidden />
                      </div>
                      <p className="mt-2 line-clamp-2 text-[12px] leading-[1.45] text-[#666d80]">{cls.description}</p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => selectChoice(cls, "firstChoice")}
                          className={`inline-flex h-8 flex-1 items-center justify-center gap-2 rounded-[6px] px-3 text-[12px] font-semibold text-white ${
                            selectedAsFirst ? "bg-[#004d08] hover:bg-[#003a06]" : "bg-[#14c1d5] hover:bg-[#11a9ba]"
                          }`}
                        >
                          <Check className="size-3.5" aria-hidden />
                          {selectedAsFirst ? "Selected 1st" : "1st Choice"}
                        </button>
                        <button
                          type="button"
                          onClick={() => selectChoice(cls, "secondChoice")}
                          className={`inline-flex h-8 flex-1 items-center justify-center rounded-[6px] border px-3 text-[12px] font-semibold ${
                            selectedAsSecond
                              ? "border-[#004d08] bg-[#004d08]/15 text-[#004d08]"
                              : "border-[#14c1d5] text-[#0b7180] hover:bg-[#ecfdff]"
                          }`}
                        >
                          {selectedAsSecond ? "Selected 2nd" : "2nd Choice"}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-[8px] border border-[#f0f0f0] p-4 text-[13px] text-[#666d80]">
                  No enrichment offerings are available right now.
                </div>
              )}
            </div>
          </section>

          <section className="rounded-[8px] border border-[#f0f0f0] bg-white p-4 shadow-sm">
            <h2 className="text-[16px] font-semibold leading-[1.4] text-[#0d0d12]">Review selections</h2>
            <div className="mt-4 flex flex-col gap-3">
              {(Object.keys(SLOT_META) as SlotId[]).map((slotId) => {
                const slot = requests[slotId];
                const hasSlotChoices = Boolean(slot.firstChoice || slot.secondChoice);
                return (
                  <div key={slotId} className="rounded-[8px] border border-[#f0f0f0] bg-[#fafafa] p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[13px] font-semibold text-[#272932]">{SLOT_META[slotId].title}</p>
                        <p className="text-[12px] text-[#666d80]">{SLOT_META[slotId].time}</p>
                      </div>
                      {hasSlotChoices ? (
                        <button
                          type="button"
                          onClick={() => clearSlot(slotId)}
                          className="text-[12px] font-semibold text-[#d80509] hover:underline"
                        >
                          Clear
                        </button>
                      ) : null}
                    </div>
                    <div className="mt-3 space-y-1 text-[12px] text-[#666d80]">
                      <p>1st: <span className="font-semibold text-[#0d0d12]">{slot.firstChoice?.name ?? "Not selected"}</span></p>
                      <p>2nd: <span className="font-semibold text-[#0d0d12]">{slot.secondChoice?.name ?? "Optional"}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              disabled={!hasChoices || submitting}
              onClick={submitSelections}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-[6px] bg-[#14c1d5] px-4 text-[14px] font-semibold text-white hover:bg-[#11a9ba] disabled:pointer-events-none disabled:opacity-50"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Clock3 className="size-4" aria-hidden />}
              {submitting ? "Submitting..." : "Submit selections"}
            </button>
          </section>
        </aside>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <section className="rounded-[8px] border border-[#f0f0f0] bg-white p-4">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[#d2f1f5]">
              <Lightbulb className="size-5 text-[#0d0d12]" aria-hidden />
            </div>
            <div>
              <h2 className="text-[16px] font-semibold leading-[1.4] text-[#272932]">Enrichment Selection Deadline</h2>
              <p className="mt-1 text-[14px] leading-[1.55] text-[#272932]">
                Please remember to submit your child's enrichment class requests before the school's deadline.
                Submitting on time helps the school organize class groups and ensures your child has the best chance of getting their preferred classes.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[8px] border border-[#f0f0f0] bg-white p-4">
          <div className="flex gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-[#cfa500]/20">
              <Info className="size-5 text-[#0d0d12]" aria-hidden />
            </div>
            <div>
              <p className="text-[14px] font-semibold leading-[1.45] text-[#272932]">
                Enrichment classes allow students to explore interests beyond core subjects such as arts, technology, entrepreneurship and science.
              </p>
              <Link
                href="/dashboard/parents/students"
                className="mt-3 inline-flex items-center gap-2 text-[14px] font-semibold text-[#272932] hover:text-[#14c1d5]"
              >
                View profile
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </div>

      <section className="rounded-[8px] border border-[#f0f0f0] bg-white p-4">
        <h2 className="text-[16px] font-semibold leading-[1.4] text-[#0d0d12]">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StepItem
            n={1}
            title="Choose classes for each available block"
            body="Browse the available enrichment classes and select one option for each open block in your child's schedule."
          />
          <StepItem
            n={2}
            title="Select a 1st and 2nd preference if possible"
            body="Choosing a second preference helps the school place your child in another option if the first choice becomes full."
          />
          <StepItem
            n={3}
            title="The school reviews and confirms placements"
            body="After submission, the school team reviews all requests and assigns students based on availability and scheduling."
          />
          <StepItem
            n={4}
            title="Approved classes will appear in the schedule"
            body="Once confirmed, the approved enrichment classes will automatically be added to your child's weekly schedule."
          />
        </div>
      </section>
    </div>
  );
}
