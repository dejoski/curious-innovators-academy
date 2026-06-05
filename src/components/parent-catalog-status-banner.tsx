"use client";

import type { ReactNode } from "react";

import type { LocalCatalogChoiceReview, LocalReviewStatus } from "@/lib/parent-catalog-state";

export type ParentCatalogRequestState = "draft" | "submitted" | null;

function reviewPillClasses(status: LocalReviewStatus): string {
  if (status === "Approved") return "border-[#8ccf98] bg-[#f5fbf6] text-[#215c2c]";
  if (status === "Waitlisted") return "border-[#e9d59a] bg-[#fffaf0] text-[#675321]";
  if (status === "Rejected") return "border-[#ebb8b8] bg-[#fff7f7] text-[#8a3434]";
  return "border-[#e9d59a] bg-[#fffaf0] text-[#675321]";
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
  if (tone === "approved") return "border-[#b7dfbf] bg-[#f8fcf9] text-[#235a2d]";
  if (tone === "rejected") return "border-[#efc7c7] bg-[#fff8f8] text-[#873535]";
  if (tone === "mixed") return "border-[#ead9a8] bg-[#fffaf0] text-[#665528]";
  return "border-[#c9e8ec] bg-[#f7fcfd] text-[#235f67]";
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
    <div className={`flex flex-col gap-3 rounded-[12px] border px-4 py-3.5 text-sm shadow-[0_1px_0_rgba(15,23,42,0.03)] ${bannerClasses(tone)} ${className}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium leading-[1.55]">{message ?? defaultMessage(state, tone)}</span>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {choices.map((choice) => (
          <span
            key={choice.id}
            className={`inline-flex max-w-full items-center gap-1 rounded-[999px] border px-2.5 py-1 text-[11px] font-medium ${reviewPillClasses(choice.status)}`}
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
