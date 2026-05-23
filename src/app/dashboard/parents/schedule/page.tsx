import { Suspense } from "react";
import { fetchScheduleExtrasResolved } from "@/lib/data/repositories/schedule";
import { fetchStudentScheduleResolved } from "@/lib/data/repositories/student-details";
import { fetchStudentsResolved } from "@/lib/data/repositories/students";
import type { StudentScheduleRow } from "@/lib/data/types";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";
import {
  SLOT_START_TIME,
  SLOT_TO_WEEKDAY,
  eventTypeFromBadgeTone,
  type ParentScheduleSlotKey,
} from "@/lib/schedule-slots";
import ScheduleMonth from "../../schedule/schedule-client";
import type { CalendarEvent } from "@/lib/dashboard/schedule-calendar-shared";

const FEB_2026 = { year: 2026, monthIndex: 1 };

function dateKey(year: number, monthIndex: number, day: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addEvent(target: Record<string, CalendarEvent[]>, key: string, event: CalendarEvent) {
  target[key] = [...(target[key] ?? []), event];
}

function studentScheduleToMonthEvents(row: StudentScheduleRow | null): Record<string, CalendarEvent[]> {
  if (!row) return {};
  const events: Record<string, CalendarEvent[]> = {};
  const daysInMonth = new Date(FEB_2026.year, FEB_2026.monthIndex + 1, 0).getDate();
  for (const [slot, weekdays] of Object.entries(SLOT_TO_WEEKDAY) as [ParentScheduleSlotKey, number[]][]) {
    const badges = row[slot].filter((badge) => badge.tone !== "empty" && badge.label !== "--");
    if (!badges.length) continue;
    for (let day = 1; day <= daysInMonth; day += 1) {
      const d = new Date(FEB_2026.year, FEB_2026.monthIndex, day);
      if (!weekdays.includes(d.getDay())) continue;
      for (const [index, badge] of badges.entries()) {
        addEvent(events, dateKey(FEB_2026.year, FEB_2026.monthIndex, day), {
          id: `${row.id}-${slot}-${day}-${index}`,
          time: SLOT_START_TIME[slot],
          title: badge.label,
          type: eventTypeFromBadgeTone(badge.tone),
          description: `${row.name} · ${slot}`,
        });
      }
    }
  }
  return events;
}

function mergeEvents(...sources: Record<string, CalendarEvent[]>[]) {
  const merged: Record<string, CalendarEvent[]> = {};
  for (const source of sources) {
    for (const [key, events] of Object.entries(source)) {
      merged[key] = [...(merged[key] ?? []), ...events];
    }
  }
  return merged;
}

export default async function ParentSchedulePage() {
  const [{ extrasByDate, source }, students] = await Promise.all([
    fetchScheduleExtrasResolved(),
    fetchStudentsResolved(),
  ]);
  const activeStudentId = students.items[0]?.id ?? "";
  const studentSchedule = activeStudentId ? await fetchStudentScheduleResolved(activeStudentId) : { rows: [], source };
  const scheduleRow = studentSchedule.rows[0] ?? null;
  const mergedEvents = mergeEvents(extrasByDate, studentScheduleToMonthEvents(scheduleRow));

  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
          Loading schedule...
        </div>
      }
    >
      <ScheduleMonth
        initialExtrasByDate={mergedEvents}
        dataSource={studentSchedule.source ?? source}
        scheduleRouteBase={PARENT_SCHEDULE_HREF}
        viewClassesHref="/dashboard/parents/classes/core"
        heroSubtitle="View your child's schedule"
        titleByView={{
          Month: "Month Class Schedule",
          Week: "Week Class Schedule",
          Day: "Day Class Schedule",
        }}
        showDataSourceBanner={false}
        showTodayButton={false}
        refreshExtrasOnClient={false}
        initialDateIso="2026-02-01"
      />
    </Suspense>
  );
}
