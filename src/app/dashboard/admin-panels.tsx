"use client";

import React from "react";
import DashboardHomeClient from "@/components/dashboard-home-client";
import { DashboardPanelError, DashboardPanelLoading } from "@/components/dashboard-loading-state";
import {
  mutateDashboardData,
  peekDashboardData,
  readDashboardData,
} from "@/lib/client-data-cache";
import type { DataSource } from "@/lib/data/fetch-source";
import type { ParentSummary, SchoolClassOptionRow, StudentListItem } from "@/lib/data/types";
import type { CalendarEvent } from "@/lib/dashboard/schedule-calendar-shared";
import type { AdminWorkspaceInitialData } from "./admin-workspace-page";
import ScheduleMonth from "./schedule/schedule-client";
import StudentsStudentsList from "./students/students-client";
import AdminStudentRosterClient from "./students/admin-student-roster-client";
import AdminStudentScheduleClient from "./students/admin-student-schedule-client";
import TeachersTeacherList from "./teachers/teachers-client";
import ParentsIndexClientGate from "./parents/parents-index-client";
import DashboardNotificationsPanel from "@/components/dashboard-notifications-panel";
import type { SchoolClassRow, SemesterRow, StudentScheduleRow } from "@/lib/data/types";

type TeacherRows = React.ComponentProps<typeof TeachersTeacherList>["initialTeachers"];

const SCHEDULE_URL = "/api/data/schedule-extras";
const STUDENTS_URL = "/api/data/students";
const STUDENT_SCHEDULES_URL = "/api/data/student-schedules";
const CLASS_OPTIONS_URL = "/api/data/class-options";
const CLASSES_URL = "/api/data/classes";
const TEACHERS_URL = "/api/data/teachers";
const PARENTS_URL = "/api/data/parents";

function sourceOrUnavailable(source: DataSource | undefined): DataSource {
  return source ?? "unavailable";
}

function usablePayload<T extends { source?: DataSource }>(payload: T | null): T | null {
  return payload?.source === "unavailable" ? null : payload;
}

function isUnavailableSource(source: DataSource | undefined): boolean {
  return source === "unavailable";
}

type PanelStatus = "loading" | "ready" | "error";

export function AdminHomePanel() {
  return <DashboardHomeClient />;
}

