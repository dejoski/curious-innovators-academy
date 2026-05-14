"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { PARENT_CATALOG_PENDING_KEY } from "@/lib/parent-dashboard-storage";
import { getParentDemoStudent } from "@/lib/parent-student-profile-demo";
import { photoUploadUnavailableToast } from "@/lib/product-copy";

const imgEllipse2735 = "/images/anna-lee-avatar.png";
const imgGroup1 = "/images/icon-group1.svg";
const imgLine10 = "/images/icon-divider-students.svg";
const imgMaskGroup = "/images/mask-group.svg";
const imgGroup2 = "/images/icon-group2.svg";
const imgVector3 = "/images/icon-filter-funnel.svg";
const imgVuesaxLinearClipboardText = "/images/icon-clipboard-text.svg";
const imgHistoryLine = "/images/icon-history-line.svg";
const imgRiParentLine = "/images/icon-parent.svg";
const imgVuesaxOutlineCalendar = "/images/icon-calendar-outline.svg";
const imgCaretDown = "/images/icon-caret-down-fine.svg";

const URGENCY_OPTIONS = ["Urgent", "All"] as const;

type UrgencyFilter = (typeof URGENCY_OPTIONS)[number];

type HistoryEntry = {
  id: string;
  urgent: boolean;
  scope: "Academic Coordination" | "Student Life Coordinator";
  name: string;
  roleLabel: string;
  date: string;
  time: string;
  body: React.ReactNode;
};

const HISTORY_ENTRIES: HistoryEntry[] = [
  {
    id: "1",
    urgent: true,
    scope: "Academic Coordination",
    name: "Mr. Mendes",
    roleLabel: "(Academic Coordination)",
    date: "02/08/2026",
    time: "16:35 PM",
    body: (
      <>
        <div className="content-stretch flex flex-col gap-[12px] items-start not-italic relative shrink-0 text-[#2f2f2d] text-[12px] w-full">
          <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0 w-full">
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.5]">Dear Mrs. Mary Lee,</p>
            <div className="font-['Inter:Regular',sans-serif] font-normal leading-[0] whitespace-pre-wrap w-full">
              <p className="leading-[1.5] mb-0">I hope this message finds you well.</p>
              <p className="leading-[1.5] mb-0">&#8203;</p>
              <p className="leading-[1.5] mb-0">
                I am writing to remind you that the enrollment deadline for Ana Lee to select her Enrichment classes is approaching quickly.
              </p>
              <p className="leading-[1.5] mb-0">&#8203;</p>
              <p>
                <span className="leading-[1.5]">
                  Our records indicate that her activity choices have not yet been submitted. To ensure that Ana secures a spot in her preferred courses before they reach full capacity, we kindly request that the selection be completed no later than{" "}
                </span>
                <span className="font-['Inter:Bold',sans-serif] font-bold leading-[1.5]">March 12th.</span>
              </p>
            </div>
          </div>
          <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0 w-full">
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold leading-[1.5]">Key Information:</p>
            <ul className="font-['Inter:Regular',sans-serif] font-normal leading-[0] list-disc w-full">
              <li className="mb-0 ms-[18px]">
                <span className="leading-[1.5]">Deadline: March 12th, 2026.</span>
              </li>
              <li className="ms-[18px]">
                <span className="leading-[1.5]">Procedure: Selections must be made through the student portal.</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
          <div className="content-stretch flex flex-col items-start relative shrink-0 w-full">
            <div className="font-['Inter:Regular',sans-serif] font-normal leading-[0] w-full">
              <p className="leading-[1.5] mb-0">If you have already completed this process or require any assistance regarding the available options, please do not hesitate to contact me.</p>
              <p className="leading-[1.5]">Best regards,</p>
            </div>
          </div>
        </div>
      </>
    ),
  },
  {
    id: "2",
    urgent: false,
    scope: "Student Life Coordinator",
    name: "Mr. Drummond",
    roleLabel: "(Student Life Coordinator)",
    date: "02/02/2026",
    time: "10:35 AM",
    body: (
      <div className="content-stretch flex flex-col gap-[12px] items-start leading-[1.5] not-italic relative shrink-0 text-[#2f2f2d] text-[12px] w-full">
        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0 w-full">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold">Incident Log</p>
          <p className="font-['Inter:Regular',sans-serif] font-normal">
            At 10:15 AM, Ana Lee reported to the coordination office feeling unwell, complaining of abdominal pain and slight dizziness. After resting in the infirmary with no significant improvement, her family was contacted.
          </p>
        </div>
        <div className="content-stretch flex flex-col gap-[2px] items-start relative shrink-0 w-full">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold">Outcome:</p>
          <p className="font-['Inter:Regular',sans-serif] font-normal">
            The student&apos;s father, Mr. [Father&apos;s Name], arrived at 11:00 AM to pick her up early. The student was released following the signing of the early dismissal form. The coordination advised the family to keep the school updated should there be a need for an extended absence.
          </p>
        </div>
      </div>
    ),
  },
];

