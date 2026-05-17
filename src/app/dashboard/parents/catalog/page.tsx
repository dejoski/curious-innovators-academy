"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { PARENT_CATALOG_PENDING_KEY } from "@/lib/parent-dashboard-storage";
import type { SchoolClassRow } from "@/lib/data/types";

const imgImage1 = "/images/icon-lightbulb-only.png";
const imgGroup = "/images/icon-group2.svg";
const imgChevronDown = "/images/icon-caret-down.svg";
const imgHistoryLine = "/images/icon-history-line-catalog.svg";
const imgUnion = "/images/parent-deadline-union.svg";

type EnrichmentClass = {
  id: string;
  name: string;
  teacher: string;
  description: string;
  prerequisites: string;
  block: string;
  level: string;
};

type SlotRequests = {
  firstChoice: EnrichmentClass | null;
  secondChoice: EnrichmentClass | null;
};

const SLOT_META: Record<string, { block: string; level: string }> = {
  block3_day3: { block: "B3", level: "3" },
  block4_day3: { block: "B4", level: "3" },
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
  };
}

export default function ParentClassesEnrichmentCatalog() {
  const scheduleGridCols = "133px 133px 133px 133px";
  const [availableClasses, setAvailableClasses] = useState<EnrichmentClass[]>([]);
  const [catalogHint, setCatalogHint] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitBanner, setSubmitBanner] = useState<{
    tone: "success" | "warning";
    message: string;
  } | null>(null);
  const [requests, setRequests] = useState<Record<string, SlotRequests>>({
    block3_day3: { firstChoice: null, secondChoice: null },
    block4_day3: { firstChoice: null, secondChoice: null },
  });

  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [activeClass, setActiveClass] = useState<EnrichmentClass | null>(null);

  const openCatalog = (slotId: string) => {
    setActiveSlot(slotId);
  };

  const closeModals = () => {
    setActiveSlot(null);
    setActiveClass(null);
  };

  const openClassDetails = (cls: EnrichmentClass) => {
    setActiveClass(cls);
  };

  const handleSelectChoice = (choiceLevel: "firstChoice" | "secondChoice") => {
    if (activeSlot && activeClass) {
      setRequests((prev) => ({
        ...prev,
        [activeSlot]: {
          ...prev[activeSlot],
          [choiceLevel]: activeClass,
        },
      }));
      closeModals();
    }
  };

  const selectedChoices = Object.entries(requests).flatMap(([slotId, slot]) => {
    const meta = SLOT_META[slotId] ?? { block: slotId, level: "" };
    return ([
      slot.firstChoice
        ? {
            classId: slot.firstChoice.id,
            block: slot.firstChoice.block || meta.block,
            level: slot.firstChoice.level || meta.level,
            option: "1st",
          }
        : null,
      slot.secondChoice
        ? {
            classId: slot.secondChoice.id,
            block: slot.secondChoice.block || meta.block,
            level: slot.secondChoice.level || meta.level,
            option: "2nd",
          }
        : null,
    ]).filter((x): x is { classId: string; block: string; level: string; option: string } => x !== null);
  });

  const hasChoices = selectedChoices.length > 0;
  const block3Offerings = availableClasses.filter((cls) => cls.block === "B3");
  const block4Offerings = availableClasses.filter((cls) => cls.block === "B4");
  const approvedBlock3Day1 = block3Offerings[0] ?? availableClasses[0] ?? null;
  const approvedBlock3Day2 = block3Offerings[1] ?? availableClasses[1] ?? null;
  const pendingBlock4Day1 = block4Offerings[0] ?? availableClasses[0] ?? null;
  const pendingBlock4Day1Alt = block4Offerings[1] ?? availableClasses[1] ?? null;
  const approvedBlock4Day2 = block4Offerings[2] ?? block4Offerings[0] ?? availableClasses[2] ?? null;

  const submitSelections = async () => {
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
        setSubmitBanner({
          tone: "warning",
          message: `Selections saved on this device, but cloud submission failed: ${body?.error ?? res.statusText}.`,
        });
        return;
      }
      setSubmitBanner({
        tone: "success",
        message: "Selections submitted for school review.",
      });
    } catch (error) {
      setSubmitBanner({
        tone: "warning",
        message: `Selections saved on this device, but cloud submission failed: ${
          error instanceof Error ? error.message : String(error)
        }.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

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
    loadClasses();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          PARENT_CATALOG_PENDING_KEY,
          JSON.stringify({
            requests,
          })
        );
        window.dispatchEvent(new Event("cia-parent-catalog-updated"));
      }
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [requests]);

  return (
    <div
      className="w-full mx-auto py-8 flex flex-col gap-6 font-sans"
      style={{ maxWidth: "1104px", fontFamily: "var(--font-inter), sans-serif" }}
    >
      {/* Page title */}
      <div className="flex flex-col gap-1 items-start w-full">
        <div className="flex flex-col gap-1 items-start">
          <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[28px] leading-[1.1]">
            Class Selection
          </h1>
          <p className="font-['Inter:Regular',sans-serif] font-normal text-[#666d80] text-[16px] leading-[1.4] max-w-[720px]">
            Pick enrichment classes for your available blocks. You can select a first and second preference.
          </p>
        </div>
      </div>

      {(catalogHint || submitBanner) && (
        <div className="flex flex-col gap-2">
          {catalogHint && (
            <p className="rounded-[10px] border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
              {catalogHint}
            </p>
          )}
          {submitBanner && (
            <p
              role="status"
              className={`rounded-[10px] border px-4 py-2 text-sm ${
                submitBanner.tone === "success"
                  ? "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]"
                  : "border-[#cfa500]/40 bg-[#fff8e6] text-[#7a5b00]"
              }`}
            >
              {submitBanner.message}
            </p>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-[10px] items-center">
        <div className="flex gap-[6px] items-center">
          <div className="bg-[#d2f1f5] border border-[#14c1d5] rounded-[4px] size-[17px]" />
          <span className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[12px] leading-[1.25]">Core (School assigned)</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[rgba(0,77,8,0.2)] border border-[#004d08] rounded-[4px] size-[17px]" />
          <span className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[12px] leading-[1.25]">Enrichment approved</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[#ffd9d9] border border-[#d80509] rounded-[4px] size-[17px]" />
          <span className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[12px] leading-[1.25]">Enrichment pending</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-[4px] size-[17px]" />
          <span className="font-['Inter:Regular',sans-serif] font-normal text-[#0d0d12] text-[12px] leading-[1.25]">Empty</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row w-full" style={{ columnGap: "20px" }}>
        {/* Schedule Grid */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 shrink-0 overflow-hidden" style={{ width: "565px" }}>
          <div style={{ width: "533px" }}>
            {/* Header Row */}
            <div className="grid gap-0" style={{ gridTemplateColumns: scheduleGridCols }}>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-tl-[8px] h-[65px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[12px] leading-[1.29]">90 minutes</span>
                <span className="font-['Inter:Regular',sans-serif] text-[#625f6e] text-[12px] leading-[1.29]">per block</span>
              </div>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[65px] flex flex-col items-center justify-center">
                <span className="font-['Inter:Regular',sans-serif] text-[#020204] text-[12px] leading-none tracking-[0.12px]">Day</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px] leading-none tracking-[0.14px]">1</span>
              </div>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[65px] flex flex-col items-center justify-center">
                <span className="font-['Inter:Regular',sans-serif] text-[#020204] text-[12px] leading-none tracking-[0.12px]">Day</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px] leading-none tracking-[0.14px]">2</span>
              </div>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-tr-[8px] h-[65px] flex flex-col items-center justify-center">
                <span className="font-['Inter:Regular',sans-serif] text-[#020204] text-[12px] leading-none tracking-[0.12px]">Day</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px] leading-none tracking-[0.14px]">3</span>
              </div>
            </div>

            {/* Block 1 */}
            <div className="grid gap-0" style={{ gridTemplateColumns: scheduleGridCols }}>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">Block 1</span>
                <span className="font-['Inter:Regular',sans-serif] text-[#625f6e] text-[12px]">7:00 - 8:30 am</span>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="relative bg-[#d2f1f5] rounded-[4px] h-[40px]">
                  <span className="absolute left-[5px] top-[7px] font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">Math</span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">School assigned</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="relative bg-[#d2f1f5] rounded-[4px] h-[40px]">
                  <span className="absolute left-[5px] top-[7px] font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">Math</span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">School assigned</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="relative bg-[#d2f1f5] rounded-[4px] h-[40px]">
                  <span className="absolute left-[5px] top-[7px] font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">Math</span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">School assigned</span>
                </div>
              </div>
            </div>

            {/* Block 2 */}
            <div className="grid gap-0" style={{ gridTemplateColumns: scheduleGridCols }}>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">Block 2</span>
                <span className="font-['Inter:Regular',sans-serif] text-[#625f6e] text-[12px]">8:40 - 10:10 am</span>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="relative bg-[#d2f1f5] rounded-[4px] h-[40px]">
                  <span className="absolute left-[5px] top-[7px] font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">ELA - Core</span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">School assigned</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="relative bg-[#d2f1f5] rounded-[4px] h-[40px]">
                  <span className="absolute left-[5px] top-[7px] font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">ELA - Core</span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">School assigned</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="relative bg-[#d2f1f5] rounded-[4px] h-[40px]">
                  <span className="absolute left-[5px] top-[7px] font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">ELA - Core</span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">School assigned</span>
                </div>
              </div>
            </div>

            {/* Block 3 */}
            <div className="grid gap-0" style={{ gridTemplateColumns: scheduleGridCols }}>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">Block 3</span>
                <span className="font-['Inter:Regular',sans-serif] text-[#625f6e] text-[12px]">10:20 - 11:50 am</span>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="relative bg-[rgba(0,77,8,0.2)] rounded-[4px] h-[40px]">
                  <span className="absolute left-[5px] top-[7px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                    {approvedBlock3Day1?.name ?? "Available slot"}
                  </span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                    {approvedBlock3Day1 ? "Enric. Approved" : "Awaiting setup"}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="relative bg-[rgba(0,77,8,0.2)] rounded-[4px] h-[40px]">
                  <span className="absolute left-[5px] top-[7px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                    {approvedBlock3Day2?.name ?? "Available slot"}
                  </span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                    {approvedBlock3Day2 ? "Enric. Approved" : "Awaiting setup"}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                {requests.block3_day3.firstChoice ? (
                  <div
                    onClick={() => openCatalog("block3_day3")}
                    className="relative bg-[#ffd9d9] rounded-[4px] h-[40px] cursor-pointer"
                  >
                    <span className="absolute left-[5px] top-[7px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                      {requests.block3_day3.firstChoice.name}
                    </span>
                    <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                      Enric. Pending
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCatalog("block3_day3")}
                    className="bg-[#f9fafb] relative rounded-[4px] w-full h-[40px] hover:bg-gray-100 transition-colors"
                  >
                    <span className="absolute left-[5px] top-[7px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                      Available slot
                    </span>
                    <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                      + Choose class
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Block 4 */}
            <div className="grid gap-0" style={{ gridTemplateColumns: scheduleGridCols }}>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-bl-[8px] h-[95px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">Block 4</span>
                <span className="font-['Inter:Regular',sans-serif] text-[#625f6e] text-[12px]">7:00 - 8:30 am</span>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[95px] p-1 flex flex-col gap-[3px]">
                <div className="relative bg-[#ffd9d9] rounded-[4px] h-[40px] shrink-0">
                  <span className="absolute left-[5px] top-[7px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                    {pendingBlock4Day1?.name ?? "Available slot"}
                  </span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                    {pendingBlock4Day1 ? "Enric. Pending" : "Awaiting setup"}
                  </span>
                </div>
                <div className="relative bg-[#ffd9d9] rounded-[4px] h-[40px] shrink-0">
                  <span className="absolute left-[5px] top-[7px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                    {pendingBlock4Day1Alt?.name ?? "Available slot"}
                  </span>
                  <span className="absolute left-[5px] top-[21px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                    {pendingBlock4Day1Alt ? "Enric. Pending" : "Awaiting setup"}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[95px] p-1">
                <div className="relative bg-[rgba(0,77,8,0.2)] rounded-[4px] h-[83px]">
                  <span className="absolute left-[5px] top-[13px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                    {approvedBlock4Day2?.name ?? "Available slot"}
                  </span>
                  <span className="absolute left-[5px] top-[27px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                    {approvedBlock4Day2 ? "Enric. Approved" : "Awaiting setup"}
                  </span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] rounded-br-[8px] h-[95px] p-1">
                {requests.block4_day3.firstChoice ? (
                  <div
                    onClick={() => openCatalog("block4_day3")}
                    className="relative bg-[#ffd9d9] rounded-[4px] h-[83px] cursor-pointer"
                  >
                    <span className="absolute left-[5px] top-[13px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                      {requests.block4_day3.firstChoice.name}
                    </span>
                    <span className="absolute left-[5px] top-[27px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                      Enric. Pending
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => openCatalog("block4_day3")}
                    className="bg-[#f9fafb] relative rounded-[4px] w-full h-[83px] hover:bg-gray-100 transition-colors"
                  >
                    <span className="absolute left-[5px] top-[13px] w-[113px] overflow-hidden text-ellipsis whitespace-nowrap font-['Inter:Regular',sans-serif] text-[#0d0d12] text-[10px] leading-none tracking-[0.1px]">
                      Available slot
                    </span>
                    <span className="absolute left-[5px] top-[27px] font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-[1.25] whitespace-nowrap">
                      + Choose class
                    </span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* How it works sidebar */}
        <div
          className="bg-white border border-[#f0f0f0] rounded-[18px] shrink-0 flex flex-col"
          style={{ width: "519px", height: "345px", padding: "16px 24px", rowGap: "20px" }}
        >
          <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[16px] leading-[1.4]">
            How it works
          </h2>

          <div className="relative h-[271px]">
            <div aria-hidden className="absolute left-[17px] top-[4.21px] h-[237.213px] w-0">
              <img alt="" className="absolute inset-[0_-0.5px] max-w-none size-full" src={imgHistoryLine} />
            </div>
            <div className="relative z-10 flex h-full flex-col items-start justify-between">
              <div className="flex gap-[10px] items-start">
                <div className="bg-[#f6fcfd] overflow-clip relative rounded-[42px] size-[32px] shrink-0">
                  <p className="-translate-x-1/2 absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] left-[15.5px] top-[6px] text-[#14c1d5] text-[14px] text-center whitespace-nowrap">
                    1
                  </p>
                </div>
              <div className="flex flex-col gap-[6px] min-w-0 items-start leading-[1.4] text-[#666d80]" style={{ width: "400px" }}>
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] text-[14px] leading-[1.4] whitespace-nowrap">Choose classes for each available block</p>
                <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[12px] leading-[1.4] w-[400px]">Browse the available enrichment classes and select one option for each open block in your child’s schedule.</p>
              </div>
            </div>

            <div className="flex gap-[10px] items-start">
              <div className="bg-[#f6fcfd] overflow-clip relative rounded-[42px] size-[32px] shrink-0">
                <p className="-translate-x-1/2 absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] left-[15.5px] top-[6px] text-[#14c1d5] text-[14px] text-center whitespace-nowrap">
                  2
                </p>
              </div>
              <div className="flex flex-col gap-[6px] min-w-0 items-start justify-center leading-[1.4] text-[#666d80]" style={{ width: "400px" }}>
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] text-[14px] leading-[1.4] whitespace-nowrap">Select a 1st and 2nd preference if possible</p>
                <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[12px] leading-[1.4] w-[400px]">Choosing a second preference helps the school place your child in another option if the first choice becomes full.</p>
              </div>
            </div>

            <div className="flex gap-[10px] items-start w-full">
              <div className="bg-[#f6fcfd] overflow-clip relative rounded-[42px] size-[32px] shrink-0">
                <p className="-translate-x-1/2 absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] left-[15px] top-[6px] text-[#14c1d5] text-[14px] text-center whitespace-nowrap">
                  3
                </p>
              </div>
              <div className="flex flex-col gap-[6px] min-w-0 items-start justify-center leading-[1.4] text-[#666d80]" style={{ width: "400px" }}>
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] text-[14px] leading-[1.4] whitespace-nowrap">The school reviews and confirms placements</p>
                <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[12px] leading-[1.4] w-[400px]">After submission, the school team reviews all requests and assigns students based on availability and scheduling.</p>
              </div>
            </div>

            <div className="flex gap-[10px] items-start w-full">
              <div className="bg-[#f6fcfd] overflow-clip relative rounded-[42px] size-[32px] shrink-0">
                <p className="-translate-x-1/2 absolute font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.4] left-[15px] top-[6px] text-[#14c1d5] text-[14px] text-center whitespace-nowrap">
                  4
                </p>
              </div>
              <div className="flex flex-col gap-[6px] min-w-0 items-start justify-center leading-[1.4] text-[#666d80]" style={{ width: "400px" }}>
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] text-[14px] leading-[1.4] whitespace-nowrap">Approved classes will appear in the schedule</p>
                <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[12px] leading-[1.4] w-[400px]">Once confirmed, the approved enrichment classes will automatically be added to your child’s weekly schedule.</p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Bottom Banners */}
      <div className="flex flex-col w-full" style={{ marginTop: "174px", rowGap: "14px" }}>
        <div className="flex justify-end">
          <button
            type="button"
            disabled={!hasChoices || submitting}
            onClick={submitSelections}
            className="rounded-[8px] bg-[#14c1d5] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#11a9ba] disabled:pointer-events-none disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit selections"}
          </button>
        </div>
        <div className="relative h-[102px] w-[1113px] max-w-[calc(100%+9px)] -ml-[9px]">
          <img alt="" className="absolute inset-0 h-full w-full" src={imgUnion} />
          <div className="relative flex gap-[8px] items-start px-[23px] py-[16px] w-[1076px]">
            <div className="bg-[#d2f1f5] rounded-[10px] size-[40px] flex items-center justify-center shrink-0">
              <div className="h-[24px] relative w-[22px] overflow-hidden">
                <img
                  alt=""
                  className="absolute h-full left-0 max-w-none top-0 w-[384.62%]"
                  src={imgImage1}
                />
              </div>
            </div>
            <div className="flex flex-col gap-[4px] items-start justify-center">
              <div className="flex items-center w-[1028px]">
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] leading-[1.4] whitespace-nowrap">
                  Enrichment Selection Deadline
                </p>
              </div>
              <div className="flex items-center w-[1028px]">
                <p className="font-['Inter:Regular',sans-serif] text-[#272932] text-[14px] leading-[1.6] tracking-[-0.28px] whitespace-nowrap">
                  Please remember to submit your child’s enrichment class requests before the school’s deadline.<br />
                  Submitting on time helps the school organize class groups and ensures your child has the best chance of getting their preferred classes.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#f0f0f0] rounded-[18px] px-[14px] py-[16px] flex items-start">
          <div className="flex items-center gap-[8px] w-full">
            <div className="bg-[rgba(207,165,0,0.2)] rounded-[10px] size-[40px] flex items-center justify-center shrink-0">
              <div className="overflow-clip relative size-[24px] shrink-0">
                <div className="absolute inset-[9.38%]">
                  <img alt="Info" className="absolute inset-[-5.13%] max-w-none size-full" src={imgGroup} />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start w-[97px]">
              <div className="flex items-center justify-between w-[1028px]">
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] leading-[1.4] w-[720px]">
                  Enrichment classes allow students to explore interests beyond core subjects such as arts, technology, entrepreneurship and science.
                </p>
                <Link
                  href="/dashboard/parents/students"
                  className="flex items-center gap-[8px] hover:opacity-70 transition-opacity shrink-0"
                >
                  <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] leading-[1.4] whitespace-nowrap">View profile</span>
                  <img alt="" className="size-[18px] -rotate-90" src={imgChevronDown} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Catalog Modal */}
      {activeSlot && !activeClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[18px] w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 shadow-xl relative">
            <button
              onClick={closeModals}
              className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold text-xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-[#272932] mb-6">Available Enrichment Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableClasses.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => openClassDetails(cls)}
                  className="border border-[#f0f0f0] rounded-xl p-4 hover:border-[#14c1d5] hover:shadow-md cursor-pointer transition-all"
                >
                  <h3 className="font-semibold text-lg text-[#0d0d12]">{cls.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">Teacher: {cls.teacher}</p>
                  <p className="text-sm text-[#666d80] line-clamp-2">{cls.description}</p>
                  <div className="mt-4 flex justify-end">
                    <span className="text-[#14c1d5] font-semibold text-sm">View Details &rarr;</span>
                  </div>
                </div>
              ))}
              {availableClasses.length === 0 && (
                <div className="col-span-full rounded-xl border border-[#f0f0f0] p-6 text-sm text-[#666d80]">
                  No enrichment offerings are available right now.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Class Details Modal */}
      {activeClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[18px] w-full max-w-xl p-6 shadow-xl relative">
            <button
              onClick={() => setActiveClass(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold text-xl"
            >
              ×
            </button>
            <button
              onClick={() => setActiveClass(null)}
              className="text-sm text-[#14c1d5] hover:underline mb-4 inline-block"
            >
              &larr; Back to Catalog
            </button>
            
            <h2 className="text-2xl font-bold text-[#272932] mb-2">{activeClass.name}</h2>
            <p className="text-md text-gray-600 mb-4">Teacher: {activeClass.teacher}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-1">Description</h4>
              <p className="text-sm text-gray-700 mb-4">{activeClass.description}</p>
              
              <h4 className="font-semibold text-gray-800 mb-1">Prerequisites</h4>
              <p className="text-sm text-gray-700">{activeClass.prerequisites}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleSelectChoice("firstChoice")}
                className="flex-1 bg-[#14c1d5] hover:bg-[#11a9ba] text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Select as 1st Choice
              </button>
              <button
                onClick={() => handleSelectChoice("secondChoice")}
                className="flex-1 bg-white border-2 border-[#14c1d5] text-[#14c1d5] hover:bg-blue-50 py-3 rounded-lg font-semibold transition-colors"
              >
                Select as 2nd Choice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
