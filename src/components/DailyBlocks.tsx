"use client";

import React from "react";
import Link from "next/link";
import {
  DASHBOARD_METRICS,
  getDashboardDailyBlocks,
  type DashboardDailyBlockRow,
} from "@/lib/dashboard-metrics";

const imgGroup = "/images/icon-group.svg";
const imgVector = "/images/vector.png";

const DEFAULT_ROWS = getDashboardDailyBlocks(DASHBOARD_METRICS);

export type DailyBlocksProps = {
  /** Schedule rows; defaults match legacy mock and dashboard metrics. */
  rows?: DashboardDailyBlockRow[];
};

function DailyBlockRow({
  row,
  firstRowNodeId,
  linkNodeId,
}: {
  row: DashboardDailyBlockRow;
  firstRowNodeId: string;
  linkNodeId: string;
}) {
  const occupancyLabel = `${row.occupancyPercent}% Full`;
  const withoutLabel = `${row.withoutClassCount} Without class`;

  return (
    <Link
      href="/dashboard/schedule"
      className="content-stretch flex flex-col gap-[24px] items-start relative shrink-0 w-full hover:bg-[#fafafa] p-2 -ml-2 rounded-lg transition-colors cursor-pointer"
      data-node-id={linkNodeId}
      data-name="Container"
    >
      <div className="content-stretch flex gap-[24px] items-start relative shrink-0 w-full" data-node-id={firstRowNodeId}>
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-[38px] items-start min-w-px relative">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.4] not-italic relative shrink-0 text-[#0d0d12] text-[14px] whitespace-nowrap">
            {row.blockTitle}
          </p>
          <div className="content-stretch flex items-center relative shrink-0">
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] not-italic relative shrink-0 text-[#666d80] text-[14px] whitespace-nowrap">
              {row.timeRange}
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-[38px] items-start min-w-px relative">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.4] not-italic relative shrink-0 text-[#0d0d12] text-[14px] whitespace-nowrap">
            {row.trackType}
          </p>
          <div className="content-stretch flex items-center relative shrink-0">
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] not-italic relative shrink-0 text-[#666d80] text-[14px] whitespace-nowrap">
              {occupancyLabel}
            </p>
          </div>
        </div>
        <div className="content-stretch flex flex-[1_0_0] flex-col gap-[4px] h-[38px] items-start min-w-px relative">
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.4] not-italic relative shrink-0 text-[#0d0d12] text-[14px] whitespace-nowrap">
            Students
          </p>
          <div className="content-stretch flex items-center relative shrink-0">
            <p className="font-['Inter:Regular',sans-serif] font-normal leading-[1.4] not-italic relative shrink-0 text-[#666d80] text-[14px] whitespace-nowrap">
              {withoutLabel}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default function DailyBlocks({ rows = DEFAULT_ROWS }: DailyBlocksProps) {
  const rowMeta = [
    { firstRowNodeId: "11:4974", linkNodeId: "11:4669" },
    { firstRowNodeId: "11:5203", linkNodeId: "11:5197" },
    { firstRowNodeId: "11:5254", linkNodeId: "11:5248" },
    { firstRowNodeId: "11:5305", linkNodeId: "11:5299" },
  ] as const;

  return (
    <div className="bg-white border border-[#f0f0f0] border-solid content-stretch flex flex-col gap-[24px] items-start p-[24px] relative rounded-[18px] size-full" data-node-id="11:4581" data-name="Container">
      <div className="content-stretch flex items-center justify-between relative shrink-0 w-full" data-node-id="11:4663" data-name="Container">
        <div className="relative shrink-0" data-node-id="12:5356">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex gap-[8px] items-center relative size-full">
            <div className="bg-[#e6f5f7] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[40px]" data-node-id="11:4664" data-name="Container">
              <div className="overflow-clip relative shrink-0 size-[20px]" data-node-id="11:4922" data-name="solar:calendar-linear">
                <div className="absolute inset-[10.42%_8.33%_8.33%_8.33%]" data-node-id="11:4923" data-name="Group">
                  <div className="absolute inset-[-5%_-5%]">
                    <img alt="" className="block max-w-none size-full" src={imgGroup} />
                  </div>
                </div>
              </div>
            </div>
            <div className="content-stretch flex flex-col gap-[2px] items-start leading-[1.4] not-italic relative shrink-0 whitespace-nowrap" data-node-id="11:4666" data-name="Text">
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold relative shrink-0 text-[#0d0d12] text-[16px]" data-node-id="11:4667">
                Daily Blocks
              </p>
              <p className="font-['Inter:Regular',sans-serif] font-normal relative shrink-0 text-[#6b6b6b] text-[12px]" data-node-id="11:4668">
                Overview
              </p>
            </div>
          </div>
        </div>
        <Link href="/dashboard/schedule" className="bg-[#fafafa] cursor-pointer relative rounded-[8px] shrink-0 hover:bg-[#f0f0f0] transition-colors" data-node-id="549:1239" data-name="Button Picker">
          <div className="bg-clip-padding border-0 border-[transparent] border-solid content-stretch flex items-center p-[8px] relative size-full">
            <div className="flex items-center justify-center relative shrink-0">
              <div className="-scale-y-100 flex-none rotate-180">
                <div className="relative size-[14px]" data-node-id="549:1240" data-name="Icon/ArrowLeft">
                  <div className="absolute flex inset-[18.75%_12.5%] items-center justify-center" style={{ containerType: "size" }}>
                    <div className="flex-none h-[100cqw] rotate-90 w-[100cqh]">
                      <div className="relative size-full" data-node-id="I549:1240;4:224" data-name="Vector">
                        <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgVector} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </div>
      {rows.map((row, index) => (
        <DailyBlockRow
          key={`${row.blockTitle}-${index}`}
          row={row}
          firstRowNodeId={rowMeta[index]?.firstRowNodeId ?? `daily-row-${index}`}
          linkNodeId={rowMeta[index]?.linkNodeId ?? `daily-link-${index}`}
        />
      ))}
    </div>
  );
}
