import React, { Suspense } from "react";
import Link from "next/link";
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
      <div className="flex h-dvh w-full overflow-hidden bg-[#fafafa] font-sans">
        <div className="hidden shrink-0 md:block">
          <Sidebar type="open" />
        </div>
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
          <nav
            aria-label="Mobile dashboard navigation"
            className="flex shrink-0 gap-2 overflow-x-auto border-b border-[#f0f0f0] bg-white px-3 py-2 md:hidden"
          >
            {[
              ["Home", "/dashboard"],
              ["Classes", "/dashboard/classes"],
              ["Students", "/dashboard/students"],
              ["Parents", "/dashboard/parents"],
              ["Schedule", "/dashboard/schedule"],
              ["Settings", "/dashboard/settings"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="shrink-0 rounded-[6px] bg-[#fafafa] px-3 py-2 text-[13px] font-semibold text-[#272932] shadow-[0_0_0_1px_#f0f0f0]"
              >
                {label}
              </Link>
            ))}
          </nav>
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
