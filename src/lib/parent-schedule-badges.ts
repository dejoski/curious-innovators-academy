import type { StudentScheduleBadge, StudentScheduleRow } from "@/lib/data/types";
import {
  PARENT_SCHEDULE_SLOT_KEYS,
  normalizeScheduleBadges,
  type ParentScheduleBadges,
} from "@/lib/schedule-slots";

function firstRealBadge(badges: StudentScheduleBadge[] | undefined): StudentScheduleBadge {
  return (badges ?? []).find((badge) => badge.tone !== "empty" && badge.label !== "--") ?? { label: "Available slot", tone: "empty" };
}

function draftBadgeWithUnderlying(badge: StudentScheduleBadge, source: StudentScheduleBadge[] | undefined): StudentScheduleBadge {
  if (badge.tone !== "draft") return badge;
  const draftOf = firstRealBadge(source);
  const isChange = draftOf.tone !== "empty";
  return {
    ...badge,
    label: isChange ? `Draft change: ${badge.label}` : badge.label,
    draftKind: isChange ? "change" : "choice",
    draftOf: {
      label: draftOf.label,
      tone: draftOf.tone,
    },
  };
}

function slotHasConfirmedPlacement(badges: StudentScheduleBadge[]): boolean {
  return badges.some((badge) => badge.tone === "core" || badge.tone === "approved");
}

export function buildParentScheduleBadges(schedule?: StudentScheduleRow | null, overrides?: ParentScheduleBadges): ParentScheduleBadges {
  return PARENT_SCHEDULE_SLOT_KEYS.reduce<ParentScheduleBadges>((next, slot) => {
    const override = overrides?.[slot];
    const source = schedule?.[slot];
    const sourceBadges = normalizeScheduleBadges(source?.length ? source : []);
    const overrideBadges = normalizeScheduleBadges(override?.length ? override : []);
    next[slot] = slotHasConfirmedPlacement(sourceBadges)
      ? sourceBadges
      : overrideBadges.length
      ? overrideBadges.map((badge) => draftBadgeWithUnderlying(badge, sourceBadges))
      : sourceBadges;
    return next;
  }, {});
}
