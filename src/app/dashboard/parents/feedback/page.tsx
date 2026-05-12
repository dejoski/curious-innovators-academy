"use client";

import React, { useEffect, useState } from "react";
import { isDemoLoginUiEnabled, isDemoUiBypassStored } from "@/lib/demo-login";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const imgGroup1 = "/images/feedback-angry-face.svg";
const imgHealthiconsNeutralOutline24Px = "/images/feedback-neutral-face.svg";
const imgGroup2 = "/images/feedback-great-face.svg";
const imgBoxiconsHappyHeartEyes = "/images/feedback-excellent-face.svg";
const imgSolarStarBold = "/images/feedback-star-filled.svg";
const imgSolarStarBold1 = "/images/feedback-star-empty.svg";
const imgFluentPersonFeedback24Regular = "/images/icon-generic.svg"; // TODO: Replace with correct Figma asset if different

type Mood = "angry" | "average" | "great" | "excellent";

const MOOD_SHELL: Record<Mood, { active: string; idle: string }> = {
  angry: {
    idle: "bg-[#fafafa] hover:bg-[#f0f0f0]",
    active: "bg-[#fafafa] ring-2 ring-[#14c1d5]/35",
  },
  average: {
    idle: "bg-[#fafafa] hover:bg-[#f0f0f0]",
    active: "bg-[#fafafa] ring-2 ring-[#14c1d5]/35",
  },
  great: {
    idle: "bg-[#fafafa] hover:bg-[#f0f0f0]",
    active: "bg-[rgba(0,77,8,0.2)] border border-[rgba(0,77,8,0.3)]",
  },
  excellent: {
    idle: "bg-[#fafafa] hover:bg-[#f0f0f0]",
    active: "bg-[#fafafa] ring-2 ring-[#14c1d5]/35",
  },
};

const STAR_ROW_KEYS = ["teaching", "communication", "engagement", "organization"] as const;
const STAR_LABELS: Record<(typeof STAR_ROW_KEYS)[number], string> = {
  teaching: "Teaching Quality",
  communication: "Communication with School",
  engagement: "Student Engagement",
  organization: "Organization & Schedule",
};

const INITIAL_STARS: Record<(typeof STAR_ROW_KEYS)[number], number> = {
  teaching: 3,
  communication: 3,
  engagement: 3,
  organization: 5,
};

const CHIP_DEFS = [
  { id: "great-teachers", label: "Great teachers" },
  { id: "clear-communication", label: "Clear communication" },
  { id: "well-organized", label: "Well-organized schedule" },
  { id: "child-enjoyed", label: "My child enjoyed the classes" },
  { id: "more-support", label: "Needs more academic support" },
  { id: "workload", label: "Too much workload" },
  { id: "schedule-conflicts", label: "Schedule conflicts" },
  { id: "lack-communication", label: "Lack of communication" },
] as const;

const DEFAULT_CHIPS = new Set<string>(["clear-communication", "schedule-conflicts", "lack-communication"]);

const NPS_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

function StarRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="border-[#f0f0f0] border-b flex flex-wrap gap-4 items-center justify-between py-4">
      <span className="font-normal text-[#0d0d12] text-sm sm:text-base">{label}</span>
      <div className="flex gap-2 items-center">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="p-0 border-0 bg-transparent cursor-pointer leading-none"
            aria-label={`${n} stars`}
          >
            <img alt="" className="size-6" src={n <= value ? imgSolarStarBold : imgSolarStarBold1} />
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ParentFeedback() {
  const [mood, setMood] = useState<Mood>("great");
  const [stars, setStars] = useState(INITIAL_STARS);
  const [selectedChips, setSelectedChips] = useState<Set<string>>(() => new Set(DEFAULT_CHIPS));
  const [thoughts, setThoughts] = useState("");
  const [highlight, setHighlight] = useState("");
  const [nps, setNps] = useState<number>(8);
  const [submitted, setSubmitted] = useState(false);
  const [previewUiBypass, setPreviewUiBypass] = useState(false);

  useEffect(() => {
    setPreviewUiBypass(isDemoLoginUiEnabled() && isDemoUiBypassStored());
  }, []);

  const submitThankYouDetail =
    previewUiBypass || !isSupabaseConfigured()
      ? "This preview keeps your responses on this device only until feedback sync is enabled."
      : null;

  const toggleChip = (id: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = () => {
    setSubmitted(true);
    window.setTimeout(() => setSubmitted(false), 8000);
  };

  const resetForm = () => {
    setMood("great");
    setStars({ ...INITIAL_STARS });
    setSelectedChips(new Set(DEFAULT_CHIPS));
    setThoughts("");
    setHighlight("");
    setNps(8);
    setSubmitted(false);
  };

  const moodButton = (m: Mood, icon: string, alt: string, text: string) => {
    const active = mood === m;
    const shell = active ? MOOD_SHELL[m].active : MOOD_SHELL[m].idle;
    const labelClass = active && m === "great" ? "text-[#004d08]" : "text-[#0d0d12]";
    return (
      <button type="button" onClick={() => setMood(m)} className={`${shell} transition-colors flex gap-2 items-center p-2 rounded-lg`}>
        <div className="relative size-6">
          <img alt={alt} className="absolute inset-0 size-full" src={icon} />
        </div>
        <div className="px-1">
          <span className={`font-normal text-xs ${labelClass}`}>{text}</span>
        </div>
      </button>
    );
  };

  return (
    <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 flex flex-col gap-8 font-sans">
      <div className="flex flex-col gap-2 items-start w-full">
        <p className="text-[11px] font-normal uppercase tracking-wide text-[#818898]">
          {previewUiBypass || !isSupabaseConfigured() ? "Preview" : "Feedback"}
        </p>
        <h1 className="font-bold leading-[1.1] text-[#272932] text-[28px]">
          Feedback
        </h1>
        <p className="font-normal leading-[1.4] text-[#666d80] text-[16px]">
          Tell us how things are going — ratings and notes help the school prioritize improvements.
        </p>
      </div>

      {submitThankYouDetail && (
        <div
          className="rounded-[18px] border border-[#d2f1f5] bg-[#f6fcfd] px-5 py-4 text-sm text-[#272932]"
          role="note"
        >
          <span className="font-semibold">Session-only flow:</span> {submitThankYouDetail}
        </div>
      )}

      {submitted && (
        <div
          role="status"
          className="rounded-[18px] border border-[rgba(0,77,8,0.35)] bg-[rgba(0,77,8,0.08)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-[#004d08]"
        >
          <div className="flex flex-col gap-1 font-medium">
            <span>Thank you for your feedback.</span>
          </div>
          <button
            type="button"
            onClick={() => setSubmitted(false)}
            className="text-xs font-semibold uppercase tracking-wide text-[#004d08] underline-offset-2 hover:underline shrink-0 self-start sm:self-center"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="bg-white border border-[#f0f0f0] flex flex-col gap-4 items-start p-6 rounded-[18px] w-full shadow-sm">
        <h2 className="font-bold leading-tight text-[#272932] text-lg sm:text-xl">
          How would you rate your overall experience?
        </h2>
        <div className="flex flex-wrap gap-4 items-center">
          {moodButton("angry", imgGroup1, "Angry", "Angry")}
          {moodButton("average", imgHealthiconsNeutralOutline24Px, "Average", "Average")}
          {moodButton("great", imgGroup2, "Great", "Great")}
          {moodButton("excellent", imgBoxiconsHappyHeartEyes, "Excellent", "Excellent")}
        </div>
      </div>

      <div className="bg-white border border-[#f0f0f0] flex flex-col gap-4 items-start p-6 rounded-[18px] w-full shadow-sm">
          <h2 className="font-bold leading-tight text-[#272932] text-lg sm:text-xl">
            Tell us more
          </h2>

          <div className="flex flex-col w-full max-w-[480px]">
            {STAR_ROW_KEYS.map((key) => (
              <StarRow
                key={key}
                label={STAR_LABELS[key]}
                value={stars[key]}
                onChange={(n) => setStars((s) => ({ ...s, [key]: n }))}
              />
            ))}
          </div>

          <p className="font-normal text-[#666d80] text-xs mt-2">
            Your feedback helps us understand what’s working and what can improve.
          </p>
        </div>

        <div className="bg-white border border-[#f0f0f0] flex flex-col gap-4 items-start p-6 rounded-[18px] w-full shadow-sm">
          <h2 className="font-bold leading-tight text-[#272932] text-lg sm:text-xl">
            What stood out this semester?
          </h2>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-3">
              {CHIP_DEFS.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`px-3 py-2 rounded-lg transition-colors ${selectedChips.has(c.id) ? "bg-[#14c1d5] hover:bg-[#12aebf]" : "bg-[#fafafa] hover:bg-[#f0f0f0]"}`}
                >
                  <span className={`text-xs ${selectedChips.has(c.id) ? "text-white" : "text-[#0d0d12]"}`}>{c.label}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {CHIP_DEFS.slice(3, 5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`px-3 py-2 rounded-lg transition-colors ${selectedChips.has(c.id) ? "bg-[#14c1d5] hover:bg-[#12aebf]" : "bg-[#fafafa] hover:bg-[#f0f0f0]"}`}
                >
                  <span className={`text-xs ${selectedChips.has(c.id) ? "text-white" : "text-[#0d0d12]"}`}>{c.label}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              {CHIP_DEFS.slice(5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`px-3 py-2 rounded-lg transition-colors ${selectedChips.has(c.id) ? "bg-[#14c1d5] hover:bg-[#12aebf]" : "bg-[#fafafa] hover:bg-[#f0f0f0]"}`}
                >
                  <span className={`text-xs ${selectedChips.has(c.id) ? "text-white" : "text-[#0d0d12]"}`}>{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="font-normal text-[#666d80] text-xs">
            Select multiple options
          </p>
        </div>

        <div className="bg-white border border-[#f0f0f0] flex flex-col gap-4 items-start p-6 rounded-[18px] w-full shadow-sm">
          <h2 className="font-bold leading-tight text-[#272932] text-lg sm:text-xl">
            Share your thoughts
          </h2>
          <textarea
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            className="w-full max-w-[824px] h-[150px] p-4 bg-white border border-[#dfe1e7] rounded-lg text-sm sm:text-base text-[#0d0d12] placeholder-[#818898] outline-none focus:border-[#14c1d5] resize-y"
            placeholder="Tell us more about your experience, suggestions, or concerns..."
          />
        </div>

        <div className="bg-white border border-[#f0f0f0] flex flex-col gap-4 items-start p-6 rounded-[18px] w-full shadow-sm">
          <h2 className="font-bold leading-tight text-[#272932] text-lg sm:text-xl">
            Anything you&apos;d like to highlight about your child&apos;s experience?
          </h2>
          <textarea
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            className="w-full max-w-[824px] h-[150px] p-4 bg-white border border-[#dfe1e7] rounded-lg text-sm sm:text-base text-[#0d0d12] placeholder-[#818898] outline-none focus:border-[#14c1d5] resize-y"
            placeholder="Do you feel your child is progressing well?"
          />
        </div>

        <div className="bg-white border border-[#f0f0f0] flex flex-col gap-4 items-start p-6 rounded-[18px] w-full shadow-sm">
          <h2 className="font-bold leading-tight text-[#272932] text-lg sm:text-xl">
            Would you recommend our program to other parents?
          </h2>
          <div className="flex flex-wrap gap-4 items-center">
            <span className="font-normal text-[#0d0d12] text-xs sm:text-sm">Not Likely</span>
            <div className="flex flex-wrap gap-2">
              {NPS_NUMBERS.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNps(num)}
                  className={`transition-colors flex items-center justify-center p-2 rounded-lg min-w-[33px] ${nps === num ? "bg-[#14c1d5] hover:bg-[#12aebf]" : "bg-[#fafafa] hover:bg-[#f0f0f0]"}`}
                >
                  <span className={`text-xs ${nps === num ? "font-semibold text-white" : "text-[#0d0d12]"}`}>{num}</span>
                </button>
              ))}
            </div>
            <span className="font-semibold text-[#14c1d5] px-2 py-1 rounded-lg text-xs sm:text-sm">
              Very likely
            </span>
          </div>
      </div>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 w-full">
        <button
          type="button"
          onClick={resetForm}
          className="border border-[#dfe1e7] hover:bg-[#fafafa] rounded-lg px-6 py-2 w-full sm:w-[180px] h-[42px] flex items-center justify-center transition-colors"
        >
          <span className="font-medium text-[#4b4d4f] text-base">Reset</span>
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="bg-[#14c1d5] hover:bg-[#12aebf] shadow-md hover:shadow-lg transition-all rounded-lg px-6 py-2 w-full sm:w-[180px] h-[42px] flex items-center justify-center"
        >
          <span className="font-medium text-white text-base">Submit</span>
        </button>
      </div>
    </div>
  );
}
