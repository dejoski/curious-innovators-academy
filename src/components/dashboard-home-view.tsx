"use client";

import DailyBlocks from "@/components/DailyBlocks";
import DashboardStatCard from "@/components/dashboard-stat-card";
import { DashboardRowsSkeleton } from "@/components/dashboard-loading-state";
import NextLink from "next/link";
import { Bell, BookOpenText, ChevronRight, Dice5, GraduationCap, UserRoundCheck } from "lucide-react";
import type { ResolvedDashboardPresentation } from "@/lib/data/repositories/dashboard";
import type { DashboardNotification, EnrichmentRequestRow } from "@/lib/data/types";
import {
  DASHBOARD_BODY_PRIMARY_TEXT_CLASS,
  DASHBOARD_BODY_SECONDARY_TEXT_CLASS,
  DASHBOARD_PANEL_TITLE_CLASS,
  DASHBOARD_SECTION_TITLE_CLASS,
  DASHBOARD_TABLE_BODY_TEXT_CLASS,
  DASHBOARD_TABLE_HEAD_TEXT_CLASS,
} from "@/lib/dashboard-shell-classes";

function Link(props: React.ComponentProps<typeof NextLink>) {
  return <NextLink prefetch={false} {...props} />;
}

export type DashboardHomeViewProps = {
  presentation: ResolvedDashboardPresentation | null;
  requests: EnrichmentRequestRow[];
  notifications: DashboardNotification[];
  presentationLoading?: boolean;
  requestsLoading?: boolean;
  notificationsLoading?: boolean;
  requestsResolved?: boolean;
  notificationsResolved?: boolean;
};

