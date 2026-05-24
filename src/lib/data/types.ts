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
  /** Optional room/location shown in parent-facing class lists. */
  location?: string;
  /** Optional long description used in parent catalog/details. */
  description?: string;
  /** Optional prerequisites used in parent catalog/details. */
  prerequisites?: string;
  /** Pending enrollment workflow count (from enrollments with status pending). */
  pendingCount: number;
  /** Waitlist count — populated when backend provides it; otherwise 0. */
  waitlistCount: number;
  /** Class capacity from the source of truth. */
  capacity?: number;
  /** Approved/currently enrolled students. */
  enrolledCount?: number;
  /** Seats consumed by approved enrollments plus pending/approved class requests. */
  reservedCount?: number;
  /** Remaining selectable seats after pending requests reserve capacity. */
  seatsRemaining?: number;
  /** Parent-facing availability label, e.g. "3 seats left" or "Full". */
  availabilityLabel?: string;
};

export type ClassRosterStatus = "Approved" | "Pending" | "Waitlisted" | "Rejected";

export type ClassRosterStudent = {
  id: string;
  name: string;
  parent: string;
  age: number;
  level: string;
  status: ClassRosterStatus;
  description: string;
};

export type StudentProfileDetails = {
  name: string;
  age: string;
  level: string;
  learningProfile: string;
  strengths: string;
  supportNotes: string;
};

export type StudentProfileTimelineEvent = {
  id: string;
  type: "Academic" | "Behavioral" | "General";
  author: string;
  role: string;
  date: string;
  time: string;
  urgent: boolean;
  title: string;
  content: string;
};

export type StudentClassChip = {
  id: string;
  name: string;
};

export type StudentProfileBundle = {
  avatar: string;
  details: StudentProfileDetails;
  parentName: string;
  parentHref: string;
  coreSummaryLabel: string;
  enrichmentSummaryLabel: string;
  pendingLabel: string;
  attendanceLabel: string;
  coreClasses: StudentClassChip[];
  enrichmentClasses: StudentClassChip[];
  events: StudentProfileTimelineEvent[];
  /** True when class chips/history are intentionally absent from the remote row. */
  directoryDataOnly?: boolean;
};

export type StudentScheduleBadgeTone = "core" | "approved" | "pending" | "waitlisted" | "draft" | "empty";

export type StudentScheduleBadge = {
  label: string;
  tone: StudentScheduleBadgeTone;
};

export type StudentScheduleRow = {
  id: string;
  name: string;
  parent: string;
  avatar: string;
  b1: StudentScheduleBadge[];
  b2: StudentScheduleBadge[];
  b3Tue: StudentScheduleBadge[];
  b3Wed: StudentScheduleBadge[];
  b3Thu: StudentScheduleBadge[];
  b4Tue: StudentScheduleBadge[];
  b4Wed: StudentScheduleBadge[];
  b4Thu: StudentScheduleBadge[];
};

export type StudentRosterStatus = "Pending" | "Waitlist" | "Approved";

export type StudentRosterRow = {
  id: string;
  name: string;
  parent: string;
  age: number;
  status: StudentRosterStatus;
  avatar: string;
  classId: string;
  classRef: string;
  blockRef: string;
  levelRef: string;
  preference: string;
  notes: string;
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
  /** Optional display order when time alone is ambiguous, e.g. parent block schedules. */
  sortOrder?: number;
  /** Canonical class details when a calendar item represents an actual class row. */
  classDetails?: SchoolClassRow;
  /** Parent-facing workflow state for class-derived calendar items. */
  statusLabel?: string;
  /** Parent schedule slot label when the event comes from a student schedule block. */
  scheduleSlotLabel?: string;
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
  id: string;
  name: string;
  email: string;
  phone: string;
  /** Bundled fallback or joined API extras for admin directory */
  avatar?: string;
  status?: string;
  studentsLabel?: string;
  linkedStudents?: { id: string; name: string }[];
};

export type RequestStatus = "Pending" | "Approved" | "Waitlisted" | "Rejected";

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

/** Timeline / notes on student profile. */
export type StudentNoteRecord = {
  id: string;
  studentId: string;
  body: string;
  author: string;
  createdAt: string;
};

/** Parent feedback submissions. */
export type FeedbackSubmissionRecord = {
  id: string;
  mood: string;
  nps: number;
  submittedAt: string;
};

export type InvoiceStatus = "Draft" | "Open" | "Paid" | "Past due" | "Void";

export type InvoiceRow = {
  id: string;
  family: string;
  student: string;
  invoiceNumber: string;
  amountCents: number;
  currency: string;
  status: InvoiceStatus;
  dueDate: string;
  issuedDate: string;
  lineItems: string;
  paymentUrl?: string;
};
