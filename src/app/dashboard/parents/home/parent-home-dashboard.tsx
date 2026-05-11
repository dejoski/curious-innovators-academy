"use client";

import React from "react";
import Link from "next/link";
import { Bell, CalendarDays, ChevronRight } from "lucide-react";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";

const imgHugeiconsStudent1 =
  "https://www.figma.com/api/mcp/asset/477431a3-f100-4cb1-b1d5-08853a8b1e0f";
const imgGroup1 =
  "https://www.figma.com/api/mcp/asset/69658baa-ec93-4b2d-ab9a-8b2546221e28";

function RowArrow() {
  return (
    <div className="bg-[#fafafa] flex items-center justify-center rounded-[8px] p-2 shrink-0">
      <ChevronRight className="size-[14px] text-[#666d80]" aria-hidden strokeWidth={2} />
    </div>
  );
}

type AlertRowProps = {
  title: string;
  body: string;
  href?: string;
};

function AlertRow({ title, body, href }: AlertRowProps) {
  const inner = (
    <div className="flex gap-6 items-center w-full">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#2f2f2d] text-[14px] leading-snug">
          {title}
        </p>
        <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[14px] leading-snug">
          {body}
        </p>
      </div>
      <RowArrow />
    </div>
  );
  if (href) {
    return (
      <Link href={href} className="block w-full hover:opacity-90 transition-opacity">
        {inner}
      </Link>
    );
  }
  return <div className="w-full">{inner}</div>;
}

type QuickRowProps = {
  title: string;
  body: string;
  href: string;
};

function QuickRow({ title, body, href }: QuickRowProps) {
  return (
    <Link
      href={href}
      className="flex flex-col gap-3 w-full hover:opacity-90 transition-opacity"
    >
      <div className="flex gap-6 items-center w-full">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#2f2f2d] text-[14px]">
            {title}
          </p>
          <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[14px] leading-snug">
            {body}
          </p>
        </div>
        <RowArrow />
      </div>
    </Link>
  );
}

function CoreCell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
      <div className="bg-[#d2f1f5] rounded-[4px] h-full p-1.5 flex flex-col justify-center">
        <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-tight">
          {subtitle}
        </span>
        <span className="text-[#0d0d12] text-[10px] leading-tight truncate">{title}</span>
      </div>
    </div>
  );
}

function ApprovedCell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-white border border-[#f0f0f0] h-[52px] p-1">
      <div className="bg-[rgba(0,77,8,0.2)] rounded-[4px] h-full p-1.5 flex flex-col justify-center">
        <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-tight">
          {subtitle}
        </span>
        <span className="text-[#0d0d12] text-[10px] leading-tight truncate">{title}</span>
      </div>
    </div>
  );
}

function DeniedCell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-[#ffd9d9] rounded-[4px] h-[40px] p-1.5 flex flex-col justify-center">
      <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-tight">
        {subtitle}
      </span>
      <span className="text-[#0d0d12] text-[10px] leading-tight truncate">{title}</span>
    </div>
  );
}

function AvailableCell() {
  return (
    <Link
      href="/dashboard/parents/catalog"
      className="bg-white border border-[#f0f0f0] h-[52px] p-1 block hover:border-[#14c1d5]/40 transition-colors"
    >
      <div className="bg-[#f9fafb] rounded-[4px] h-full p-1.5 flex flex-col justify-center border border-dashed border-[#d1d5db]">
        <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">
          + Choose class
        </span>
        <span className="text-[#0d0d12] text-[10px]">Available slot</span>
      </div>
    </Link>
  );
}

function ApprovedTallCell({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="bg-white border border-[#f0f0f0] h-[95px] p-1">
      <div className="bg-[rgba(0,77,8,0.2)] rounded-[4px] h-[83px] p-1.5 flex flex-col justify-center">
        <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px] leading-tight">
          {subtitle}
        </span>
        <span className="text-[#0d0d12] text-[10px] leading-tight truncate">{title}</span>
      </div>
    </div>
  );
}

