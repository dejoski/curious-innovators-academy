"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, CalendarDays, ChevronRight } from "lucide-react";

import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";
import type {
  DashboardNotification,
  DataSource,
  StudentListItem,
  StudentProfileBundle,
  StudentScheduleBadge,
  StudentScheduleRow,
} from "@/lib/data";

const imgHugeiconsStudent1 = "/images/icon-student.svg";
const imgGroup1 = "/images/icon-group.svg";

type SlotKey =
  | "b1"
  | "b2"
  | "b3Tue"
  | "b3Wed"
  | "b3Thu"
  | "b4Tue"
  | "b4Wed"
  | "b4Thu";

const DAYS = ["Day 1", "Day 2", "Day 3"] as const;

const SCHEDULE_ROWS: { label: string; time: string; slots: [SlotKey, SlotKey, SlotKey]; tall?: boolean }[] = [
  { label: "Block 1", time: "7:00 - 8:30 am", slots: ["b1", "b1", "b1"] },
  { label: "Block 2", time: "8:40 - 10:10 am", slots: ["b2", "b2", "b2"] },
  { label: "Block 3", time: "10:20 - 11:50 am", slots: ["b3Tue", "b3Wed", "b3Thu"] },
  { label: "Block 4", time: "12:30 - 2:00 pm", slots: ["b4Tue", "b4Wed", "b4Thu"], tall: true },
];

function RowArrow() {
  return (
    <div className="bg-[#fafafa] flex items-center justify-center rounded-[8px] p-2 shrink-0">
      <ChevronRight className="size-[14px] text-[#666d80]" aria-hidden strokeWidth={2} />
    </div>
  );
}

function AlertRow({ item }: { item: DashboardNotification }) {
  return (
    <Link href={item.href} className="block w-full hover:opacity-90 transition-opacity">
      <div className="flex gap-6 items-center w-full">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#2f2f2d] text-[14px] leading-snug truncate">
            {item.title}
          </p>
          <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[14px] leading-snug line-clamp-2">
            {item.detail}
          </p>
        </div>
        <RowArrow />
      </div>
    </Link>
  );
}

function QuickRow({ title, body, href }: { title: string; body: string; href: string }) {
  return (
    <Link href={href} className="flex flex-col gap-3 w-full hover:opacity-90 transition-opacity">
      <div className="flex gap-6 items-center w-full">
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#2f2f2d] text-[14px]">
            {title}
          </p>
          <p className="font-['Inter:Regular',sans-serif] text-[#666d80] text-[14px] leading-snug">
            {body}
          </p>
        </div>
        <RowArrow />
      </div>
    </Link>
  );
}

function firstNumber(label: string, fallback = "0"): string {
  return label.match(/\d+(\.\d+)?/)?.[0] ?? fallback;
}

function metricValue(label: string, fallback: string): string {
  const value = label.split(":").slice(1).join(":").trim();
  return value || fallback;
}

function sourceHint(source: DataSource | null): string | null {
  if (source === "fallback") return "Showing sample parent dashboard data because cloud data is unavailable.";
  if (source === "unavailable") return "Parent dashboard data is unavailable. Ask an administrator to configure Supabase.";
  return null;
}

function badgeClasses(tone: StudentScheduleBadge["tone"]): string {
  if (tone === "core") return "bg-[#d2f1f5] text-[#0d0d12]";
  if (tone === "approved") return "bg-[rgba(0,77,8,0.2)] text-[#0d0d12]";
  if (tone === "pending") return "bg-[#fae7a6] text-[#6b5200]";
  return "bg-[#f9fafb] text-[#666d80] border border-dashed border-[#d1d5db]";
}

