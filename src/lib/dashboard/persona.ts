export type DashboardPersona = "admin" | "parent" | "teacher" | "student";

export function isDashboardPersona(value: string | null | undefined): value is DashboardPersona {
  return value === "admin" || value === "parent" || value === "teacher" || value === "student";
}
