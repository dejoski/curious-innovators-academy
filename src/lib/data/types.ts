export type ProgramTrack = "core" | "enrichment";

/** Students list (/dashboard/students). */
export type StudentListItem = {
  id: string;
  name: string;
  avatar: string;
  parent: string;
  level: string;
  status: "Incomplete" | "Completed";
  enrichment: string;
  notes: string;
  track: ProgramTrack;
};

/** Classes overview (/dashboard/classes). */
export type SchoolClassRow = {
  id: string;
  name: string;
  teacher: string;
  students: string;
  schedule: string;
  status: "Active" | "Full";
  /** Core vs enrichment track — drives tabs on Class Setup. */
  program: ProgramTrack;
  /** Grade band / level label when known (otherwise shown as em dash). */
  level: string;
  /** Scheduling block label when known. */
  block: string;
  /** Pending enrollment workflow count (from enrollments with status pending). */
  pendingCount: number;
  /** Waitlist count — populated when backend provides it; otherwise 0. */
  waitlistCount: number;
};

/** Notifications inbox. */
export type DashboardNotification = {
  id: string;
  title: string;
  detail: string;
  time: string;
  href: string;
  read: boolean;
};

export type CalendarEventType =
  | "core"
  | "enrichment-pending"
  | "enrichment-approved"
  | "event";

export type ScheduleCalendarEvent = {
  id: string;
  time: string;
  title: string;
  type: CalendarEventType;
  description?: string;
};

/** Teachers list (/dashboard/teachers). */
export type TeacherRow = {
  id: string;
  name: string;
  subjects: string;
  email: string;
  phone: string;
  avatar: string;
  program: ProgramTrack;
};

/** Lightweight parent directory row (future parent-facing lists). */
export type ParentSummary = {
  id: number;
  name: string;
  email: string;
  phone: string;
  /** Bundled fallback or joined API extras for admin directory */
  avatar?: string;
  status?: string;
  studentsLabel?: string;
  linkedStudents?: { id: number; name: string }[];
};

export type RequestStatus = "Pending" | "Approved" | "Rejected";

/** Enrichment requests (/dashboard/classes/requests). */
export type EnrichmentRequestRow = {
  id: string;
  student: string;
  parent: string;
  class: string;
  block: string;
  level: string;
  option: string;
  status: RequestStatus;
};

/** Timeline / notes on student profile (stub for persistence). */
export type StudentNoteRecord = {
  id: string;
  studentId: number;
  body: string;
  author: string;
  createdAt: string;
};

/** Parent feedback submissions (stub). */
export type FeedbackSubmissionRecord = {
  id: string;
  mood: string;
  nps: number;
  submittedAt: string;
};
