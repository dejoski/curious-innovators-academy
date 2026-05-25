"use client";

import type { ReactNode } from "react";
import type { StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import {
  PARENT_SCHEDULE_DAYS,
  PARENT_SCHEDULE_ROWS,
  catalogSlotIdFromScheduleSlot,
  normalizeScheduleBadges,
  type ParentScheduleBadges,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";

export type { ParentScheduleBadges, ParentScheduleSlotKey } from "@/lib/schedule-slots";

const PARENT_SCHEDULE_SLOT_KEYS: ParentScheduleSlotKey[] = ["b1", "b2", "b3Tue", "b3Wed", "b3Thu", "b4Tue", "b4Wed", "b4Thu"];

export type ParentScheduleBadgeClick = (slot: ParentScheduleSlotKey, badge: StudentScheduleBadge, index: number) => void;

export function buildParentScheduleBadges(schedule?: StudentScheduleRow | null, overrides?: ParentScheduleBadges): ParentScheduleBadges {
  return PARENT_SCHEDULE_SLOT_KEYS.reduce<ParentScheduleBadges>((next, slot) => {
    const override = overrides?.[slot];
    const source = schedule?.[slot];
    next[slot] = normalizeScheduleBadges(override?.length ? override : source?.length ? source : []);
    return next;
  }, {});
}

function badgeClasses(tone: StudentScheduleBadge["tone"], interactive: boolean) {
  if (tone === "core") return "border-[#14c1d5]/55 bg-[#d2f1f5]";
  if (tone === "approved") return "border-[#004d08]/15 bg-[#d9e7d8]";
  if (tone === "pending") return "border-[#d80509]/20 bg-[#ffd9d9]";
  if (tone === "waitlisted") return "border-[#cfa500]/35 bg-[#fff5cc]";
  if (tone === "draft") return "border-[#84adff]/45 bg-[#eef4ff]";
  return `border-dashed border-[#dfe3ea] bg-[#fbfcfe] ${interactive ? "hover:border-[#14c1d5] hover:bg-[#f6fcfd]" : ""}`;
}

function badgeCaption(badge: StudentScheduleBadge) {
  if (badge.tone === "core") return "School assigned";
  if (badge.tone === "approved") return "Enric. Approved";
  if (badge.tone === "pending") return "Enric. Pending";
  if (badge.tone === "waitlisted") return "Enric. Waitlisted";
  if (badge.tone === "draft") return "Draft choice";
  return "+ Choose class";
}

function meaningfulBadgeCount(badges: StudentScheduleBadge[]) {
  return badges.filter((badge) => badge.tone !== "empty").length;
}

function ScheduleBadgeCard({ badge, tall = false, compact = false }: { badge: StudentScheduleBadge; tall?: boolean; compact?: boolean }) {
  return (
    <div className={`flex h-full flex-col rounded-[6px] border px-2 min-[1100px]:px-3 ${compact ? "justify-center py-2" : "justify-between py-2 min-[1100px]:py-3"} ${badgeClasses(badge.tone, false)}`}>
      <p className={`${tall ? "line-clamp-3" : "line-clamp-2"} text-[11px] leading-[1.16] text-[#111827] min-[1100px]:text-[13px]`}>{badge.label}</p>
      <p className={`mt-1.5 text-[10px] font-semibold leading-[1.15] text-[#667085] min-[1100px]:mt-2 min-[1100px]:text-[12px] ${tall ? "line-clamp-2" : "line-clamp-1"}`}>{badgeCaption(badge)}</p>
    </div>
  );
}

function SlotCell({
  slot,
  badges,
  tall = false,
  onSlotClick,
  onBadgeClick,
}: {
  slot: ParentScheduleSlotKey;
  badges: StudentScheduleBadge[];
  tall?: boolean;
  onSlotClick?: (slot: ParentScheduleSlotKey) => void;
  onBadgeClick?: ParentScheduleBadgeClick;
}) {
  const visible = badges.length ? badges : [{ label: "Available slot", tone: "empty" as const }];
  const isEmpty = visible.every((badge) => badge.tone === "empty");
  const catalogSlotId = catalogSlotIdFromScheduleSlot(slot);
  const clickable = Boolean(onSlotClick) && Boolean(catalogSlotId);
  const content = (
    <div className={`flex h-full flex-col ${visible.length > 1 ? "gap-1.5 min-[1100px]:gap-2" : ""}`}>
      {visible.map((badge, index) => (
        <div key={`${slot}-${badge.label}-${index}`} className={visible.length > 1 ? "min-h-0 flex-1" : "h-full"}>
          {onBadgeClick && badge.tone !== "empty" ? (
            <button
              type="button"
              onClick={() => onBadgeClick(slot, badge, index)}
              className="block h-full w-full rounded-[6px] text-left transition hover:ring-2 hover:ring-[#14c1d5]/35"
            >
              <ScheduleBadgeCard badge={badge} tall={tall} compact={visible.length > 1} />
            </button>
          ) : (
            <ScheduleBadgeCard badge={badge} tall={tall} compact={visible.length > 1} />
          )}
        </div>
      ))}
    </div>
  );

  return (
    <div
      data-schedule-slot={slot}
      data-catalog-slot={catalogSlotId ?? undefined}
      className={`min-w-0 border border-[#e8ebf0] bg-white p-1.5 min-[1100px]:p-2 ${tall ? "h-[156px]" : "h-[74px] min-[1100px]:h-[76px]"}`}
    >
      {clickable && isEmpty ? (
        <button type="button" onClick={() => onSlotClick?.(slot)} className={`block h-full w-full rounded-[6px] text-left transition ${isEmpty ? badgeClasses("empty", true) : "hover:ring-2 hover:ring-[#14c1d5]/35"}`}>
          <div className="flex h-full flex-col justify-center px-2 min-[1100px]:px-3">
            <p className="text-[11px] leading-[1.2] text-[#111827] min-[1100px]:text-[13px]">Available slot</p>
            <p className="mt-1.5 text-[10px] font-semibold leading-[1.2] text-[#667085] min-[1100px]:mt-2 min-[1100px]:text-[12px]">+ Choose class</p>
          </div>
        </button>
      ) : clickable && !onBadgeClick ? (
        <button type="button" onClick={() => onSlotClick?.(slot)} className="block h-full w-full rounded-[6px] text-left transition hover:ring-2 hover:ring-[#14c1d5]/35">
          {content}
        </button>
      ) : content}
    </div>
  );
}

export function ParentScheduleGrid({
  badgesBySlot,
  onSlotClick,
  onBadgeClick,
  className = "",
  footer,
}: {
  badgesBySlot?: ParentScheduleBadges;
  onSlotClick?: (slot: ParentScheduleSlotKey) => void;
  onBadgeClick?: ParentScheduleBadgeClick;
  className?: string;
  footer?: ReactNode;
}) {
  const getBadges = (slot: ParentScheduleSlotKey) => badgesBySlot?.[slot] ?? [];
  const rowNeedsExtraHeight = (slots: readonly ParentScheduleSlotKey[]) => slots.some((slot) => meaningfulBadgeCount(getBadges(slot)) > 1);

  return (
    <div className={`min-w-0 rounded-[16px] border border-[#e6e9ef] bg-white p-3 shadow-sm min-[1100px]:p-5 ${className}`}>
      <div className="min-w-0 overflow-hidden">
        <div className="grid w-full min-w-0 grid-cols-[minmax(82px,0.78fr)_repeat(3,minmax(0,1fr))] overflow-hidden rounded-[10px] border border-[#e8ebf0]">
          <div className="flex h-[70px] min-w-0 flex-col justify-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] px-2 text-[#5d6678] min-[1100px]:h-[78px] min-[1100px]:px-5">
            <span className="text-[12px] font-bold leading-[1.2] min-[1100px]:text-[15px]">90 minutes</span>
            <span className="text-[11px] leading-[1.2] min-[1100px]:text-[14px]">per block</span>
          </div>
          {PARENT_SCHEDULE_DAYS.map((day, index) => (
            <div key={day} className="flex h-[70px] min-w-0 flex-col items-center justify-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] last:border-r-0 min-[1100px]:h-[78px]">
              <span className="text-[11px] leading-none text-[#111827] min-[1100px]:text-[14px]">Day</span>
              <span className="mt-1.5 text-[18px] font-semibold leading-none text-[#111827] min-[1100px]:mt-2 min-[1100px]:text-[22px]">{index + 1}</span>
            </div>
          ))}

          {PARENT_SCHEDULE_ROWS.map((row, rowIndex) => {
            const tall = rowNeedsExtraHeight(row.slots);

            return (
              <div key={row.label} className="contents">
                <div className={`flex min-w-0 flex-col justify-center border-b border-r border-[#e8ebf0] bg-[#f7f9fc] px-2 text-[#5d6678] min-[1100px]:px-6 ${tall ? "h-[156px] justify-start pt-4 min-[1100px]:pt-6" : "h-[74px] min-[1100px]:h-[76px]"} ${rowIndex === PARENT_SCHEDULE_ROWS.length - 1 ? "border-b-0" : ""}`}>
                  <span className="text-[11px] font-bold leading-none min-[1100px]:text-[13px]">{row.label}</span>
                  <span className="mt-1.5 text-[11px] leading-[1.15] min-[1100px]:mt-2 min-[1100px]:text-[14px]">{row.time}</span>
                </div>
                {row.slots.map((slot, index) => (
                  <SlotCell
                    key={`${row.label}-${slot}-${index}`}
                    slot={slot}
                    badges={getBadges(slot)}
                    tall={tall}
                    onSlotClick={onSlotClick}
                    onBadgeClick={onBadgeClick}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </div>
      {footer}
    </div>
  );
}