function countCatalogPendingSlots(raw: string | null): number | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as {
      requests?: Record<string, { firstChoice?: { name?: string } | null }>;
    };
    const slots = data.requests ?? {};
    return Object.values(slots).filter((s) => s?.firstChoice != null).length;
  } catch {
    return null;
  }
}

function ParentStudentsProfileContent() {
  const searchParams = useSearchParams();
  const studentId = searchParams.get("student") ?? "anna";
  const student = getParentDemoStudent(studentId);

  const [urgency, setUrgency] = useState<UrgencyFilter>("Urgent");
  const [pendingSlots, setPendingSlots] = useState<number>(2);
  const [photoBanner, setPhotoBanner] = useState<string | null>(null);

  useEffect(() => {
    function refreshPending() {
      if (typeof window === "undefined") return;
      try {
        const raw = window.sessionStorage.getItem(PARENT_CATALOG_PENDING_KEY);
        const n = countCatalogPendingSlots(raw);
        if (n != null) setPendingSlots(n);
      } catch {
        /* ignore */
      }
    }
    refreshPending();
    window.addEventListener("cia-parent-catalog-updated", refreshPending);
    return () => window.removeEventListener("cia-parent-catalog-updated", refreshPending);
  }, []);

  useEffect(() => {
    if (!photoBanner) return;
    const t = window.setTimeout(() => setPhotoBanner(null), 4000);
    return () => window.clearTimeout(t);
  }, [photoBanner]);

  const visibleHistory = useMemo(() => HISTORY_ENTRIES, []);

  return (
    <div className="mx-auto flex w-full max-w-[1104px] flex-col pb-6 pt-8 font-['Inter:Regular',sans-serif]">
      <div className="flex w-[503px] max-w-full flex-col gap-1" style={{ marginBottom: "23px" }}>
        <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[28px] leading-[1.1]">
          Student Profile
        </h1>
        <p className="font-['Inter:Regular',sans-serif] font-normal text-[#666d80] text-[16px] leading-[1.4]">
          View your child’s profile and current class schedule.
        </p>
      </div>

      {photoBanner && (
        <div className="rounded-xl border border-[#14c1d5]/35 bg-[#f6fcfd] px-4 py-3 text-sm text-[#0d0d12]" role="status">
          {photoBanner}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row">
        <div
          className="flex flex-col rounded-[16px] border border-[#f0f0f0] bg-white p-6"
          style={{ width: "100%", maxWidth: "719px", height: "215px" }}
        >
          <div className="flex flex-col gap-6 md:flex-row md:gap-[22px]">
            <div className="relative shrink-0 w-24 h-24 md:w-[102px] md:h-[102px]">
              <img alt={student.avatarAlt} className="absolute inset-0 w-full h-full rounded-full object-cover" src={imgEllipse2735} />
              <button
                type="button"
                onClick={() => setPhotoBanner(photoUploadUnavailableToast())}
                className="absolute bottom-0 right-0 bg-[#14c1d5] border border-[rgba(20,193,213,0.2)] flex items-center justify-center p-[3px] rounded-[36px] w-[18px] h-[18px]"
                aria-label="Edit profile photo"
              >
                <img alt="" className="w-[10px] h-[10px]" src={imgGroup1} />
              </button>
            </div>

            <div className="flex flex-col gap-[6px] md:w-[547px]">
              <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-xl whitespace-nowrap">
                {student.profileCardName}
              </h2>

              <div className="flex flex-col gap-[12px] text-[14px] leading-[1.2] text-[#0d0d12] whitespace-nowrap">
                <div className="flex items-baseline gap-[6px]">
                  <span className="font-['Inter:Regular',sans-serif] shrink-0">Age:</span>
                  <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] shrink-0">{student.ageLabel}</span>
                </div>
                <div className="flex flex-col gap-[12px]">
                  <div className="flex items-baseline gap-[6px]">
                    <span className="font-['Inter:Regular',sans-serif] shrink-0">Level:</span>
                    <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] shrink-0">{student.level}</span>
                  </div>
                  <div className="flex items-baseline gap-[6px]">
                    <span className="font-['Inter:Regular',sans-serif] shrink-0">Learning Profile:</span>
                    <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] shrink-0">{student.learningProfile}</span>
                  </div>
                  <div className="flex items-baseline gap-[6px]">
                    <span className="font-['Inter:Regular',sans-serif] shrink-0">Strengths:</span>
                    <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] shrink-0">{student.strengths}</span>
                  </div>
                  <div className="flex items-baseline gap-[6px]">
                    <span className="font-['Inter:Regular',sans-serif] shrink-0">Support Notes:</span>
                    <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] shrink-0">{student.supportNotes}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="flex shrink-0 flex-col rounded-[16px] border border-[#f0f0f0] bg-white p-6"
          style={{ width: "100%", maxWidth: "353px", height: "215px" }}
        >
          <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-base">
            Schedule Summary
          </h2>
          <div className="mt-[11px] flex h-px items-center justify-center w-[305px]">
            <div className="flex-none rotate-[-0.19deg]">
              <div className="h-0 relative w-[305.002px]">
                <img alt="Divider" className="absolute inset-[-1px_0_0_0] max-w-none size-full" src={imgLine10} />
              </div>
            </div>
          </div>

          <div className="mt-[10px] flex w-[305px] flex-col gap-[10px]">
            <div className="flex items-center w-full">
              <div className="flex flex-[1_0_0] items-center justify-between min-w-px">
                <span className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px] leading-[1.4] whitespace-nowrap shrink-0">Core: 2 / 2</span>
                <div className="overflow-clip relative shrink-0 size-[16px]">
                  <div className="absolute inset-[8.33%_8.33%_8.34%_8.33%]">
                    <img alt="Check" className="absolute inset-[-3.75%] max-w-none size-full" src={imgMaskGroup} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center w-full">
              <div className="flex flex-[1_0_0] items-center justify-between min-w-px">
                <span className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px] leading-[1.4] whitespace-nowrap shrink-0">Enrichment: 4 / 6</span>
                <div className="overflow-clip relative shrink-0 size-[16px]">
                  <div className="absolute inset-[9.38%]">
                    <img alt="" className="absolute inset-[-3.85%] max-w-none size-full" src={imgGroup2} />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center w-full">
              <div className="flex flex-[1_0_0] items-center justify-between min-w-px">
                <span className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px] leading-[1.4] whitespace-nowrap shrink-0">
                  Pending Requests: {pendingSlots}
                </span>
                <div className="overflow-clip relative shrink-0 size-[16px]">
                  <div className="absolute inset-[9.38%]">
                    <img alt="" className="absolute inset-[-3.85%] max-w-none size-full" src={imgGroup2} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-[10px] flex items-center w-full">
            <div className="flex flex-[1_0_0] items-center min-w-px">
              <span className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px] leading-[1.4] whitespace-nowrap shrink-0">
                Attendance: 98%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col rounded-[12px]" style={{ marginTop: "30px" }}>
        <div className="flex justify-between items-center py-3">
          <h2 className="font-semibold text-[#05080b] text-sm">History</h2>

          <div className="flex items-center gap-[10px]">
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setUrgency(opt)}
                className={`bg-white border border-[#dfe1e7] rounded-[8px] p-[8px] flex items-center gap-[4px] text-[#4b4d4f] ${
                  opt === "Urgent" ? "w-[98px]" : "w-[73px]"
                }`}
                aria-label={`Filter history by ${opt.toLowerCase()}`}
                aria-pressed={urgency === opt}
              >
                <div className="flex items-center pr-[2px] py-[2px]">
                  <img alt="" className="size-[14px]" src={imgVector3} />
                </div>
                <div className="flex items-center px-[2px]">
                  <span className="font-['Inter:Medium',sans-serif] font-medium text-[#4b4d4f] text-[12px] leading-none tracking-[0.12px]">
                    {opt}
                  </span>
                </div>
                <div className="flex items-center py-[2px]">
                  <img alt="" className="size-[14px]" src={imgCaretDown} />
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="relative mt-4 flex flex-col gap-4">
          {visibleHistory.map((entry) => (
            <div key={entry.id} className="relative z-10 flex items-start gap-6">
              <div className="relative flex shrink-0 flex-col items-center self-stretch">
                <div className="flex size-[44px] items-center justify-center rounded-[42px] bg-[#f6fcfd]">
                  <img alt="" className="size-[22px]" src={imgVuesaxLinearClipboardText} />
                </div>
                <div aria-hidden className="absolute left-[22px] top-[44px] h-[604px] w-0">
                  <img alt="" className="absolute inset-[0_-1.5px] max-w-none size-full" src={imgHistoryLine} />
                </div>
              </div>

              <div
                className="w-full rounded-[10px] border border-[#dfe1e7] bg-white p-4 flex flex-col gap-8"
                style={{ height: entry.id === "1" ? "348px" : "208px" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex flex-[1_0_0] min-w-px items-center gap-[16px]">
                    <div className="flex items-center gap-[8px]">
                      <img alt="" className="size-[18px]" src={imgRiParentLine} />
                      <span className="font-['Inter:Medium',sans-serif] font-medium text-[14px] leading-[1.4] text-[#2f2f2d] whitespace-nowrap">{entry.name}</span>
                    </div>
                    <span className="font-['Inter:Medium',sans-serif] font-medium text-[12px] leading-[1.5] text-[#4b4d4f] whitespace-nowrap">{entry.roleLabel}</span>
                    {entry.urgent ? (
                      <div className="rounded-[6px] border border-[rgba(216,5,9,0.5)] bg-[#ffd9d9] px-[8px] py-[2px]">
                        <span className="font-['Inter:Regular',sans-serif] text-[10px] leading-[1.4] text-[#d80509] whitespace-nowrap">Urgent</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-[1_0_0] min-w-px items-center justify-end">
                    <div className="flex items-center gap-[4px]">
                      <img alt="" className="size-[14px] shrink-0" src={imgVuesaxOutlineCalendar} />
                      <span className="font-['Inter:Medium',sans-serif] font-medium text-[12px] leading-[1.3] tracking-[-0.12px] text-[#625f6e] whitespace-nowrap shrink-0">{entry.date}</span>
                      <span className="font-['Inter:Medium',sans-serif] font-medium text-[12px] leading-[1.3] tracking-[-0.12px] text-[#625f6e] whitespace-nowrap shrink-0">-</span>
                      <span className="font-['Inter:Medium',sans-serif] font-medium text-[12px] leading-[1.3] tracking-[-0.12px] text-[#625f6e] whitespace-nowrap shrink-0">{entry.time}</span>
                    </div>
                  </div>
                </div>

                {entry.body}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ParentStudentsProfile() {
  return (
    <Suspense
      fallback={
        <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 text-sm text-[#666d80]">
          Loading profile…
        </div>
      }
    >
      <ParentStudentsProfileContent />
    </Suspense>
  );
}
