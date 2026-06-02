import type { LucideIcon } from "lucide-react";
import { DashboardValueSkeleton } from "@/components/dashboard-loading-state";
import { DASHBOARD_METRIC_LABEL_CLASS } from "@/lib/dashboard-shell-classes";

export type DashboardStatCardProps = {
  count: number;
  label: string;
  icon: LucideIcon;
  loading?: boolean;
};

export default function DashboardStatCard({ count, label, icon: Icon, loading = false }: DashboardStatCardProps) {
  return (
    <div className="flex size-full items-center rounded-[18px] border border-[#f0f0f0] bg-white p-[20px]">
      <div className="flex w-[112px] shrink-0 flex-col items-start gap-[13px]">
        <div className="flex size-[40px] shrink-0 items-center justify-center rounded-[10px] bg-[#d2f1f5]">
          <Icon aria-hidden="true" className="size-[20px] text-[#00bad3]" strokeWidth={1.8} />
        </div>
        <div className="flex w-full shrink-0 flex-col items-start gap-[10px]">
          <p className="w-full font-bold text-[32px] leading-[1.1] text-[#272932]">
            {loading ? <DashboardValueSkeleton className="h-8 w-12" /> : count}
          </p>
          <p className={`w-full ${DASHBOARD_METRIC_LABEL_CLASS}`}>
            {label}
          </p>
        </div>
      </div>
    </div>
  );
}
