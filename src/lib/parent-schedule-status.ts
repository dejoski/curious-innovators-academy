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

function hasAnySlotBadges(badges: StudentScheduleBadge[] | undefined) {
  return realBadges(badges).length > 0;
}

function finalityState(state: ParentScheduleFinalityState, label: string, description: string): ParentScheduleFinality {
  return { state: state as const, label, description };
}

export function parentScheduleFinalityFromBadges(badgesBySlot: ParentScheduleBadges | null | undefined): ParentScheduleFinality {
  let hasDraft = false;
  let hasPending = false;
  let hasWaitlisted = false;
  let hasOpenSlot = false;

  for (const slot of SELECTABLE_SLOTS) {
    const badges = realBadges(badgesBySlot?.[slot]);
    if (!hasAnySlotBadges(badges)) {
      hasOpenSlot = true;
      continue;
    }
    hasDraft ||= badges.some((badge) => badge.tone === "draft");
    hasPending ||= badges.some((badge) => badge.tone === "pending");
    hasWaitlisted ||= badges.some((badge) => badge.tone === "waitlisted");
  }

  if (hasDraft) return finalityState("draft", "Draft schedule", "Not final. Submit the draft, then school approval finalizes enrichment placements.");
  if (hasPending) return finalityState("pending", "Pending approval", "Not final. Enrichment placements become final only after admin approval.");
  if (hasWaitlisted) return finalityState("waitlisted", "Waitlisted", "Not final. One or more choices are waitlisted and need school follow-up.");
  if (hasOpenSlot) return finalityState("open", "Open schedule", "Not final. Open enrichment blocks still need a submitted and approved placement.");
  return finalityState("final", "Final schedule", "Final. Core classes and enrichment placements are approved by the school.");
}

function parentScheduleFinalityFromScheduleState(
  state: StudentScheduleState | null | undefined,
  row?: Pick<StudentScheduleRow, "finalizedAt" | "finalizedBy" | "hasConflicts" | "incompleteBlocks"> | null,
): ParentScheduleFinality | null {
  if (state === "final") {
    const finalizer = row?.finalizedBy ? ` by ${row.finalizedBy}` : "";
    const when = row?.finalizedAt ? ` on ${new Date(row.finalizedAt).toLocaleDateString("en-US", { timeZone: "America/New_York" })}` : "";
    return finalityState("final", "Finalized schedule", `Final. This schedule was finalized${finalizer}${when}.`);
  }
  if (state === "pending") {
    return finalityState("pending", "Pending finalization", "Not final. The schedule is ready for school review before parent-facing finalization.");
  }
  if (state === "draft") {
    const issues: string[] = [];
    if (row?.hasConflicts) issues.push("conflicts");
    if ((row?.incompleteBlocks ?? 0) > 0) issues.push(`${row?.incompleteBlocks} open block${row?.incompleteBlocks === 1 ? "" : "s"}`);
    return finalityState("draft", "Draft schedule", issues.length ? `Not final. Needs admin review for ${issues.join(" and ")}.` : "Not final. Admin can keep editing before finalization.");
  }
  return null;
}

export function parentScheduleFinalityFromRow(row: StudentScheduleRow | null | undefined): ParentScheduleFinality {
  const explicit = parentScheduleFinalityFromScheduleState(row?.scheduleState, row);
  if (explicit) return explicit;
  return parentScheduleFinalityFromBadges(row ? studentScheduleSlots(row) : null);
}

export function parentScheduleFinalityClasses(state: ParentScheduleFinalityState) {
  const map: Record<ParentScheduleFinalityState, string> = {
    final: "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]",
    draft: "border-[#84adff]/45 bg-[#eef4ff] text-[#3451a4]",
    pending: "border-[#d80509]/25 bg-[#fff5f5] text-[#8c1f1f]",
    waitlisted: "border-[#cfa500]/45 bg-[#fff8e6] text-[#7a5b00]",
    open: "border-[#cfa500]/35 bg-[#fffdf3] text-[#7a5b00]",
  };
  return map[state] ?? map.open;
}
