import { PARENT_CATALOG_PENDING_KEY } from "@/lib/parent-dashboard-storage";
import {
  CATALOG_SLOT_IDS,
  CATALOG_SLOT_META,
  type CatalogSlotId,
  type ParentScheduleBadges,
} from "@/lib/schedule-slots";
import type { EnrichmentRequestRow, StudentScheduleBadge } from "@/lib/data/types";

export type ParentCatalogChoice = {
  id?: string;
  name?: string;
};

export type ParentCatalogSlotRequest = {
  firstChoice?: ParentCatalogChoice | null;
  secondChoice?: ParentCatalogChoice | null;
};

export type ParentCatalogRequests = Record<CatalogSlotId, ParentCatalogSlotRequest>;
export type ParentCatalogChoiceKind = keyof ParentCatalogSlotRequest;

export type LocalReviewStatus = "Pending" | "Approved" | "Waitlisted" | "Rejected";
export type LocalReviewStatuses = Record<string, LocalReviewStatus>;

export type LocalCatalogChoiceReview = {
  id: string;
  slotId: CatalogSlotId;
  slot: string;
  choice: "1st" | "2nd";
  kind: "first" | "second";
  name: string;
  classId?: string;
  status: LocalReviewStatus;
};

export type ParentCatalogIdentity = {
  studentId?: string;
  studentName?: string;
  parentName?: string;
};

const LEGACY_PARENT_CATALOG_SUBMITTED_KEY = "cia-parent-catalog-submitted";
const LEGACY_PARENT_CATALOG_REVIEW_STATUS_KEY = "cia-parent-catalog-review-status";

export const INITIAL_PARENT_CATALOG_REQUESTS: ParentCatalogRequests = CATALOG_SLOT_IDS.reduce(
  (next, slotId) => {
    next[slotId] = { firstChoice: null, secondChoice: null };
    return next;
  },
  {} as ParentCatalogRequests,
);

export function localReviewKey(slotId: CatalogSlotId, kind: "first" | "second") {
  return `catalog-${slotId}-${kind}`;
}

function normalizeChoice(choice: ParentCatalogChoice | null | undefined): ParentCatalogChoice | null {
  if (!choice?.id && !choice?.name) return null;
  return { ...choice };
}

function normalizeSlotRequest(raw: ParentCatalogSlotRequest | null | undefined): ParentCatalogSlotRequest {
  const firstChoice = normalizeChoice(raw?.firstChoice);
  const secondChoice = normalizeChoice(raw?.secondChoice);

  if (firstChoice?.id && secondChoice?.id && firstChoice.id === secondChoice.id) {
    return { firstChoice, secondChoice: null };
  }

  return { firstChoice, secondChoice };
}

function normalizeRequests(raw: unknown): ParentCatalogRequests {
  const value = raw && typeof raw === "object" ? (raw as Partial<ParentCatalogRequests>) : {};
  return CATALOG_SLOT_IDS.reduce((next, slotId) => {
    next[slotId] = normalizeSlotRequest(value[slotId]);
    return next;
  }, {} as ParentCatalogRequests);
}

function hasSlotChoice(slot: ParentCatalogSlotRequest | null | undefined): boolean {
  return Boolean(slot?.firstChoice?.id || slot?.firstChoice?.name || slot?.secondChoice?.id || slot?.secondChoice?.name);
}

function sameCatalogChoice(
  leftChoice: ParentCatalogChoice | null | undefined,
  rightChoice: ParentCatalogChoice | null | undefined,
): boolean {
  const left = normalizeChoice(leftChoice);
  const right = normalizeChoice(rightChoice);
  if (!left && !right) return true;
  if (!left || !right) return false;
  if (left.id && right.id) return left.id === right.id;
  const leftName = left.name?.trim().toLowerCase() ?? "";
  const rightName = right.name?.trim().toLowerCase() ?? "";
  if (leftName && rightName) return leftName === rightName;
  return (left.id ?? "") === (right.id ?? "");
}

