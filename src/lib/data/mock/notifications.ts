import type { DashboardNotification } from "@/lib/data/types";

/** Demo seed when Supabase is not configured or queries fail. */
export const NOTIFICATIONS_FALLBACK: DashboardNotification[] = [
  {
    id: "1",
    title: "New enrichment class request",
    detail: "Anna Lee requested Robotics Lab — review prerequisites.",
    time: "2 mins ago",
    href: "/dashboard/classes/requests",
    read: false,
  },
  {
    id: "2",
    title: "Teacher schedule updated",
    detail: "Emily Carter updated her availability for next term.",
    time: "1 hour ago",
    href: "/dashboard/schedule",
    read: false,
  },
  {
    id: "3",
    title: "System maintenance",
    detail: "Scheduled backup tonight at 2:00 AM local time.",
    time: "5 hours ago",
    href: "/dashboard",
    read: false,
  },
  {
    id: "4",
    title: "Student profile merged",
    detail: "Duplicate records for Jordan Kim were consolidated.",
    time: "Yesterday",
    href: "/dashboard/students",
    read: true,
  },
  {
    id: "5",
    title: "New teacher onboarding",
    detail: "Alex Rivera completed orientation — assigned to Core cohort.",
    time: "Yesterday",
    href: "/dashboard/teachers",
    read: true,
  },
];
