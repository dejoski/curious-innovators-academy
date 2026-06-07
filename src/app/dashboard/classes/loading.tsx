import { DashboardLoadingCard, DashboardLoadingPanel, DashboardRowsSkeleton } from "@/components/dashboard-loading-state";

export default function ClassesLoading() {
  return (
    <div className="w-full p-4 md:p-[30px]" aria-busy="true">
      <div className="mx-auto flex w-full max-w-[1104px] flex-col gap-6">
        <div className="space-y-3">
          <div className="h-9 w-[320px] max-w-full animate-pulse rounded bg-[#e9eef0]" />
          <div className="h-5 w-[560px] max-w-full animate-pulse rounded bg-[#edf2f4]" />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <DashboardLoadingCard key={index} />
          ))}
        </div>

        <DashboardLoadingPanel />
      </div>
    </div>
  );
}
