import type { StudentScheduleBadge, StudentScheduleRow, StudentScheduleState } from "@/lib/data/types";
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

export function parentScheduleFinalityFromScheduleState(
  state: StudentScheduleState | null | undefined,
  row?: Pick<StudentScheduleRow, "finalizedAt" | "finalizedBy" | "hasConflicts" | "incompleteBlocks"> | null,
): ParentScheduleFinality | null {
  if (state === "finalized") {
    const finalizer = row?.finalizedBy ? ` by ${row.finalizedBy}` : "";
    const when = row?.finalizedAt
      ? ` on ${new Date(row.finalizedAt).toLocaleDateString("en-US", { timeZone: "America/New_York" })}`
      : "";
    return {
      state: "final",
      label: "Finalized schedule",
      description: `Final. This schedule was finalized${finalizer}${when}.`,
    };
  }
  if (state === "pending") {
    return {
      state: "pending",
      label: "Pending finalization",
      description: "Not final. The schedule is ready for school review before parent-facing finalization.",
    };
  }
  if (state === "draft") {
    const issues: string[] = [];
    if (row?.hasConflicts) issues.push("conflicts");
    if ((row?.incompleteBlocks ?? 0) > 0) {
      issues.push(`${row?.incompleteBlocks} open block${row?.incompleteBlocks === 1 ? "" : "s"}`);
    }
    return {
      state: "draft",
      label: "Draft schedule",
      description: issues.length
        ? `Not final. Needs admin review for ${issues.join(" and ")}.`
        : "Not final. Admin can keep editing before finalization.",
    };
  }
  return null;
}

export function parentScheduleFinalityFromRow(row: StudentScheduleRow | null | undefined): ParentScheduleFinality {
  const explicit = parentScheduleFinalityFromScheduleState(row?.scheduleState, row);
  if (explicit) return explicit;
  return parentScheduleFinalityFromBadges(row ? studentScheduleSlots(row) : null);
}

export function parentScheduleFinalityClasses(state: ParentScheduleFinalityState) {
  if (state === "final") return "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]";
  if (state === "draft") return "border-[#84adff]/45 bg-[#eef4ff] text-[#3451a4]";
  if (state === "pending") return "border-[#d80509]/25 bg-[#fff5f5] text-[#8c1f1f]";
  if (state === "waitlisted") return "border-[#cfa500]/45 bg-[#fff8e6] text-[#7a5b00]";
  return "border-[#cfa500]/35 bg-[#fffdf3] text-[#7a5b00]";
}

export function isFinalParentSchedule(state: ParentScheduleFinalityState) {
  return state === "final";
}
