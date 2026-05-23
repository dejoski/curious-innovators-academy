import React, { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { DashboardPersonaProvider } from "@/components/dashboard-persona";
import ParentDashboardPreloader from "@/components/parent-dashboard-preloader";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardPersonaProvider>
      <ParentDashboardPreloader />
      <div className="flex h-dvh w-full overflow-hidden bg-[#fafafa] font-sans">
        <div className="block shrink-0 md:hidden">
          <Sidebar type="close" />
        </div>
        <div className="hidden shrink-0 md:block">
          <Sidebar type="open" />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={<div className="h-[56px] shrink-0 border-b border-[#f0f0f0] bg-white" />}>
            <DashboardHeader />
          </Suspense>
          <main className="relative w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </DashboardPersonaProvider>
  );
}
