"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cachedJson, peekCachedJson } from "@/lib/client-data-cache";
import type { CalendarEvent } from "@/lib/dashboard/schedule-calendar-shared";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";
import {
  mergeCalendarEvents,
  studentScheduleToMonthEvents,
} from "@/lib/parent-schedule-month-events";
import type { DataSource, StudentListItem, StudentScheduleRow } from "@/lib/data";
import ScheduleMonth from "../../schedule/schedule-client";

type StudentsBody = { students?: StudentListItem[]; source?: DataSource };
type StudentScheduleBody = { rows?: StudentScheduleRow[]; source?: DataSource };
type ScheduleExtrasBody = { extrasByDate?: Record<string, CalendarEvent[]>; source?: DataSource };

type ParentScheduleState = {
  eventsByDate: Record<string, CalendarEvent[]>;
  source: DataSource;
  ready: boolean;
  studentId: string | null;
};

function resolveRequestedStudent(students: StudentListItem[], requestedStudentId: string): StudentListItem | null {
  return students.find((row) => row.id === requestedStudentId) ?? students[0] ?? null;
}

function composeParentScheduleState(
  studentsBody: StudentsBody | null,
  scheduleBody: StudentScheduleBody | null,
  extrasBody: ScheduleExtrasBody | null,
  requestedStudentId: string,
): ParentScheduleState {
  const selectedStudent = resolveRequestedStudent(studentsBody?.students ?? [], requestedStudentId);
  const scheduleRow = scheduleBody?.rows?.[0] ?? null;
  return {
    eventsByDate: mergeCalendarEvents(
      extrasBody?.extrasByDate ?? {},
      studentScheduleToMonthEvents(scheduleRow),
    ),
    source: scheduleBody?.source ?? extrasBody?.source ?? studentsBody?.source ?? "unavailable",
    ready: Boolean(studentsBody && scheduleBody && extrasBody),
    studentId: selectedStudent?.id ?? null,
  };
}

function readCachedParentScheduleState(requestedStudentId: string): ParentScheduleState {
  const studentsBody = peekCachedJson<StudentsBody>("/api/data/students");
  const selectedStudent = resolveRequestedStudent(studentsBody?.students ?? [], requestedStudentId);
  const scheduleBody = selectedStudent
    ? peekCachedJson<StudentScheduleBody>(`/api/data/students/${encodeURIComponent(selectedStudent.id)}/schedule`)
    : null;
  const extrasBody = peekCachedJson<ScheduleExtrasBody>("/api/data/schedule-extras");
  return composeParentScheduleState(studentsBody, scheduleBody, extrasBody, requestedStudentId);
}

export default function ParentScheduleClient() {
  const searchParams = useSearchParams();
  const requestedStudentId = searchParams.get("student") ?? "";
  const [scheduleState, setScheduleState] = useState<ParentScheduleState>({
    eventsByDate: {},
    source: "unavailable",
    ready: false,
    studentId: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadSchedule() {
      const cached = readCachedParentScheduleState(requestedStudentId);
      if (cached.ready) {
        setScheduleState(cached);
        setIsLoading(false);
      } else {
        setScheduleState({
          eventsByDate: {},
          source: "unavailable",
          ready: false,
          studentId: null,
        });
        setIsLoading(true);
      }

      try {
        const studentsBody = await cachedJson<StudentsBody>("/api/data/students");
        const selectedStudent = resolveRequestedStudent(studentsBody.students ?? [], requestedStudentId);
        const [scheduleBody, extrasBody] = await Promise.all([
          selectedStudent
            ? cachedJson<StudentScheduleBody>(`/api/data/students/${encodeURIComponent(selectedStudent.id)}/schedule`)
            : Promise.resolve<StudentScheduleBody>({ rows: [], source: studentsBody.source ?? "unavailable" }),
          cachedJson<ScheduleExtrasBody>("/api/data/schedule-extras"),
        ]);
        if (cancelled) return;
        setScheduleState(composeParentScheduleState(studentsBody, scheduleBody, extrasBody, requestedStudentId));
        setLoadError(null);
      } catch (error) {
        if (!cancelled) {
          setLoadError(`Could not load schedule: ${error instanceof Error ? error.message : String(error)}.`);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void loadSchedule();
    return () => {
      cancelled = true;
    };
  }, [requestedStudentId]);

  return (
    <div className="flex flex-col gap-3">
      {loadError ? (
        <div className="mx-4 mt-4 rounded-xl border border-[#cfa500]/35 bg-[#fff8e6] px-4 py-3 text-sm text-[#7a5b00] md:mx-8" role="status">
          {loadError}
        </div>
      ) : null}
      {isLoading && !scheduleState.ready ? (
        <div className="flex min-h-[40vh] w-full items-center justify-center p-8 font-sans text-[#666d80]">
          Loading schedule...
        </div>
      ) : (
        <ScheduleMonth
          key={scheduleState.studentId ?? "no-student"}
          initialExtrasByDate={scheduleState.eventsByDate}
          dataSource={scheduleState.source}
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
          allowEventCreation={false}
          initialDateIso="2026-02-01"
        />
      )}
    </div>
  );
}
