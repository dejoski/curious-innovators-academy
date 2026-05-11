import React, { Suspense } from "react";
import Sidebar from "@/components/Sidebar";
import DashboardHeader from "@/components/DashboardHeader";
import { DashboardPersonaProvider } from "@/components/dashboard-persona";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardPersonaProvider>
      <div className="flex h-screen bg-[#fafafa] overflow-hidden w-full font-sans">
        <Sidebar type="open" />
        <div className="flex flex-col flex-1 overflow-hidden relative">
          <Suspense fallback={<div className="h-[56px] shrink-0 border-b border-[#f0f0f0] bg-white" />}>
            <DashboardHeader />
          </Suspense>
          <main className="flex-1 overflow-y-auto w-full relative">
            {children}
          </main>
        </div>
      </div>
    </DashboardPersonaProvider>
  );
}
