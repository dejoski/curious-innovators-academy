import {
  PARENT_CATALOG_PENDING_KEY,
  PARENT_CATALOG_REVIEW_STATUS_KEY,
  PARENT_CATALOG_SUBMITTED_KEY,
} from "@/lib/parent-dashboard-storage";
import { CATALOG_SLOT_META, type CatalogSlotId } from "@/lib/schedule-slots";
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

export type LocalReviewStatus = "Pending" | "Approved" | "Rejected";
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

export const INITIAL_PARENT_CATALOG_REQUESTS: ParentCatalogRequests = {
  block3_day3: { firstChoice: null, secondChoice: null },
  block4_day3: { firstChoice: null, secondChoice: null },
};

export function localReviewKey(slotId: CatalogSlotId, kind: "first" | "second") {
  return `local-${slotId}-${kind}`;
}

export function dispatchParentCatalogUpdated() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("cia-parent-catalog-updated"));
}

function normalizeRequests(raw: unknown): ParentCatalogRequests {
  const value = raw && typeof raw === "object" ? (raw as Partial<ParentCatalogRequests>) : {};
  return {
    block3_day3: value.block3_day3 ?? INITIAL_PARENT_CATALOG_REQUESTS.block3_day3,
    block4_day3: value.block4_day3 ?? INITIAL_PARENT_CATALOG_REQUESTS.block4_day3,
  };
}

export function readLocalReviewStatuses(): LocalReviewStatuses {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(PARENT_CATALOG_REVIEW_STATUS_KEY);
    return raw ? (JSON.parse(raw) as LocalReviewStatuses) : {};
  } catch {
    return {};
  }
}