function sameSlotRequest(
  leftSlot: ParentCatalogSlotRequest | null | undefined,
  rightSlot: ParentCatalogSlotRequest | null | undefined,
): boolean {
  const left = normalizeSlotRequest(leftSlot);
  const right = normalizeSlotRequest(rightSlot);
  return sameCatalogChoice(left.firstChoice, right.firstChoice) && sameCatalogChoice(left.secondChoice, right.secondChoice);
}

export function normalizeParentCatalogRequests(requests: ParentCatalogRequests | null | undefined): ParentCatalogRequests {
  return normalizeRequests(requests);
}

export function changedParentCatalogRequests(
  draftRequests: ParentCatalogRequests | null | undefined,
  baseRequests: ParentCatalogRequests | null | undefined,
): ParentCatalogRequests | null {
  const draft = normalizeRequests(draftRequests);
  const base = normalizeRequests(baseRequests);
  const changed = normalizeRequests(null);
  let changedCount = 0;

  CATALOG_SLOT_IDS.forEach((slotId) => {
    if (hasSlotChoice(draft[slotId]) && !sameSlotRequest(draft[slotId], base[slotId])) {
      changed[slotId] = draft[slotId];
      changedCount += 1;
    }
  });

  return changedCount ? changed : null;
}

export function changedParentCatalogChoiceRequests(
  draftRequests: ParentCatalogRequests | null | undefined,
  baseRequests: ParentCatalogRequests | null | undefined,
): ParentCatalogRequests | null {
  const draft = normalizeRequests(draftRequests);
  const base = normalizeRequests(baseRequests);
  const changed = normalizeRequests(null);
  let changedCount = 0;

  CATALOG_SLOT_IDS.forEach((slotId) => {
    const firstChoice = normalizeChoice(draft[slotId].firstChoice);
    const secondChoice = normalizeChoice(draft[slotId].secondChoice);
    if (firstChoice && !sameCatalogChoice(firstChoice, base[slotId].firstChoice)) {
      changed[slotId].firstChoice = firstChoice;
      changedCount += 1;
    }
    if (secondChoice && !sameCatalogChoice(secondChoice, base[slotId].secondChoice)) {
      changed[slotId].secondChoice = secondChoice;
      changedCount += 1;
    }
  });

  return changedCount ? changed : null;
}

export function mergeParentCatalogRequests(
  baseRequests: ParentCatalogRequests | null | undefined,
  overlayRequests: ParentCatalogRequests | null | undefined,
): ParentCatalogRequests {
  const base = normalizeRequests(baseRequests);
  const overlay = normalizeRequests(overlayRequests);
  return CATALOG_SLOT_IDS.reduce((next, slotId) => {
    next[slotId] = hasSlotChoice(overlay[slotId]) ? overlay[slotId] : base[slotId];
    return next;
  }, {} as ParentCatalogRequests);
}

export function mergeParentCatalogChoiceRequests(
  baseRequests: ParentCatalogRequests | null | undefined,
  overlayRequests: ParentCatalogRequests | null | undefined,
): ParentCatalogRequests {
  const base = normalizeRequests(baseRequests);
  const overlay = normalizeRequests(overlayRequests);
  return CATALOG_SLOT_IDS.reduce((next, slotId) => {
    next[slotId] = {
      firstChoice: overlay[slotId].firstChoice ?? base[slotId].firstChoice,
      secondChoice: overlay[slotId].secondChoice ?? base[slotId].secondChoice,
    };
    return next;
  }, {} as ParentCatalogRequests);
}

