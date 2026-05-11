import React from "react";

const imgHugeiconsStudent = "/images/icon-generic.svg";

export type Frame40901Props = {
  /** Stat value shown in large type */
  count?: number;
  label?: string;
};

export default function Frame40901({ count = 70, label = "Students" }: Frame40901Props) {
  return (
    <div className="bg-white border border-[#f0f0f0] border-solid content-stretch flex items-center p-[20px] relative rounded-[18px] size-full" data-node-id="11:4231">
      <div className="content-stretch flex flex-col gap-[13px] items-start relative shrink-0 w-[112px]" data-node-id="11:4230">
        <div className="bg-[#d2f1f5] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[40px]" data-node-id="11:4865" data-name="Container">
          <div className="relative shrink-0 size-[20px]" data-node-id="11:4881" data-name="hugeicons:student">
            <img alt="" className="absolute block inset-0 max-w-none size-full" src={imgHugeiconsStudent} />
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[10px] items-start not-italic relative shrink-0 w-full" data-node-id="11:4229">
          <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.1] relative shrink-0 text-[#272932] text-[32px] w-full" data-node-id="11:4219">
            {count}
          </p>
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#666d80] text-[16px] w-full" data-node-id="11:4222">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
