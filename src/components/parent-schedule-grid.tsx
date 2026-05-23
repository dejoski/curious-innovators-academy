"use client";

import type { ReactNode } from "react";
import type { StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import {
  PARENT_SCHEDULE_DAYS,
  PARENT_SCHEDULE_ROWS,
  isSelectableCatalogSlot,
  type ParentScheduleBadges,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";

export type { ParentScheduleBadges, ParentScheduleSlotKey } from "@/lib/schedule-slots";

const PARENT_SCHEDULE_SLOT_KEYS: ParentScheduleSlotKey[] = ["b1", "b2", "b3Tue", "b3Wed", "b3Thu", "b4Tue", "b4Wed", "b4Thu"];

export function buildParentScheduleBadges(schedule?: StudentScheduleRow | null, overrides?: ParentScheduleBadges): ParentScheduleBadges {
  return PARENT_SCHEDULE_SLOT_KEYS.reduce<ParentScheduleBadges>((next, slot) => {
    const override = overrides?.[slot];
    const source = schedule?.[slot];
    next[slot] = override?.length ? override : source?.length ? source : [];
    return next;
  }, {});
}

function badgeClasses(tone: StudentScheduleBadge["tone"], interactive: boolean) {
  if (tone === "core") return "border-[#14c1d5]/55 bg-[#d2f1f5]";
  if (tone === "approved") return "border-[#004d08]/15 bg-[#d9e7d8]";
  if (tone === "pending") return "border-[#d80509]/20 bg-[#ffd9d9]";
  if (tone === "draft") return "border-[#84adff]/45 bg-[#eef4ff]";
  return `border-dashed border-[#dfe3ea] bg-[#fbfcfe] ${interactive ? "hover:border-[#14c1d5] hover:bg-[#f6fcfd]" : ""}`;
}

function badgeCaption(badge: StudentScheduleBadge) {
  if (badge.tone === "core") return "School assigned";
  if (badge.tone === "approved") return "Enric. Approved";
  if (badge.tone === "pending") return "Enric. Pending";
  if (badge.tone === "draft") return "Draft choice";
  return "+ Choose class";
}

function ScheduleBadgeCard({ badge, tall = false, compact = false }: { badge: StudentScheduleBadge; tall?: boolean; compact?: boolean }) {
  return (
    <div className={`flex h-full flex-col rounded-[6px] border px-3 ${compact ? "justify-center py-2" : "justify-between py-3"} ${badgeClasses(badge.tone, false)}`}>
      <p className="line-clamp-2 text-[13px] leading-[1.2] text-[#111827]">{badge.label}</p>
      <p className={`mt-2 text-[12px] font-semibold leading-[1.2] text-[#667085] ${tall ? "" : "line-clamp-1"}`}>{badgeCaption(badge)}</p>
    </div>
  );
}

function SlotCell({
  slot,
  badges,
  tall = false,
  onSlotClick,
}: {
  slot: ParentScheduleSlotKey;
  badges: StudentScheduleBadge[];
  tall?: boolean;
  onSlotClick?: (slot: ParentScheduleSlotKey) => void;
}) {
  const visible = badges.length ? badges : [{ label: "Available slot", tone: "empty" as const }];
  const isEmpty = visible.every((badge) => badge.tone === "empty");
  const clickable = Boolean(onSlotClick) && isSelectableCatalogSlot(slot);
  const content = (
    <div className={`flex h-full flex-col ${visible.length > 1 ? "gap-2" : ""}`}>
      {visible.map((badge, index) => (
        <div key={`${slot}-${badge.label}-${index}`} className={visible.length > 1 ? "min-h-0 flex-1" : "h-full"}>
          <ScheduleBadgeCard badge={badge} tall={tall} compact={visible.length > 1} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={`border border-[#e8ebf0] bg-white p-2 ${tall ? "h-[152px]" : "h-[76px]"}`}>
      {clickable ? (
        <button type="button" onClick={() => onSlotClick?.(slot)} className={`block h-full w-full rounded-[6px] text-left transition ${isEmpty ? badgeClasses("empty", true) : "hover:ring-2 hover:ring-[#14c1d5]/35"}`}>
          {isEmpty ? (
            <div className="flex h-full flex-col justify-center px-3">
              <p className="text-[13px] leading-[1.2] text-[#111827]">Available slot</p>
              <p className="mt-2 text-[12px] font-semibold leading-[1.2] text-[#667085]">+ Choose class</p>
            </div>
          ) : content}
        </button>
      ) : content}
    </div>
  );
}

export function ParentScheduleGrid({
  badgesBySlot,
  onSlotClick,
  className = "",
  footer,
}: {
  badgesBySlot?: ParentScheduleBadges;
  onSlotClick?: (slot: ParentScheduleSlotKey) => void;
  className?: string;
  footer?: ReactNode;
}) {
  const getBadges = (slot: ParentScheduleSlotKey) => badgesBySlot?.[slot] ?? [];

  return (
    <div className={`min-w-0 rounded-[16px] border border-[#e6e9ef] bg-white p-5 shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <div className="grid min-w-[760px] grid-cols-[minmax(160px,190px)_repeat(3,minmax(170px,1fr))] overflow-hidden rounded-[10px] border border-[#e8ebf0]">
          <div className="flex h-[78px] flex-col justify-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] px-5 text-[#5d6678]">
            <span className="text-[15px] font-bold leading-[1.25]">90 minutes</span>
            <span className="text-[14px] leading-[1.25]">per block</span>
          </div>
          {PARENT_SCHEDULE_DAYS.map((day, index) => (
            <div key={day} className="flex h-[78px] flex-col items-center justify-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] last:border-r-0">
              <span className="text-[14px] leading-none text-[#111827]">Day</span>
              <span className="mt-2 text-[22px] font-semibold leading-none text-[#111827]">{index + 1}</span>
            </div>
          ))}

          {PARENT_SCHEDULE_ROWS.map((row, rowIndex) => (
            <div key={row.label} className="contents">
              <div className={`flex flex-col justify-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] px-6 text-[#5d6678] ${row.tall ? "h-[152px] justify-start pt-6" : "h-[76px]"} ${rowIndex === PARENT_SCHEDULE_ROWS.length - 1 ? "border-b-0" : ""}`}>
                <span className="text-[13px] font-bold leading-none">{row.label}</span>
                <span className="mt-2 text-[14px] leading-none">{row.time}</span>
              </div>
              {row.slots.map((slot, index) => (
                <SlotCell key={`${row.label}-${slot}-${index}`} slot={slot} badges={getBadges(slot)} tall={row.tall} onSlotClick={onSlotClick} />
              ))}
            </div>
          ))}
        </div>
      </div>
      {footer}
    </div>
  );
}
