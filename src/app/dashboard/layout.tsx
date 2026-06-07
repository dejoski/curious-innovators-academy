import React, { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import {
  DashboardNavigationOverlay,
  DashboardNavigationProgressProvider,
} from "@/components/dashboard-navigation-progress";
import { ClassesDataCacheProvider } from "@/components/classes-data-cache";
import DashboardDataWarmup from "@/components/dashboard-data-warmup";
import { DashboardPersonaProvider } from "@/components/dashboard-persona";
import DashboardRouteGuard from "@/components/dashboard-route-guard";
import ParentDashboardPreloader from "@/components/parent-dashboard-preloader";
import { DashboardSuspenseFallback } from "@/components/dashboard-suspense";

type LayoutFallback = { width: string; height?: string; className?: string };

const SIDEBAR_FALLBACKS: { type: "close" | "open"; props: LayoutFallback }[] = [
  { type: "close", props: { width: "72px", height: "100vh", className: "block shrink-0 md:hidden" } },
  { type: "open", props: { width: "272px", height: "100vh", className: "hidden shrink-0 md:block" } },
];

const HEADER_FALLBACK: LayoutFallback = { width: "100%", height: "56px", className: "min-w-0 border-b border-[#f0f0f0] bg-white" };

function SidebarSuspense({ type, fallback }: { type: "close" | "open"; fallback: LayoutFallback }) {
  return (
    <div className={fallback.className}>
      <Suspense fallback={<DashboardSuspenseFallback {...fallback} />}>
        <Sidebar type={type} />
      </Suspense>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardPersonaProvider>
      <ClassesDataCacheProvider>
        <DashboardNavigationProgressProvider>
          <ParentDashboardPreloader />
          <DashboardDataWarmup />
          <DashboardRouteGuard>
            <div className="flex h-dvh w-full overflow-hidden bg-[#fafafa] font-sans">
              {SIDEBAR_FALLBACKS.map(({ type, props }) => (
                <SidebarSuspense key={type} type={type} fallback={props} />
              ))}
              <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                <Suspense fallback={<DashboardSuspenseFallback {...HEADER_FALLBACK} />}>
                  <DashboardHeader />
                </Suspense>
                <main className="relative w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                  {children}
                  <DashboardNavigationOverlay />
                </main>
              </div>
            </div>
          </DashboardRouteGuard>
        </DashboardNavigationProgressProvider>
      </ClassesDataCacheProvider>
    </DashboardPersonaProvider>
  );
}
