"use client";

import React, { useState } from "react";
import Link from "next/link";
import { PARENT_CATALOG_PENDING_KEY } from "@/lib/parent-dashboard-storage";

const imgImage1 = "https://www.figma.com/api/mcp/asset/8c883a17-0b3c-4ac9-b3b1-f91036c351f0";
const imgGroup = "https://www.figma.com/api/mcp/asset/9677da71-4681-473e-9037-df50df844ea3";
const imgChevronDown = "https://www.figma.com/api/mcp/asset/9bf6a4a7-ed8d-4d52-aff9-cb8a25963f83";

type EnrichmentClass = {
  id: string;
  name: string;
  teacher: string;
  description: string;
  prerequisites: string;
};

const DUMMY_CLASSES: EnrichmentClass[] = [
  {
    id: "c1",
    name: "Digital Storytelling & Animation",
    teacher: "Ms. Adams",
    description: "Learn how to craft compelling stories and animate them using industry-standard software.",
    prerequisites: "None",
  },
  {
    id: "c2",
    name: "Health Sciences Lab",
    teacher: "Mr. Brown",
    description: "Hands-on experiments focusing on human biology and health sciences.",
    prerequisites: "Intro to Biology",
  },
  {
    id: "c3",
    name: "Robotics 101",
    teacher: "Mrs. Clark",
    description: "Build and program your own robots to complete various challenges.",
    prerequisites: "None",
  },
  {
    id: "c4",
    name: "Advanced Art",
    teacher: "Ms. Davis",
    description: "Explore various art mediums including painting, sculpture, and digital art.",
    prerequisites: "Art I",
  },
];

type SlotRequests = {
  firstChoice: EnrichmentClass | null;
  secondChoice: EnrichmentClass | null;
};

