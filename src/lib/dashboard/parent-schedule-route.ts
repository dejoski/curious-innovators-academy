/**
 * Parent-shell schedule navigation must always use this path — never `/dashboard/schedule`,
 * which loads the admin/teacher calendar shell and swaps persona context incorrectly.
 */
export const PARENT_SCHEDULE_HREF = "/dashboard/parents/schedule" as const;
