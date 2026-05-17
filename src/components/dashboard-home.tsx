import Frame40901 from "@/components/Frame40901";
import Frame40902 from "@/components/Frame40902";
import Frame40903 from "@/components/Frame40903";
import Frame40904 from "@/components/Frame40904";
import DailyBlocks from "@/components/DailyBlocks";
import Link from "next/link";
import { fetchNotificationsResolved } from "@/lib/data/repositories/notifications";
import { resolveDashboardPresentation } from "@/lib/data/repositories/dashboard";
import { fetchEnrichmentRequestsResolved } from "@/lib/data/repositories/requests";

export async function DashboardHomeResolved() {
  const [{ metrics: m, dailyRows }, { items: requests }, { items: notifications }] = await Promise.all([
    resolveDashboardPresentation(),
    fetchEnrichmentRequestsResolved(),
    fetchNotificationsResolved(),
  ]);

  const topRequests = requests.slice(0, 4);
  const systemAlerts = notifications.slice(0, 3);
  const statusPill: Record<string, string> = {
    Pending: "bg-[#fae7a6] text-[#8b6e00]",
    Approved: "bg-[#d7f0de] text-[#0c6a26]",
    Rejected: "bg-[#ffd9d9] text-[#b31313]",
  };

  return (
    <div className="w-full p-4 md:p-[30px]">
      <div className="mx-auto flex w-full max-w-[1104px] flex-col gap-4 md:gap-[24px]">
        <div className="flex flex-col gap-[20px] lg:flex-row">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[729px] lg:grid-cols-4 lg:gap-[20px]">
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
          <div className="w-full rounded-[18px] border border-[#f0f0f0] bg-white p-[16px] lg:w-[355px]">
            <div className="mb-[14px] flex items-center gap-[8px]">
              <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#d2f1f5]">
                <img alt="" className="size-[16px]" src="/images/icon-notification-bell.svg" />
              </div>
              <p className="font-['Inter:Semi_Bold',sans-serif] text-[24px] leading-[1.35] text-[#0d0d12]">System Alerts</p>
            </div>

            <div className="space-y-[12px]">
              {systemAlerts.length ? (
                systemAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className="flex w-full items-center justify-between rounded-[8px] p-[4px] text-left hover:bg-[#fafafa]"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-['Inter:Medium',sans-serif] text-[14px] leading-[1.4] text-[#0d0d12]">{alert.title}</p>
                      <p className="truncate font-['Inter:Regular',sans-serif] text-[14px] leading-[1.4] text-[#666d80]">{alert.detail}</p>
                    </div>
                    <img alt="" className="size-[12px] -rotate-90" src="/images/icon-arrow-right-thin.svg" />
                  </Link>
                ))
              ) : (
                <div className="rounded-[8px] border border-[#f0f0f0] px-3 py-4 text-sm text-[#666d80]">
                  No system alerts right now.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[20px] lg:flex-row lg:items-start">
          <div className="w-full lg:w-[729px]">
            <DailyBlocks rows={dailyRows} />
          </div>
          <div className="w-full self-start rounded-[18px] border border-[#f0f0f0] bg-white p-[16px] lg:w-[355px]">
            <div className="mb-[14px] flex items-center gap-[8px]">
              <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#d2f1f5]">
                <img alt="" className="size-[16px]" src="/images/icon-dices.svg" />
              </div>
              <p className="font-['Inter:Semi_Bold',sans-serif] text-[24px] leading-[1.35] text-[#0d0d12]">Quick Actions</p>
            </div>
            <div className="space-y-[12px]">
              <Link href="/dashboard/classes/new" className="flex items-center justify-between rounded-[8px] p-[4px] hover:bg-[#fafafa]">
                <div>
                  <p className="font-['Inter:Medium',sans-serif] text-[14px] leading-[1.4] text-[#0d0d12]">Create Class</p>
                  <p className="font-['Inter:Regular',sans-serif] text-[14px] leading-[1.4] text-[#666d80]">Add a new class to the school schedule</p>
                </div>
                <img alt="" className="size-[12px] -rotate-90" src="/images/icon-arrow-right-thin.svg" />
              </Link>
              <Link href="/dashboard/students/new" className="flex items-center justify-between rounded-[8px] p-[4px] hover:bg-[#fafafa]">
                <div>
                  <p className="font-['Inter:Medium',sans-serif] text-[14px] leading-[1.4] text-[#0d0d12]">Create Student</p>
                  <p className="font-['Inter:Regular',sans-serif] text-[14px] leading-[1.4] text-[#666d80]">Add a new student to the school roster</p>
                </div>
                <img alt="" className="size-[12px] -rotate-90" src="/images/icon-arrow-right-thin.svg" />
              </Link>
              <Link href="/dashboard/teachers/new" className="flex items-center justify-between rounded-[8px] p-[4px] hover:bg-[#fafafa]">
                <div>
                  <p className="font-['Inter:Medium',sans-serif] text-[14px] leading-[1.4] text-[#0d0d12]">Create Teacher</p>
                  <p className="font-['Inter:Regular',sans-serif] text-[14px] leading-[1.4] text-[#666d80]">Add a new teacher to the school staff</p>
                </div>
                <img alt="" className="size-[12px] -rotate-90" src="/images/icon-arrow-right-thin.svg" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[20px] lg:flex-row lg:items-start">
          <div
            className="w-full rounded-[18px] border border-[#f0f0f0] bg-white p-[16px] lg:flex-none"
            style={{ width: "min(100%, 729px)" }}
          >
            <div className="mb-[14px] flex items-center justify-between">
              <div className="flex items-center gap-[8px]">
                <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#d2f1f5]">
                  <img alt="" className="size-[16px]" src="/images/icon-dices.svg" />
                </div>
                <div>
                  <p className="font-['Inter:Semi_Bold',sans-serif] text-[16px] leading-[1.3] text-[#0d0d12]">Enrichment Requests</p>
                  <p className="font-['Inter:Regular',sans-serif] text-[12px] leading-[1.4] text-[#666d80]">Overview</p>
                </div>
              </div>
              <Link href="/dashboard/classes/requests" className="rounded-[8px] bg-[#fafafa] p-[8px] hover:bg-[#f0f0f0]">
                <img alt="" className="size-[12px] -rotate-90" src="/images/icon-arrow-right-thin.svg" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-[10px] border border-[#f0f0f0]">
              <div
                className="grid bg-[#fafafa] px-[12px] py-[8px] text-[12px] font-medium text-[#666d80]"
                style={{ gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.8fr" }}
              >
                <p>Student</p>
                <p>Class</p>
                <p>Block</p>
                <p>Status</p>
              </div>
              {topRequests.length ? (
                topRequests.map((req) => (
                  <div
                    key={req.id}
                    className="grid border-t border-[#f0f0f0] px-[12px] py-[8px] text-[14px] text-[#0d0d12]"
                    style={{ gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.8fr" }}
                  >
                    <p>{req.student}</p>
                    <p className="truncate">{req.class}</p>
                    <p>{req.block}</p>
                    <div>
                      <span className={`rounded-[6px] px-[8px] py-[2px] text-[10px] font-medium ${statusPill[req.status] ?? statusPill.Pending}`}>
                        {req.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="border-t border-[#f0f0f0] px-[12px] py-[16px] text-[14px] text-[#666d80]">
                  No enrichment requests yet.
                </div>
              )}
            </div>
          </div>
          <div className="hidden lg:block lg:w-[355px]" aria-hidden />
        </div>
      </div>
    </div>
  );
}