export default function ParentClassesEnrichmentCatalog() {
  const [requests, setRequests] = useState<Record<string, SlotRequests>>({
    block3_day3: { firstChoice: null, secondChoice: null },
    block4_day3: { firstChoice: null, secondChoice: null },
  });

  const [activeSlot, setActiveSlot] = useState<string | null>(null);
  const [activeClass, setActiveClass] = useState<EnrichmentClass | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const openCatalog = (slotId: string) => {
    if (submitted) return;
    setActiveSlot(slotId);
  };

  const closeModals = () => {
    setActiveSlot(null);
    setActiveClass(null);
  };

  const openClassDetails = (cls: EnrichmentClass) => {
    setActiveClass(cls);
  };

  const handleSelectChoice = (choiceLevel: "firstChoice" | "secondChoice") => {
    if (activeSlot && activeClass) {
      setRequests((prev) => ({
        ...prev,
        [activeSlot]: {
          ...prev[activeSlot],
          [choiceLevel]: activeClass,
        },
      }));
      closeModals();
    }
  };

  const handleSubmit = () => {
    setSubmitted(true);
    try {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(
          PARENT_CATALOG_PENDING_KEY,
          JSON.stringify({
            submittedAt: new Date().toISOString(),
            requests,
          })
        );
        window.dispatchEvent(new Event("cia-parent-catalog-updated"));
      }
    } catch {
      /* ignore quota / privacy mode */
    }
  };

  return (
    <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 flex flex-col gap-6 font-sans">
      {/* Page title + submit */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 w-full">
        <div className="flex flex-col gap-1 items-start">
          <h1 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[28px] leading-[1.1]">
            Class Selection
          </h1>
          <p className="font-['Inter:Regular',sans-serif] font-normal text-[#666d80] text-[16px] leading-[1.4] max-w-[720px]">
            Pick enrichment classes for your available blocks. You can select a first and second preference.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitted}
          className={`shrink-0 self-start sm:self-center px-6 py-3 rounded-lg font-semibold text-white transition-colors ${
            submitted ? "bg-green-600 cursor-not-allowed" : "bg-[#14c1d5] hover:bg-[#11a9ba]"
          }`}
        >
          {submitted ? "Selections Submitted" : "Submit Selections"}
        </button>
      </div>

      {submitted && (
        <div
          role="status"
          className="rounded-[18px] border border-[rgba(207,165,0,0.45)] bg-[rgba(207,165,0,0.12)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        >
          <p className="text-[#272932] text-[15px] leading-snug">
            Your enrichment choices were submitted and are <strong>pending admin approval</strong>. You’ll see updates on your student’s enrichment list once reviewed.
          </p>
          <div className="flex flex-wrap gap-3 shrink-0">
            <Link
              href="/dashboard/parents/classes/enrichment"
              className="inline-flex items-center justify-center rounded-lg bg-[#14c1d5] hover:bg-[#11a9ba] text-white text-sm font-semibold px-4 py-2 transition-colors"
            >
              View enrichment classes
            </Link>
            <Link
              href="/dashboard/parents/students"
              className="inline-flex items-center justify-center rounded-lg border-2 border-[#14c1d5] text-[#14c1d5] hover:bg-[#f6fcfd] text-sm font-semibold px-4 py-2 transition-colors"
            >
              Student profile
            </Link>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-[10px] items-center">
        <div className="flex gap-[6px] items-center">
          <div className="bg-[#d2f1f5] border border-[#14c1d5] rounded-[4px] size-[17px]" />
          <span className="text-[#0d0d12] text-[12px]">Core (School assigned)</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[rgba(0,77,8,0.2)] border border-[#004d08] rounded-[4px] size-[17px]" />
          <span className="text-[#0d0d12] text-[12px]">Enrichment approved</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[#ffd9d9] border border-[#d80509] rounded-[4px] size-[17px]" />
          <span className="text-[#0d0d12] text-[12px]">Enrichment pending</span>
        </div>
        <div className="flex gap-[6px] items-center">
          <div className="bg-[#fafafa] border border-[#f0f0f0] rounded-[4px] size-[17px]" />
          <span className="text-[#0d0d12] text-[12px]">Empty</span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {/* Schedule Grid */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex-1 overflow-x-auto shadow-sm">
          <div className="min-w-[600px]">
            {/* Header Row */}
            <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
              <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-tl-[8px] h-[65px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[12px] leading-[1.29]">90 minutes</span>
                <span className="text-[#625f6e] text-[12px] leading-[1.29]">per block</span>
              </div>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[65px] flex flex-col items-center justify-center">
                <span className="text-[#020204] text-[12px]">Day</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px]">1</span>
              </div>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[65px] flex flex-col items-center justify-center">
                <span className="text-[#020204] text-[12px]">Day</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px]">2</span>
              </div>
              <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-tr-[8px] h-[65px] flex flex-col items-center justify-center">
                <span className="text-[#020204] text-[12px]">Day</span>
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px]">3</span>
              </div>
            </div>

            {/* Block 1 */}
            <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">Block 1</span>
                <span className="text-[#625f6e] text-[12px]">7:00 - 8:30 am</span>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="bg-[#d2f1f5] rounded-[4px] h-full p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">School assigned</span>
                  <span className="text-[#0d0d12] text-[10px]">Math</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="bg-[#d2f1f5] rounded-[4px] h-full p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">School assigned</span>
                  <span className="text-[#0d0d12] text-[10px]">Math</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="bg-[#d2f1f5] rounded-[4px] h-full p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">School assigned</span>
                  <span className="text-[#0d0d12] text-[10px]">Math</span>
                </div>
              </div>
            </div>

            {/* Block 2 */}
            <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">Block 2</span>
                <span className="text-[#625f6e] text-[12px]">8:40 - 10:10 am</span>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="bg-[#d2f1f5] rounded-[4px] h-full p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">School assigned</span>
                  <span className="text-[#0d0d12] text-[10px]">ELA - Core</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="bg-[#d2f1f5] rounded-[4px] h-full p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">School assigned</span>
                  <span className="text-[#0d0d12] text-[10px]">ELA - Core</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="bg-[#d2f1f5] rounded-[4px] h-full p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">School assigned</span>
                  <span className="text-[#0d0d12] text-[10px]">ELA - Core</span>
                </div>
              </div>
            </div>

            {/* Block 3 */}
            <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
              <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">Block 3</span>
                <span className="text-[#625f6e] text-[12px]">10:20 - 11:50 am</span>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="bg-[rgba(0,77,8,0.2)] rounded-[4px] h-full p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">Enric. Approved</span>
                  <span className="text-[#0d0d12] text-[10px] truncate">Economics & Financial Literacy</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                <div className="bg-[rgba(0,77,8,0.2)] rounded-[4px] h-full p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">Enric. Approved</span>
                  <span className="text-[#0d0d12] text-[10px] truncate">Ocean Explorers</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
                {requests.block3_day3.firstChoice ? (
                  submitted ? (
                    <div className="bg-[#ffd9d9] border border-[#d80509] rounded-[4px] h-full p-1 flex flex-col justify-center">
                      <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">Request pending</span>
                      <span className="text-[#0d0d12] text-[10px] truncate">1st: {requests.block3_day3.firstChoice.name}</span>
                      {requests.block3_day3.secondChoice && (
                        <span className="text-[#0d0d12] text-[9px] truncate">2nd: {requests.block3_day3.secondChoice.name}</span>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => openCatalog("block3_day3")}
                      className="bg-yellow-100 border border-yellow-400 rounded-[4px] h-full p-1 flex flex-col justify-center cursor-pointer hover:bg-yellow-200 transition-colors"
                    >
                      <span className="font-bold text-yellow-800 text-[10px]">1st: {requests.block3_day3.firstChoice.name}</span>
                      {requests.block3_day3.secondChoice && (
                        <span className="text-yellow-700 text-[9px] truncate">2nd: {requests.block3_day3.secondChoice.name}</span>
                      )}
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={submitted}
                    onClick={() => openCatalog("block3_day3")}
                    className="bg-[#f9fafb] border border-dashed border-[#d1d5db] rounded-[4px] w-full h-full flex flex-col justify-center items-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">+ Choose class</span>
                    <span className="text-[#0d0d12] text-[10px]">Available slot</span>
                  </button>
                )}
              </div>
            </div>

            {/* Block 4 */}
            <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
              <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-bl-[8px] h-[95px] flex flex-col justify-center px-4">
                <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">Block 4</span>
                <span className="text-[#625f6e] text-[12px]">12:30 - 2:00 pm</span>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[95px] p-1 flex flex-col gap-1">
                <div className="bg-[#ffd9d9] rounded-[4px] shrink-0 flex-1 min-h-0 p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">Enric. Pending</span>
                  <span className="text-[#0d0d12] text-[10px] truncate">Force & Motion</span>
                </div>
                <div className="bg-[#ffd9d9] rounded-[4px] shrink-0 flex-1 min-h-0 p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">Enric. Pending</span>
                  <span className="text-[#0d0d12] text-[10px] truncate">Digital Storytelling & Animation</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] h-[95px] p-1">
                <div className="bg-[rgba(0,77,8,0.2)] rounded-[4px] h-[83px] p-1 flex flex-col justify-center">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">Enric. Approved</span>
                  <span className="text-[#0d0d12] text-[10px] truncate">Health Sciences Lab</span>
                </div>
              </div>
              <div className="bg-white border border-[#f0f0f0] rounded-br-[8px] h-[95px] p-1">
                {requests.block4_day3.firstChoice ? (
                  submitted ? (
                    <div className="bg-[#ffd9d9] border border-[#d80509] rounded-[4px] h-[83px] p-1 flex flex-col justify-center">
                      <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">Request pending</span>
                      <span className="text-[#0d0d12] text-[10px] truncate">1st: {requests.block4_day3.firstChoice.name}</span>
                      {requests.block4_day3.secondChoice && (
                        <span className="text-[#0d0d12] text-[9px] truncate">2nd: {requests.block4_day3.secondChoice.name}</span>
                      )}
                    </div>
                  ) : (
                    <div
                      onClick={() => openCatalog("block4_day3")}
                      className="bg-yellow-100 border border-yellow-400 rounded-[4px] h-[83px] p-1 flex flex-col justify-center cursor-pointer hover:bg-yellow-200 transition-colors"
                    >
                      <span className="font-bold text-yellow-800 text-[10px]">1st: {requests.block4_day3.firstChoice.name}</span>
                      {requests.block4_day3.secondChoice && (
                        <span className="text-yellow-700 text-[9px] truncate">2nd: {requests.block4_day3.secondChoice.name}</span>
                      )}
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    disabled={submitted}
                    onClick={() => openCatalog("block4_day3")}
                    className="bg-[#f9fafb] border border-dashed border-[#d1d5db] rounded-[4px] w-full h-[83px] flex flex-col justify-center items-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                  >
                    <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">+ Choose class</span>
                    <span className="text-[#0d0d12] text-[10px]">Available slot</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* How it works sidebar */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 w-full lg:w-[400px] shrink-0 flex flex-col gap-6 shadow-sm">
          <h2 className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[16px]">
            How it works
          </h2>

          <div className="flex flex-col gap-6 relative">
            <div className="absolute left-[15px] top-[16px] bottom-[16px] w-px bg-gray-200" />

            <div className="flex gap-4 items-start relative z-10">
              <div className="bg-[#f6fcfd] rounded-full size-[32px] flex items-center justify-center shrink-0 border-2 border-white">
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#14c1d5] text-[14px]">1</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] text-[14px]">Choose classes for each available block</p>
                <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[12px]">Browse the available enrichment classes and select one option for each open block in your child’s schedule.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start relative z-10">
              <div className="bg-[#f6fcfd] rounded-full size-[32px] flex items-center justify-center shrink-0 border-2 border-white">
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#14c1d5] text-[14px]">2</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] text-[14px]">Select a 1st and 2nd preference if possible</p>
                <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[12px]">Choosing a second preference helps the school place your child in another option if the first choice becomes full.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start relative z-10">
              <div className="bg-[#f6fcfd] rounded-full size-[32px] flex items-center justify-center shrink-0 border-2 border-white">
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#14c1d5] text-[14px]">3</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] text-[14px]">The school reviews and confirms placements</p>
                <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[12px]">After submission, the school team reviews all requests and assigns students based on availability and scheduling.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start relative z-10">
              <div className="bg-[#f6fcfd] rounded-full size-[32px] flex items-center justify-center shrink-0 border-2 border-white">
                <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#14c1d5] text-[14px]">4</span>
              </div>
              <div className="flex flex-col gap-1">
                <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#666d80] text-[14px]">Approved classes will appear in the schedule</p>
                <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[12px]">Once confirmed, the approved enrichment classes will automatically be added to your child’s weekly schedule.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Banners */}
      <div className="flex flex-col gap-4 w-full">
        <div className="bg-[#f6fcfd] border border-[#d2f1f5] rounded-[18px] p-4 flex items-center gap-4 shadow-sm">
          <div className="bg-[#d2f1f5] rounded-[10px] size-[40px] flex items-center justify-center shrink-0">
            <img alt="Info" className="size-[24px]" src={imgImage1} />
          </div>
          <div className="flex flex-col gap-1 w-full">
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">Enrichment Selection Deadline</p>
            <p className="font-['Inter:Regular',sans-serif] text-[#272932] text-[14px]">
              Please remember to submit your child’s enrichment class requests before the school’s deadline.<br />
              Submitting on time helps the school organize class groups and ensures your child has the best chance of getting their preferred classes.
            </p>
          </div>
        </div>

        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-4">
            <div className="bg-[rgba(207,165,0,0.2)] rounded-[10px] size-[40px] flex items-center justify-center shrink-0">
              <img alt="Info" className="size-[24px]" src={imgGroup} />
            </div>
            <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px] max-w-[700px]">
              Enrichment classes allow students to explore interests beyond core subjects such as arts, technology, entrepreneurship and science.
            </p>
          </div>
          <Link
            href="/dashboard/parents/students"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity shrink-0"
          >
            <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#272932] text-[16px]">View profile</span>
            <img alt="" className="size-[18px] -rotate-90" src={imgChevronDown} />
          </Link>
        </div>
      </div>

      {/* Catalog Modal */}
      {activeSlot && !activeClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[18px] w-full max-w-3xl max-h-[80vh] overflow-y-auto p-6 shadow-xl relative">
            <button
              onClick={closeModals}
              className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold text-xl"
            >
              ×
            </button>
            <h2 className="text-2xl font-bold text-[#272932] mb-6">Available Enrichment Classes</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {DUMMY_CLASSES.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => openClassDetails(cls)}
                  className="border border-[#f0f0f0] rounded-xl p-4 hover:border-[#14c1d5] hover:shadow-md cursor-pointer transition-all"
                >
                  <h3 className="font-semibold text-lg text-[#0d0d12]">{cls.name}</h3>
                  <p className="text-sm text-gray-500 mb-2">Teacher: {cls.teacher}</p>
                  <p className="text-sm text-[#666d80] line-clamp-2">{cls.description}</p>
                  <div className="mt-4 flex justify-end">
                    <span className="text-[#14c1d5] font-semibold text-sm">View Details &rarr;</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Class Details Modal */}
      {activeClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-[18px] w-full max-w-xl p-6 shadow-xl relative">
            <button
              onClick={() => setActiveClass(null)}
              className="absolute top-4 right-4 text-gray-500 hover:text-black font-bold text-xl"
            >
              ×
            </button>
            <button
              onClick={() => setActiveClass(null)}
              className="text-sm text-[#14c1d5] hover:underline mb-4 inline-block"
            >
              &larr; Back to Catalog
            </button>
            
            <h2 className="text-2xl font-bold text-[#272932] mb-2">{activeClass.name}</h2>
            <p className="text-md text-gray-600 mb-4">Teacher: {activeClass.teacher}</p>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-800 mb-1">Description</h4>
              <p className="text-sm text-gray-700 mb-4">{activeClass.description}</p>
              
              <h4 className="font-semibold text-gray-800 mb-1">Prerequisites</h4>
              <p className="text-sm text-gray-700">{activeClass.prerequisites}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => handleSelectChoice("firstChoice")}
                className="flex-1 bg-[#14c1d5] hover:bg-[#11a9ba] text-white py-3 rounded-lg font-semibold transition-colors"
              >
                Select as 1st Choice
              </button>
              <button
                onClick={() => handleSelectChoice("secondChoice")}
                className="flex-1 bg-white border-2 border-[#14c1d5] text-[#14c1d5] hover:bg-blue-50 py-3 rounded-lg font-semibold transition-colors"
              >
                Select as 2nd Choice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
