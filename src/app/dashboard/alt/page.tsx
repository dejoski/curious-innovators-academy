"use client";

import Frame40901 from "@/components/Frame40901";
import Frame40902 from "@/components/Frame40902";
import Frame40903 from "@/components/Frame40903";
import Frame40904 from "@/components/Frame40904";
import DailyBlocks from "@/components/DailyBlocks";
import Link from "next/link";
import { useEffect, useState } from "react";

interface DashboardMetrics {
  studentCount: number;
  teacherCount: number;
  coreClassCount: number;
  enrichmentOfferingCount: number;
}

export default function AlternateDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    studentCount: 0,
    teacherCount: 0,
    coreClassCount: 0,
    enrichmentOfferingCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await fetch("/api/data/dashboard");
        if (res.ok) {
          const data = await res.json();
          setMetrics(data.metrics || metrics);
        }
      } catch (error) {
        console.error("Failed to load dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 w-full flex items-center justify-center min-h-screen">
        <p className="text-[#666d80]">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="p-[32px] w-full">
      <div className="max-w-[1168px] mx-auto flex flex-col gap-[32px]">
        {/* Alternate Layout: Split grid with widgets arranged differently */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[24px]">
          <Link href="/dashboard/students" className="block hover:opacity-90 transition-opacity cursor-pointer">
            <Frame40901 count={metrics.studentCount} label="Students" />
          </Link>
          <Link href="/dashboard/teachers" className="block hover:opacity-90 transition-opacity cursor-pointer">
            <Frame40903 count={metrics.teacherCount} label="Teachers" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[24px]">
          <Link href="/dashboard/classes" className="block hover:opacity-90 transition-opacity cursor-pointer">
            <Frame40904 count={metrics.coreClassCount} label="Core Classes" />
          </Link>
          <Link href="/dashboard/classes" className="block hover:opacity-90 transition-opacity cursor-pointer">
            <Frame40902 count={metrics.enrichmentOfferingCount} label="Enrichment" />
          </Link>
        </div>

        {/* Daily Blocks Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-[24px]">
          <div className="lg:col-span-2">
            <DailyBlocks />
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 flex flex-col gap-4">
          <h2 className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[18px]">Quick Links</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/dashboard/classes/approvals"
              className="bg-[#f0f8fa] border border-[#14c1d5] rounded-[12px] p-4 text-left hover:bg-[#e0f4f8] transition-colors"
            >
              <p className="font-semibold text-[#0d0d12] text-[14px]">Approvals</p>
              <p className="text-[#666d80] text-[12px] mt-1">Review decisions</p>
            </Link>
            <Link
              href="/dashboard/classes/requests"
              className="bg-[#f0f8fa] border border-[#14c1d5] rounded-[12px] p-4 text-left hover:bg-[#e0f4f8] transition-colors"
            >
              <p className="font-semibold text-[#0d0d12] text-[14px]">Requests</p>
              <p className="text-[#666d80] text-[12px] mt-1">Pending enrichment</p>
            </Link>
            <Link
              href="/dashboard/schedule"
              className="bg-[#f0f8fa] border border-[#14c1d5] rounded-[12px] p-4 text-left hover:bg-[#e0f4f8] transition-colors"
            >
              <p className="font-semibold text-[#0d0d12] text-[14px]">Schedule</p>
              <p className="text-[#666d80] text-[12px] mt-1">View calendar</p>
            </Link>
            <Link
              href="/dashboard/parents"
              className="bg-[#f0f8fa] border border-[#14c1d5] rounded-[12px] p-4 text-left hover:bg-[#e0f4f8] transition-colors"
            >
              <p className="font-semibold text-[#0d0d12] text-[14px]">Parents</p>
              <p className="text-[#666d80] text-[12px] mt-1">Parent directory</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
