"use client";

import React, { useState } from "react";

const imgGroup1 = "/images/feedback-angry-face.svg";
const imgHealthiconsNeutralOutline24Px = "/images/feedback-neutral-face.svg";
const imgGroup2 = "/images/feedback-great-face.svg";
const imgBoxiconsHappyHeartEyes = "/images/feedback-excellent-face.svg";
const imgSolarStarBold = "/images/feedback-star-filled.svg";
const imgSolarStarBold1 = "/images/feedback-star-empty.svg";
const imgSolarStarBold2 = "/images/feedback-star-mid.svg";

type Mood = "angry" | "average" | "great" | "excellent";

const STAR_ROW_KEYS = ["teaching", "communication", "engagement", "organization"] as const;
const STAR_LABELS: Record<(typeof STAR_ROW_KEYS)[number], string> = {
  teaching: "Teaching Quality",
  communication: "Communication with School",
  engagement: "Student Engagement",
  organization: "Organization & Schedule",
};

const INITIAL_STARS: Record<(typeof STAR_ROW_KEYS)[number], number> = {
  teaching: 3,
  communication: 4,
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
  rowKey,
  label,
  value,
  onChange,
}: {
  rowKey: (typeof STAR_ROW_KEYS)[number];
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex w-full items-center justify-between border-b border-[#f0f0f0] pb-[14px]">
      <span className="font-['Inter:Regular',sans-serif] text-[16px] leading-[1.6] tracking-[-0.32px] text-[#0d0d12]">{label}</span>
      <div className="flex items-center gap-[7px]">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="border-0 bg-transparent p-0 leading-none"
            aria-label={`${n} stars`}
          >
            <img
              alt=""
              className="size-[24px]"
              src={
                rowKey === "communication" && n === 4 && value >= 4
                  ? imgSolarStarBold2
                  : n <= value
                    ? imgSolarStarBold
                    : imgSolarStarBold1
              }
            />
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

  const toggleChip = (id: string) => {
    setSelectedChips((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moodButton = (m: Mood, icon: string, alt: string, text: string) => {
    const active = mood === m;
    const activeClass =
      m === "great" && active
        ? "bg-[rgba(0,77,8,0.2)] text-[#004d08]"
        : "bg-[#fafafa] text-[#0d0d12]";

    return (
      <button
        type="button"
        onClick={() => setMood(m)}
        className={`${activeClass} flex items-center gap-[4px] rounded-[8px] p-[8px] transition-colors`}
      >
        <img alt={alt} className="size-[24px]" src={icon} />
        <span className="px-[2px] font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4]">{text}</span>
      </button>
    );
  };

  return (
    <div
      className="relative mx-auto flex min-h-[1757px] w-full max-w-[1104px] flex-col gap-0 pb-[0px] pt-0 font-['Inter:Regular',sans-serif]"
      style={{ paddingTop: "32px" }}
    >
      <div className="flex w-[503px] max-w-full flex-col gap-[4px]" style={{ marginBottom: "23px" }}>
        <h1 className="font-['Inter:Bold',sans-serif] text-[28px] font-bold leading-[1.1] text-[#272932]">Share Your Feedback</h1>
        <p className="font-['Inter:Regular',sans-serif] text-[16px] leading-[1.4] text-[#666d80]">Help us improve your child&apos;s learning experience this period.</p>
      </div>

      <section className="h-[150px] rounded-[18px] border border-[#f0f0f0] bg-white p-[24px]">
        <div className="flex flex-col gap-[16px]">
          <p className="font-['Inter:Bold',sans-serif] text-[20px] font-bold leading-[1.1] text-[#272932]">How would you rate your overall experience?</p>
          <div className="flex w-[405px] items-center justify-between">
            {moodButton("angry", imgGroup1, "Angry", "Angry")}
            {moodButton("average", imgHealthiconsNeutralOutline24Px, "Average", "Average")}
            {moodButton("great", imgGroup2, "Great", "Great")}
            {moodButton("excellent", imgBoxiconsHappyHeartEyes, "Excellent", "Excellent")}
          </div>
        </div>
      </section>

      <section className="h-[353px] rounded-[18px] border border-[#f0f0f0] bg-white p-[24px]">
        <div className="flex flex-col gap-[16px]">
          <p className="font-['Inter:Bold',sans-serif] text-[20px] font-bold leading-[1.1] text-[#272932]">Tell us more</p>
          <div className="flex w-[480px] flex-col gap-[14px]">
            {STAR_ROW_KEYS.map((key) => (
              <StarRow
                key={key}
                rowKey={key}
                label={STAR_LABELS[key]}
                value={stars[key]}
                onChange={(n) => setStars((s) => ({ ...s, [key]: n }))}
              />
            ))}
          </div>
          <p className="font-['Inter:Regular',sans-serif] text-[12px] leading-[1.6] tracking-[-0.24px] text-[#666d80]">
            Your feedback helps us understand what&apos;s working and what can improve.
          </p>
        </div>
      </section>

      <section className="h-[268px] rounded-[18px] border border-[#f0f0f0] bg-white p-[24px]">
        <div className="flex flex-col gap-[16px]">
          <p className="font-['Inter:Bold',sans-serif] text-[20px] font-bold leading-[1.1] text-[#272932]">What stood out this semester?</p>
          <div className="flex w-[432px] flex-col gap-[12px]">
            <div className="flex items-center gap-[12px]">
              {CHIP_DEFS.slice(0, 3).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`${selectedChips.has(c.id) ? "bg-[#14c1d5] text-white" : "bg-[#fafafa] text-[#0d0d12]"} rounded-[8px] p-[8px]`}
                >
                  <span className="px-[2px] font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4]">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-[12px]">
              {CHIP_DEFS.slice(3, 5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`${selectedChips.has(c.id) ? "bg-[#14c1d5] text-white" : "bg-[#fafafa] text-[#0d0d12]"} rounded-[8px] p-[8px]`}
                >
                  <span className="px-[2px] font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4]">{c.label}</span>
                </button>
              ))}
            </div>
            <div className="flex items-center gap-[12px]">
              {CHIP_DEFS.slice(5).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChip(c.id)}
                  className={`${selectedChips.has(c.id) ? "bg-[#14c1d5] text-white" : "bg-[#fafafa] text-[#0d0d12]"} rounded-[8px] p-[8px]`}
                >
                  <span className="px-[2px] font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4]">{c.label}</span>
                </button>
              ))}
            </div>
          </div>
          <p className="font-['Inter:Regular',sans-serif] text-[12px] leading-[1.6] tracking-[-0.24px] text-[#666d80]">Select multiple options</p>
        </div>
      </section>

      <section className="h-[260px] rounded-[18px] border border-[#f0f0f0] bg-white p-[24px]">
        <div className="flex w-[824px] flex-col gap-[16px]">
          <p className="font-['Inter:Bold',sans-serif] text-[20px] font-bold leading-[1.1] text-[#272932]">Share your thoughts</p>
          <textarea
            value={thoughts}
            onChange={(e) => setThoughts(e.target.value)}
            className="h-[150px] w-full resize-none rounded-[10px] border border-[#dfe1e7] bg-white p-[12px] text-[16px] tracking-[0.32px] text-[#0d0d12] outline-none placeholder:text-[#818898]"
            placeholder="Tell us more about your experience, suggestions, or concerns..."
          />
        </div>
      </section>

      <section className="h-[260px] rounded-[18px] border border-[#f0f0f0] bg-white p-[24px]">
        <div className="flex w-[824px] flex-col gap-[16px]">
          <p className="font-['Inter:Bold',sans-serif] text-[20px] font-bold leading-[1.1] text-[#272932]">Anything you&apos;d like to highlight about your child&apos;s experience?</p>
          <textarea
            value={highlight}
            onChange={(e) => setHighlight(e.target.value)}
            className="h-[150px] w-full resize-none rounded-[10px] border border-[#dfe1e7] bg-white p-[12px] text-[16px] tracking-[0.32px] text-[#0d0d12] outline-none placeholder:text-[#818898]"
            placeholder="Do you feel your child is progressing well?"
          />
        </div>
      </section>

      <section className="h-[151px] rounded-[18px] border border-[#f0f0f0] bg-white p-[24px]">
        <div className="flex flex-col gap-[16px]">
          <p className="font-['Inter:Bold',sans-serif] text-[20px] font-bold leading-[1.1] text-[#272932]">Would you recommend our program to other parents?</p>
          <div className="flex items-center gap-[13px]">
            <span className="rounded-[8px] bg-[#fafafa] p-[8px] font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4] text-[#0d0d12]">Not Likely</span>
            <div className="flex items-center gap-[8px]">
              {NPS_NUMBERS.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setNps(num)}
                  className={`${nps === num ? "bg-[#14c1d5] text-white font-['Inter:Semi_Bold',sans-serif] font-semibold" : "bg-[#fafafa] text-[#0d0d12] font-['Inter:Regular',sans-serif]"} flex w-[33px] items-center justify-center rounded-[8px] p-[8px] text-[12px] leading-[1.4]`}
                >
                  {num}
                </button>
              ))}
            </div>
            <span className="rounded-[8px] bg-[#14c1d5] p-[8px] font-['Inter:Semi_Bold',sans-serif] text-[12px] font-semibold leading-[1.4] text-white">Very likely</span>
          </div>
        </div>
      </section>

      <div className="-mx-[32px] flex h-[114px] items-center justify-end bg-white px-[32px] py-[36px] shadow-[5px_5px_25px_rgba(26,32,44,0.12),0px_8px_25px_rgba(26,32,44,0.06)]">
        <button
          type="button"
          className="flex h-[42px] w-[180px] items-center justify-center rounded-[6px] border border-[#14c1d5] bg-[#14c1d5] px-[16px] py-[8px]"
        >
          <span className="font-['Inter_Tight:Medium',sans-serif] text-[16px] tracking-[0.32px] text-white">Submit</span>
        </button>
      </div>
    </div>
  );
}