export function AdminSchedulePanel() {
  const cached = usablePayload(peekDashboardData<{
    extrasByDate?: Record<string, CalendarEvent[]>;
    semester?: SemesterRow | null;
    source?: DataSource;
  }>(SCHEDULE_URL));
  const [extrasByDate, setExtrasByDate] = React.useState<Record<string, CalendarEvent[]>>(
    () => cached?.extrasByDate ?? {},
  );
  const [source, setSource] = React.useState<DataSource>(() => sourceOrUnavailable(cached?.source));
  const [semester, setSemester] = React.useState<SemesterRow | null>(() => cached?.semester ?? null);
  const [status, setStatus] = React.useState<PanelStatus>(() => (cached ? "ready" : "loading"));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!cached) setStatus("loading");
    void readDashboardData<{ extrasByDate?: Record<string, CalendarEvent[]>; semester?: SemesterRow | null; source?: DataSource }>(SCHEDULE_URL)
      .then((body) => {
        if (cancelled) return;
        if (isUnavailableSource(body.source)) {
          setExtrasByDate({});
          setSemester(null);
          setSource("unavailable");
          setError("Schedule is temporarily unavailable.");
          setStatus("error");
          return;
        }
        setExtrasByDate(body.extrasByDate ?? {});
        setSemester(body.semester ?? null);
        setSource(sourceOrUnavailable(body.source));
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          setSource("unavailable");
          setError(`Could not load schedule: ${err instanceof Error ? err.message : String(err)}.`);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") return <DashboardPanelLoading label="Loading schedule..." />;
  if (status === "error") return <DashboardPanelError message={error ?? "Could not load schedule."} />;
  return <ScheduleMonth initialExtrasByDate={extrasByDate} dataSource={source} semester={semester} />;
}

export function AdminStudentsPanel({ initialData }: { initialData?: AdminWorkspaceInitialData["students"] }) {
  const usableInitialData = initialData?.source === "remote" ? initialData : undefined;
  const cached = usablePayload(peekDashboardData<{ students?: StudentListItem[]; source?: DataSource }>(STUDENTS_URL));
  const [students, setStudents] = React.useState<StudentListItem[]>(() => usableInitialData?.rows ?? cached?.students ?? []);
  const [source, setSource] = React.useState<DataSource>(() => sourceOrUnavailable(usableInitialData?.source ?? cached?.source));
  const [status, setStatus] = React.useState<PanelStatus>(() => (usableInitialData || cached ? "ready" : "loading"));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (usableInitialData) {
      mutateDashboardData(STUDENTS_URL, () => ({ students: usableInitialData.rows, source: usableInitialData.source }));
    } else if (!cached) {
      setStatus("loading");
    }
    void readDashboardData<{ students?: StudentListItem[]; source?: DataSource }>(STUDENTS_URL)
      .then((body) => {
        if (cancelled) return;
        if (isUnavailableSource(body.source)) {
          setStudents([]);
          setSource("unavailable");
          setError("Students are temporarily unavailable.");
          setStatus("error");
          return;
        }
        setStudents(body.students ?? []);
        setSource(sourceOrUnavailable(body.source));
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          setSource("unavailable");
          setError(`Could not load students: ${err instanceof Error ? err.message : String(err)}.`);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cached, usableInitialData]);

  if (status === "loading") return <DashboardPanelLoading label="Loading students..." />;
  if (status === "error") return <DashboardPanelError message={error ?? "Could not load students."} />;
  return <StudentsStudentsList initialStudents={students} dataSource={source} />;
}

export function AdminStudentSchedulePanel({ initialData }: { initialData?: AdminWorkspaceInitialData["studentSchedules"] }) {
  const usableInitialData = initialData?.source === "remote" ? initialData : undefined;
  const cached = usablePayload(peekDashboardData<{ rows?: StudentScheduleRow[]; source?: DataSource }>(STUDENT_SCHEDULES_URL));
  const [rows, setRows] = React.useState<StudentScheduleRow[]>(() => usableInitialData?.rows ?? cached?.rows ?? []);
  const [source, setSource] = React.useState<DataSource>(() => sourceOrUnavailable(usableInitialData?.source ?? cached?.source));
  const [status, setStatus] = React.useState<PanelStatus>(() => (usableInitialData || cached ? "ready" : "loading"));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (usableInitialData) {
      mutateDashboardData(STUDENT_SCHEDULES_URL, () => ({ rows: usableInitialData.rows, source: usableInitialData.source }));
    } else if (!cached) {
      setStatus("loading");
    }
    void readDashboardData<{ rows?: StudentScheduleRow[]; source?: DataSource }>(STUDENT_SCHEDULES_URL)
      .then((body) => {
        if (cancelled) return;
        if (isUnavailableSource(body.source)) {
          setRows([]);
          setSource("unavailable");
          setError("Student schedules are temporarily unavailable.");
          setStatus("error");
          return;
        }
        setRows(body.rows ?? []);
        setSource(sourceOrUnavailable(body.source));
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          setRows([]);
          setSource("unavailable");
          setError(`Could not load student schedules: ${err instanceof Error ? err.message : String(err)}.`);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cached, usableInitialData]);

  if (status === "loading") return <DashboardPanelLoading label="Loading student schedules..." />;
  if (status === "error") return <DashboardPanelError message={error ?? "Could not load student schedules."} />;
  return <AdminStudentScheduleClient initialRows={rows} dataSource={source} />;
}

export function AdminStudentRosterPanel({ initialData }: { initialData?: AdminWorkspaceInitialData["classOptions"] }) {
  const usableInitialData = initialData?.source === "remote" ? initialData : undefined;
  const cached = usablePayload(peekDashboardData<{ classes?: SchoolClassOptionRow[]; source?: DataSource }>(CLASS_OPTIONS_URL));
  const [classes, setClasses] = React.useState<SchoolClassOptionRow[]>(() => usableInitialData?.rows ?? cached?.classes ?? []);
  const [source, setSource] = React.useState<DataSource>(() => sourceOrUnavailable(usableInitialData?.source ?? cached?.source));
  const [status, setStatus] = React.useState<PanelStatus>(() => (usableInitialData || cached ? "ready" : "loading"));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (usableInitialData) {
      mutateDashboardData(CLASS_OPTIONS_URL, () => ({ classes: usableInitialData.rows, source: usableInitialData.source }));
    } else if (!cached) {
      setStatus("loading");
    }
    void readDashboardData<{ classes?: SchoolClassOptionRow[]; source?: DataSource }>(CLASS_OPTIONS_URL)
      .then((body) => {
        if (cancelled) return;
        if (isUnavailableSource(body.source)) {
          setClasses([]);
          setSource("unavailable");
          setError("Class roster options are temporarily unavailable.");
          setStatus("error");
          return;
        }
        setClasses(body.classes ?? []);
        setSource(sourceOrUnavailable(body.source));
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          setClasses([]);
          setSource("unavailable");
          setError(`Could not load class roster options: ${err instanceof Error ? err.message : String(err)}.`);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cached, usableInitialData]);

  if (status === "loading") return <DashboardPanelLoading label="Loading roster options..." />;
  if (status === "error") return <DashboardPanelError message={error ?? "Could not load roster options."} />;
  return <AdminStudentRosterClient classes={classes} dataSource={source} />;
}

export function AdminTeachersPanel() {
  const cached = usablePayload(peekDashboardData<{ teachers?: TeacherRows; source?: DataSource }>(TEACHERS_URL));
  const [teachers, setTeachers] = React.useState<TeacherRows>(() => cached?.teachers ?? []);
  const [source, setSource] = React.useState<DataSource>(() => sourceOrUnavailable(cached?.source));
  const [status, setStatus] = React.useState<PanelStatus>(() => (cached ? "ready" : "loading"));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!cached) setStatus("loading");
    void readDashboardData<{ teachers?: TeacherRows; source?: DataSource }>(TEACHERS_URL)
      .then((body) => {
        if (cancelled) return;
        if (isUnavailableSource(body.source)) {
          setTeachers([]);
          setSource("unavailable");
          setError("Teachers are temporarily unavailable.");
          setStatus("error");
          return;
        }
        setTeachers(body.teachers ?? []);
        setSource(sourceOrUnavailable(body.source));
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          setSource("unavailable");
          setError(`Could not load teachers: ${err instanceof Error ? err.message : String(err)}.`);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") return <DashboardPanelLoading label="Loading teachers..." />;
  if (status === "error") return <DashboardPanelError message={error ?? "Could not load teachers."} />;
  return <TeachersTeacherList initialTeachers={teachers} dataSource={source} />;
}

export function AdminParentsPanel() {
  const cached = usablePayload(peekDashboardData<{ parents?: ParentSummary[]; source?: DataSource }>(PARENTS_URL));
  const [parents, setParents] = React.useState<ParentSummary[]>(() => cached?.parents ?? []);
  const [source, setSource] = React.useState<DataSource>(() => sourceOrUnavailable(cached?.source));
  const [status, setStatus] = React.useState<PanelStatus>(() => (cached ? "ready" : "loading"));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!cached) setStatus("loading");
    void readDashboardData<{ parents?: ParentSummary[]; source?: DataSource }>(PARENTS_URL)
      .then((body) => {
        if (cancelled) return;
        if (isUnavailableSource(body.source)) {
          setParents([]);
          setSource("unavailable");
          setError("Parents are temporarily unavailable.");
          setStatus("error");
          return;
        }
        setParents(body.parents ?? []);
        setSource(sourceOrUnavailable(body.source));
        setError(null);
        setStatus("ready");
      })
      .catch((err) => {
        if (!cancelled) {
          setSource("unavailable");
          setError(`Could not load parents: ${err instanceof Error ? err.message : String(err)}.`);
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (status === "loading") return <DashboardPanelLoading label="Loading parents..." />;
  if (status === "error") return <DashboardPanelError message={error ?? "Could not load parents."} />;
  return <ParentsIndexClientGate initialParents={parents} dataSource={source} />;
}

export function AdminNotificationsPanel() {
  return <DashboardNotificationsPanel />;
}
