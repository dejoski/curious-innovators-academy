"use client";

import React from "react";
import {
  preloadDashboardData,
  studentDetailDataUrls,
} from "@/lib/client-data-cache";
import { useDashboardPersona } from "@/components/dashboard-persona";

type DashboardWarmupProfile = "admin" | "parent" | "teacher" | "student";

const ADMIN_WARMUP = [
  "/api/dashboard-presentation",
  "/api/data/semesters",
  "/api/data/notifications",
  "/api/data/classes",
  "/api/data/class-options",
  "/api/data/enrichment-requests",
  "/api/data/approval-history",
  "/api/data/students",
  "/api/data/student-schedules",
  "/api/data/teachers",
  "/api/data/parents",
  "/api/data/schedule-extras",
];

function studentUrls(studentId: string) {
  return [...studentDetailDataUrls(studentId)];
}

function warmupUrls(profile: DashboardWarmupProfile, studentId: string) {
  if (profile === "admin") return ADMIN_WARMUP;
  if (profile === "parent") {
    return [
      "/api/data/notifications",
      "/api/data/semesters",
      "/api/data/classes",
      "/api/data/enrichment-requests",
      "/api/data/invoices",
      ...(studentId ? studentUrls(studentId) : []),
    ];
  }
  if (profile === "teacher") {
    return ["/api/data/notifications", "/api/data/semesters", "/api/data/schedule-extras", "/api/data/classes"];
  }
  return [
    "/api/data/notifications",
    "/api/data/semesters",
    "/api/data/classes",
    ...(studentId ? studentUrls(studentId) : []),
  ];
}

export default function DashboardDataWarmup() {
  const { persona, demoStudentId, isAccountResolved } = useDashboardPersona();

  React.useEffect(() => {
    if (!isAccountResolved) return;

    const urls = persona === "admin" ? [] : warmupUrls(persona, demoStudentId);
    if (urls.length === 0) return;
    const run = () => {
      for (const url of urls) preloadDashboardData(url);
    };

    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 1200 });
      return () => window.cancelIdleCallback(id);
    }

    const id = globalThis.setTimeout(run, 150);
    return () => globalThis.clearTimeout(id);
  }, [demoStudentId, isAccountResolved, persona]);

  return null;
}
