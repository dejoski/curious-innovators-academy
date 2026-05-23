"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, ExternalLink, Info, Lightbulb, Loader2, X } from "lucide-react";

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

const SLOT_META: Record<SlotId, { title: string; block: string; level: string; time: string; overlayTime: string }> = {
  block3_day3: {
    title: "Block 3 Wednesday",
    block: "B3",
    level: "3",
    time: "10:20 - 11:50 am",
    overlayTime: "10:20 AM - 11:50 AM",
  },
  block4_day3: {
    title: "Block 4 Wednesday",
    block: "B4",
    level: "3",
    time: "7:00 - 8:30 am",
    overlayTime: "1:00 PM - 2:30 PM",
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

function localReviewKey(slotId: SlotId, kind: "first" | "second") {
  return `local-${slotId}-${kind}`;
}

function statusDotClass(kind: "core" | "approved" | "pending" | "empty") {
  if (kind === "core") return "border-[#14c1d5] bg-[#d2f1f5]";
  if (kind === "approved") return "border-[#004d08] bg-[#004d08]/20";
  if (kind === "pending") return "border-[#d80509] bg-[#ffd9d9]";
  return "border-[#f0f0f0] bg-[#fafafa]";
}

function classCardClass(kind: "core" | "approved" | "pending" | "empty") {
  if (kind === "core") return "border-[#14c1d5]/45 bg-[#d2f1f5]";
  if (kind === "approved") return "border-transparent bg-[#004d08]/20";
  if (kind === "pending") return "border-transparent bg-[#ffd9d9]";
  return "border-transparent bg-[#f9fafb]";
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

function FixedClassCard({ title, caption, kind, tall = false }: { title: string; caption: string; kind: "core" | "approved" | "pending"; tall?: boolean }) {
  return (
    <div className={`h-full rounded-[4px] border px-[5px] py-[7px] ${classCardClass(kind)}`}>
      <p className="truncate text-[10px] leading-none tracking-[0.1px] text-[#0d0d12]">{title}</p>
      <p className={`mt-[8px] text-[10px] font-bold leading-[1.25] text-[#666d80] ${tall ? "" : "truncate"}`}>{caption}</p>
    </div>
  );
}

function OpenSlotCard({
  selected,
  firstStatus = "Pending",
  secondStatus = "Pending",
  label,
  onClick,
  tall = false,
}: {
  selected: SlotRequests;
  firstStatus?: LocalReviewStatus;
  secondStatus?: LocalReviewStatus;
  label: string;
  onClick: () => void;
  tall?: boolean;
}) {
  const primary = selected.firstChoice;
  const secondary = selected.secondChoice;
  const dominantStatus = primary ? firstStatus : secondStatus;
  const dominantKind = primary || secondary ? reviewKind(dominantStatus) : "empty";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full w-full flex-col justify-start rounded-[4px] border px-[5px] py-[7px] text-left transition hover:ring-1 hover:ring-[#14c1d5] ${classCardClass(dominantKind)}`}
    >
      <p className="truncate text-[10px] leading-none tracking-[0.1px] text-[#0d0d12]">
        {primary?.name ?? (secondary ? "Second choice only" : "Available slot")}
      </p>
      <p className="mt-[8px] text-[10px] font-bold leading-[1.25] text-[#666d80]">
        {primary || secondary ? reviewCaption(dominantStatus) : "+ Choose class"}
      </p>
      {secondary ? (
        <p className={`truncate text-[10px] leading-[1.25] text-[#666d80] ${tall ? "mt-auto" : ""}`}>
          {secondStatus === "Approved" ? "Approved 2nd" : secondStatus === "Rejected" ? "Rejected 2nd" : "2nd"}: {secondary.name}
        </p>
      ) : null}
      <span className="sr-only">{label}</span>
    </button>
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

function SelectedClassSummary({ cls }: { cls: EnrichmentClass | null }) {
  if (!cls) return null;
  return (
    <div className="rounded-[6px] border border-[#dfe1e6] bg-white p-[12px]">
      <div className="flex items-start justify-between gap-3 border-b border-[#dfe1e6] pb-[10px]">
        <h3 className="text-[16px] font-semibold leading-[1.4] text-[#272932]">{cls.name}</h3>
        <ExternalLink className="mt-1 size-4 shrink-0 text-[#14c1d5]" aria-hidden />
      </div>
      <div className="space-y-[8px] border-b border-[#dfe1e6] py-[12px] text-[12px] leading-[1.35] text-[#4f5665]">
        <p>Description: {cls.description}</p>
        <p>Teacher: {cls.teacher}</p>
        <p>{SLOT_META.block4_day3.title.replace("Block 4 ", "Wed ")} 1:00PM - 1:30PM</p>
      </div>
      <p className="pt-[10px] text-[12px] text-[#4f5665]">Status: Open</p>
    </div>
  );
}

function ChoiceDropdown({
  label,
  value,
  classes,
  open,
  onToggle,
  onSelect,
}: {
  label: string;
  value: EnrichmentClass | null;
  classes: EnrichmentClass[];
  open: boolean;
  onToggle: () => void;
  onSelect: (cls: EnrichmentClass) => void;
}) {
  return (
    <div>
      <p className="mb-[8px] text-[16px] font-semibold leading-[1.4] text-[#272932]">{label}</p>
      <div className="relative">
        <button
          type="button"
          onClick={onToggle}
          className={`flex h-[50px] w-full items-center justify-between rounded-[10px] border bg-white px-[24px] text-left text-[16px] text-[#0d0d12] ${open ? "border-[#14c1d5] ring-2 ring-[#14c1d5]/15" : "border-[#f0f0f0]"}`}
        >
          <span className="truncate">{value?.name ?? "Select a class"}</span>
          <ChevronDown className={`size-5 shrink-0 transition ${open ? "rotate-180" : ""}`} aria-hidden />
        </button>
        {open ? (
          <div className="absolute left-0 right-0 top-[58px] z-20 max-h-[314px] overflow-y-auto rounded-[10px] border border-[#dfe1e6] bg-white px-[20px] py-[12px] shadow-[0px_8px_24px_rgba(13,13,18,0.12)]">
            {classes.map((cls, index) => (
              <button
                key={cls.id}
                type="button"
                onClick={() => onSelect(cls)}
                className="flex w-full items-start justify-between gap-4 py-[10px] text-left"
              >
                <span>
                  <span className="block text-[16px] leading-[1.4] text-[#0d0d12]">{cls.name}</span>
                  <span className="mt-[2px] block text-[12px] leading-[1.4] text-[#666d80]">{cls.description}</span>
                </span>
                <span className="mt-[2px] shrink-0 text-[14px] text-[#666d80]">{index === 0 ? "Waitlist" : "Available"}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function ParentClassesEnrichmentCatalog() {
  const [availableClasses, setAvailableClasses] = useState<EnrichmentClass[]>([]);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotId>("block4_day3");
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [openChoice, setOpenChoice] = useState<ChoiceKind | null>(null);
  const [requests, setRequests] = useState<Record<SlotId, SlotRequests>>(initialRequests);
  const [localReviewStatuses, setLocalReviewStatuses] = useState<LocalReviewStatuses>({});
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [localSubmittedAt, setLocalSubmittedAt] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<{ tone: "success" | "warning"; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadClasses() {
      try {
        const res = await fetch("/api/data/classes", { cache: "no-store" });
        if (!res.ok) throw new Error(res.statusText);
        const body = (await res.json()) as { classes?: SchoolClassRow[]; source?: string };
        const rows = Array.isArray(body.classes) ? body.classes : [];
        const enrichment = rows.filter((row) => row.program === "enrichment").map(catalogClassFromRow);
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
      const raw = window.sessionStorage.getItem(PARENT_CATALOG_SUBMITTED_KEY) ?? window.sessionStorage.getItem(PARENT_CATALOG_PENDING_KEY);
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
    if (!overlayOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOverlayOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [overlayOpen]);

  useEffect(() => {
    try {
      window.sessionStorage.setItem(PARENT_CATALOG_PENDING_KEY, JSON.stringify({ requests }));
      window.dispatchEvent(new Event("cia-parent-catalog-updated"));
    } catch {
      /* Browser storage can be unavailable in privacy modes. */
    }
  }, [requests]);

  const selectedChoices = useMemo(
    () =>
      Object.entries(requests).flatMap(([slotId, slot]) => {
        const meta = SLOT_META[slotId as SlotId];
        return ([
          slot.firstChoice ? { classId: slot.firstChoice.id, block: meta.block, level: meta.level, option: "1st" } : null,
          slot.secondChoice ? { classId: slot.secondChoice.id, block: meta.block, level: meta.level, option: "2nd" } : null,
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

  function selectChoice(cls: EnrichmentClass, kind: ChoiceKind) {
    setRequests((prev) => {
      const otherKind: ChoiceKind = kind === "firstChoice" ? "secondChoice" : "firstChoice";
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
    const submittedAt = new Date().toISOString();
    try {
      window.sessionStorage.removeItem(PARENT_CATALOG_REVIEW_STATUS_KEY);
      window.sessionStorage.setItem(PARENT_CATALOG_SUBMITTED_KEY, JSON.stringify({ requests, submittedAt }));
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

      <div className="mt-[19px] grid gap-[20px] xl:grid-cols-[565px_519px]">
        <section className="w-full max-w-[565px] rounded-[18px] border border-[#f0f0f0] bg-white p-[15px]">
          <div className="overflow-hidden">
            <div className="grid min-w-[533px] grid-cols-[134px_repeat(3,133px)]">
              <div className="flex h-[65px] flex-col justify-center rounded-tl-[8px] border border-[#f0f0f0] bg-[#f9fafb] px-[14px] text-[#625f6e]">
                <span className="text-[12px] font-bold leading-[1.29]">90 minutes</span>
                <span className="text-[12px] leading-[1.29]">per block</span>
              </div>
              {[1, 2, 3].map((day) => (
                <div key={day} className={`flex h-[65px] flex-col items-center justify-center border border-[#f0f0f0] bg-[#f9fafb] ${day === 3 ? "rounded-tr-[8px]" : ""}`}>
                  <span className="text-[12px] leading-none tracking-[0.12px] text-[#020204]">Day</span>
                  <span className="mt-[4px] text-[14px] font-semibold leading-none tracking-[0.14px] text-[#020204]">{day}</span>
                </div>
              ))}

              <div className="flex h-[52px] flex-col justify-center border border-[#f0f0f0] bg-[#f9fafb] px-[17px] text-[#625f6e]">
                <span className="text-[10px] font-bold leading-none">Block 1</span>
                <span className="mt-[4px] text-[12px] leading-none">7:00 - 8:30 am</span>
              </div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="Math" caption="School assigned" kind="core" /></div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="Math" caption="School assigned" kind="core" /></div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="Math" caption="School assigned" kind="core" /></div>

              <div className="flex h-[52px] flex-col justify-center border border-[#f0f0f0] bg-[#f9fafb] px-[17px] text-[#625f6e]">
                <span className="text-[10px] font-bold leading-none">Block 2</span>
                <span className="mt-[4px] text-[12px] leading-none">8:40 - 10:10 am</span>
              </div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="ELA - Core" caption="School assigned" kind="core" /></div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="ELA - Core" caption="School assigned" kind="core" /></div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="ELA - Core" caption="School assigned" kind="core" /></div>

              <div className="flex h-[52px] flex-col justify-center border border-[#f0f0f0] bg-[#f9fafb] px-[17px] text-[#625f6e]">
                <span className="text-[10px] font-bold leading-none">Block 3</span>
                <span className="mt-[4px] text-[12px] leading-none">10:20 - 11:50 am</span>
              </div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="Economics & Financial Literacy" caption="Enric. Approved" kind="approved" /></div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="Ocean Explorers" caption="Enric. Approved" kind="approved" /></div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]">
                <OpenSlotCard label={SLOT_META.block3_day3.title} selected={requests.block3_day3} firstStatus={localReviewStatuses[localReviewKey("block3_day3", "first")] ?? "Pending"} secondStatus={localReviewStatuses[localReviewKey("block3_day3", "second")] ?? "Pending"} onClick={() => openSlot("block3_day3")} />
              </div>

              <div className="flex h-[95px] flex-col justify-start rounded-bl-[8px] border border-[#f0f0f0] bg-[#f9fafb] px-[17px] pt-[12px] text-[#625f6e]">
                <span className="text-[10px] font-bold leading-none">Block 4</span>
                <span className="mt-[4px] text-[12px] leading-none">7:00 - 8:30 am</span>
              </div>
              <div className="flex h-[95px] flex-col gap-[3px] border border-[#f0f0f0] bg-white p-[5px]">
                <FixedClassCard title="Force & Motion" caption="Enric. Pending" kind="pending" />
                <FixedClassCard title="Digital Storytelling & Animation" caption="Enric. Pending" kind="pending" />
              </div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]"><FixedClassCard title="Health Sciences Lab" caption="Enric. Approved" kind="approved" tall /></div>
              <div className="border border-[#f0f0f0] bg-white p-[5px]">
                <OpenSlotCard label={SLOT_META.block4_day3.title} selected={requests.block4_day3} firstStatus={localReviewStatuses[localReviewKey("block4_day3", "first")] ?? "Pending"} secondStatus={localReviewStatuses[localReviewKey("block4_day3", "second")] ?? "Pending"} onClick={() => openSlot("block4_day3")} tall />
              </div>
            </div>
          </div>
        </section>

        <section className="w-full max-w-[565px] rounded-[18px] border border-[#f0f0f0] bg-white px-[24px] py-[16px] xl:max-w-none">
          <h2 className="text-[16px] font-semibold leading-[1.4] text-[#0d0d12]">How it works</h2>
          <div className="mt-[20px] flex flex-col gap-[10px]">
            <StepItem n={1} title="Choose classes for each available block" body="Browse the available enrichment classes and select one option for each open block in your child's schedule." />
            <StepItem n={2} title="Select a 1st and 2nd preference if possible" body="Choosing a second preference helps the school place your child in another option if the first choice becomes full." />
            <StepItem n={3} title="The school reviews and confirms placements" body="After submission, the school team reviews all requests and assigns students based on availability and scheduling." />
            <StepItem n={4} title="Approved classes will appear in the schedule" body="Once confirmed, the approved enrichment classes will automatically be added to your child's weekly schedule." />
          </div>
        </section>
      </div>

      <section className="mt-[203px] rounded-[18px] border border-[#f0f0f0] bg-white px-[14px] py-[16px]">
        <div className="flex gap-[8px]">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-[#d2f1f5]">
            <Lightbulb className="size-5 text-[#0d0d12]" aria-hidden />
          </div>
          <div>
            <h2 className="text-[16px] font-semibold leading-[1.4] text-[#272932]">Enrichment Selection Deadline</h2>
            <p className="mt-[4px] text-[14px] leading-[1.6] tracking-[-0.28px] text-[#272932]">
              Please remember to submit your child's enrichment class requests before the school's deadline.<br className="hidden sm:block" />
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
          <Link href="/dashboard/parents/students" className="hidden shrink-0 items-center gap-[8px] text-[16px] font-semibold text-[#272932] sm:inline-flex">
            View profile
            <ArrowRight className="size-[18px]" aria-hidden />
          </Link>
        </div>
      </section>

      {overlayOpen ? (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/20"
          role="dialog"
          aria-modal="true"
          aria-labelledby="select-class-title"
          onMouseDown={() => setOverlayOpen(false)}
        >
          <div
            className="flex h-full w-full flex-col rounded-l-[18px] bg-white px-[24px] py-[24px] shadow-2xl sm:w-[570px]"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="select-class-title" className="text-[24px] font-bold leading-[1.1] text-[#272932]">Select a Class</h2>
                <p className="mt-[8px] text-[14px] leading-[1.4] text-[#666d80]">Choose an enrichment class available for this block.</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setOverlayOpen(false)} className="rounded-full p-1 text-[#666d80] hover:bg-[#fafafa]">
                <X className="size-5" aria-hidden />
              </button>
            </div>

            <div className="mt-[28px] border-y border-[#f0f0f0] py-[26px] text-[16px] font-semibold text-[#0d0d12]">
              {activeMeta.title} • {activeMeta.overlayTime}
            </div>

            <div className="mt-[26px] flex-1 space-y-[30px] overflow-y-auto pr-1">
              <div>
                <ChoiceDropdown
                  label="Choose the first option"
                  value={firstChoice}
                  classes={firstChoiceOptions}
                  open={openChoice === "firstChoice"}
                  onToggle={() => setOpenChoice((open) => (open === "firstChoice" ? null : "firstChoice"))}
                  onSelect={(cls) => selectChoice(cls, "firstChoice")}
                />
                <div className="mt-[12px]">
                  <SelectedClassSummary cls={firstChoice} />
                </div>
              </div>

              <ChoiceDropdown
                label="Choose the second option"
                value={secondChoice}
                classes={secondChoiceOptions}
                open={openChoice === "secondChoice"}
                onToggle={() => setOpenChoice((open) => (open === "secondChoice" ? null : "secondChoice"))}
                onSelect={(cls) => selectChoice(cls, "secondChoice")}
              />
            </div>

            <div className="mt-[30px] flex gap-[24px] border-t border-[#f0f0f0] pt-[24px]">
              <button type="button" onClick={() => setOverlayOpen(false)} className="h-[42px] flex-1 rounded-[6px] bg-[#d2f1f5] text-[14px] font-semibold text-[#14c1d5]">
                Back
              </button>
              <button
                type="button"
                disabled={!activeSlotHasChoices || submitting}
                onClick={submitSelections}
                className="inline-flex h-[42px] flex-1 items-center justify-center gap-2 rounded-[6px] bg-[#d2f1f5] text-[14px] font-semibold text-white disabled:opacity-100 enabled:bg-[#14c1d5]"
              >
                {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