export default function DashboardHomeView({
  presentation,
  requests,
  notifications,
  presentationLoading = false,
  requestsLoading = false,
  notificationsLoading = false,
  requestsResolved = true,
  notificationsResolved = true,
}: DashboardHomeViewProps) {
  const presentationUnknown = presentationLoading || !presentation;
  const requestsUnknown = requestsLoading || !requestsResolved;
  const notificationsUnknown = notificationsLoading || !notificationsResolved;
  const m = presentation?.metrics ?? {
    studentCount: 0,
    teacherCount: 0,
    coreClassCount: 0,
    enrichmentOfferingCount: 0,
  };
  const topRequests = requests.slice(0, 4);
  const systemAlerts = [
    ...(presentation?.systemAlerts ?? []).map((alert) => ({ ...alert, read: false, time: "" })),
    ...notifications,
  ].slice(0, 3);
  const statusPill: Record<string, string> = {
    Pending: "bg-[#fae7a6] text-[#8b6e00]",
    Approved: "bg-[#d7f0de] text-[#0c6a26]",
    Waitlisted: "bg-[#fff8e6] text-[#7a5b00]",
    Rejected: "bg-[#ffd9d9] text-[#b31313]",
  };
  const metricCards = [
    { href: "/dashboard/students", count: m.studentCount, label: "Students", icon: GraduationCap },
    { href: "/dashboard/teachers", count: m.teacherCount, label: "Teachers", icon: UserRoundCheck },
    { href: "/dashboard/classes", count: m.coreClassCount, label: "Core Class", icon: BookOpenText },
    { href: "/dashboard/classes", count: m.enrichmentOfferingCount, label: "Enrichment", icon: Dice5 },
  ];

  return (
    <div className="w-full p-4 md:p-[30px]">
      <div className="mx-auto flex w-full max-w-[1104px] flex-col gap-4 md:gap-[24px]">
        <div className="flex flex-col gap-[20px] lg:flex-row">
          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 lg:w-[729px] lg:grid-cols-4 lg:gap-[20px]">
            {metricCards.map((card) => (
              <Link key={card.label} href={card.href} className="block cursor-pointer transition-opacity hover:opacity-90">
                <DashboardStatCard count={card.count} label={card.label} icon={card.icon} loading={presentationUnknown} />
              </Link>
            ))}
          </div>
          <div className="w-full rounded-[18px] border border-[#f0f0f0] bg-white p-[16px] lg:w-[355px]">
            <div className="mb-[14px] flex items-center gap-[8px]">
              <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#d2f1f5]">
                <Bell aria-hidden="true" className="size-[16px] text-[#00bad3]" strokeWidth={1.8} />
              </div>
              <p className={DASHBOARD_PANEL_TITLE_CLASS}>System Alerts</p>
            </div>

            <div className="space-y-[12px]">
              {notificationsUnknown ? (
                <DashboardRowsSkeleton rows={2} />
              ) : systemAlerts.length ? (
                systemAlerts.map((alert) => (
                  <Link
                    key={alert.id}
                    href={alert.href}
                    className="flex w-full items-center justify-between rounded-[8px] p-[4px] text-left hover:bg-[#fafafa]"
                  >
                    <div className="min-w-0">
                      <p className={`truncate font-medium ${DASHBOARD_BODY_PRIMARY_TEXT_CLASS}`}>{alert.title}</p>
                      <p className={`truncate ${DASHBOARD_BODY_SECONDARY_TEXT_CLASS}`}>{alert.detail}</p>
                    </div>
                    <ChevronRight aria-hidden="true" className="size-[16px] shrink-0 text-[#0d0d12]" strokeWidth={1.8} />
                  </Link>
                ))
              ) : (
                <div className="rounded-[8px] border border-[#f0f0f0] px-3 py-4 text-[14px] leading-[1.4] text-[#666d80]">
                  No system alerts right now.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-[20px] lg:flex-row lg:items-start">
          <div className="w-full lg:w-[729px]">
            {presentationUnknown ? (
              <div className="rounded-[18px] border border-[#f0f0f0] bg-white">
                <DashboardRowsSkeleton rows={4} />
              </div>
            ) : (
              <DailyBlocks rows={presentation?.dailyRows ?? []} />
            )}
          </div>
          <div className="w-full self-start rounded-[18px] border border-[#f0f0f0] bg-white p-[16px] lg:w-[355px]">
              <div className="mb-[14px] flex items-center gap-[8px]">
                <div className="flex h-[28px] w-[28px] items-center justify-center rounded-[8px] bg-[#d2f1f5]">
                  <Dice5 aria-hidden="true" className="size-[16px] text-[#00bad3]" strokeWidth={1.8} />
                </div>
              <p className={DASHBOARD_PANEL_TITLE_CLASS}>Quick Actions</p>
            </div>
            <div className="space-y-[12px]">
              <Link href="/dashboard/classes/new" className="flex items-center justify-between rounded-[8px] p-[4px] hover:bg-[#fafafa]">
                <div>
                  <p className={`font-medium ${DASHBOARD_BODY_PRIMARY_TEXT_CLASS}`}>Create Class</p>
                  <p className={DASHBOARD_BODY_SECONDARY_TEXT_CLASS}>Add a new class to the school schedule</p>
                </div>
                <ChevronRight aria-hidden="true" className="size-[16px] shrink-0 text-[#0d0d12]" strokeWidth={1.8} />
              </Link>
              <Link href="/dashboard/students/new" className="flex items-center justify-between rounded-[8px] p-[4px] hover:bg-[#fafafa]">
                <div>
                  <p className={`font-medium ${DASHBOARD_BODY_PRIMARY_TEXT_CLASS}`}>Create Student</p>
                  <p className={DASHBOARD_BODY_SECONDARY_TEXT_CLASS}>Add a new student to the school roster</p>
                </div>
                <ChevronRight aria-hidden="true" className="size-[16px] shrink-0 text-[#0d0d12]" strokeWidth={1.8} />
              </Link>
              <Link href="/dashboard/teachers/new" className="flex items-center justify-between rounded-[8px] p-[4px] hover:bg-[#fafafa]">
                <div>
                  <p className={`font-medium ${DASHBOARD_BODY_PRIMARY_TEXT_CLASS}`}>Create Teacher</p>
                  <p className={DASHBOARD_BODY_SECONDARY_TEXT_CLASS}>Add a new teacher to the school staff</p>
                </div>
                <ChevronRight aria-hidden="true" className="size-[16px] shrink-0 text-[#0d0d12]" strokeWidth={1.8} />
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
                  <Dice5 aria-hidden="true" className="size-[16px] text-[#00bad3]" strokeWidth={1.8} />
                </div>
                <div>
                  <p className={`${DASHBOARD_SECTION_TITLE_CLASS}`}>Enrichment Requests</p>
                  <p className={DASHBOARD_BODY_SECONDARY_TEXT_CLASS}>Overview</p>
                </div>
              </div>
              <Link href="/dashboard/classes/requests" className="rounded-[8px] bg-[#fafafa] p-[8px] hover:bg-[#f0f0f0]">
                <ChevronRight aria-hidden="true" className="size-[16px] text-[#0d0d12]" strokeWidth={1.8} />
              </Link>
            </div>

            <div className="overflow-hidden rounded-[10px] border border-[#f0f0f0]">
              <div
                className={`grid bg-[#fafafa] px-[12px] py-[8px] font-medium ${DASHBOARD_TABLE_HEAD_TEXT_CLASS}`}
                style={{ gridTemplateColumns: "1.2fr 1.4fr 0.8fr 0.8fr" }}
              >
                <p>Student</p>
                <p>Class</p>
                <p>Block</p>
                <p>Status</p>
              </div>
              {requestsUnknown ? (
                <DashboardRowsSkeleton rows={3} />
              ) : topRequests.length ? (
                topRequests.map((req) => (
                  <div
                    key={req.id}
                    className={`grid border-t border-[#f0f0f0] px-[12px] py-[8px] ${DASHBOARD_TABLE_BODY_TEXT_CLASS}`}
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
