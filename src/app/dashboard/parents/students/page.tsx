"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { PARENT_CATALOG_PENDING_KEY } from "@/lib/parent-dashboard-storage";
import { getParentDemoStudent } from "@/lib/parent-student-profile-demo";
import { photoUploadUnavailableToast } from "@/lib/product-copy";

const imgEllipse2735 = "/images/icon-generic.svg";
const imgGroup1 = "/images/icon-group1.svg";
const imgLine10 = "/images/icon-generic.svg";
const imgMaskGroup = "/images/mask-group.png";
const imgGroup2 = "/images/icon-group2.svg";
const imgVector3 = "/images/icon-generic.svg";
const imgVuesaxLinearClipboardText = "/images/icon-generic.svg";
const imgRiParentLine = "/images/icon-generic.svg";
const imgVuesaxOutlineCalendar = "/images/icon-generic.svg";

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
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Dear Mrs. Mary Lee,</p>
          <p>I hope this message finds you well.</p>
          <p>
            I am writing to remind you that the enrollment deadline for Anna Lee to select her Enrichment classes is approaching quickly.
          </p>
          <p>
            Our records indicate that her activity choices have not yet been submitted. To ensure that Anna secures a spot in her preferred courses before they reach full capacity, we kindly request that the selection be completed no later than{" "}
            <span className="font-bold">March 12th.</span>
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Key Information:</p>
          <ul className="list-disc ml-5 flex flex-col gap-1">
            <li>Deadline: March 12th, 2026.</li>
            <li>Procedure: Selections must be made through the student portal.</li>
          </ul>
        </div>
        <div className="flex flex-col gap-1">
          <p>If you have already completed this process or require any assistance regarding the available options, please do not hesitate to contact me.</p>
          <p>Best regards,</p>
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
      <>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Incident Log</p>
          <p>
            At 10:15 AM, Anna Lee reported to the coordination office feeling unwell, complaining of abdominal pain and slight dizziness. After resting in the infirmary with no significant improvement, her family was contacted.
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="font-semibold">Outcome:</p>
          <p>
            The student&apos;s father, Mr. [Father&apos;s Name], arrived at 11:00 AM to pick her up early. The student was released following the signing of the early dismissal form. The coordination advised the family to keep the school updated should there be a need for an extended absence.
          </p>
        </div>
      </>
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

  const visibleHistory = useMemo(() => {
    return HISTORY_ENTRIES.filter((entry) => {
      if (urgency === "Urgent" && !entry.urgent) return false;
      return true;
    });
  }, [urgency]);

  return (
    <div className="flex flex-col gap-8 w-full max-w-[1104px] mx-auto p-6 md:p-8">
      <div className="flex flex-col gap-1">
        <h1 className="font-bold text-[#272932] text-2xl md:text-[28px]">
          Student Profile
        </h1>
        <p className="font-normal text-[#666d80] text-base">
          View your child&apos;s profile and current class schedule.
        </p>
      </div>

      {photoBanner && (
        <div className="rounded-xl border border-[#14c1d5]/35 bg-[#f6fcfd] px-4 py-3 text-sm text-[#0d0d12]" role="status">
          {photoBanner}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#f0f0f0] flex flex-col p-6 rounded-[16px]">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="relative shrink-0 w-24 h-24 md:w-[102px] md:h-[102px]">
              <img alt={student.avatarAlt} className="absolute inset-0 w-full h-full rounded-full object-cover" src={imgEllipse2735} />
              <button
                type="button"
                onClick={() => setPhotoBanner(photoUploadUnavailableToast())}
                className="absolute bottom-0 right-0 bg-[#14c1d5] border border-[rgba(20,193,213,0.2)] flex items-center justify-center p-1 rounded-full w-5 h-5"
                aria-label="Edit profile photo"
              >
                <img alt="" className="w-3 h-3" src={imgGroup1} />
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <h2 className="font-semibold text-[#0d0d12] text-xl">
                {student.profileCardName}
              </h2>

              <div className="flex flex-col gap-3 text-sm">
                <div className="flex gap-2 items-baseline">
                  <span className="text-[#0d0d12]">Age:</span>
                  <span className="font-semibold text-[#666d80]">{student.ageLabel}</span>
                </div>
                <div className="flex gap-2 items-baseline">
                  <span className="text-[#0d0d12]">Level:</span>
                  <span className="font-semibold text-[#666d80]">{student.level}</span>
                </div>
                <div className="flex gap-2 items-baseline">
                  <span className="text-[#0d0d12]">Learning Profile:</span>
                  <span className="font-semibold text-[#666d80]">{student.learningProfile}</span>
                </div>
                <div className="flex gap-2 items-baseline">
                  <span className="text-[#0d0d12]">Strengths:</span>
                  <span className="font-semibold text-[#666d80]">{student.strengths}</span>
                </div>
                <div className="flex gap-2 items-baseline">
                  <span className="text-[#0d0d12]">Support Notes:</span>
                  <span className="font-semibold text-[#666d80]">{student.supportNotes}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-[#f0f0f0] flex flex-col gap-4 p-6 rounded-[16px]">
          <h2 className="font-semibold text-[#272932] text-base">
            Schedule Summary
          </h2>
          <img alt="Divider" className="w-full h-px object-cover" src={imgLine10} />

          <div className="flex flex-col gap-3 w-full">
            <div className="flex justify-between items-center w-full">
              <span className="font-medium text-[#666d80] text-base">Core: 2 / 2</span>
              <img alt="Check" className="w-4 h-4" src={imgMaskGroup} />
            </div>
            <Link
              href="/dashboard/parents/classes/enrichment"
              className="flex justify-between items-center w-full rounded-lg px-1 -mx-1 py-1 hover:bg-[#fafafa] transition-colors"
            >
              <span className="font-medium text-[#666d80] text-base">Enrichment: 4 / 6</span>
              <div className="flex items-center gap-2">
                <img alt="" className="w-4 h-4" src={imgGroup2} />
                <span className="text-xs font-semibold text-[#14c1d5] whitespace-nowrap">View →</span>
              </div>
            </Link>
            <Link
              href="/dashboard/parents/catalog"
              className="flex justify-between items-center w-full rounded-lg px-1 -mx-1 py-1 hover:bg-[#fafafa] transition-colors"
            >
              <span className="font-medium text-[#666d80] text-base">
                Pending Requests: {pendingSlots}
              </span>
              <span className="text-xs font-semibold text-[#14c1d5]">View catalog →</span>
            </Link>
          </div>

          <div className="mt-2">
            <span className="font-medium text-[#666d80] text-base">Attendance: 98%</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col rounded-xl w-full mt-2">
        <div className="flex justify-between items-center py-3">
          <h2 className="font-semibold text-[#05080b] text-sm">History</h2>

          <div
            className="inline-flex items-center rounded-lg border border-[#dfe1e7] bg-[#fafafa] p-0.5 gap-0.5"
            role="group"
            aria-label="Filter history by urgency"
          >
            {URGENCY_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setUrgency(opt)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  urgency === opt
                    ? "bg-white text-[#0d0d12] shadow-sm ring-1 ring-black/[0.06]"
                    : "text-[#4b4d4f] hover:bg-white/80"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-6 mt-4 relative">
          {visibleHistory.length === 0 ? (
            <p className="text-sm text-[#666d80] py-6">No history entries match these filters.</p>
          ) : (
            visibleHistory.map((entry, index) => (
              <div key={entry.id} className="flex gap-4 md:gap-6 items-start relative z-10">
                <div className="flex flex-col items-center shrink-0">
                  <div className="bg-[#f6fcfd] flex items-center justify-center rounded-full w-11 h-11 z-10 shadow-sm border border-white">
                    <img alt="" className="w-5 h-5" src={imgVuesaxLinearClipboardText} />
                  </div>
                  {index < visibleHistory.length - 1 && (
                    <div className="w-px grow min-h-[24px] bg-gray-200" />
                  )}
                </div>

                <div className="bg-white border border-[#dfe1e7] flex flex-col gap-6 p-4 md:p-6 rounded-xl w-full">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-3 items-center">
                      <div className="flex gap-2 items-center">
                        <img alt="" className="w-4 h-4" src={imgRiParentLine} />
                        <span className="font-medium text-[#2f2f2d] text-sm">{entry.name}</span>
                      </div>
                      <span className="font-medium text-[#4b4d4f] text-xs">{entry.roleLabel}</span>
                      {entry.urgent && (
                        <div className="bg-[#ffd9d9] border border-[rgba(216,5,9,0.5)] px-2 py-1 rounded-md">
                          <span className="text-[#d80509] text-[10px]">Urgent</span>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1 items-center text-[#625f6e] text-xs font-medium">
                      <img alt="" className="w-4 h-4 mr-1" src={imgVuesaxOutlineCalendar} />
                      <span>{entry.date}</span>
                      <span>-</span>
                      <span>{entry.time}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 text-[#2f2f2d] text-xs leading-relaxed">{entry.body}</div>
                </div>
              </div>
            ))
          )}
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