export function readParentCatalogSnapshot(): {
  requests: ParentCatalogRequests | null;
  submittedAt: string | null;
  state: "draft" | "submitted" | null;
  reviewStatuses: LocalReviewStatuses;
  studentId?: string;
  studentName?: string;
  parentName?: string;
};
export function readParentCatalogSnapshot(identity: Pick<ParentCatalogIdentity, "studentId" | "studentName">): {
  requests: ParentCatalogRequests | null;
  submittedAt: string | null;
  state: "draft" | "submitted" | null;
  reviewStatuses: LocalReviewStatuses;
  studentId?: string;
  studentName?: string;
  parentName?: string;
};
export function readParentCatalogSnapshot(identity?: Pick<ParentCatalogIdentity, "studentId" | "studentName">): {
  requests: ParentCatalogRequests | null;
  submittedAt: string | null;
  state: "draft" | "submitted" | null;
  reviewStatuses: LocalReviewStatuses;
  studentId?: string;
  studentName?: string;
  parentName?: string;
} {
  if (typeof window === "undefined") {
    return { requests: null, submittedAt: null, state: null, reviewStatuses: {} };
  }

  try {
    const draftRaw = window.sessionStorage.getItem(PARENT_CATALOG_PENDING_KEY);
    window.sessionStorage.removeItem(LEGACY_PARENT_CATALOG_SUBMITTED_KEY);
    window.sessionStorage.removeItem(LEGACY_PARENT_CATALOG_REVIEW_STATUS_KEY);
    const draft = draftRaw
      ? (JSON.parse(draftRaw) as { requests?: unknown; submittedAt?: string } & ParentCatalogIdentity)
      : null;
    const matchesStudent = (parsed: ParentCatalogIdentity | null) => {
      if (!identity?.studentId) return true;
      if (!parsed) return false;
      return parsed.studentId ? parsed.studentId === identity.studentId : parsed.studentName === identity.studentName;
    };
    const parsed = matchesStudent(draft) ? draft : null;
    if (!parsed) {
      return { requests: null, submittedAt: null, state: null, reviewStatuses: {} };
    }
    return {
      requests: parsed?.requests ? normalizeRequests(parsed.requests) : null,
      submittedAt: null,
      state: "draft",
      reviewStatuses: {},
      studentId: parsed?.studentId,
      studentName: parsed?.studentName,
      parentName: parsed?.parentName,
    };
  } catch {
    return { requests: null, submittedAt: null, state: null, reviewStatuses: {} };
  }
}

export function writePendingParentCatalogRequests(
  requests: ParentCatalogRequests,
  identity: ParentCatalogIdentity = {},
) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PARENT_CATALOG_PENDING_KEY, JSON.stringify({ requests: normalizeRequests(requests), ...identity }));
  dispatchParentCatalogUpdated();
}

export function clearPendingParentCatalogRequests(identity: Pick<ParentCatalogIdentity, "studentId"> = {}) {
  if (typeof window === "undefined") return;
  if (identity.studentId) {
    try {
      const raw = window.sessionStorage.getItem(PARENT_CATALOG_PENDING_KEY);
      const parsed = raw ? (JSON.parse(raw) as ParentCatalogIdentity) : null;
      if (parsed?.studentId && parsed.studentId !== identity.studentId) return;
    } catch {
      return;
    }
  }
  window.sessionStorage.removeItem(PARENT_CATALOG_PENDING_KEY);
  dispatchParentCatalogUpdated();
}

export function clearSubmittedParentCatalogSnapshot(identity: Pick<ParentCatalogIdentity, "studentId"> = {}) {
  void identity;
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(LEGACY_PARENT_CATALOG_SUBMITTED_KEY);
  window.sessionStorage.removeItem(LEGACY_PARENT_CATALOG_REVIEW_STATUS_KEY);
  dispatchParentCatalogUpdated();
}

function requestSlotId(row: EnrichmentRequestRow): CatalogSlotId | null {
  const block = row.block.trim().toLowerCase();
  const level = row.level.trim().toLowerCase();
  return CATALOG_SLOT_IDS.find((slotId) => {
    const meta = CATALOG_SLOT_META[slotId];
    const metaBlock = meta.block.toLowerCase();
    const metaLevel = meta.level.toLowerCase();
    return (
      (metaBlock === block && metaLevel === level) ||
      meta.title.toLowerCase() === block ||
      meta.label.toLowerCase() === block ||
      (block.includes(`block ${metaBlock.replace("b", "")}`) && block.includes(`day ${metaLevel}`))
    );
  }) ?? null;
}

