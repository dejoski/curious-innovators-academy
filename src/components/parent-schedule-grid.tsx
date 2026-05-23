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
  if (tone === "core") return "border-[#14c1d5]/45 bg-[#d2f1f5]";
  if (tone === "approved") return "border-transparent bg-[#004d08]/20";
  if (tone === "pending") return "border-transparent bg-[#ffd9d9]";
  return `border-dashed border-[#d1d5db] bg-[#f9fafb] ${interactive ? "hover:border-[#14c1d5] hover:bg-[#f6fcfd]" : ""}`;
}

function badgeCaption(badge: StudentScheduleBadge) {
  if (badge.tone === "core") return "School assigned";
  if (badge.tone === "approved") return "Enric. Approved";
  if (badge.tone === "pending") return "Enric. Pending";
  return "+ Choose class";
}

function ScheduleBadgeCard({ badge, tall = false, compact = false }: { badge: StudentScheduleBadge; tall?: boolean; compact?: boolean }) {
  return (
    <div className={`h-full rounded-[4px] border px-[5px] py-[7px] ${badgeClasses(badge.tone, false)} ${compact ? "py-[5px]" : ""}`}>
      <p className="truncate text-[10px] leading-none tracking-[0.1px] text-[#0d0d12] sm:text-[12px]">{badge.label}</p>
      <p className={`mt-[8px] text-[10px] font-bold leading-[1.25] text-[#666d80] sm:text-[12px] ${tall ? "" : "truncate"}`}>{badgeCaption(badge)}</p>
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
    <div className={`flex h-full flex-col ${visible.length > 1 ? "gap-[3px]" : ""}`}>
      {visible.map((badge, index) => (
        <div key={`${slot}-${badge.label}-${index}`} className={visible.length > 1 ? "min-h-0 flex-1" : "h-full"}>
          <ScheduleBadgeCard badge={badge} tall={tall} compact={visible.length > 1} />
        </div>
      ))}
    </div>
  );

  return (
    <div className={`border border-[#f0f0f0] bg-white p-[5px] ${tall ? "h-[95px]" : "h-[52px]"}`}>
      {clickable ? (
        <button type="button" onClick={() => onSlotClick?.(slot)} className={`block h-full w-full rounded-[4px] text-left transition ${isEmpty ? badgeClasses("empty", true) : "hover:ring-1 hover:ring-[#14c1d5]"}`}>
          {isEmpty ? (
            <div className="flex h-full flex-col justify-center px-[5px]">
              <p className="truncate text-[10px] leading-none tracking-[0.1px] text-[#0d0d12] sm:text-[12px]">Available slot</p>
              <p className="mt-[8px] text-[10px] font-bold leading-[1.25] text-[#666d80] sm:text-[12px]">+ Choose class</p>
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
    <div className={`rounded-[18px] border border-[#f0f0f0] bg-white p-[15px] shadow-sm ${className}`}>
      <div className="overflow-hidden">
        <div className="grid grid-cols-[minmax(98px,134px)_repeat(3,minmax(0,1fr))]">
          <div className="flex h-[65px] flex-col justify-center rounded-tl-[8px] border border-[#f0f0f0] bg-[#f9fafb] px-[14px] text-[#625f6e]">
            <span className="text-[12px] font-bold leading-[1.29]">90 minutes</span>
            <span className="text-[12px] leading-[1.29]">per block</span>
          </div>
          {PARENT_SCHEDULE_DAYS.map((day, index) => (
            <div key={day} className={`flex h-[65px] flex-col items-center justify-center border border-[#f0f0f0] bg-[#f9fafb] ${index === PARENT_SCHEDULE_DAYS.length - 1 ? "rounded-tr-[8px]" : ""}`}>
              <span className="text-[12px] leading-none tracking-[0.12px] text-[#020204]">Day</span>
              <span className="mt-[4px] text-[14px] font-semibold leading-none tracking-[0.14px] text-[#020204]">{index + 1}</span>
            </div>
          ))}

          {PARENT_SCHEDULE_ROWS.map((row, rowIndex) => (
            <div key={row.label} className="contents">
              <div className={`flex flex-col justify-center border border-[#f0f0f0] bg-[#f9fafb] px-[17px] text-[#625f6e] ${row.tall ? "h-[95px] justify-start pt-[12px]" : "h-[52px]"} ${rowIndex === PARENT_SCHEDULE_ROWS.length - 1 ? "rounded-bl-[8px]" : ""}`}>
                <span className="text-[10px] font-bold leading-none">{row.label}</span>
                <span className="mt-[4px] text-[12px] leading-none">{row.time}</span>
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
