import React from "react";

const imgGroup = "https://www.figma.com/api/mcp/asset/900a9739-5ace-49cc-9b00-0255d874b014";

export type Frame40904Props = {
  count?: number;
  label?: string;
};

export default function Frame40904({ count = 16, label = "Core Class" }: Frame40904Props) {
  return (
    <div className="bg-white border border-[#f0f0f0] border-solid content-stretch flex items-center p-[20px] relative rounded-[18px] size-full" data-node-id="11:4252">
      <div className="content-stretch flex flex-col gap-[13px] items-start relative shrink-0" data-node-id="11:4253">
        <div className="bg-[#d2f1f5] content-stretch flex flex-col items-center justify-center relative rounded-[10px] shrink-0 size-[40px]" data-node-id="11:4892" data-name="Container">
          <div className="overflow-clip relative shrink-0 size-[20px]" data-node-id="11:4905" data-name="icon-park-outline:notebook-one">
            <div className="absolute inset-[8.33%_16.67%]" data-node-id="11:4906" data-name="Group">
              <div className="absolute inset-[-5%_-6%]">
                <img alt="" className="block max-w-none size-full" src={imgGroup} />
              </div>
            </div>
          </div>
        </div>
        <div className="content-stretch flex flex-col gap-[10px] items-start not-italic relative shrink-0 whitespace-nowrap" data-node-id="11:4259">
          <p className="font-['Inter:Bold',sans-serif] font-bold leading-[1.1] relative shrink-0 text-[#272932] text-[32px]" data-node-id="11:4260">
            {count}
          </p>
          <p className="font-['Inter:Medium',sans-serif] font-medium leading-[1.4] relative shrink-0 text-[#666d80] text-[16px]" data-node-id="11:4261">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
