"use client";

import type { ReactNode } from "react";

import type { LocalCatalogChoiceReview, LocalReviewStatus } from "@/lib/parent-catalog-state";

export type ParentCatalogRequestState = "draft" | "submitted" | null;

function reviewPillClasses(status: LocalReviewStatus): string {
  if (status === "Approved") return "border-[#004d08]/35 bg-[#004d08]/15 text-[#004d08]";
  if (status === "Waitlisted") return "border-[#cfa500]/45 bg-[#fff8e6] text-[#7a5b00]";
  if (status === "Rejected") return "border-[#d80509]/35 bg-[#ffd9d9] text-[#d80509]";
  return "border-[#cfa500]/45 bg-[#fff8e6] text-[#7a5b00]";
}

function reviewPillLabel(status: LocalReviewStatus, state: ParentCatalogRequestState): string {
  return state === "draft" ? "Draft" : status;
}

function bannerTone(state: ParentCatalogRequestState, choices: LocalCatalogChoiceReview[]) {
  const pending = choices.filter((choice) => choice.status === "Pending").length;
  const approved = choices.filter((choice) => choice.status === "Approved").length;
  const waitlisted = choices.filter((choice) => choice.status === "Waitlisted").length;
  const rejected = choices.filter((choice) => choice.status === "Rejected").length;

  if (state === "draft") return "draft";
  if (rejected && !pending && !approved && !waitlisted) return "rejected";
  if (approved && !pending && !rejected && !waitlisted) return "approved";
  if (approved || rejected || waitlisted) return "mixed";
  return "pending";
}

function bannerClasses(tone: string) {
  if (tone === "approved") return "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]";
  if (tone === "rejected") return "border-[#d80509]/30 bg-[#fff5f5] text-[#a00408]";
  if (tone === "mixed") return "border-[#cfa500]/40 bg-[#fff8e6] text-[#7a5b00]";
  return "border-[#14c1d5]/30 bg-[#ecfdff] text-[#155e66]";
}

function defaultMessage(state: ParentCatalogRequestState, tone: string) {
  if (state === "draft") return "You have a saved class-selection draft ready to review.";
  if (tone === "approved") return "Your enrichment request has been approved. Approved classes are reflected in the schedule.";
  if (tone === "rejected") return "Your enrichment request was not approved. Review the class selection page to choose another option.";
  if (tone === "mixed") return "Your enrichment request has review updates, including waitlist decisions. Check each class status below.";
  return "Your enrichment request is saved and pending school review.";
}

export function ParentCatalogStatusBanner({
  state,
  choices,
  message,
  actions,
  className = "",
}: {
  state: ParentCatalogRequestState;
  choices: LocalCatalogChoiceReview[];
  message?: string;
  actions?: ReactNode;
  className?: string;
}) {
  if (!state || choices.length === 0) return null;
  const tone = bannerTone(state, choices);

  return (
    <div className={`flex flex-col gap-3 rounded-[8px] border px-4 py-3 text-sm ${bannerClasses(tone)} ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium">{message ?? defaultMessage(state, tone)}</span>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <span
            key={choice.id}
            className={`inline-flex max-w-full items-center gap-1 rounded-[999px] border px-2.5 py-1 text-[11px] font-semibold ${reviewPillClasses(choice.status)}`}
            title={`${choice.slot} ${choice.choice}: ${choice.name}`}
          >
            <span>{reviewPillLabel(choice.status, state)}</span>
            <span className="text-current/70">·</span>
            <span className="truncate">{choice.choice}: {choice.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
