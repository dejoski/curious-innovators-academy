import Image from "next/image";

export type DashboardStatCardProps = {
  count: number;
  label: string;
  iconSrc: string;
};

export default function DashboardStatCard({ count, label, iconSrc }: DashboardStatCardProps) {
  return (
    <div className="flex size-full items-center rounded-[18px] border border-[#f0f0f0] bg-white p-[20px]">
      <div className="flex w-[112px] shrink-0 flex-col items-start gap-[13px]">
        <div className="flex size-[40px] shrink-0 items-center justify-center rounded-[10px] bg-[#d2f1f5]">
          <Image alt="" className="size-[20px]" src={iconSrc} width={20} height={20} />
        </div>
        <div className="flex w-full shrink-0 flex-col items-start gap-[10px]">
          <p className="w-full font-['Inter:Bold',sans-serif] text-[32px] font-bold leading-[1.1] text-[#272932]">
            {count}
          </p>
          <p className="w-full font-['Inter:Medium',sans-serif] text-[16px] font-medium leading-[1.4] text-[#666d80]">
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
