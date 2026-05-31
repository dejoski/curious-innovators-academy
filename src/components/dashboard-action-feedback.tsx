"use client";

import { CheckCircle2, Loader2, XCircle } from "lucide-react";

export type DashboardActionFeedbackState = {
  tone: "loading" | "success" | "error";
  message: string;
} | null;

export function DashboardActionFeedback({ state }: { state: DashboardActionFeedbackState }) {
  if (!state) return null;

  const Icon = state.tone === "loading" ? Loader2 : state.tone === "success" ? CheckCircle2 : XCircle;
  const toneClass =
    state.tone === "success"
      ? "border-[#004d08]/30 bg-[#f3fbf4] text-[#004d08]"
      : state.tone === "error"
        ? "border-[#d80509]/30 bg-[#fff5f5] text-[#a00408]"
        : "border-[#14c1d5]/35 bg-[#ecfdff] text-[#155e66]";

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed right-4 top-4 z-[140] flex max-w-[min(420px,calc(100vw-32px))] items-center gap-3 rounded-[12px] border px-4 py-3 text-sm font-semibold shadow-lg ${toneClass}`}
    >
      <Icon className={`size-5 shrink-0 ${state.tone === "loading" ? "animate-spin" : ""}`} aria-hidden />
      <span>{state.message}</span>
    </div>
  );
}
