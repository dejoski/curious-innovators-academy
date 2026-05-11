import Frame40901 from "@/components/Frame40901";
import Frame40902 from "@/components/Frame40902";
import Frame40903 from "@/components/Frame40903";
import Frame40904 from "@/components/Frame40904";
import DailyBlocks from "@/components/DailyBlocks";
import Link from "next/link";
import { bundledMetricsBannerText } from "@/lib/product-copy";
import { resolveDashboardPresentation } from "@/lib/data/repositories/dashboard";

export async function DashboardHomeResolved() {
  const { metrics: m, dailyRows, fromRemote } = await resolveDashboardPresentation();

  return (
    <div className="p-[32px] w-full">
      {!fromRemote && (
        <div className="max-w-[1168px] mx-auto mb-4 rounded-lg border border-[#cfa500]/40 bg-[#fff8e6] px-4 py-2 text-sm text-[#7a5b00]">
          {bundledMetricsBannerText()}
        </div>
      )}
      <div className="max-w-[1168px] mx-auto flex flex-col gap-[32px]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[24px]">
          <Link href="/dashboard/students" className="block hover:opacity-90 transition-opacity cursor-pointer">
            <Frame40901 count={m.studentCount} label="Students" />
          </Link>
          <Link href="/dashboard/teachers" className="block hover:opacity-90 transition-opacity cursor-pointer">
            <Frame40903 count={m.teacherCount} label="Teachers" />
          </Link>
          <Link href="/dashboard/classes" className="block hover:opacity-90 transition-opacity cursor-pointer">
            <Frame40904 count={m.coreClassCount} label="Core Class" />
          </Link>
          <Link href="/dashboard/classes" className="block hover:opacity-90 transition-opacity cursor-pointer">
            <Frame40902 count={m.enrichmentOfferingCount} label="Enrichment" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
          <div className="lg:col-span-2">
            <DailyBlocks rows={dailyRows} />
          </div>
        </div>
      </div>
    </div>
  );
}
