import React from "react";

const imgGroup = "https://www.figma.com/api/mcp/asset/ef407803-dd11-41c6-a0dd-2d07f60d226a";

export type Frame40902Props = {
  count?: number;
  label?: string;
};

export default function Frame40902({ count = 12, label = "Enrichment" }: Frame40902Props) {
  return (
    <div className="bg-white border border-[#f0f0f0] border-solid content-stretch flex items-center p-[20px] relative rounded-[18px] size-full" data-node-id="11:4232">
      <div className="content-stretch flex flex-col gap-[13px] items-start relative shrink-0 w-[112px]" data-node-id="11:4233">
        <div className="bg-[#d2f1f5] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[40px]" data-node-id="11:4896" data-name="Container">
          <div className="overflow-clip relative shrink-0 size-[20px]" data-node-id="11:4910" data-name="streamline-plump:dices-entertainment-gaming-dices">
            <div className="absolute inset-[6.34%_6.04%_5.68%_6.71%]" data-node-id="11:4911" data-name="Group">
              <div className="absolute inset-[-4%_-4%]">
                <img alt="" className="block max-w-none size-full" src={imgGroup} />
              </div>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[10px] items-start not-italic relative shrink-0 w-full" data-node-id="11:4239">
          <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.1] min-w-full relative shrink-0 text-[#272932] text-[32px] w-[min-content]" data-node-id="11:4240">
            {count}
          </p>
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#666d80] text-[16px] whitespace-nowrap" data-node-id="11:4241">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