function ScheduleCell({ badges, tall = false }: { badges: StudentScheduleBadge[]; tall?: boolean }) {
  const visible = badges.length ? badges : [{ label: "Available slot", tone: "empty" as const }];
  const hasOnlyEmpty = visible.every((badge) => badge.tone === "empty");
  const content = (
    <div className={`bg-white border border-[#f0f0f0] ${tall ? "h-[95px]" : "h-[52px]"} p-1`}>
      <div className={`flex h-full flex-col justify-center gap-1 overflow-hidden rounded-[4px] p-1.5 ${hasOnlyEmpty ? badgeClasses("empty") : "bg-white"}`}>
        {visible.map((badge, index) => (
          <span
            key={`${badge.label}-${index}`}
            className={`truncate rounded-[4px] px-1.5 py-1 text-[10px] leading-tight ${
              hasOnlyEmpty ? "" : badgeClasses(badge.tone)
            }`}
          >
            {badge.tone === "empty" ? "+ Choose class" : badge.label}
          </span>
        ))}
      </div>
    </div>
  );

  return hasOnlyEmpty ? (
    <Link href="/dashboard/parents/catalog" className="block hover:border-[#14c1d5]/40">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function ParentHomeDashboard() {
  const [student, setStudent] = useState<StudentListItem | null>(null);
  const [profile, setProfile] = useState<StudentProfileBundle | null>(null);
  const [schedule, setSchedule] = useState<StudentScheduleRow | null>(null);
  const [notifications, setNotifications] = useState<DashboardNotification[]>([]);
  const [dataSource, setDataSource] = useState<DataSource | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadParentHome() {
      setLoadError(null);
      try {
        const [studentsRes, notificationsRes] = await Promise.all([
          fetch("/api/data/students", { cache: "no-store" }),
          fetch("/api/data/notifications", { cache: "no-store" }),
        ]);
        if (!studentsRes.ok) throw new Error(`students ${studentsRes.status}`);
        const studentsBody = (await studentsRes.json()) as { students?: StudentListItem[]; source?: DataSource };
        const rows = Array.isArray(studentsBody.students) ? studentsBody.students : [];
        const activeStudent = rows[0] ?? null;

        let profileBody: { profile?: StudentProfileBundle | null; source?: DataSource } = {};
        let scheduleBody: { rows?: StudentScheduleRow[]; source?: DataSource } = {};
        if (activeStudent) {
          const [profileRes, scheduleRes] = await Promise.all([
            fetch(`/api/data/students/${encodeURIComponent(activeStudent.id)}/profile`, { cache: "no-store" }),
            fetch(`/api/data/students/${encodeURIComponent(activeStudent.id)}/schedule`, { cache: "no-store" }),
          ]);
          if (profileRes.ok) profileBody = (await profileRes.json()) as typeof profileBody;
          if (scheduleRes.ok) scheduleBody = (await scheduleRes.json()) as typeof scheduleBody;
        }

        const notificationsBody = notificationsRes.ok
          ? ((await notificationsRes.json()) as { notifications?: DashboardNotification[]; source?: DataSource })
          : {};

        if (cancelled) return;
        setStudent(activeStudent);
        setProfile(profileBody.profile ?? null);
        setSchedule(Array.isArray(scheduleBody.rows) ? (scheduleBody.rows[0] ?? null) : null);
        setNotifications(Array.isArray(notificationsBody.notifications) ? notificationsBody.notifications.slice(0, 3) : []);
        setDataSource(
          profileBody.source === "fallback" || scheduleBody.source === "fallback" || notificationsBody.source === "fallback"
            ? "fallback"
            : (profileBody.source ?? scheduleBody.source ?? studentsBody.source ?? notificationsBody.source ?? null),
        );
      } catch (err) {
        if (!cancelled) setLoadError(`Could not load parent dashboard: ${err instanceof Error ? err.message : String(err)}.`);
      }
    }
    void loadParentHome();
    return () => {
      cancelled = true;
    };
  }, []);

  const attendance = profile ? metricValue(profile.attendanceLabel, "--") : "--";
  const pendingRequests = profile ? firstNumber(profile.pendingLabel, "0") : "0";
  const hint = loadError ?? sourceHint(dataSource);

  const selectedSchedule = useMemo(() => {
    if (schedule) return schedule;
    return null;
  }, [schedule]);

  return (
    <div className="w-full max-w-[1104px] mx-auto p-6 md:p-8 flex flex-col gap-6 font-sans">
      {hint ? (
        <div className="rounded-xl border border-[#cfa500]/35 bg-[#fff8e6] px-4 py-3 text-sm text-[#7a5b00]" role="status">
          {hint}
        </div>
      ) : null}

      <div className="flex flex-col sm:flex-row gap-4 md:gap-6">
        <div className="flex-1 min-w-[200px] bg-white border border-[#f0f0f0] rounded-[18px] p-5 flex items-center shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
              <img alt="" className="size-5" src={imgHugeiconsStudent1} />
            </div>
            <p className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[32px] leading-[1.1]">
              {attendance}
            </p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
              Attendance
            </p>
          </div>
        </div>
        <div className="flex-1 min-w-[200px] bg-white border border-[#f0f0f0] rounded-[18px] p-5 flex items-center shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
              <div className="relative size-5 overflow-hidden">
                <div className="absolute inset-[8.33%_16.67%]">
                  <div className="absolute inset-[-4.5%_-5.63%]">
                    <img alt="" className="block max-w-none size-full" src={imgGroup1} />
                  </div>
                </div>
              </div>
            </div>
            <p className="font-['Inter:Bold',sans-serif] font-bold text-[#272932] text-[32px] leading-[1.1]">
              {pendingRequests.padStart(2, "0")}
            </p>
            <p className="font-['Inter:Medium',sans-serif] font-medium text-[#666d80] text-[16px]">
              Pending requests
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 items-start">
        <div className="w-full xl:flex-1 min-w-0 flex flex-col gap-6">
          <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-4 shadow-sm overflow-x-auto">
            <div className="mb-4 flex flex-col gap-1">
              <h2 className="font-['Inter:Semi_Bold',sans-serif] text-[16px] font-semibold text-[#0d0d12]">
                {student ? `${student.name}'s schedule` : "Student schedule"}
              </h2>
              <p className="text-sm text-[#666d80]">Current core and enrichment blocks.</p>
            </div>
            <div className="min-w-[600px]">
              <div className="grid grid-cols-[100px_1fr_1fr_1fr] gap-2 mb-2">
                <div className="bg-[#f9fafb] border border-[#f0f0f0] rounded-tl-[8px] h-[65px] flex flex-col justify-center px-4">
                  <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[12px] leading-[1.29]">
                    90 minutes
                  </span>
                  <span className="text-[#625f6e] text-[12px] leading-[1.29]">per block</span>
                </div>
                {DAYS.map((day, index) => (
                  <div
                    key={day}
                    className={`bg-[#f9fafb] border border-[#f0f0f0] h-[65px] flex flex-col items-center justify-center ${
                      index === DAYS.length - 1 ? "rounded-tr-[8px]" : ""
                    }`}
                  >
                    <span className="text-[#020204] text-[12px]">Day</span>
                    <span className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#020204] text-[14px]">
                      {index + 1}
                    </span>
                  </div>
                ))}
              </div>

              {SCHEDULE_ROWS.map((row, rowIndex) => (
                <div key={row.label} className={`grid grid-cols-[100px_1fr_1fr_1fr] gap-2 ${rowIndex < SCHEDULE_ROWS.length - 1 ? "mb-2" : ""}`}>
                  <div
                    className={`bg-[#f9fafb] border border-[#f0f0f0] ${row.tall ? "h-[95px]" : "h-[52px]"} flex flex-col justify-center px-4 ${
                      rowIndex === SCHEDULE_ROWS.length - 1 ? "rounded-bl-[8px]" : ""
                    }`}
                  >
                    <span className="font-['Inter:Bold',sans-serif] font-bold text-[#625f6e] text-[10px]">
                      {row.label}
                    </span>
                    <span className="text-[#625f6e] text-[12px]">{row.time}</span>
                  </div>
                  {row.slots.map((slot, index) => (
                    <ScheduleCell
                      key={`${row.label}-${slot}-${index}`}
                      badges={selectedSchedule?.[slot] ?? []}
                      tall={row.tall}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full xl:w-[355px] shrink-0 flex flex-col gap-6">
          <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
                <Bell className="size-5 text-[#0d0d12]" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[16px]">
                System Alerts
              </p>
            </div>
            <div className="flex flex-col gap-6">
              {notifications.length ? (
                notifications.map((item) => <AlertRow key={item.id} item={item} />)
              ) : (
                <p className="text-sm text-[#666d80]">No system alerts right now.</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-[#f0f0f0] rounded-[18px] p-6 flex flex-col gap-6 shadow-sm">
            <div className="flex items-center gap-2">
              <div className="bg-[#d2f1f5] flex items-center justify-center rounded-[10px] size-10">
                <CalendarDays className="size-5 text-[#0d0d12]" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="font-['Inter:Semi_Bold',sans-serif] font-semibold text-[#0d0d12] text-[16px]">
                Quick Actions
              </p>
            </div>
            <div className="flex flex-col gap-6">
              <QuickRow title="View Schedule" body="See your child's daily and weekly schedule." href={PARENT_SCHEDULE_HREF} />
              <QuickRow title="View Profile" body="Access your child's personal and academic information." href="/dashboard/parents/students" />
              <QuickRow title="View Classes" body="Explore all enrolled classes and details." href="/dashboard/parents/classes/core" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