export function writeLocalReviewStatus(id: string, status: LocalReviewStatus) {
  if (typeof window === "undefined") return;
  const reviewStatuses = readLocalReviewStatuses();
  window.sessionStorage.setItem(
    PARENT_CATALOG_REVIEW_STATUS_KEY,
    JSON.stringify({ ...reviewStatuses, [id]: status }),
  );
  dispatchParentCatalogUpdated();
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
export function readParentCatalogSnapshot(identity?: Pick<ParentCatalogIdentity, "studentId">): {
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
    const submittedRaw = window.sessionStorage.getItem(PARENT_CATALOG_SUBMITTED_KEY);
    const draftRaw = window.sessionStorage.getItem(PARENT_CATALOG_PENDING_KEY);
    const raw = submittedRaw ?? draftRaw;
    const parsed = raw
      ? (JSON.parse(raw) as { requests?: unknown; submittedAt?: string } & ParentCatalogIdentity)
      : null;
    if (identity?.studentId && parsed?.studentId !== identity.studentId) {
      return { requests: null, submittedAt: null, state: null, reviewStatuses: {} };
    }
    return {
      requests: parsed?.requests ? normalizeRequests(parsed.requests) : null,
      submittedAt: parsed?.submittedAt ?? null,
      state: submittedRaw ? "submitted" : draftRaw ? "draft" : null,
      reviewStatuses: readLocalReviewStatuses(),
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
  window.sessionStorage.setItem(PARENT_CATALOG_PENDING_KEY, JSON.stringify({ requests, ...identity }));
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
  if (typeof window === "undefined") return;
  if (identity.studentId) {
    try {
      const raw = window.sessionStorage.getItem(PARENT_CATALOG_SUBMITTED_KEY);
      const parsed = raw ? (JSON.parse(raw) as ParentCatalogIdentity) : null;
      if (parsed?.studentId && parsed.studentId !== identity.studentId) return;
    } catch {
      return;
    }
  }
  window.sessionStorage.removeItem(PARENT_CATALOG_SUBMITTED_KEY);
  window.sessionStorage.removeItem(PARENT_CATALOG_REVIEW_STATUS_KEY);
  dispatchParentCatalogUpdated();
}

export function writeSubmittedParentCatalogSnapshot(
  requests: ParentCatalogRequests,
  identity: ParentCatalogIdentity = {},
) {
  if (typeof window === "undefined") return null;
  const submittedAt = new Date().toISOString();
  window.sessionStorage.removeItem(PARENT_CATALOG_REVIEW_STATUS_KEY);
  window.sessionStorage.setItem(PARENT_CATALOG_SUBMITTED_KEY, JSON.stringify({ requests, submittedAt, ...identity }));
  dispatchParentCatalogUpdated();
  return submittedAt;
}

export function catalogChoiceReviews(
  requests: ParentCatalogRequests | null,
  reviewStatuses: LocalReviewStatuses,
): LocalCatalogChoiceReview[] {
  if (!requests) return [];
  const rows: LocalCatalogChoiceReview[] = [];
  (Object.keys(CATALOG_SLOT_META) as CatalogSlotId[]).forEach((slotId) => {
    const slot = requests[slotId];
    const meta = CATALOG_SLOT_META[slotId];
    const add = (kind: "first" | "second", choice: ParentCatalogChoice | null | undefined) => {
      if (!choice?.name) return;
      const id = localReviewKey(slotId, kind);
      rows.push({
        id,
        slotId,
        slot: meta.label,
        choice: kind === "first" ? "1st" : "2nd",
        kind,
        name: choice.name,
        classId: choice.id,
        status: reviewStatuses[id] ?? "Pending",
      });
    };
    add("first", slot?.firstChoice);
    add("second", slot?.secondChoice);
  });
  return rows;
}

export function catalogBadgesForSlot(
  requests: ParentCatalogRequests | null,
  slotId: CatalogSlotId,
  reviewStatuses: LocalReviewStatuses,
  state: "draft" | "submitted" | null = "submitted",
): StudentScheduleBadge[] {
  const slot = requests?.[slotId];
  const rows = catalogChoiceReviews({ ...INITIAL_PARENT_CATALOG_REQUESTS, [slotId]: slot ?? {} }, reviewStatuses)
    .filter((row) => row.slotId === slotId);
  return rows.map((row) => ({
    label: row.status === "Rejected" ? `${row.choice === "2nd" ? "Rejected 2nd" : "Rejected"}: ${row.name}` : row.choice === "2nd" ? `2nd: ${row.name}` : row.name,
    tone: state === "draft" ? "draft" : row.status === "Approved" ? "approved" : "pending",
  }));
}

export function hasParentCatalogChoices(requests: ParentCatalogRequests): boolean {
  return Object.values(requests).some((slot) => Boolean(slot.firstChoice?.id || slot.firstChoice?.name || slot.secondChoice?.id || slot.secondChoice?.name));
}

export function selectedChoicesForSubmit(requests: ParentCatalogRequests) {
  return (Object.entries(requests) as [CatalogSlotId, ParentCatalogSlotRequest][]).flatMap(([slotId, slot]) => {
    const meta = CATALOG_SLOT_META[slotId];
    return [
      slot.firstChoice ? { classId: slot.firstChoice.id ?? "", block: meta.block, level: meta.level, option: "1st" } : null,
      slot.secondChoice ? { classId: slot.secondChoice.id ?? "", block: meta.block, level: meta.level, option: "2nd" } : null,
    ].filter((choice): choice is { classId: string; block: string; level: string; option: string } => Boolean(choice?.classId));
  });
}

export function localRequestRowsFromCatalogRequests(
  requests: ParentCatalogRequests | null,
  reviewStatuses: LocalReviewStatuses,
  identity: ParentCatalogIdentity = {},
): EnrichmentRequestRow[] {
  return catalogChoiceReviews(requests, reviewStatuses).map((choice) => ({
    id: choice.id,
    student: identity.studentName ?? "",
    parent: identity.parentName ?? "",
    class: choice.name,
    block: CATALOG_SLOT_META[choice.slotId].block,
    level: CATALOG_SLOT_META[choice.slotId].level,
    option: choice.choice,
    status: choice.status,
  }));
}