export default function ParentHomeDashboard() {
  return (
    <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 flex flex-col gap-6 font-sans">
      <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
        <div className="flex-1 min-w-[200px] bg-white border border-[#f0f0f0] rounded-[18px] p-5 flex items-center shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
              <img alt="" className="size-5" src={imgHugeiconsStudent1} />
            </div>
            <p className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[32px] leading-[1.1]">
              89%
            </p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
              Attendance
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-[200px] bg-white border border-[#f0f0f0] rounded-[18px] p-5 flex items-center shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
              <div className="relative size-5 overflow-hidden">
                <div className="absolute inset-[8.33%_16.67%]">
                  <div className="absolute inset-[-4.5%_-5.63%]">
                    <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                  </div>
                </div>
              </div>
            </div>
            <p className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[32px] leading-[1.1]">
              06
            </p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
              Pending requests
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="w-full xl:flex-1 min-w-0 flex flex-col gap-6">
          <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 shadow-sm overflow-x-auto">
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
                <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-tl-[8px] h-[65px] flex flex-col justify-center px-4">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[12px] leading-[1.29]">
                    90 minutes
                  </span>
                  <span className="text-[#625f6e] text-[12px] leading-[1.29]">per block</span>
                </div>
                <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[65px] flex flex-col items-center justify-center">
                  <span className="text-[#020204] text-[12px]">Day</span>
                  <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px]">
                    1
                  </span>
                </div>
                <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[65px] flex flex-col items-center justify-center">
                  <span className="text-[#020204] text-[12px]">Day</span>
                  <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px]">
                    2
                  </span>
                </div>
                <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-tr-[8px] h-[65px] flex flex-col items-center justify-center">
                  <span className="text-[#020204] text-[12px]">Day</span>
                  <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px]">
                    3
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
                <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">
                    Block 1
                  </span>
                  <span className="text-[#625f6e] text-[12px]">7:00 - 8:30 am</span>
                </div>
                <CoreCell title="Math" subtitle="School assigned" />
                <CoreCell title="Math" subtitle="School assigned" />
                <CoreCell title="Math" subtitle="School assigned" />
              </div>

              <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
                <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">
                    Block 2
                  </span>
                  <span className="text-[#625f6e] text-[12px]">8:40 - 10:10 am</span>
                </div>
                <CoreCell title="ELA - Core" subtitle="School assigned" />
                <CoreCell title="ELA - Core" subtitle="School assigned" />
                <CoreCell title="ELA - Core" subtitle="School assigned" />
              </div>

              <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
                <div className="bg-[#f9fafb] border border-[#f0f0f0] h-[52px] flex flex-col justify-center px-4">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">
                    Block 3
                  </span>
                  <span className="text-[#625f6e] text-[12px]">10:20 - 11:50 am</span>
                </div>
                <ApprovedCell
                  title="Economics & Financial Literacy- Enrichment"
                  subtitle="Enric. Approved"
                />
                <ApprovedCell title="Ocean Explorers" subtitle="Enric. Approved" />
                <AvailableCell />
              </div>

              <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2">
                <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-bl-[8px] h-[95px] flex flex-col justify-center px-4">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">
                    Block 4
                  </span>
                  <span className="text-[#625f6e] text-[12px]">12:30 - 2:00 pm</span>
                </div>
                <div className="bg-white border border-[#f0f0f0] h-[95px] p-1 flex flex-col gap-1">
                  <DeniedCell title="Force & Motion" subtitle="Denied" />
                  <DeniedCell title="Digital Storytelling & Animation" subtitle="Denied" />
                </div>
                <ApprovedTallCell title="Health Sciences Lab" subtitle="Enric. Approved" />
                <div className="bg-white border border-[#f0f0f0] rounded-br-[8px] h-[95px] p-1">
                  <Link
                    href="/dashboard/parents/catalog"
                    className="bg-[#f9fafb] rounded-[4px] border border-dashed border-[#d1d5db] h-[83px] p-2 flex flex-col justify-center hover:bg-[#f3f4f6] transition-colors"
                  >
                    <span className="font-['Inter:Bold',sans-serif] font-bold text-[#666d80] text-[10px]">
                      + Choose class
                    </span>
                    <span className="text-[#0d0d12] text-[10px]">Available slot</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full xl:w-[355px] shrink-0 flex flex-col gap-6">
          <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
                <Bell className="size-5 text-[#0d0d12]" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[16px]">
                System Alerts
              </p>
            </div>
            <div className="flex flex-col gap-6">
              <AlertRow
                title="New update available"
                body="You’ve received a new update about the Robotics class."
                href="/dashboard/parents/classes/enrichment"
              />
              <AlertRow
                title="New Message"
                body="Academic Coordination sent you a message"
                href="/dashboard/parents/feedback"
              />
              <AlertRow
                title="Complete your schedule"
                body="You still need to choose 4 classes to complete your schedule."
                href="/dashboard/parents/catalog"
              />
            </div>
          </div>

          <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
                <CalendarDays className="size-5 text-[#0d0d12]" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[16px]">
                Quick Actions
              </p>
            </div>
            <div className="flex flex-col gap-6">
              <QuickRow
                title="View Schedule"
                body="See your child’s daily and weekly schedule."
                href={PARENT_SCHEDULE_HREF}
              />
              <QuickRow
                title="View Profile"
                body="Access your child’s personal and academic information."
                href="/dashboard/parents/students"
              />
              <QuickRow
                title="View Classes"
                body="Explore all enrolled classes and details."
                href="/dashboard/parents/classes/core"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
