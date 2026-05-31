"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { cachedJson, peekCachedJson } from "@/lib/client-data-cache";
import type { CalendarEvent } from "@/lib/dashboard/schedule-calendar-shared";
import { PARENT_SCHEDULE_HREF } from "@/lib/dashboard/parent-schedule-route";
import {
  selectedParentStudentIdFromSearchParams,
  withParentStudentParam,
} from "@/lib/parent-student-selection";
import {
  mergeCalendarEvents,
  studentScheduleToMonthEvents,
} from "@/lib/parent-schedule-month-events";
import type { DataSource, SchoolClassRow, SemesterRow, StudentListItem, StudentScheduleRow } from "@/lib/data";
import ScheduleMonth from "../../schedule/schedule-client";

type StudentsBody = { students?: StudentListItem[]; source?: DataSource };
type StudentScheduleBody = { rows?: StudentScheduleRow[]; source?: DataSource };
type ScheduleExtrasBody = { extrasByDate?: Record<string, CalendarEvent[]>; source?: DataSource };
type ClassesBody = { classes?: SchoolClassRow[]; source?: DataSource };
type SemestersBody = { semesters?: SemesterRow[]; currentSemester?: SemesterRow | null; source?: DataSource };

type ParentScheduleState = {
  eventsByDate: Record<string, CalendarEvent[]>;
  source: DataSource;
  ready: boolean;
  studentId: string | null;
  semester: SemesterRow | null;
};

function resolveRequestedStudent(students: StudentListItem[], requestedStudentId: string): StudentListItem | null {
  return students.find((row) => row.id === requestedStudentId) ?? students[0] ?? null;
}

function composeParentScheduleState(
  studentsBody: StudentsBody | null,
  scheduleBody: StudentScheduleBody | null,
  extrasBody: ScheduleExtrasBody | null,
  classesBody: ClassesBody | null,
  semestersBody: SemestersBody | null,
  requestedStudentId: string,
): ParentScheduleState {
  const selectedStudent = resolveRequestedStudent(studentsBody?.students ?? [], requestedStudentId);
  const scheduleRow = scheduleBody?.rows?.[0] ?? null;
  const semester = semestersBody?.currentSemester ?? null;
  return {
    eventsByDate: mergeCalendarEvents(
      extrasBody?.extrasByDate ?? {},
      studentScheduleToMonthEvents(scheduleRow, classesBody?.classes ?? [], semester),
    ),
    source: scheduleBody?.source ?? extrasBody?.source ?? classesBody?.source ?? semestersBody?.source ?? studentsBody?.source ?? "unavailable",
    ready: Boolean(studentsBody && scheduleBody && extrasBody && classesBody && semestersBody),
    studentId: selectedStudent?.id ?? null,
    semester,
  };
}

function readCachedParentScheduleState(requestedStudentId: string): ParentScheduleState {
  const studentsBody = peekCachedJson<StudentsBody>("/api/data/students");
  const selectedStudent = resolveRequestedStudent(studentsBody?.students ?? [], requestedStudentId);
  const scheduleBody = selectedStudent
    ? peekCachedJson<StudentScheduleBody>(`/api/data/students/${encodeURIComponent(selectedStudent.id)}/schedule`)
    : null;
  const extrasBody = peekCachedJson<ScheduleExtrasBody>("/api/data/schedule-extras");
  const classesBody = peekCachedJson<ClassesBody>("/api/data/classes");
  const semestersBody = peekCachedJson<SemestersBody>("/api/data/semesters");
  return composeParentScheduleState(studentsBody, scheduleBody, extrasBody, classesBody, semestersBody, requestedStudentId);
}

export default function ParentScheduleClient() {
  const searchParams = useSearchParams();
  const requestedStudentId = selectedParentStudentIdFromSearchParams(searchParams);
  const [scheduleState, setScheduleState] = useState<ParentScheduleState>({
    eventsByDate: {},
    source: "unavailable",
    ready: false,
    studentId: null,
    semester: null,
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
          semester: null,
        });
        setIsLoading(true);
      }

      try {
        const studentsBody = await cachedJson<StudentsBody>("/api/data/students");
        const selectedStudent = resolveRequestedStudent(studentsBody.students ?? [], requestedStudentId);
        const [scheduleBody, extrasBody, classesBody, semestersBody] = await Promise.all([
          selectedStudent
            ? cachedJson<StudentScheduleBody>(`/api/data/students/${encodeURIComponent(selectedStudent.id)}/schedule`)
            : Promise.resolve<StudentScheduleBody>({ rows: [], source: studentsBody.source ?? "unavailable" }),
          cachedJson<ScheduleExtrasBody>("/api/data/schedule-extras"),
          cachedJson<ClassesBody>("/api/data/classes"),
          cachedJson<SemestersBody>("/api/data/semesters"),
        ]);
        if (cancelled) return;
        setScheduleState(composeParentScheduleState(studentsBody, scheduleBody, extrasBody, classesBody, semestersBody, requestedStudentId));
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
          viewClassesHref={withParentStudentParam("/dashboard/parents/classes/core", scheduleState.studentId)}
          heroSubtitle="View your child's schedule"
          titleByView={{
            Month: "Month Class Schedule",
            Week: "Weekly Class Schedule",
            Day: "Day Class Schedule",
          }}
          subtitleByView={{
            Week: "View your child's schedule by time and day",
          }}
          showDataSourceBanner={false}
          showTodayButton={false}
          refreshExtrasOnClient={false}
          allowEventCreation={false}
          semester={scheduleState.semester}
        />
      )}
    </div>
  );
}
