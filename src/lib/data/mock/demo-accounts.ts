import type { DemoAccount, DemoAccountId } from "@/lib/demo-accounts";

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "admin-joseph",
    persona: "admin",
    displayName: "Joseph Collins",
    roleLabel: "Administrator",
    defaultRoute: "/dashboard",
    studentId: "1",
  },
  {
    id: "admin-dejan",
    persona: "admin",
    displayName: "Dejan Stajić",
    roleLabel: "Administrator",
    defaultRoute: "/dashboard",
    studentId: "1",
  },
  {
    id: "parent-mary",
    persona: "parent",
    displayName: "Mary Lee",
    roleLabel: "Parent",
    defaultRoute: "/dashboard/parents/home",
    studentId: "1",
  },
  {
    id: "teacher-emily",
    persona: "teacher",
    displayName: "Emily Carter",
    roleLabel: "Teacher",
    defaultRoute: "/dashboard/teachers",
    studentId: "1",
  },
  {
    id: "student-anna",
    persona: "student",
    displayName: "Anna Lee",
    roleLabel: "Student",
    defaultRoute: "/dashboard/students/1",
    studentId: "1",
  },
];

export const DEFAULT_DEMO_ACCOUNT_ID: DemoAccountId = "admin-joseph";