function requestChoiceKind(row: EnrichmentRequestRow): "firstChoice" | "secondChoice" {
  return row.option.trim().toLowerCase().startsWith("2") ? "secondChoice" : "firstChoice";
}

function reviewStatusPriority(status: LocalReviewStatus): number {
  if (status === "Pending") return 4;
  if (status === "Waitlisted") return 3;
  if (status === "Approved") return 2;
  return 1;
}

function shouldReplaceCatalogChoice(
  currentStatus: LocalReviewStatus | undefined,
  nextStatus: LocalReviewStatus,
): boolean {
  if (!currentStatus) return true;
  return reviewStatusPriority(nextStatus) > reviewStatusPriority(currentStatus);
}

export function catalogSnapshotFromEnrichmentRequests(
  rows: EnrichmentRequestRow[],
  studentId?: string,
): {
  requests: ParentCatalogRequests | null;
  reviewStatuses: LocalReviewStatuses;
  state: "submitted" | null;
} {
  const next = normalizeRequests(null);
  const reviewStatuses: LocalReviewStatuses = {};
  let count = 0;

  rows.forEach((row) => {
    if (studentId && row.studentId && row.studentId !== studentId) return;
    const slotId = requestSlotId(row);
    if (!slotId) return;
    const kind = requestChoiceKind(row);
    const classId = row.classId ?? "";
    const name = row.class.trim();
    if (!classId && !name) return;

    const reviewKey = localReviewKey(slotId, kind === "firstChoice" ? "first" : "second");
    if (!shouldReplaceCatalogChoice(reviewStatuses[reviewKey], row.status)) return;

    next[slotId] = {
      ...next[slotId],
      [kind]: { id: classId, name },
    };
    reviewStatuses[reviewKey] = row.status;
    count += 1;
  });

  return {
    requests: count > 0 ? next : null,
    reviewStatuses,
    state: count > 0 ? "submitted" : null,
  };
}

export function catalogChoiceReviews(
  requests: ParentCatalogRequests | null,
  reviewStatuses: LocalReviewStatuses,
): LocalCatalogChoiceReview[] {
  if (!requests) return [];
  const normalizedRequests = normalizeRequests(requests);
  const rows: LocalCatalogChoiceReview[] = [];
  CATALOG_SLOT_IDS.forEach((slotId) => {
    const slot = normalizedRequests[slotId];
    const meta = CATALOG_SLOT_META[slotId];
    const toReview = (
      kind: "first" | "second",
      choice: ParentCatalogChoice | null | undefined,
    ): LocalCatalogChoiceReview | null => {
      if (!choice?.name) return null;
      const id = localReviewKey(slotId, kind);
      const review: LocalCatalogChoiceReview = {
        id,
        slotId,
        slot: meta.label,
        choice: kind === "first" ? "1st" : "2nd",
        kind,
        name: choice.name,
        status: reviewStatuses[id] ?? "Pending",
      };
      if (choice.id) review.classId = choice.id;
      return review;
    };
    const slotRows = [
      toReview("first", slot?.firstChoice),
      toReview("second", slot?.secondChoice),
    ].filter((row): row is LocalCatalogChoiceReview => row !== null);
    rows.push(...slotRows);
  });
  return rows;
}

function mergedParentCatalogScheduleBadgeOverrides(
  baseRequests: ParentCatalogRequests | null,
  baseReviewStatuses: LocalReviewStatuses,
  baseState: "submitted" | null,
  draftRequests: ParentCatalogRequests | null,
): ParentScheduleBadges {
  const visibleBaseRequests = normalizeRequests(baseRequests);
  const normalizedDraftRequests = normalizeRequests(draftRequests);

  CATALOG_SLOT_IDS.forEach((slotId) => {
    if (normalizedDraftRequests[slotId].firstChoice?.id || normalizedDraftRequests[slotId].firstChoice?.name) {
      visibleBaseRequests[slotId].firstChoice = null;
    }
    if (normalizedDraftRequests[slotId].secondChoice?.id || normalizedDraftRequests[slotId].secondChoice?.name) {
      visibleBaseRequests[slotId].secondChoice = null;
    }
  });

  const baseBadges = catalogScheduleBadgeOverrides(visibleBaseRequests, baseReviewStatuses, baseState);
  const draftBadges = catalogScheduleBadgeOverrides(normalizedDraftRequests, {}, draftRequests ? "draft" : null);
  const mergedBadges: ParentScheduleBadges = { ...baseBadges };

  Object.entries(draftBadges).forEach(([slot, badges]) => {
    mergedBadges[slot as keyof ParentScheduleBadges] = [
      ...(mergedBadges[slot as keyof ParentScheduleBadges] ?? []),
      ...badges,
    ];
  });

  return mergedBadges;
}

