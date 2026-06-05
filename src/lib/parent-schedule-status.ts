import type { StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import {
  CATALOG_SLOT_IDS,
  CATALOG_SLOT_META,
  studentScheduleSlots,
  type ParentScheduleBadges,
} from "@/lib/schedule-slots";

export type ParentScheduleFinalityState = "draft" | "pending" | "waitlisted" | "open" | "final";

export type ParentScheduleFinality = {
  state: ParentScheduleFinalityState;
  label: string;
  description: string;
};

const SELECTABLE_SLOTS = CATALOG_SLOT_IDS.map((slotId) => CATALOG_SLOT_META[slotId].scheduleSlot);

function realBadges(badges: StudentScheduleBadge[] | undefined) {
  return (badges ?? []).filter((badge) => badge.tone !== "empty" && badge.label !== "--");
}

export function parentScheduleFinalityFromBadges(badgesBySlot: ParentScheduleBadges | null | undefined): ParentScheduleFinality {
  let hasDraft = false;
  let hasPending = false;
  let hasWaitlisted = false;
  let hasOpenSlot = false;

  for (const slot of SELECTABLE_SLOTS) {
    const badges = realBadges(badgesBySlot?.[slot]);
    if (badges.length === 0) {
      hasOpenSlot = true;
      continue;
    }
    hasDraft ||= badges.some((badge) => badge.tone === "draft");
    hasPending ||= badges.some((badge) => badge.tone === "pending");
    hasWaitlisted ||= badges.some((badge) => badge.tone === "waitlisted");
  }

  if (hasDraft) {
    return {
      state: "draft",
      label: "Draft schedule",
      description: "Not final. Submit the draft, then school approval finalizes enrichment placements.",
    };
  }
  if (hasPending) {
    return {
      state: "pending",
      label: "Pending approval",
      description: "Not final. Enrichment placements become final only after admin approval.",
    };
  }
  if (hasWaitlisted) {
    return {
      state: "waitlisted",
      label: "Waitlisted",
      description: "Not final. One or more choices are waitlisted and need school follow-up.",
    };
  }
  if (hasOpenSlot) {
    return {
      state: "open",
      label: "Open schedule",
      description: "Not final. Open enrichment blocks still need a submitted and approved placement.",
    };
  }
  return {
    state: "final",
    label: "Final schedule",
    description: "Final. Core classes and enrichment placements are approved by the school.",
  };
}

export function parentScheduleFinalityFromRow(row: StudentScheduleRow | null | undefined): ParentScheduleFinality {
  return parentScheduleFinalityFromBadges(row ? studentScheduleSlots(row) : null);
}

export function parentScheduleFinalityClasses(state: ParentScheduleFinalityState) {
  if (state === "final") return "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]";
  if (state === "draft") return "border-[#84adff]/45 bg-[#eef4ff] text-[#3451a4]";
  if (state === "pending") return "border-[#d80509]/25 bg-[#fff5f5] text-[#8c1f1f]";
  if (state === "waitlisted") return "border-[#cfa500]/45 bg-[#fff8e6] text-[#7a5b00]";
  return "border-[#cfa500]/35 bg-[#fffdf3] text-[#7a5b00]";
}