export function hasParentCatalogChoices(requests: ParentCatalogRequests): boolean {
  return Object.values(normalizeRequests(requests)).some((slot) => Boolean(
    slot.firstChoice?.id ||
      slot.firstChoice?.name ||
      slot.secondChoice?.id ||
      slot.secondChoice?.name,
  ));
}

export function parentCatalogRequestsForChoice(
  requests: ParentCatalogRequests | null | undefined,
  slotId: CatalogSlotId,
  choiceKind: ParentCatalogChoiceKind,
): ParentCatalogRequests | null {
  const normalized = normalizeRequests(requests);
  const choice = normalizeChoice(normalized[slotId][choiceKind]);
  if (!choice?.id && !choice?.name) return null;
  return {
    ...normalizeRequests(null),
    [slotId]: {
      firstChoice: choiceKind === "firstChoice" ? choice : null,
      secondChoice: choiceKind === "secondChoice" ? choice : null,
    },
  };
}

export function parentCatalogRequestsForSlot(
  requests: ParentCatalogRequests | null | undefined,
  slotId: CatalogSlotId,
): ParentCatalogRequests | null {
  const normalized = normalizeRequests(requests);
  if (!hasSlotChoice(normalized[slotId])) return null;
  return {
    ...normalizeRequests(null),
    [slotId]: normalized[slotId],
  };
}

export function remainingParentCatalogDraftAfterSubmit(
  draftRequests: ParentCatalogRequests | null | undefined,
  submittedRequests: ParentCatalogRequests | null | undefined,
  nextBaseRequests: ParentCatalogRequests | null | undefined,
): ParentCatalogRequests | null {
  const draft = normalizeRequests(draftRequests);
  const submitted = normalizeRequests(submittedRequests);
  const base = normalizeRequests(nextBaseRequests);
  const nextDraft = normalizeRequests(draft);

  CATALOG_SLOT_IDS.forEach((slotId) => {
    if (submitted[slotId].firstChoice?.id || submitted[slotId].firstChoice?.name) {
      nextDraft[slotId].firstChoice = null;
    }
    if (submitted[slotId].secondChoice?.id || submitted[slotId].secondChoice?.name) {
      nextDraft[slotId].secondChoice = null;
    }
    if (sameCatalogChoice(nextDraft[slotId].firstChoice, base[slotId].firstChoice)) {
      nextDraft[slotId].firstChoice = null;
    }
    if (sameCatalogChoice(nextDraft[slotId].secondChoice, base[slotId].secondChoice)) {
      nextDraft[slotId].secondChoice = null;
    }
  });

  return changedParentCatalogChoiceRequests(nextDraft, nextBaseRequests);
}

export function selectedChoicesForSubmit(requests: ParentCatalogRequests) {
  return (Object.entries(normalizeRequests(requests)) as [CatalogSlotId, ParentCatalogSlotRequest][]).flatMap(([slotId, slot]) => {
    const meta = CATALOG_SLOT_META[slotId];
    return [
      slot.firstChoice ? { classId: slot.firstChoice.id ?? "", block: meta.block, level: meta.level, option: "1st" } : null,
      slot.secondChoice ? { classId: slot.secondChoice.id ?? "", block: meta.block, level: meta.level, option: "2nd" } : null,
    ].filter((choice): choice is { classId: string; block: string; level: string; option: string } => Boolean(choice?.classId));
  });
}
